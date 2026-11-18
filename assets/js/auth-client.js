// auth-client.js
// Global Supabase client for DentAIstudy

const SUPABASE_URL = "https://hlvkbqpesiqjxbastxux.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_Ua-32KrYhA63EESjA0RxsQ_fytQcdE4";

const DAS_GOOGLE_CLIENT_ID =
  "468222375092-vfu0l7mo49mpgcj242vdmgp0939evmjp.apps.googleusercontent.com";

window.dasSupabase = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

const functionsBaseUrl = SUPABASE_URL.replace(
  ".supabase.co",
  ".functions.supabase.co",
);

// Expose URLs for other scripts (read-only)
window.dasSupabaseUrl = SUPABASE_URL;
window.dasSupabaseFunctionsBase = functionsBaseUrl;

const DAS_AUTH_NEXT_KEY = "das.auth.next.v1";

function dasNormalizeAuthNext(raw, fallback = "study.html") {
  const value = String(raw || "").trim();
  if (!value) return fallback;

  try {
    const target = new URL(value, window.location.origin);
    if (
      target.origin !== window.location.origin ||
      !["http:", "https:"].includes(target.protocol)
    ) {
      return fallback;
    }

    return `${target.pathname}${target.search}${target.hash}`;
  } catch (_) {
    return fallback;
  }
}

window.dasGetSafeAuthNext = function (fallback = "study.html") {
  const params = new URLSearchParams(window.location.search);
  const queryNext = params.get("next");

  if (queryNext) {
    return dasNormalizeAuthNext(queryNext, fallback);
  }

  try {
    const pending = sessionStorage.getItem(DAS_AUTH_NEXT_KEY);
    return dasNormalizeAuthNext(pending, fallback);
  } catch (_) {
    return fallback;
  }
};

window.dasClearPendingAuthNext = function () {
  try {
    sessionStorage.removeItem(DAS_AUTH_NEXT_KEY);
  } catch (_) {}
};

function dasSyncPendingAuthNext(fileName) {
  if (fileName !== "login.html" && fileName !== "signup.html") return;

  const params = new URLSearchParams(window.location.search);
  const queryNext = params.get("next");

  try {
    if (queryNext) {
      sessionStorage.setItem(
        DAS_AUTH_NEXT_KEY,
        dasNormalizeAuthNext(queryNext, "study.html"),
      );
    } else {
      sessionStorage.removeItem(DAS_AUTH_NEXT_KEY);
    }
  } catch (_) {}
}
// -----------------------------------------------------------
// Avatar metadata preservation (prevents Google from "winning")
// Place this right after: window.dasSupabaseFunctionsBase = functionsBaseUrl;
// -----------------------------------------------------------
(() => {
  const sb = window.dasSupabase;
  if (!sb?.auth) return;

  const isSupabaseAvatarUrl = (url) =>
    typeof url === "string" &&
    url.includes(".supabase.co/storage/v1/object/public/profile-pictures/");

  async function ensureCustomAvatarMeta() {
    const { data, error } = await sb.auth.getUser();
    if (error || !data?.user) return;

    const meta = data.user.user_metadata || {};

    const customUrl = meta.custom_avatar_url;
    const legacyUrl = meta.avatar_url;

    // 1) One-time migration: if user already has a Supabase avatar in avatar_url, copy it to custom_avatar_url
    if (!customUrl && isSupabaseAvatarUrl(legacyUrl)) {
      await sb.auth.updateUser({
        data: {
          ...meta,
          custom_avatar_url: legacyUrl,
          custom_avatar_path:
            meta.avatar_path || meta.custom_avatar_path || null,
        },
      });
      return;
    }

    // 2) Compatibility: if custom exists, force avatar_url to match it (so any old code still works)
    if (customUrl && meta.avatar_url !== customUrl) {
      await sb.auth.updateUser({
        data: { ...meta, avatar_url: customUrl },
      });
    }
  }

  // Run once on page load
  ensureCustomAvatarMeta();

  // Run again on sign-in / refresh events (covers mobile login then desktop refresh)
  sb.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
      ensureCustomAvatarMeta();
    }
  });
})();

// -----------------------------------------------------------
// Google OAuth + One Tap sign-in / sign-up
// -----------------------------------------------------------
async function dasSetupGoogleAuth() {
  const client = window.dasSupabase;
  if (!client || !client.auth) return;

  const origin = window.location.origin.replace(/\/$/, "");
  const redirectTo = `${origin}/study.html`;

  const fileName =
    (window.location.pathname || "").split("/").pop() || "index.html";

  dasSyncPendingAuthNext(fileName);

  if (fileName === "study.html") {
    const pendingNext = window.dasGetSafeAuthNext?.("study.html") || "study.html";
    if (pendingNext !== "study.html" && pendingNext !== "/study.html") {
      const { data: pendingSession } = await client.auth.getSession();
      if (pendingSession?.session) {
        window.dasClearPendingAuthNext?.();
        window.location.replace(pendingNext);
        return;
      }
    }
  }

  const oneTapPages = {
    "index.html": "signin",
    "login.html": "signin",
    "signup.html": "signup",
  };

  const loginBtn = document.getElementById("login-google-btn");
  const signupBtn = document.getElementById("signup-google-btn");

  function createOneTapNonce() {
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
      "",
    );
  }

  async function hashOneTapNonce(nonce) {
    const encoded = new TextEncoder().encode(nonce);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
    return Array.from(new Uint8Array(hashBuffer), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");
  }

  async function handleGoogleClick(event) {
    event.preventDefault();

    try {
      const { error } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
        },
      });

      if (error) {
        console.error("Google auth error:", error);
        alert("Could not start Google sign-in. Please try again.");
      }
    } catch (err) {
      console.error("Unexpected Google auth error:", err);
      alert("Could not start Google sign-in. Please try again.");
    }
  }

  if (loginBtn) loginBtn.addEventListener("click", handleGoogleClick);
  if (signupBtn) signupBtn.addEventListener("click", handleGoogleClick);

  const oneTapContext = oneTapPages[fileName];
  if (!oneTapContext) return;

  if (
    !DAS_GOOGLE_CLIENT_ID ||
    DAS_GOOGLE_CLIENT_ID.includes("PASTE_YOUR_GOOGLE_WEB_CLIENT_ID_HERE")
  ) {
    console.warn("Google One Tap skipped: missing Google Web Client ID.");
    return;
  }

  const { data } = await client.auth.getSession();
  if (data?.session) return;

  if (!window.google?.accounts?.id) {
    console.warn("Google One Tap skipped: Google Identity script not loaded.");
    return;
  }

  const oneTapNonce = createOneTapNonce();
  const hashedOneTapNonce = await hashOneTapNonce(oneTapNonce);

  async function handleGoogleCredential(response) {
    if (!response?.credential) return;

    try {
      const { error } = await client.auth.signInWithIdToken({
        provider: "google",
        token: response.credential,
        nonce: oneTapNonce,
      });

      if (error) {
        console.error("Google One Tap error:", error);
        return;
      }

      const destination =
        window.dasGetSafeAuthNext?.("study.html") || "study.html";
      window.dasClearPendingAuthNext?.();
      window.location.href = destination;
    } catch (err) {
      console.error("Unexpected Google One Tap error:", err);
    }
  }

  window.google.accounts.id.initialize({
    client_id: DAS_GOOGLE_CLIENT_ID,
    callback: handleGoogleCredential,
    context: oneTapContext,
    nonce: hashedOneTapNonce,
    ux_mode: "popup",
    auto_select: false,
    cancel_on_tap_outside: true,
    itp_support: true,
    use_fedcm_for_prompt: true,
  });

  window.google.accounts.id.prompt();
}

document.addEventListener("DOMContentLoaded", dasSetupGoogleAuth);

// -----------------------------------------------------------
// Study Preference Counters (OSCE / Packs / Flashcards / Theory / Viva)
// -----------------------------------------------------------
//
// We store simple usage counts in user_metadata:
//   osce_count, packs_count, flashcard_count, theory_count, viva_count
// And a derived field:
//   top_used_category: "osce" | "packs" | "flashcard" | "theory" | "viva"
//
// Use later from Study Builder, e.g.:
//   incrementStudyPreference("osce");
//   incrementStudyPreference("packs");
//
// UI highlighting will be done in separate steps.

const DAS_STUDY_CATEGORIES = ["osce", "packs", "flashcard", "theory", "viva"];

function computeTopUsedCategoryFromMeta(meta) {
  const safeMeta = meta || {};
  let top = safeMeta.top_used_category || null;
  let maxCount = -1;

  DAS_STUDY_CATEGORIES.forEach((cat) => {
    const key = `${cat}_count`;
    const value = typeof safeMeta[key] === "number" ? safeMeta[key] : 0;

    if (value > maxCount) {
      maxCount = value;
      top = cat;
    }
  });

  // If all are zero, keep whatever we had or default to "osce"
  if (!top) {
    top = "osce";
  }

  return top;
}

async function incrementStudyPreference(category) {
  try {
    if (!window.dasSupabase || !window.dasSupabase.auth) return;
    if (!DAS_STUDY_CATEGORIES.includes(category)) {
      console.warn("incrementStudyPreference: invalid category:", category);
      return;
    }

    const { data: userData, error: userError } =
      await window.dasSupabase.auth.getUser();
    if (userError) {
      console.error("incrementStudyPreference getUser error:", userError);
      return;
    }

    const user = userData?.user;
    if (!user) {
      console.warn("incrementStudyPreference: no user found");
      return;
    }

    const meta = user.user_metadata || {};
    const updatedMeta = { ...meta };

    // Normalise counts for all categories
    DAS_STUDY_CATEGORIES.forEach((cat) => {
      const key = `${cat}_count`;
      const current = typeof meta[key] === "number" ? meta[key] : 0;
      updatedMeta[key] = current;
    });

    // Increment the requested category
    const counterKey = `${category}_count`;
    updatedMeta[counterKey] = (updatedMeta[counterKey] || 0) + 1;

    // Recompute top_used_category
    updatedMeta.top_used_category = computeTopUsedCategoryFromMeta(updatedMeta);

    // Update last active timestamp
    updatedMeta.last_active_at = new Date().toISOString();

    const { error: updateError } = await window.dasSupabase.auth.updateUser({
      data: updatedMeta,
    });

    if (updateError) {
      console.error("incrementStudyPreference updateUser error:", updateError);
    }
  } catch (err) {
    console.error("incrementStudyPreference failed:", err);
  }
}

// Optional: helper to read the current usage summary (for future UI)
async function getStudyPreferenceSummary() {
  if (!window.dasSupabase || !window.dasSupabase.auth) return null;

  const { data: userData, error } = await window.dasSupabase.auth.getUser();
  if (error) {
    console.error("getStudyPreferenceSummary getUser error:", error);
    return null;
  }

  const user = userData?.user;
  if (!user) return null;

  const meta = user.user_metadata || {};
  const summary = {
    osce_count: typeof meta.osce_count === "number" ? meta.osce_count : 0,
    packs_count: typeof meta.packs_count === "number" ? meta.packs_count : 0,
    flashcard_count:
      typeof meta.flashcard_count === "number" ? meta.flashcard_count : 0,
    theory_count: typeof meta.theory_count === "number" ? meta.theory_count : 0,
    viva_count: typeof meta.viva_count === "number" ? meta.viva_count : 0,
    top_used_category: computeTopUsedCategoryFromMeta(meta),
    last_active_at: meta.last_active_at || null,
  };

  return summary;
}

// Expose helpers for other scripts (Study Builder, etc.)
window.dasStudyPrefs = {
  increment: incrementStudyPreference,
  summary: getStudyPreferenceSummary,
};
