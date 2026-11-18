import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function clean(value: unknown, max = 120) {
  return String(value ?? "").trim().slice(0, max);
}

function activeUntil(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return false;
  const parsed = Date.parse(raw);
  return Number.isFinite(parsed) && parsed > Date.now();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return json({ error: "Promotion service is not configured." }, 500);
  }

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body = await req.json().catch(() => ({}));
    const action = clean(body?.action, 30).toLowerCase();
    const code = clean(body?.code, 32).toUpperCase();

    if (!code) {
      return json({ ok: false, state: "invalid", message: "This promotion link is not valid." }, 400);
    }

    const { data: stateData, error: stateError } = await admin.rpc(
      "promo_evaluate_experiment",
    );
    if (stateError) throw stateError;

    const { data: promoCode, error: codeError } = await admin
      .from("promo_codes")
      .select("code,cohort,enabled")
      .eq("code", code)
      .maybeSingle();

    if (codeError) throw codeError;
    if (!promoCode?.enabled) {
      return json({
        ok: false,
        state: "invalid",
        message: "This promotion link is not valid.",
      });
    }

    const { count: redemptionCount, error: countError } = await admin
      .from("promo_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("code", code);

    if (countError) throw countError;

    const experiment =
      stateData && typeof stateData === "object" ? stateData : {};
    const status = String(experiment?.status ?? "closed");
    const currentCap = Number(experiment?.current_cap ?? 0);
    const atCap = Number(redemptionCount ?? 0) >= currentCap;

    if (action === "status") {
      if (status === "closed") {
        return json({
          ok: true,
          available: false,
          state: "expired",
          cohort: promoCode.cohort,
          message:
            "This promotion has ended and is no longer accepting new activations.",
        });
      }

      if (atCap) {
        return json({
          ok: true,
          available: false,
          state: "allocation_full",
          cohort: promoCode.cohort,
          message:
            status === "active"
              ? "The current promotional allocation has been claimed. This offer may reopen after the campaign review."
              : "This promotion has reached its available allocation.",
        });
      }

      return json({
        ok: true,
        available: true,
        state: "available",
        cohort: promoCode.cohort,
      });
    }

    if (action !== "redeem") {
      return json({ error: "Unsupported promotion action." }, 400);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ ok: false, reason: "AUTH_REQUIRED" }, 401);
    }

    const jwt = authHeader.slice(7).trim();
    const { data: userData, error: userError } = await admin.auth.getUser(jwt);
    const user = userData?.user;

    if (userError || !user) {
      return json({ ok: false, reason: "AUTH_REQUIRED" }, 401);
    }

    const appMeta = user.app_metadata ?? {};
    const tier = String(appMeta.subscription_tier ?? "free");
    const paddleStatus = String(appMeta.paddle_subscription_status ?? "");
    const partnerActive = activeUntil(appMeta.partner_pro_until);

    const { data: existing, error: existingError } = await admin
      .from("promo_redemptions")
      .select("code,cohort,expires_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingError) throw existingError;

    if (existing) {
      const expiresAt = String(existing.expires_at);
      const metadata = {
        ...appMeta,
        promo_program: true,
        promo_code: existing.code,
        promo_cohort: existing.cohort,
        promo_pro_until: expiresAt,
      };

      const { error: syncError } = await admin.auth.admin.updateUserById(
        user.id,
        { app_metadata: metadata },
      );
      if (syncError) throw syncError;

      return json({
        ok: false,
        reason: "ALREADY_USED",
        code: existing.code,
        cohort: existing.cohort,
        expires_at: expiresAt,
      });
    }

    if (
      tier === "pro" ||
      tier === "pro_yearly" ||
      paddleStatus === "trialing" ||
      partnerActive
    ) {
      return json({
        ok: false,
        reason: "NOT_ELIGIBLE",
        message:
          "This promotion is available to Free accounts that do not already have paid, trial, or Partner Pro access.",
      });
    }

    const { data: redeemed, error: redeemError } = await admin.rpc(
      "promo_redeem",
      {
        p_user_id: user.id,
        p_code: code,
        p_utm_source: clean(body?.utm_source),
        p_utm_medium: clean(body?.utm_medium),
        p_utm_campaign: clean(body?.utm_campaign),
        p_utm_content: clean(body?.utm_content),
      },
    );

    if (redeemError) throw redeemError;

    if (!redeemed?.ok) {
      const reason = String(redeemed?.reason ?? "UNAVAILABLE");
      if (reason === "EXPIRED") {
        return json({
          ok: false,
          reason,
          state: "expired",
          message:
            "This promotion has ended and is no longer accepting new activations.",
        });
      }
      if (reason === "CAP_REACHED") {
        return json({
          ok: false,
          reason,
          state: "allocation_full",
          message:
            "The current promotional allocation has been claimed. This offer may reopen after the campaign review.",
        });
      }
      return json({ ok: false, reason, ...redeemed });
    }

    const expiresAt = String(redeemed.expires_at);
    const metadata = {
      ...appMeta,
      promo_program: true,
      promo_code: redeemed.code,
      promo_cohort: redeemed.cohort,
      promo_redeemed_at: new Date().toISOString(),
      promo_pro_until: expiresAt,
    };

    const { error: metadataError } = await admin.auth.admin.updateUserById(
      user.id,
      { app_metadata: metadata },
    );

    if (metadataError) {
      await admin.from("promo_redemptions").delete().eq("user_id", user.id);
      throw metadataError;
    }

    return json({
      ok: true,
      code: redeemed.code,
      cohort: redeemed.cohort,
      expires_at: expiresAt,
    });
  } catch (error) {
    console.error("[promo-redeem]", error);
    return json(
      {
        ok: false,
        error: "Promotion service is temporarily unavailable.",
      },
      500,
    );
  }
});
