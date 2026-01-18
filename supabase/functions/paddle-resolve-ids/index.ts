// supabase/functions/paddle-resolve-ids/index.ts
//
// Resolve Paddle customer_id + subscription_id for the logged-in Supabase user
// (by exact email match), then persist into Supabase Auth metadata.

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

function pickBestSubscription(subs: any[]): any | null {
  if (!Array.isArray(subs) || subs.length === 0) return null;
  const rank = (s: any) => {
    const st = String(s?.status || "");
    if (st === "active") return 0;
    if (st === "trialing") return 1;
    if (st === "past_due") return 2;
    if (st === "paused") return 3;
    return 99;
  };
  return subs.slice().sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

async function paddleGet(path: string) {
  const res = await fetch(`${PADDLE_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  const json = await res.json().catch(() => null);
  return { res, json };
}

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
  if (userErr || !userData?.user?.id || !userData.user.email) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userId = userData.user.id;
  const email = userData.user.email;

  // 1) Find Paddle customer by exact email
  const { res: custRes, json: custJson } = await paddleGet(
    `/customers?email=${encodeURIComponent(email)}`
  );

  if (!custRes.ok || !custJson?.data) {
    return new Response(
      JSON.stringify({
        error: "Failed to list Paddle customers",
        details: custJson,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const customer = Array.isArray(custJson.data) ? custJson.data[0] : null;
  if (!customer?.id) {
    return new Response(
      JSON.stringify({
        error: "No Paddle customer found for this email",
        email,
        hint: "If the buyer typed a different email in checkout, this lookup will not match.",
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const customerId = customer.id;

  // 2) Find subscriptions for that customer
  // Paddle supports filtering subscriptions by customer_id
  const { res: subRes, json: subJson } = await paddleGet(
    `/subscriptions?customer_id=${encodeURIComponent(
      customerId
    )}&status=active,trialing,past_due,paused`
  );

  if (!subRes.ok || !subJson?.data) {
    return new Response(
      JSON.stringify({
        error: "Failed to list Paddle subscriptions",
        details: subJson,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const subscription = pickBestSubscription(subJson.data);
  if (!subscription?.id) {
    return new Response(
      JSON.stringify({
        error: "No subscription found for Paddle customer",
        customerId,
      }),
      {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  const subscriptionId = subscription.id;

  // 3) Persist into Supabase Auth metadata
  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: got, error: getErr } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (getErr || !got?.user) {
    return new Response(JSON.stringify({ error: "Supabase user not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const existingApp = got.user.app_metadata || {};
  const existingUserMeta = got.user.user_metadata || {};

  const { error: updErr } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      app_metadata: {
        ...existingApp,
        paddle_customer_id: customerId,
        paddle_subscription_id: subscriptionId,
        paddle_subscription_status: subscription.status ?? null,
        paddle_scheduled_change: subscription.scheduled_change ?? null,
      },
      user_metadata: {
        ...existingUserMeta,
        paddle_customer_id: customerId,
        paddle_subscription_id: subscriptionId,
        paddle_subscription_status: subscription.status ?? null,
        paddle_scheduled_change: subscription.scheduled_change ?? null,
      },
    }
  );

  if (updErr) {
    return new Response(
      JSON.stringify({
        error: "Failed to update user metadata",
        details: updErr.message,
      }),
      {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  return new Response(
    JSON.stringify({
      ok: true,
      paddle_customer_id: customerId,
      paddle_subscription_id: subscriptionId,
      paddle_subscription_status: subscription.status ?? null,
    }),
    {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    }
  );
});
