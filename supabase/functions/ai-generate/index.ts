// supabase/functions/ai-generate/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 200;

// Safety nets (server-side) to reduce TPM even if client sends too much.
const HISTORY_WINDOW = 10;
const MAX_MESSAGE_CHARS = 6000;

// Output cap (prevents huge completions).
const MAX_OUTPUT_TOKENS = 800;

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function truncateText(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

async function fetchOpenAIWithBackoff(
  body: unknown,
  apiKey: string
): Promise<Response> {
  let res: Response | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (res.status !== 429) return res;

    const delayMs = Math.min(8000, 500 * 2 ** attempt);
    await new Promise((r) => setTimeout(r, delayMs));
  }

  // If still 429 after retries, return the last response.
  return res!;
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!OPENAI_API_KEY) {
    return new Response(JSON.stringify({ error: "SERVER_MISCONFIGURED" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json().catch(() => ({}))) as any;

    const topic = String(body?.topic ?? "").trim();
    const mode = String(body?.mode ?? "General overview");
    const subject = String(body?.subject ?? "General dentistry");

    const messagesFromClient = Array.isArray(body?.messages)
      ? body.messages
          .filter(
            (m: any) => m && (m.role === "user" || m.role === "assistant")
          )
          .slice(-HISTORY_WINDOW)
          .map((m: any) => ({
            role: m.role,
            content: truncateText(String(m.content ?? ""), MAX_MESSAGE_CHARS),
          }))
      : null;

    if (!topic && !messagesFromClient?.length) {
      return new Response(JSON.stringify({ error: "TOPIC_REQUIRED" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") || "";
    let userId: string | null = null;

    if (authHeader.toLowerCase().startsWith("bearer ")) {
      const jwt = authHeader.slice(7).trim();
      const { data } = await supabase.auth.getUser(jwt);
      if (data?.user) userId = data.user.id;
    }

    if (userId) {
      const today = getTodayUTC();
      const { data } = await supabase.auth.admin.getUserById(userId);
      if (data?.user) {
        const userMeta: any = data.user.user_metadata ?? {};
        const appMeta: any = data.user.app_metadata ?? {};
        const tier =
          appMeta.subscription_tier || userMeta.subscription_tier || "free";
        const isPro = tier === "pro" || tier === "pro_yearly";
        const limit = isPro ? PRO_DAILY_LIMIT : FREE_DAILY_LIMIT;

        let used =
          typeof userMeta.ai_count === "number" ? userMeta.ai_count : 0;
        let date =
          typeof userMeta.ai_date === "string" ? userMeta.ai_date : null;

        if (date !== today) {
          used = 0;
          date = today;
        }

        if (used >= limit) {
          return new Response(
            JSON.stringify({ error: "LIMIT_REACHED", tier, limit }),
            {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }

        await supabase.auth.admin.updateUserById(userId, {
          user_metadata: { ...userMeta, ai_date: today, ai_count: used + 1 },
        });
      }
    }

    const modeExplanation = (() => {
      const l = mode.toLowerCase();
      if (l.includes("osce"))
        return "Produce an OSCE-style checklist or station flow.";
      if (l.includes("flashcard")) return "Produce concise exam flashcards.";
      if (l.includes("mcq")) return "Produce exam-style MCQs with answers.";
      return "Produce a concise, structured exam-focused explanation.";
    })();

    const systemPrompt =
      "You are DentAIstudy, an exam-focused dental AI assistant. Be structured and concise.";

    const baseUserPrompt = [
      `Subject: ${subject}`,
      `Study mode: ${mode}`,
      "",
      `Instruction: ${modeExplanation}`,
    ].join("\n");

    const finalMessages = messagesFromClient?.length
      ? [{ role: "system", content: systemPrompt }, ...messagesFromClient]
      : [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: baseUserPrompt + "\n\nTopic: " + topic,
          },
        ];

    // ✅ Replace the single fetch with backoff + add max_tokens (output cap).
    const openAiBody = {
      model: "gpt-4.1-mini",
      messages: finalMessages,
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS,
    };

    const aiRes = await fetchOpenAIWithBackoff(openAiBody, OPENAI_API_KEY);

    const aiText = await aiRes.text();

    let aiJson: any = null;
    try {
      aiJson = aiText ? JSON.parse(aiText) : null;
    } catch {
      aiJson = null;
    }

    if (!aiRes.ok) {
      console.error("OPENAI_ERROR", aiRes.status, aiText);
      return new Response(
        JSON.stringify({
          error: "OPENAI_ERROR",
          status: aiRes.status,
          details: aiJson?.error ?? aiText,
        }),
        {
          status: aiRes.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const content =
      aiJson?.choices?.[0]?.message?.content?.toString().trim() ?? "";

    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(JSON.stringify({ error: "AI_NETWORK_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
