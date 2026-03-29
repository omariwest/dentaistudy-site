import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const FREE_DAILY_LIMIT = 20;
const PRO_DAILY_LIMIT = 200;

// Safety nets
const HISTORY_WINDOW = 10;
const MAX_MESSAGE_CHARS = 6000;
const MAX_OUTPUT_TOKENS = 1600;

// RAG settings
const EMBEDDING_MODEL = "text-embedding-3-small"; // 1536 dims
const RETRIEVE_TOP_K = 8;
const MAX_CONTEXT_CHARS = 14000;

// Indexing caps (cost control)
const MAX_INDEX_CHARS_PER_FILE = 60_000;
const CHUNK_CHARS = 2500;
const CHUNK_OVERLAP = 150;

function getTodayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function truncateText(text: string, maxChars: number): string {
  if (!text) return "";
  return text.length > maxChars ? text.slice(0, maxChars) : text;
}

async function fetchOpenAIWithBackoff(
  url: string,
  body: unknown,
  apiKey: string,
): Promise<Response> {
  let res: Response | null = null;

  for (let attempt = 0; attempt < 4; attempt++) {
    res = await fetch(url, {
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

  return res!;
}

async function embedTexts(texts: string[]): Promise<number[][]> {
  const res = await fetchOpenAIWithBackoff(
    "https://api.openai.com/v1/embeddings",
    {
      model: EMBEDDING_MODEL,
      input: texts,
    },
    OPENAI_API_KEY,
  );

  const raw = await res.text();
  const json = raw ? JSON.parse(raw) : null;

  if (!res.ok) {
    throw new Error(`EMBEDDINGS_ERROR ${res.status}: ${raw.slice(0, 300)}`);
  }

  const data = Array.isArray(json?.data) ? json.data : [];
  return data.map((d: any) => d.embedding as number[]);
}

// Parses text that contains page markers like: [Page 3]
function splitIntoPages(
  text: string,
): Array<{ page: number | null; text: string }> {
  const t = (text || "").slice(0, MAX_INDEX_CHARS_PER_FILE);

  // If no page markers, treat as single "page"
  if (!/\[Page\s+\d+\]/.test(t)) {
    return [{ page: null, text: t }];
  }

  const out: Array<{ page: number | null; text: string }> = [];
  const re = /\[Page\s+(\d+)\]/g;

  let lastIndex = 0;
  let lastPage: number | null = null;

  for (;;) {
    const m = re.exec(t);
    if (!m) break;

    const idx = m.index;
    if (idx > lastIndex) {
      const chunk = t.slice(lastIndex, idx).trim();
      if (chunk) out.push({ page: lastPage, text: chunk });
    }

    lastPage = Number(m[1]);
    lastIndex = re.lastIndex;
  }

  const tail = t.slice(lastIndex).trim();
  if (tail) out.push({ page: lastPage, text: tail });

  return out;
}

function chunkText(pageText: string): string[] {
  const s = (pageText || "").replace(/\s+/g, " ").trim();
  if (!s) return [];

  const chunks: string[] = [];
  let i = 0;

  while (i < s.length) {
    const end = Math.min(s.length, i + CHUNK_CHARS);
    const slice = s.slice(i, end).trim();
    if (slice) chunks.push(slice);

    if (end >= s.length) break;
    i = Math.max(0, end - CHUNK_OVERLAP);
  }

  return chunks;
}

type PdfDoc = {
  file_id: string;
  file_name?: string;
  text: string;
  pages?: number | null;
};

async function indexPdfDocs(
  supabaseAdmin: ReturnType<typeof createClient>,
  userId: string,
  conversationId: string,
  pdfDocs: PdfDoc[],
) {
  for (const doc of pdfDocs) {
    const fileId = String(doc.file_id || "").trim();
    const fileName = String(doc.file_name || "").trim() || null;
    const text = String(doc.text || "").trim();
    if (!fileId || !text) continue;

    // Replace old chunks for this file in this conversation (clean + simple)
    await supabaseAdmin
      .from("pdf_chunks")
      .delete()
      .eq("user_id", userId)
      .eq("conversation_id", conversationId)
      .eq("file_id", fileId);

    const pages = splitIntoPages(text);

    let chunkIndex = 0;
    const rows: any[] = [];

    for (const p of pages) {
      const parts = chunkText(p.text);
      for (const part of parts) {
        rows.push({
          user_id: userId,
          conversation_id: conversationId,
          file_id: fileId,
          file_name: fileName,
          page_start: p.page,
          page_end: p.page,
          chunk_index: chunkIndex++,
          content: part,
          embedding: [], // fill after embedding
        });
      }
    }

    if (!rows.length) continue;

    // Embed in batches
    const BATCH = 48;
    for (let i = 0; i < rows.length; i += BATCH) {
      const batchRows = rows.slice(i, i + BATCH);
      const batchTexts = batchRows.map((r) => r.content);
      const embeds = await embedTexts(batchTexts);
      for (let j = 0; j < batchRows.length; j++) {
        batchRows[j].embedding = embeds[j];
      }
    }

    const { error } = await supabaseAdmin.from("pdf_chunks").insert(rows);
    if (error) {
      console.error("PDF_INDEX_INSERT_ERROR", error);
      // don't throw hard — user can still chat without PDF
    }
  }
}

function buildRagContext(chunks: any[]): string {
  let out = "";
  for (const c of chunks || []) {
    const page =
      c.page_start == null
        ? ""
        : ` (page ${c.page_start}${
            c.page_end && c.page_end !== c.page_start ? `-${c.page_end}` : ""
          })`;
    const header = `\n--- ${c.file_name || "PDF"}${page} ---\n`;
    const block = header + String(c.content || "").trim() + "\n";
    if (out.length + block.length > MAX_CONTEXT_CHARS) break;
    out += block;
  }
  return out.trim();
}

async function fetchAllChunksForFile(
  supabaseAdmin: any,
  userId: string,
  conversationId: string,
  fileId: string,
) {
  const { data, error } = await supabaseAdmin
    .from("pdf_chunks")
    .select("chunk_index,page_start,page_end,content,file_name")
    .eq("user_id", userId)
    .eq("conversation_id", conversationId)
    .eq("file_id", fileId)
    .order("chunk_index", { ascending: true });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

function makeBatchesByCharLimit(rows: any[], maxChars: number) {
  const batches: any[][] = [];
  let cur: any[] = [];
  let curLen = 0;

  for (const r of rows) {
    const txt = String(r.content || "").trim();
    if (!txt) continue;

    const addLen = txt.length + 40; // tiny buffer for headers/newlines
    if (cur.length && curLen + addLen > maxChars) {
      batches.push(cur);
      cur = [];
      curLen = 0;
    }
    cur.push(r);
    curLen += addLen;
  }
  if (cur.length) batches.push(cur);
  return batches;
}

function formatBatch(rows: any[]) {
  let out = "";
  for (const r of rows) {
    const page =
      r.page_start == null
        ? ""
        : ` (page ${r.page_start}${r.page_end && r.page_end !== r.page_start ? `-${r.page_end}` : ""})`;
    out += `\n--- ${r.file_name || "PDF"}${page} ---\n${String(r.content || "").trim()}\n`;
  }
  return out.trim();
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (
    !OPENAI_API_KEY ||
    !SUPABASE_URL ||
    !SUPABASE_SERVICE_ROLE_KEY ||
    !SUPABASE_ANON_KEY
  ) {
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
    const conversationId = String(body?.conversation_id ?? "").trim();

    // NEW: controls behavior without changing UI much
    const task = String(body?.task ?? "qa").trim(); // "qa" | "chapter_notes"
    const activeFileId =
      String(body?.file_id ?? "").trim() ||
      String(body?.pdf_docs?.[0]?.file_id ?? "").trim();

    const pdfDocs: PdfDoc[] = Array.isArray(body?.pdf_docs)
      ? body.pdf_docs.map((d: any) => ({
          file_id: String(d?.file_id ?? ""),
          file_name: String(d?.file_name ?? ""),
          text: String(d?.text ?? ""),
          pages: d?.pages ?? null,
        }))
      : [];

    const messagesFromClient = Array.isArray(body?.messages)
      ? body.messages
          .filter(
            (m: any) => m && (m.role === "user" || m.role === "assistant"),
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

    // Admin client (service role): limits + writes
    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { persistSession: false },
      },
    );

    // User-context client (anon + user JWT): RLS + auth.uid() works inside RPC
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Identify user
    let userId: string | null = null;
    if (authHeader.toLowerCase().startsWith("bearer ")) {
      const jwt = authHeader.slice(7).trim();
      const { data } = await supabaseAdmin.auth.getUser(jwt);
      if (data?.user) userId = data.user.id;
    }

    // Enforce signed-in for PDF indexing/retrieval
    const canUsePdf = Boolean(userId && conversationId);

    // Rate limit (your existing logic)
    if (userId) {
      const today = getTodayUTC();
      const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
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
            },
          );
        }

        await supabaseAdmin.auth.admin.updateUserById(userId, {
          user_metadata: { ...userMeta, ai_date: today, ai_count: used + 1 },
        });
      }
    }

    // If PDFs arrived with this message: index them now (chat-scoped via conversation_id)
    if (canUsePdf && pdfDocs.length) {
      await indexPdfDocs(supabaseAdmin, userId!, conversationId, pdfDocs);
    }

    // Retrieve top-k relevant chunks (QA only)
    let ragContext = "";
    if (canUsePdf && task !== "chapter_notes") {
      try {
        const question =
          topic ||
          (messagesFromClient
            ?.slice()
            .reverse()
            .find((m) => m.role === "user")?.content ??
            "");
        if (question) {
          const [qEmbed] = await embedTexts([question]);
          const { data } = await supabaseUser.rpc("match_pdf_chunks", {
            p_conversation_id: conversationId,
            p_query_embedding: qEmbed,
            p_match_count: RETRIEVE_TOP_K,
          });

          ragContext = buildRagContext(Array.isArray(data) ? data : []);
        }
      } catch (e) {
        console.error("RAG_RETRIEVE_ERROR", e);
      }
    }

    // NEW: full chapter notes (batch summarize -> merge)
    if (canUsePdf && task === "chapter_notes") {
      if (!activeFileId) {
        return new Response(JSON.stringify({ error: "FILE_ID_REQUIRED" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const allChunks = await fetchAllChunksForFile(
        supabaseAdmin,
        userId!,
        conversationId,
        activeFileId,
      );

      if (!allChunks.length) {
        return new Response(JSON.stringify({ error: "NO_CHUNKS_FOUND" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // batch size: big enough to be efficient, small enough to fit reliably
      const batches = makeBatchesByCharLimit(allChunks, 12000);
      const partials: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batchText = formatBatch(batches[i]);

        const body1 = {
          model: "gpt-4.1-mini",
          temperature: 0.2,
          max_tokens: MAX_OUTPUT_TOKENS,
          messages: [
            {
              role: "system",
              content:
                "You are DentAIstudy. Create exam-ready notes from the provided text ONLY. " +
                "Be clean and useful: short headings, bullet points only when needed, high-yield focus. " +
                "Do NOT invent missing content.",
            },
            {
              role: "user",
              content:
                `Subject: ${subject}\n` +
                `Goal: Produce exam-ready notes for this section.\n` +
                `Section ${i + 1}/${batches.length}:\n\n` +
                batchText,
            },
          ],
        };

        const r1 = await fetchOpenAIWithBackoff(
          "https://api.openai.com/v1/chat/completions",
          body1,
          OPENAI_API_KEY,
        );
        const t1 = await r1.text();
        const j1 = t1 ? JSON.parse(t1) : null;
        if (!r1.ok) {
          console.error("OPENAI_ERROR_SECTION", r1.status, t1);
          return new Response(
            JSON.stringify({ error: "OPENAI_ERROR", details: t1 }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        const s = String(j1?.choices?.[0]?.message?.content ?? "").trim();
        if (s) partials.push(s);
      }

      // merge partial notes into one premium sheet
      const body2 = {
        model: "gpt-4.1-mini",
        temperature: 0.2,
        max_tokens: 2400,
        messages: [
          {
            role: "system",
            content:
              "You are DentAIstudy, a friendly dental study tutor. " +
              "Start with a brief warm intro (1–2 sentences) acknowledging what the student asked for and what the sheet covers, e.g. 'Here is your exam-ready chapter sheet covering [topic]. It highlights the key definitions, red flags, and likely exam questions from the text.' " +
              "Then produce ONE exam-ready chapter sheet. Structure: concise headings, key definitions, red flags, tables (text-based), and likely exam questions. " +
              "No filler. No repeating the same point twice.",
          },
          {
            role: "user",
            content:
              `Subject: ${subject}\n` +
              `Deliverable: Complete exam sheet for the full chapter.\n\n` +
              partials
                .map((p, idx) => `--- Section Notes ${idx + 1} ---\n${p}`)
                .join("\n\n"),
          },
        ],
      };

      const r2 = await fetchOpenAIWithBackoff(
        "https://api.openai.com/v1/chat/completions",
        body2,
        OPENAI_API_KEY,
      );
      const t2 = await r2.text();
      const j2 = t2 ? JSON.parse(t2) : null;

      if (!r2.ok) {
        console.error("OPENAI_ERROR_MERGE", r2.status, t2);
        return new Response(
          JSON.stringify({ error: "OPENAI_ERROR", details: t2 }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const merged = String(j2?.choices?.[0]?.message?.content ?? "").trim();
      return new Response(JSON.stringify({ output: merged }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
      "You are DentAIstudy, a friendly and smart dental study tutor.\n" +
      "Start with a brief natural reply (1–2 sentences) that acknowledges what the student asked, then give the direct answer followed by high-yield details.\n" +
      "Avoid boilerplate headings unless the user asks.\n" +
      "If PDF excerpts are provided, answer ONLY from those excerpts. If the excerpts do not contain the answer, say you can't find it in the PDF.";

    const baseUserPrompt = [
      `Subject: ${subject}`,
      `Study mode: ${mode}`,
      `Instruction: ${modeExplanation}`,
      ragContext ? `\nRelevant PDF excerpts:\n${ragContext}` : "",
      "\nUse the chat context below. Keep it exam-relevant.",
    ].join("\n");

    const safeHistory = (
      Array.isArray(messagesFromClient) ? messagesFromClient : []
    )
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .slice(-HISTORY_WINDOW)
      .map((m) => ({
        role: m.role,
        content: truncateText(String(m.content || ""), MAX_MESSAGE_CHARS),
      }));

    const finalMessages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: baseUserPrompt },
      ...safeHistory,
    ];

    const openAiBody = {
      model: "gpt-4.1-mini",
      messages: finalMessages,
      temperature: 0.3,
      max_tokens: MAX_OUTPUT_TOKENS,
    };

    const aiRes = await fetchOpenAIWithBackoff(
      "https://api.openai.com/v1/chat/completions",
      openAiBody,
      OPENAI_API_KEY,
    );

    const aiText = await aiRes.text();
    const aiJson = aiText ? JSON.parse(aiText) : null;

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
        },
      );
    }

    const content =
      aiJson?.choices?.[0]?.message?.content?.toString().trim() ?? "";
    return new Response(JSON.stringify({ content }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("AI_NETWORK_ERROR", e);
    return new Response(JSON.stringify({ error: "AI_NETWORK_ERROR" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
