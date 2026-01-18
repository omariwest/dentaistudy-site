import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

const PADDLE_API_KEY = Deno.env.get("PADDLE_API_KEY")!;
const PADDLE_ENV = (Deno.env.get("PADDLE_ENV") || "sandbox").toLowerCase();

const PADDLE_API_BASE =
  PADDLE_ENV === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "Missing Authorization bearer token" }),
      {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const supabaseAuthed = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } =
    await supabaseAuthed.auth.getUser();
  if (userErr || !userData?.user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body = await req.json().catch(() => ({}));
  const customerId = body?.customer_id;
  const subscriptionId = body?.subscription_id;

  if (!customerId || !subscriptionId) {
    return new Response(
      JSON.stringify({ error: "Missing customer_id or subscription_id" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const paddleRes = await fetch(
    `${PADDLE_API_BASE}/customers/${encodeURIComponent(
      customerId
    )}/portal-sessions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PADDLE_API_KEY}`,
      },
      body: JSON.stringify({ subscription_ids: [subscriptionId] }),
    }
  );

  const paddleJson = await paddleRes.json().catch(() => null);
  if (!paddleRes.ok || !paddleJson?.data?.urls) {
    return new Response(
      JSON.stringify({
        error: "Failed to create portal session",
        details: paddleJson,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const subs = paddleJson?.data?.urls?.subscriptions || [];
  const url = subs?.[0]?.update_subscription_payment_method || null;

  if (!url) {
    return new Response(
      JSON.stringify({
        error: "Portal session created but no update_payment_method link found",
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  // Optional: you may also return overview link if you want
  return new Response(JSON.stringify({ url }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
