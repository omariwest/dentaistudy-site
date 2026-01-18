// supabase/functions/paddle-webhook/index.ts
//
// Paddle webhook -> Supabase Auth metadata sync
// - Verifies Paddle-Signature (ts + h1) using destination endpoint secret
// - Reads custom_data.supabase_user_id + custom_data.plan
// - Updates subscription_tier in both app_metadata + user_metadata (merged, not overwritten)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type PaddleEvent = {
  event_id: string;
  event_type: string;
  occurred_at: string;
  data?: any;
};

function parsePaddleSignature(
  headerValue: string | null,
): { ts: string; h1: string } | null {
  if (!headerValue) return null;
  const parts = headerValue.split(";").map((p) => p.trim());
  const kv: Record<string, string> = {};
  for (const p of parts) {
    const [k, v] = p.split("=");
    if (k && v) kv[k] = v;
  }
  if (!kv.ts || !kv.h1) return null;
  return { ts: kv.ts, h1: kv.h1 };
}

async function hmacSha256Hex(secret: string, msg: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(msg),
  );
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

function extractCustomData(evt: PaddleEvent): {
  userId?: string;
  plan?: string;
} {
  const d = evt.data ?? {};
  const cd = d.custom_data ?? d.customData ?? {};
  return {
    userId: cd.supabase_user_id ?? cd.supabaseUserId,
    plan: cd.plan,
  };
}

function planToTier(plan: string | undefined): "pro" | "pro_yearly" | "free" {
  if (plan === "pro" || plan === "pro_yearly") return plan;
  return "free";
}

Deno.serve(async (req) => {
  try {
    if (req.method !== "POST")
      return new Response("Method not allowed", { status: 405 });

    const PADDLE_ENV = (Deno.env.get("PADDLE_ENV") || "sandbox").toLowerCase();

    const PADDLE_WEBHOOK_SECRET =
      PADDLE_ENV === "live"
        ? Deno.env.get("PADDLE_WEBHOOK_SECRET_LIVE") || ""
        : Deno.env.get("PADDLE_WEBHOOK_SECRET_SANDBOX") || "";

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
    const SUPABASE_SERVICE_ROLE_KEY =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    if (!PADDLE_WEBHOOK_SECRET || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing env vars" }), {
        status: 500,
      });
    }

    // IMPORTANT: verify using raw body exactly (don’t JSON stringify/format before verifying). :contentReference[oaicite:5]{index=5}
    const rawBody = await req.text();
    const sigHeader = req.headers.get("Paddle-Signature");
    const parsed = parsePaddleSignature(sigHeader);
    if (!parsed)
      return new Response(
        JSON.stringify({ error: "Missing/invalid Paddle-Signature" }),
        { status: 401 },
      );

    // Paddle signs: `${ts}:${rawBody}` with HMAC SHA256. :contentReference[oaicite:6]{index=6}
    const signedPayload = `${parsed.ts}:${rawBody}`;
    const expected = await hmacSha256Hex(PADDLE_WEBHOOK_SECRET, signedPayload);

    if (!timingSafeEqual(expected, parsed.h1)) {
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
      });
    }

    const evt = JSON.parse(rawBody) as PaddleEvent;

    const { userId, plan } = extractCustomData(evt);

    const priceIdToPlan: Record<string, "pro" | "pro_yearly"> = {
      // sandbox
      pri_01kesdfpmd8rrkvtz2epb37ed9: "pro",
      pri_01kesdhj1s1da94aqgnpba30ac: "pro_yearly",

      // live (from your screenshot)
      pri_01kf6ec0xh0e6a055tfjaqt8sp: "pro",
      pri_01kf6ea46qs390nfh7d0pa93x6: "pro_yearly",
    };

    let resolvedPlan = plan;

    if (!resolvedPlan) {
      const items = Array.isArray(evt.data?.items) ? evt.data.items : [];
      for (const it of items) {
        const pid = it?.price?.id || it?.price_id;
        if (pid && priceIdToPlan[pid]) {
          resolvedPlan = priceIdToPlan[pid];
          break;
        }
      }
    }

    if (!userId) {
      // No mapping -> accept webhook but do nothing
      return new Response(
        JSON.stringify({ ok: true, skipped: "missing supabase_user_id" }),
        { status: 200 },
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Decide tier based on event type + subscription status
    const et = evt.event_type || "";
    let nextTier: "pro" | "pro_yearly" | "free" = "free";

    const subStatus = (evt as any)?.data?.status as string | undefined;

    if (et === "transaction.completed") {
      nextTier = planToTier(resolvedPlan);
    } else if (et.startsWith("subscription.")) {
      // definitive downgrade
      if (et === "subscription.canceled" || subStatus === "canceled") {
        nextTier = "free";
      } else if (et === "subscription.paused" || subStatus === "paused") {
        nextTier = "free";
      } else {
        // still active (even if scheduled to cancel later)
        nextTier = planToTier(resolvedPlan);
      }
    }

    // Merge metadata safely (don’t overwrite existing)
    const { data: got, error: getErr } =
      await supabase.auth.admin.getUserById(userId);
    if (getErr || !got?.user) {
      return new Response(
        JSON.stringify({ error: "User not found", details: getErr?.message }),
        { status: 200 },
      );
    }

    const existingApp = got.user.app_metadata ?? {};
    const existingUserMeta = got.user.user_metadata ?? {};

    const existingTier =
      (existingApp as any)?.subscription_tier ||
      (existingUserMeta as any)?.subscription_tier ||
      "free";

    // Guard: don't accidentally downgrade active subscriptions when plan can't be resolved
    const planIsMissing = !resolvedPlan;
    const existingIsPaid =
      existingTier === "pro" || existingTier === "pro_yearly";
    const incomingLooksActive =
      et.startsWith("subscription.") &&
      et !== "subscription.canceled" &&
      subStatus !== "canceled" &&
      et !== "subscription.paused" &&
      subStatus !== "paused";

    if (
      incomingLooksActive &&
      planIsMissing &&
      nextTier === "free" &&
      existingIsPaid
    ) {
      nextTier = existingTier;
    }

    // Skip older events (Paddle webhooks can arrive out of order)
    const occurredAt = evt.occurred_at || null;
    const prevOccurredAt =
      (existingApp as any)?.paddle_last_occurred_at ||
      (existingUserMeta as any)?.paddle_last_occurred_at ||
      null;

    if (occurredAt && prevOccurredAt) {
      const incoming = Date.parse(occurredAt);
      const previous = Date.parse(prevOccurredAt);
      if (
        Number.isFinite(incoming) &&
        Number.isFinite(previous) &&
        incoming < previous
      ) {
        return new Response(
          JSON.stringify({
            ok: true,
            skipped: "out_of_order_webhook",
            occurredAt,
            prevOccurredAt,
          }),
          { status: 200 },
        );
      }
    }

    const paddleCustomerId =
      (evt as any)?.data?.customer_id ?? (evt as any)?.data?.customerId ?? null;

    const paddleSubscriptionId =
      et === "transaction.completed"
        ? ((evt as any)?.data?.subscription_id ??
          (evt as any)?.data?.subscriptionId ??
          null)
        : ((evt as any)?.data?.id ?? null);

    const scheduledChange = (evt as any)?.data?.scheduled_change ?? null;

    const { error: updErr } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...existingApp,
        subscription_tier: nextTier,
        paddle_last_occurred_at: evt.occurred_at || null,
        ...(paddleCustomerId ? { paddle_customer_id: paddleCustomerId } : {}),
        ...(paddleSubscriptionId
          ? { paddle_subscription_id: paddleSubscriptionId }
          : {}),
        ...(subStatus ? { paddle_subscription_status: subStatus } : {}),
        paddle_scheduled_change: scheduledChange,
      },
      user_metadata: {
        ...existingUserMeta,
        subscription_tier: nextTier,
        paddle_last_occurred_at: evt.occurred_at || null,
        ...(paddleCustomerId ? { paddle_customer_id: paddleCustomerId } : {}),
        ...(paddleSubscriptionId
          ? { paddle_subscription_id: paddleSubscriptionId }
          : {}),
        ...(subStatus ? { paddle_subscription_status: subStatus } : {}),
        paddle_scheduled_change: scheduledChange,
      },
    });

    if (updErr) {
      return new Response(
        JSON.stringify({ ok: false, error: updErr.message }),
        { status: 200 },
      );
    }

    return new Response(
      JSON.stringify({
        ok: true,
        event_type: et,
        userId,
        subscription_tier: nextTier,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: "Webhook handler crashed", details: String(e) }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
});
