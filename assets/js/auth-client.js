// auth-client.js
// Global Supabase client for DentAIstudy

const SUPABASE_URL = "https://hlvkbqpesiqjxbastxux.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhsdmticXBlc2lxanhiYXN0eHV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQxNjIwNDksImV4cCI6MjA3OTczODA0OX0.9J_wVXWo_ai2v3sXiQUMpts3k6Ak6zWNBPmU0DfB_ZE";

window.dasSupabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const functionsBaseUrl = SUPABASE_URL.replace(
  ".supabase.co",
  ".functions.supabase.co"
);

// Expose URLs for other scripts (read-only)
window.dasSupabaseUrl = SUPABASE_URL;
window.dasSupabaseFunctionsBase = functionsBaseUrl;
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
// Google OAuth sign-in / sign-up (shared for login + signup)
// -----------------------------------------------------------
function dasSetupGoogleAuth() {
  const client = window.dasSupabase;
  if (!client || !client.auth) return;

  // Where to send users back after Google completes
  // Use current origin so it works on localhost / LAN IP and production domain
  const origin = window.location.origin.replace(/\/$/, "");
  const redirectTo = `${origin}/study.html`;

  const loginBtn = document.getElementById("login-google-btn");
  const signupBtn = document.getElementById("signup-google-btn");

  if (!loginBtn && !signupBtn) return;

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
      // Supabase will redirect automatically on success.
    } catch (err) {
      console.error("Unexpected Google auth error:", err);
      alert("Could not start Google sign-in. Please try again.");
    }
  }

  if (loginBtn) loginBtn.addEventListener("click", handleGoogleClick);
  if (signupBtn) signupBtn.addEventListener("click", handleGoogleClick);
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
