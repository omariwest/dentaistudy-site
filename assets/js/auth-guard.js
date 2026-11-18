console.log("[auth-guard] LOADED FILE v3.1 on", window.location.href);

// DentAIstudy - Auth guard + header/menu UI + user metadata
// ---------------------------------------------------------------------
// Responsibilities
// ---------------------------------------------------------------------
// - Read Supabase session + fresh user (handles stale JWT / Google re-login)
// - Derive subscription_tier from app_metadata
// - Protect profile/settings pages (redirect to login if not authenticated)
// - Fill profile + settings UI with user information
// - Lock / unlock Study Preferences cards based on plan
// - Keep header + slide menu login/logout labels in sync
// - Hook into existing logout handler via [data-das-logout]
// - Handle avatar display + upload (profile photo)
//
// IMPORTANT FIX:
// - Prefer provider-neutral avatar keys first so Google OAuth doesn't override the uploaded avatar.
//   We use:
//     - user_metadata.custom_avatar_url
//     - fallback: user_metadata.avatar_url
//     - fallback: user_metadata.picture

const DAS_STUDY_IDENTITY_CACHE_KEY = "das.study.identity.v1";
const DAS_STUDY_FILES = [
  "study.html",
  "study-notes.html",
  "study-library.html",
  "study-flashcards.html",
  "study-quiz.html",
];

function getDasFileName() {
  return (window.location.pathname || "").split("/").pop() || "index.html";
}

function isDasStudyPage() {
  return DAS_STUDY_FILES.includes(getDasFileName());
}

function isDasProTier(tier) {
  return tier === "pro" || tier === "pro_yearly";
}

function hasActivePartnerPro(appMeta) {
  const value = String(appMeta?.partner_pro_until || "").trim();
  if (!value) return false;

  const expiresAt = new Date(`${value}T23:59:59.999Z`).getTime();
  return Number.isFinite(expiresAt) && expiresAt >= Date.now();
}

function hasActivePromoPro(appMeta) {
  if (appMeta?.promo_program !== true) return false;

  const value = String(appMeta?.promo_pro_until || "").trim();
  if (!value) return false;

  const expiresAt = Date.parse(value);
  return Number.isFinite(expiresAt) && expiresAt >= Date.now();
}

function formatPromoExpiry(appMeta) {
  const value = String(appMeta?.promo_pro_until || "").trim();
  const expiresAt = value ? new Date(value) : null;
  if (!expiresAt || !Number.isFinite(expiresAt.getTime())) return "";

  return expiresAt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function readCachedStudyIdentity() {
  try {
    const raw = localStorage.getItem(DAS_STUDY_IDENTITY_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached || typeof cached !== "object") return null;
    if (!cached.name && !cached.avatarUrl && !cached.tier) return null;

    return cached;
  } catch (_) {
    return null;
  }
}

function writeCachedStudyIdentity(identity) {
  try {
    localStorage.setItem(
      DAS_STUDY_IDENTITY_CACHE_KEY,
      JSON.stringify({
        userId: identity.userId || "",
        name: identity.name || "",
        avatarUrl: identity.avatarUrl || "",
        tier: identity.tier || "free",
        updatedAt: Date.now(),
      }),
    );
  } catch (_) {}
}

function clearCachedStudyIdentity() {
  try {
    localStorage.removeItem(DAS_STUDY_IDENTITY_CACHE_KEY);
  } catch (_) {}
}

function renderStudyIdentity(identity, options = {}) {
  if (!isDasStudyPage()) return;

  const userchip = document.querySelector(".userchip");
  const nameEl = document.getElementById("das-user-name");
  const planBadge = document.getElementById("das-study-plan-badge");
  const avatarTargets = document.querySelectorAll("[data-das-avatar]");

  if (nameEl && identity?.name) {
    nameEl.textContent = identity.name;
  }

  if (identity?.avatarUrl && avatarTargets.length) {
    avatarTargets.forEach((el) => {
      el.src = identity.avatarUrl;
    });
  }

  if (identity?.tier) {
    const isPaidPlan = isDasProTier(identity.tier);
    document.documentElement.dataset.dasPlan = isPaidPlan ? "pro" : "free";

    if (planBadge) {
      const planText = planBadge.querySelector(".sb-plan-text");
      planBadge.dataset.plan = isPaidPlan ? "pro" : "free";
      if (planText) {
        planText.textContent = isPaidPlan ? "Pro Member" : "Free Member";
      }
      planBadge.hidden = false;
    }
  }

  if (options.ready && userchip) {
    userchip.removeAttribute("data-auth-loading");
  }
}

function renderStudyLockCard(status) {
  if (!isDasStudyPage()) return;

  const card = document.querySelector("[data-pro-lock] .pro-lock-card");
  if (!card) return;

  const page = getDasFileName();
  const title = card.querySelector("h1");
  const text = card.querySelector("p");
  const primary = card.querySelector(".pro-lock-actions .study-primary-btn");
  const secondary = card.querySelector(
    ".pro-lock-actions .study-secondary-btn",
  );

  const freeCopy = {
    "study-notes.html": {
      title: "Unlock PDF to notes.",
      text: "Upload your dental material and turn it into clear, exam ready notes built for revision, viva prep, and clinical reasoning.",
    },
    "study-flashcards.html": {
      title: "Unlock flashcards from your notes.",
      text: "Generate active recall decks from saved Notes, then review them for exams, clinics, and revision.",
    },
    "study-quiz.html": {
      title: "Unlock quizzes from your notes.",
      text: "Generate board style questions from saved Notes, then review explanations while weak spots are still fresh.",
    },
  };

  const anonymousCopy = {
    "study-notes.html": {
      title: "PDF notes are Pro.",
      text: "Sign up free to start with Exam Coach. Pro unlocks PDF to notes for revision, viva prep, and clinical reasoning.",
    },
    "study-flashcards.html": {
      title: "Flashcards are Pro.",
      text: "Sign up free to start with Exam Coach. Pro unlocks flashcards from saved Notes for active recall.",
    },
    "study-quiz.html": {
      title: "Quizzes are Pro.",
      text: "Sign up free to start with Exam Coach. Pro unlocks board style quizzes from saved Notes.",
    },
    "study-library.html": {
      title: "Sign up to view your Study Library.",
      text: "Create a free account to save Exam Coach chats. Pro adds Notes, flashcards, and quiz history.",
    },
  };

  const content = status === "free" ? freeCopy[page] : anonymousCopy[page];
  if (!content) return;

  if (title) title.textContent = content.title;
  if (text) text.textContent = content.text;

  if (primary) {
    primary.href = status === "free" ? "pricing.html" : "signup.html";
    primary.textContent = status === "free" ? "Upgrade to Pro" : "Sign up free";
  }

  if (secondary) {
    secondary.href = "study.html";
    secondary.textContent = "Open Exam Coach";
  }
}

function renderStudySidebarCta(status) {
  if (!isDasStudyPage()) return;

  renderStudyLockCard(status);

  const cta = document.querySelector("[data-study-cta]");
  const userchip = document.querySelector(".userchip");
  if (!cta) return;

  const title = cta.querySelector("[data-study-cta-title]");
  const text = cta.querySelector("[data-study-cta-text]");

  if (status === "pro") {
    if (userchip) userchip.hidden = false;
    cta.hidden = true;
    return;
  }

  if (status === "anonymous") {
    if (userchip) userchip.hidden = true;
    cta.href = "signup.html";
    if (title) title.textContent = "Sign up free";
    if (text) {
      text.textContent =
        "Save your Exam Coach chats and keep your study work in one place.";
    }
    cta.hidden = false;
    return;
  }

  if (status === "free") {
    if (userchip) userchip.hidden = false;
    cta.href = "pricing.html";
    if (title) title.textContent = "Upgrade to Pro";
    if (text) {
      text.textContent =
        "Unlock Notes, flashcards, quizzes, and full Library flow.";
    }
    cta.hidden = false;
  }
}

// Instant auth UI — reads Supabase session from localStorage synchronously
(function () {
  try {
    const keys = Object.keys(localStorage);
    const sessionKey = keys.find(
      (k) => k.startsWith("sb-") && k.endsWith("-auth-token"),
    );
    let instantUserId = "";
    let hasInstantSession = false;

    if (sessionKey) {
      const parsed = JSON.parse(localStorage.getItem(sessionKey));
      const instantSession = parsed?.session || parsed;
      instantUserId = instantSession?.user?.id || parsed?.user?.id || "";

      if (instantSession?.access_token) {
        hasInstantSession = true;
        updateAuthUI({ user: {} }); // logged in: swap to "Log out" instantly
      }
    }

    if (isDasStudyPage()) {
      const cachedIdentity = readCachedStudyIdentity();
      const sameCachedUser =
        cachedIdentity &&
        hasInstantSession &&
        (!cachedIdentity.userId ||
          !instantUserId ||
          cachedIdentity.userId === instantUserId);

      if (sameCachedUser) {
        renderStudyIdentity(cachedIdentity, { ready: true });
      }
    }
  } catch (_) {}
})();

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname || "";
  const fileName = path.split("/").pop() || "index.html";
  const isProfile = fileName === "profile.html";
  const isSettings = fileName === "settings.html";
  const isStudyLibrary = fileName === "study-library.html";
  const isStudy = [
    "study.html",
    "study-notes.html",
    "study-library.html",
    "study-flashcards.html",
    "study-quiz.html",
  ].includes(fileName);
  const isProtected = isProfile || isSettings;
  const isAccountPage = isProfile || isSettings;
  const revealAccountPage = () => {
    if (isAccountPage) {
      document.body?.classList.remove("account-auth-loading");
    }
  };
  // Account confirmation modal
  function getDasModalEls() {
    const overlay = document.getElementById("dasModalOverlay");
    const title = document.getElementById("dasModalTitle");
    const message = document.getElementById("dasModalMessage");
    const input = document.getElementById("dasModalInput");
    const cancelBtn = document.getElementById("dasModalCancelBtn");
    const okBtn = document.getElementById("dasModalOkBtn");

    if (!overlay || !title || !message || !cancelBtn || !okBtn) return null;
    return { overlay, title, message, input, cancelBtn, okBtn };
  }

  function dasConfirm({
    title,
    message,
    okText = "OK",
    cancelText = "Cancel",
    danger = false,
  }) {
    const els = getDasModalEls();
    if (!els) return Promise.resolve(window.confirm(message));

    const { overlay, title: t, message: msg, input, cancelBtn, okBtn } = els;

    return new Promise((resolve) => {
      let done = false;

      function cleanup(result) {
        if (done) return;
        done = true;

        overlay.hidden = true;
        if (input) {
          input.hidden = true;
          input.value = "";
        }

        overlay.removeEventListener("click", onBackdrop);
        cancelBtn.removeEventListener("click", onCancel);
        okBtn.removeEventListener("click", onOk);
        window.removeEventListener("keydown", onKeyDown);

        resolve(result);
      }

      function onBackdrop(e) {
        if (e.target === overlay) cleanup(false);
      }
      function onCancel() {
        cleanup(false);
      }
      function onOk() {
        cleanup(true);
      }
      function onKeyDown(e) {
        if (e.key === "Escape") cleanup(false);
        if (e.key === "Enter") cleanup(true);
      }

      t.textContent = title || "";
      msg.textContent = message || "";
      cancelBtn.textContent = cancelText;
      okBtn.textContent = okText;

      if (input) {
        input.hidden = true;
        input.value = "";
      }

      okBtn.classList.toggle("das-modal__btn--danger", !!danger);
      okBtn.classList.toggle("das-modal__btn--primary", !danger);

      overlay.hidden = false;
      window.requestAnimationFrame(() => okBtn.focus());

      overlay.addEventListener("click", onBackdrop);
      cancelBtn.addEventListener("click", onCancel);
      okBtn.addEventListener("click", onOk);
      window.addEventListener("keydown", onKeyDown);
    });
  }

  try {
    // -------------------------------------------------------------
    // Ensure Supabase client exists
    // -------------------------------------------------------------
    if (!window.dasSupabase || !window.dasSupabase.auth) {
      console.warn("[auth-guard] Supabase client not found on this page");
      updateAuthUI(null);
      renderStudySidebarCta("anonymous");
      if (isProtected) {
        window.location.replace("login.html");
      }
      return;
    }

    const supabase = window.dasSupabase;

    const functionsBase =
      typeof window.dasSupabaseFunctionsBase === "string"
        ? window.dasSupabaseFunctionsBase
        : "";

    // -------------------------------------------------------------
    // Get current session (may be slightly stale)
    // -------------------------------------------------------------
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      console.error("[auth-guard] getSession error:", sessionError);
    }
    const session = sessionData?.session || null;

    // Keep header + slide menu in sync with current auth state
    updateAuthUI(session);

    // -------------------------------------------------------------
    // Get a FRESH user from Supabase
    // -------------------------------------------------------------
    let freshUserData = null;
    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError) {
        console.warn("[auth-guard] getUser error:", userError);
      } else {
        freshUserData = userData;
      }
    } catch (e) {
      console.warn("[auth-guard] getUser threw:", e);
    }

    // -------------------------------------------------------------
    // Choose which user object to trust
    // -------------------------------------------------------------
    const effectiveUser = freshUserData?.user || session?.user || null;

    console.log("[auth-guard] getSession result:", {
      fileName,
      sessionUser: session?.user,
      sessionUserMeta: session?.user?.user_metadata,
      sessionUserAppMeta: session?.user?.app_metadata,
    });

    console.log("[auth-guard] getUser result:", {
      fileName,
      freshUser: freshUserData?.user,
      freshUserMeta: freshUserData?.user?.user_metadata,
      freshUserAppMeta: freshUserData?.user?.app_metadata,
    });

    // If there is no user and this is a protected page → go to login
    if (!effectiveUser) {
      clearCachedStudyIdentity();
      renderStudySidebarCta("anonymous");

      if (isProtected) {
        window.location.replace("login.html");
      }
      return;
    }

    // -------------------------------------------------------------
    // Derive metadata + plan information
    // -------------------------------------------------------------
    const user = effectiveUser;
    const meta = user.user_metadata || {};
    const appMeta = user.app_metadata || {};

    // Update last_active_at on account and Library page loads
    const now = new Date().toISOString();
    if (isProfile || isSettings || isStudyLibrary) {
      const needsUpdate =
        !meta.last_active_at ||
        new Date(now).getTime() - new Date(meta.last_active_at).getTime() >
          60000; // 1 minute threshold

      if (needsUpdate) {
        supabase.auth
          .updateUser({
            data: { ...meta, last_active_at: now },
          })
          .catch((err) =>
            console.warn("[auth-guard] Could not update last_active_at:", err),
          );
      }
    }

    const fullName =
      meta.full_name ||
      meta.name ||
      (user.email ? user.email.split("@")[0] : "") ||
      "";
    const email = user.email || "";

    // IMPORTANT: provider-neutral avatar first
    const avatarUrl =
      meta.custom_avatar_url || meta.avatar_url || meta.picture || "";

    const defaultLevel = meta.default_level || "undergraduate";

    // Study activity / usage
    const packsCount =
      typeof meta.packs_count === "number" ? meta.packs_count : 0;
    const osceCount = typeof meta.osce_count === "number" ? meta.osce_count : 0;
    const flashcardCount =
      typeof meta.flashcard_count === "number" ? meta.flashcard_count : 0;
    const starredCount =
      typeof meta.starred_packs_count === "number"
        ? meta.starred_packs_count
        : typeof meta.starred_count === "number"
          ? meta.starred_count
          : 0;
    const lastActive =
      isProfile || isSettings || isStudyLibrary
        ? now
        : meta.last_active_at || null;
    const topMode = meta.top_used_category || null;

    // Plan / subscription tier (provider-neutral)
    const subscriptionTier = appMeta.subscription_tier || "free";
    const partnerProActive = hasActivePartnerPro(appMeta);
    const promoProActive = hasActivePromoPro(appMeta);
    const isPaidPlan =
      isDasProTier(subscriptionTier) || partnerProActive || promoProActive;
    const isPartnerGrantedPro =
      partnerProActive && !isDasProTier(subscriptionTier);
    const isPromoGrantedPro =
      promoProActive &&
      !partnerProActive &&
      !isDasProTier(subscriptionTier);
    const effectiveTier =
      isPartnerGrantedPro || isPromoGrantedPro ? "pro" : subscriptionTier;

    // Expose the effective entitlement for other modules (composer, etc.)
    window.DentAIUser = { tier: effectiveTier, isPro: isPaidPlan };

    console.log("[auth-guard] derived plan from metadata:", {
      fileName,
      email,
      subscriptionTier,
      fromAppMeta: appMeta.subscription_tier,
      partnerProActive,
      promoProActive,
      isPaidPlan,
    });

    // Favorite subjects and default formats (arrays of slugs)
    const favoriteSubjects = Array.isArray(meta.favorite_subjects)
      ? meta.favorite_subjects
      : [];
    const defaultFormats = Array.isArray(meta.preferred_output_styles)
      ? meta.preferred_output_styles
      : [];

    // -------------------------------------------------------------
    // Fill common workspace header name (top left)
    // -------------------------------------------------------------
    const workspaceNameEl = document.getElementById("das-user-name");
    if (workspaceNameEl && fullName) {
      workspaceNameEl.textContent = fullName;
    }

    // Study builder sidebar: plan badge under the user name
    if (isStudy) {
      document.documentElement.dataset.dasPlan = isPaidPlan ? "pro" : "free";

      const studyPlanBadge = document.getElementById("das-study-plan-badge");
      if (studyPlanBadge) {
        const studyPlanText = studyPlanBadge.querySelector(".sb-plan-text");
        studyPlanBadge.dataset.plan = isPaidPlan ? "pro" : "free";
        if (studyPlanText) {
          studyPlanText.textContent = isPaidPlan ? "Pro Member" : "Free Member";
        } else {
          studyPlanBadge.textContent = isPaidPlan
            ? "Pro Member"
            : "Free Member";
        }
        studyPlanBadge.hidden = false;
      }

      const studyIdentity = {
        userId: user.id,
        name: fullName,
        avatarUrl,
        tier: effectiveTier,
      };
      writeCachedStudyIdentity(studyIdentity);
      renderStudyIdentity(studyIdentity, { ready: true });
      renderStudySidebarCta(isPaidPlan ? "pro" : "free");
    }

    // -------------------------------------------------------------
    // Profile page: basic info + counters + preferences card
    // -------------------------------------------------------------
    if (isProfile) {
      // Basic identity
      const profileNameEl = document.getElementById("das-profile-name");
      const profileEmailEl = document.getElementById("das-profile-email");
      const profilePlanBadge = document.getElementById(
        "das-profile-plan-badge",
      );

      if (profileNameEl && fullName) {
        profileNameEl.textContent = fullName;
      }
      if (profileEmailEl && email) {
        profileEmailEl.textContent = email;
      }
      if (profilePlanBadge) {
        profilePlanBadge.textContent = isPaidPlan ? "Pro plan" : "Free plan";
      }

      // Profile activity: real saved Study Library totals
      const chatCountEl = document.getElementById("das-profile-chat-count");
      const answerCountEl = document.getElementById("das-profile-answer-count");
      const noteCountEl = document.getElementById("das-profile-note-count");
      const deckCountEl = document.getElementById("das-profile-deck-count");
      const quizCountEl = document.getElementById("das-profile-quiz-count");
      const lastActiveEl = document.getElementById("das-profile-last-active");
      const profileActivityOverview = document.querySelector(
        ".profile-library-overview",
      );
      const profileNoteStat = document.querySelector(
        '[data-profile-pro-stat="notes"]',
      );
      const profileDeckStat = document.querySelector(
        '[data-profile-pro-stat="flashcards"]',
      );
      const profileQuizStat = document.querySelector(
        '[data-profile-pro-stat="quizzes"]',
      );

      const setProfileProStatState = (card, countEl, state, countLabel) => {
        if (!card) return;
        const noteEl = card.querySelector(".profile-library-note");

        card.dataset.profileLockState = state;
        if (state === "locked") {
          if (countEl) countEl.textContent = "Pro";
          if (noteEl) noteEl.textContent = "Pro feature";
        } else if (noteEl) {
          noteEl.textContent = countLabel;
        }
      };

      if (profileActivityOverview) {
        profileActivityOverview.dataset.dasPlan = isPaidPlan ? "pro" : "free";
      }

      setProfileProStatState(
        profileNoteStat,
        noteCountEl,
        isPaidPlan ? "active" : "locked",
        "saved notes",
      );

      setProfileProStatState(
        profileDeckStat,
        deckCountEl,
        isPaidPlan ? "active" : "locked",
        "decks",
      );

      setProfileProStatState(
        profileQuizStat,
        quizCountEl,
        isPaidPlan ? "active" : "locked",
        "quizzes",
      );

      if (lastActiveEl) {
        if (lastActive) {
          const d = new Date(lastActive);
          if (!Number.isNaN(d.getTime())) {
            lastActiveEl.textContent = d.toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            });
          } else {
            lastActiveEl.textContent = "–";
          }
        } else {
          lastActiveEl.textContent = "–";
        }
      }

      revealAccountPage();

      if (
        chatCountEl ||
        answerCountEl ||
        noteCountEl ||
        deckCountEl ||
        quizCountEl
      ) {
        if (chatCountEl) chatCountEl.textContent = "—";
        if (answerCountEl) answerCountEl.textContent = "—";
        if (isPaidPlan && noteCountEl) noteCountEl.textContent = "—";
        if (isPaidPlan && deckCountEl) deckCountEl.textContent = "—";
        if (isPaidPlan && quizCountEl) quizCountEl.textContent = "—";

        try {
          const countRequests = [
            supabase
              .from("conversations")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id),

            supabase
              .from("messages")
              .select("id", { count: "exact", head: true })
              .eq("user_id", user.id)
              .eq("role", "assistant"),
          ];

          if (isPaidPlan) {
            countRequests.push(
              supabase
                .from("study_notes")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id),

              supabase
                .from("flashcard_decks")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id),

              supabase
                .from("study_quizzes")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id),
            );
          }

          const [chatResult, answerResult, noteResult, deckResult, quizResult] =
            await Promise.all(countRequests);

          if (chatCountEl && !chatResult.error) {
            chatCountEl.textContent = chatResult.count ?? 0;
          }

          if (answerCountEl && !answerResult.error) {
            answerCountEl.textContent = answerResult.count ?? 0;
          }

          if (isPaidPlan && noteCountEl && noteResult && !noteResult.error) {
            noteCountEl.textContent = noteResult.count ?? 0;
          }

          if (isPaidPlan && deckCountEl && deckResult && !deckResult.error) {
            deckCountEl.textContent = deckResult.count ?? 0;
          }

          if (isPaidPlan && quizCountEl && quizResult && !quizResult.error) {
            quizCountEl.textContent = quizResult.count ?? 0;
          }
        } catch (err) {
          console.warn("[profile] Could not load study library totals:", err);
          if (chatCountEl) chatCountEl.textContent = "–";
          if (answerCountEl) answerCountEl.textContent = "–";
          if (isPaidPlan && noteCountEl) noteCountEl.textContent = "–";
          if (isPaidPlan && deckCountEl) deckCountEl.textContent = "–";
          if (isPaidPlan && quizCountEl) quizCountEl.textContent = "–";
        }
      }

      // Default level text + chip color
      const defaultLevelEl = document.getElementById(
        "das-profile-default-level",
      );
      if (defaultLevelEl) {
        if (defaultLevel === "postgraduate") {
          defaultLevelEl.textContent = "Postgraduate";
        } else if (defaultLevel === "undergraduate") {
          defaultLevelEl.textContent = "Undergraduate";
        } else if (defaultLevel) {
          defaultLevelEl.textContent = defaultLevel;
        } else {
          defaultLevelEl.textContent = "Set your level";
        }

        if (isPaidPlan) {
          defaultLevelEl.style.background = "#eff6ff";
          defaultLevelEl.style.color = "#1d4ed8";
        } else {
          defaultLevelEl.style.background = "#f3f4f6";
          defaultLevelEl.style.color = "#4b5563";
        }
      }

      // Sidebar identity chips (Profile + Study)
      const identityLevelTag = document.getElementById("das-identity-level");
      const identityPlanTag = document.getElementById("das-identity-plan");
      const identityActivityTag = document.getElementById(
        "das-identity-activity",
      );

      // Level chip
      if (identityLevelTag) {
        if (defaultLevel === "postgraduate") {
          identityLevelTag.textContent = "Postgraduate";
        } else if (defaultLevel === "undergraduate") {
          identityLevelTag.textContent = "Undergraduate";
        } else if (defaultLevel) {
          identityLevelTag.textContent = defaultLevel;
        } else {
          identityLevelTag.textContent = "Set your level";
        }
      }

      // Plan chip
      if (identityPlanTag) {
        let planLabel = "Free";
        if (subscriptionTier === "pro_yearly") {
          planLabel = "Pro yearly";
        } else if (isPaidPlan) {
          planLabel = "Pro";
        }
        identityPlanTag.textContent = planLabel;
      }

      // Activity chip (relative)
      if (identityActivityTag) {
        let activityLabel = "New member";

        if (lastActive) {
          const d = new Date(lastActive);
          if (!Number.isNaN(d.getTime())) {
            const now = new Date();
            const diffMs = now.getTime() - d.getTime();
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays <= 0) {
              activityLabel = "Active today";
            } else if (diffDays === 1) {
              activityLabel = "Active yesterday";
            } else if (diffDays < 7) {
              activityLabel = `Active ${diffDays} days ago`;
            } else {
              activityLabel = `Active ${d.toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}`;
            }
          } else {
            activityLabel = "Activity unknown";
          }
        }

        identityActivityTag.textContent = activityLabel;
      }

      // Profile study preferences card (lock/ unlock)
      const profilePrefsCard = document.querySelector(
        "[data-das-profile-preferences-card]",
      );
      const profilePrefsNote = document.getElementById(
        "das-profile-preferences-note",
      );

      if (profilePrefsCard) {
        if (isPaidPlan) {
          profilePrefsCard.style.opacity = "1";
          profilePrefsCard.style.background = "#ffffff";
          profilePrefsCard.style.pointerEvents = "auto";
        } else {
          profilePrefsCard.style.opacity = "0.8";
          profilePrefsCard.style.background = "#f3f4f6";
          profilePrefsCard.style.pointerEvents = "none";
        }
      }
      if (profilePrefsNote) {
        profilePrefsNote.style.display = isPaidPlan ? "none" : "block";
      }
    }

    // -------------------------------------------------------------
    // Settings page: account details + default level
    // -------------------------------------------------------------
    if (isSettings) {
      const settingsFullNameInput =
        document.getElementById("settings-fullname");
      const settingsEmailInput = document.getElementById("settings-email");
      const settingsDefaultLevelInputs = document.querySelectorAll(
        'input[name="settings-default-level"]',
      );
      const settingsNewPasswordInput = document.getElementById(
        "settings-new-password",
      );
      const settingsConfirmPasswordInput = document.getElementById(
        "settings-confirm-password",
      );
      const settingsPasswordNote = document.getElementById(
        "settings-password-note",
      );
      const settingsPasswordToggleBtns = document.querySelectorAll(
        "[data-settings-password-toggle]",
      );
      const settingsSaveBtn = document.getElementById("settings-save-btn");
      const settingsSaveStatus = document.getElementById(
        "settings-save-status",
      );

      // Pre-fill readonly profile info
      if (settingsFullNameInput && fullName) {
        settingsFullNameInput.value = fullName;
      }
      if (settingsEmailInput && email) {
        settingsEmailInput.value = email;
      }
      document.querySelectorAll("[data-das-settings-name]").forEach((el) => {
        if (fullName) el.textContent = fullName;
      });
      document.querySelectorAll("[data-das-settings-email]").forEach((el) => {
        if (email) el.textContent = email;
      });

      // Pre-select current default level so Settings matches Profile
      if (settingsDefaultLevelInputs.length) {
        settingsDefaultLevelInputs.forEach((input) => {
          input.checked = input.value === defaultLevel;
        });
      }
      const isPasswordRecovery =
        window.location.hash.includes("type=recovery") ||
        window.location.search.includes("type=recovery");

      if (
        isPasswordRecovery &&
        settingsPasswordNote &&
        settingsNewPasswordInput
      ) {
        settingsPasswordNote.textContent =
          "Enter your new password, confirm it, then save changes.";
        settingsPasswordNote.style.color = "#0f3c7d";
        settingsNewPasswordInput.focus();
      }

      settingsPasswordToggleBtns.forEach((btn) => {
        const input = document.getElementById(
          btn.dataset.settingsPasswordToggle,
        );

        if (!input) return;

        btn.addEventListener("click", () => {
          const shouldShow = input.type === "password";

          input.type = shouldShow ? "text" : "password";
          btn.classList.toggle("is-visible", shouldShow);
          btn.setAttribute(
            "aria-label",
            shouldShow ? "Hide password" : "Show password",
          );
          btn.setAttribute("aria-pressed", shouldShow ? "true" : "false");
        });
      });

      // Handle Save button: update default_level (+ optional password)
      if (
        settingsSaveBtn &&
        settingsDefaultLevelInputs.length &&
        settingsSaveStatus
      ) {
        settingsSaveBtn.addEventListener("click", async () => {
          const checkedLevelInput = document.querySelector(
            'input[name="settings-default-level"]:checked',
          );

          const chosenLevel =
            checkedLevelInput && checkedLevelInput.value === "postgraduate"
              ? "postgraduate"
              : "undergraduate";

          const newPassword = settingsNewPasswordInput
            ? settingsNewPasswordInput.value.trim()
            : "";

          const confirmPassword = settingsConfirmPasswordInput
            ? settingsConfirmPasswordInput.value.trim()
            : "";

          settingsSaveStatus.style.opacity = "1";
          settingsSaveStatus.style.color = "#0f3c7d";
          settingsSaveStatus.textContent = "Saving...";

          if (newPassword || confirmPassword) {
            if (!newPassword || !confirmPassword) {
              settingsSaveStatus.style.color = "#b91c1c";
              settingsSaveStatus.textContent =
                "Enter and confirm your new password.";
              return;
            }

            if (newPassword !== confirmPassword) {
              settingsSaveStatus.style.color = "#b91c1c";
              settingsSaveStatus.textContent = "Passwords do not match.";
              return;
            }

            if (newPassword.length < 8) {
              settingsSaveStatus.style.color = "#b91c1c";
              settingsSaveStatus.textContent =
                "Password must be at least 8 characters.";
              return;
            }
          }

          try {
            // Preserve all existing metadata, only change default_level
            const updatedMeta = {
              ...meta,
              default_level: chosenLevel,
            };

            const updatePayload = { data: updatedMeta };
            if (newPassword) {
              updatePayload.password = newPassword;
            }

            const { error: updateError } =
              await supabase.auth.updateUser(updatePayload);

            if (updateError) {
              console.error("[settings] updateUser error", updateError);
              settingsSaveStatus.style.color = "#b91c1c";
              settingsSaveStatus.textContent =
                updateError.message || "Could not save settings.";
              return;
            }

            // Reflect change locally for this session
            if (settingsNewPasswordInput) {
              settingsNewPasswordInput.value = "";
            }
            if (settingsConfirmPasswordInput) {
              settingsConfirmPasswordInput.value = "";
            }
            settingsSaveStatus.style.color = "#0f3c7d";
            settingsSaveStatus.textContent = "Settings saved.";

            setTimeout(() => {
              settingsSaveStatus.style.opacity = "0";
            }, 2000);
          } catch (err) {
            console.error("[settings] unexpected error", err);
            settingsSaveStatus.style.color = "#b91c1c";
            settingsSaveStatus.textContent =
              "Something went wrong. Please try again.";
          }
        });
      }
    }

    // -------------------------------------------------------------
    // Settings page: plan label + delete account
    // -------------------------------------------------------------
    if (isSettings) {
      const settingsPlanLabel = document.getElementById(
        "das-settings-plan-label",
      );
      const settingsPlanNote = document.getElementById(
        "das-settings-plan-note",
      );
      const settingsPlanUpgrade = document.getElementById(
        "das-settings-plan-upgrade-actions",
      );
      const settingsPlanManage = document.getElementById(
        "das-settings-plan-manage-actions",
      );
      const partnerBillingMessage =
        "Your Pro access is included with the DentAIstudy Partner Program. No billing action is needed.";
      const promoExpiryLabel = formatPromoExpiry(appMeta);
      const promoBillingMessage = promoExpiryLabel
        ? `Your Pro access is included through a DentAIstudy exam promotion until ${promoExpiryLabel}. Billing and cancellation are unavailable for promotional access. No payment method is connected.`
        : "Your Pro access is included through a DentAIstudy exam promotion. Billing and cancellation are unavailable for promotional access. No payment method is connected.";

      const deleteAccountBtn = document.getElementById("delete-account-btn");
      const deleteAccountStatus = document.getElementById(
        "delete-account-status",
      );

      if (settingsPlanLabel) {
        settingsPlanLabel.textContent = isPaidPlan ? "Pro plan" : "Free plan";
      }
      document
        .querySelectorAll("[data-das-settings-plan-label]")
        .forEach((el) => {
          el.textContent = isPaidPlan ? "Pro plan" : "Free plan";
        });

      if (settingsPlanNote && settingsPlanUpgrade && settingsPlanManage) {
        if (isPartnerGrantedPro) {
          settingsPlanNote.textContent = partnerBillingMessage;
          settingsPlanUpgrade.style.display = "none";
          settingsPlanManage.style.display = "flex";
        } else if (isPromoGrantedPro) {
          settingsPlanNote.textContent = promoBillingMessage;
          settingsPlanUpgrade.style.display = "none";
          settingsPlanManage.style.display = "flex";
        } else if (isPaidPlan) {
          settingsPlanNote.textContent =
            "Your Pro access renews automatically until you cancel.";
          settingsPlanUpgrade.style.display = "none";
          settingsPlanManage.style.display = "flex";
        } else {
          settingsPlanNote.textContent =
            "Upgrade to Pro for higher daily limits and more focused OSCE / Viva study flows.";
          settingsPlanUpgrade.style.display = "flex";
          settingsPlanManage.style.display = "none";
        }
      }

      revealAccountPage();

      // -------------------------------------------------------------
      // Settings page: Paddle billing + Retain cancellation
      // -------------------------------------------------------------
      const manageStatusEl = document.getElementById(
        "das-settings-plan-manage-status",
      );

      const setManageStatus = (msg, isError = false) => {
        if (!manageStatusEl) return;
        manageStatusEl.textContent = msg;
        manageStatusEl.style.color = isError ? "#b91c1c" : "#6b7280";
      };

      const billingBtn = document.querySelector(
        '[data-das-manage-plan="billing"]',
      );
      const cancelBtn = document.querySelector(
        '[data-das-manage-plan="cancel"]',
      );

      if (isPromoGrantedPro) {
        [billingBtn, cancelBtn].forEach((button) => {
          if (!button) return;
          button.disabled = true;
          button.setAttribute("aria-disabled", "true");
          button.title =
            "Unavailable for promotional Pro access. No billing account is connected.";
        });
        setManageStatus(promoBillingMessage);
      }

      // Paddle IDs should be stored by your webhook (see server edit below)
      const paddleCustomerId =
        meta.paddle_customer_id || appMeta.paddle_customer_id || null;

      // After paddleCustomerId/paddleSubscriptionId are computed (inside isSettings block)
      try {
        if (
          window.Paddle &&
          !window.dasPaddleInitialized &&
          !isPartnerGrantedPro &&
          !isPromoGrantedPro
        ) {
          window.Paddle.Initialize({
            token: "live_5dddba89244dee1c26f561c5b75",
            pwCustomer: paddleCustomerId?.startsWith("ctm_")
              ? { id: paddleCustomerId }
              : {}, // per Paddle docs: pass empty object if you don't have customer id
          });
          window.dasPaddleInitialized = true;
        }
      } catch (e) {
        console.error("[retain] Paddle init on app page failed:", e);
      }

      const paddleSubscriptionId =
        meta.paddle_subscription_id || appMeta.paddle_subscription_id || null;

      if (billingBtn) {
        billingBtn.addEventListener("click", async (event) => {
          event.preventDefault();

          if (isPartnerGrantedPro) {
            setManageStatus(partnerBillingMessage);
            return;
          }
          if (isPromoGrantedPro) {
            setManageStatus(promoBillingMessage);
            return;
          }

          if (!functionsBase) {
            setManageStatus(
              "Billing portal is unavailable (missing functions base).",
              true,
            );
            return;
          }
          let resolvedCustomerId = paddleCustomerId;
          let resolvedSubscriptionId = paddleSubscriptionId;

          if (!resolvedCustomerId || !resolvedSubscriptionId) {
            setManageStatus("Resolving billing profile…");

            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();
            if (sessionError || !sessionData?.session?.access_token) {
              setManageStatus("Session expired. Please log in again.", true);
              return;
            }

            const r = await fetch(`${functionsBase}/paddle-resolve-ids`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.paddle_customer_id || !j?.paddle_subscription_id) {
              console.error("[paddle-resolve-ids] failed", r.status, j);
              setManageStatus(
                j?.hint ||
                  "Couldn’t resolve billing profile. Make sure checkout used the same email.",
                true,
              );
              return;
            }

            resolvedCustomerId = j.paddle_customer_id;
            resolvedSubscriptionId = j.paddle_subscription_id;
          }

          billingBtn.disabled = true;
          const oldText = billingBtn.textContent;
          billingBtn.textContent = "Opening...";
          setManageStatus("Opening secure billing portal…");

          try {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();
            if (sessionError || !sessionData?.session?.access_token) {
              setManageStatus("Session expired. Please log in again.", true);
              return;
            }

            const response = await fetch(
              `${functionsBase}/paddle-portal-session`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                  customer_id: resolvedCustomerId,
                  subscription_id: resolvedSubscriptionId,
                  purpose: "update_payment_method",
                }),
              },
            );

            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.url) {
              console.error(
                "[paddle-portal-session] error",
                response.status,
                result,
              );
              setManageStatus("Couldn’t open billing portal. Try again.", true);
              return;
            }

            window.location.href = result.url;
          } catch (err) {
            console.error("[billing] failed", err);
            setManageStatus("Couldn’t open billing portal. Try again.", true);
          } finally {
            billingBtn.disabled = isPromoGrantedPro;
            billingBtn.textContent = oldText;
          }
        });
      }

      if (cancelBtn) {
        cancelBtn.addEventListener("click", async (event) => {
          event.preventDefault();

          if (isPartnerGrantedPro) {
            setManageStatus(partnerBillingMessage);
            return;
          }
          if (isPromoGrantedPro) {
            setManageStatus(promoBillingMessage);
            return;
          }

          const confirmed = await dasConfirm({
            title: "Cancel plan",
            message:
              "Are you sure you want to cancel your Pro plan? You'll keep access until the end of your billing period.",
            okText: "Cancel plan",
            danger: true,
          });
          if (!confirmed) return;

          let resolvedCustomerId = paddleCustomerId;
          let resolvedSubscriptionId = paddleSubscriptionId;

          if (!resolvedCustomerId || !resolvedSubscriptionId) {
            if (!functionsBase) {
              setManageStatus(
                "Cancellation is unavailable (missing functions base).",
                true,
              );
              return;
            }

            setManageStatus("Resolving billing profile…");

            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();
            if (sessionError || !sessionData?.session?.access_token) {
              setManageStatus("Session expired. Please log in again.", true);
              return;
            }

            const r = await fetch(`${functionsBase}/paddle-resolve-ids`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${sessionData.session.access_token}`,
              },
            });

            const j = await r.json().catch(() => null);
            if (!r.ok || !j?.paddle_customer_id || !j?.paddle_subscription_id) {
              console.error("[paddle-resolve-ids] failed", r.status, j);
              setManageStatus(
                j?.hint ||
                  "Couldn't resolve billing profile. Make sure checkout used the same email.",
                true,
              );
              return;
            }

            resolvedCustomerId = j.paddle_customer_id;
            resolvedSubscriptionId = j.paddle_subscription_id;
          }

          cancelBtn.disabled = true;
          const oldText = cancelBtn.textContent;
          cancelBtn.textContent = "Opening...";
          setManageStatus("Opening billing portal…");

          try {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();
            if (sessionError || !sessionData?.session?.access_token) {
              setManageStatus("Session expired. Please log in again.", true);
              return;
            }

            const response = await fetch(
              `${functionsBase}/paddle-portal-session`,
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${sessionData.session.access_token}`,
                },
                body: JSON.stringify({
                  customer_id: resolvedCustomerId,
                  subscription_id: resolvedSubscriptionId,
                  purpose: "cancel_subscription",
                }),
              },
            );

            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.url) {
              console.error(
                "[paddle-portal-session] error",
                response.status,
                result,
              );
              setManageStatus("Couldn't open billing portal. Try again.", true);
              return;
            }

            window.location.href = result.url;
          } catch (err) {
            console.error("[cancel] failed", err);
            setManageStatus("Couldn't open billing portal. Try again.", true);
          } finally {
            cancelBtn.disabled = isPromoGrantedPro;
            cancelBtn.textContent = oldText;
          }
        });
      }

      // Delete account → automatic via Supabase Edge Function
      if (deleteAccountBtn && deleteAccountStatus) {
        deleteAccountBtn.addEventListener("click", async (event) => {
          event.preventDefault();

          const confirmed = await dasConfirm({
            title: "Delete account",
            message:
              "Are you sure you want to delete your DentAIstudy account? This will permanently remove your study activity and preferences.",
            okText: "Delete",
            danger: true,
          });
          if (!confirmed) return;

          if (!functionsBase) {
            deleteAccountStatus.style.opacity = "1";
            deleteAccountStatus.style.color = "#b91c1c";
            deleteAccountStatus.textContent =
              "Account deletion is temporarily unavailable. Please contact support.";
            return;
          }

          deleteAccountBtn.disabled = true;
          deleteAccountBtn.textContent = "Deleting...";
          deleteAccountStatus.style.opacity = "1";
          deleteAccountStatus.style.color = "#0f3c7d";
          deleteAccountStatus.textContent =
            "Deleting your account securely. Please wait...";

          try {
            const { data: sessionData, error: sessionError } =
              await supabase.auth.getSession();

            if (sessionError || !sessionData?.session?.access_token) {
              console.error("[delete-account] getSession error", sessionError);
              deleteAccountStatus.style.color = "#b91c1c";
              deleteAccountStatus.textContent =
                "We couldn't verify your session. Please log in again and try deleting your account.";
              deleteAccountBtn.disabled = false;
              deleteAccountBtn.textContent = "Delete my account";
              return;
            }

            const accessToken = sessionData.session.access_token;
            const endpoint = `${functionsBase}/delete-account`;

            const response = await fetch(endpoint, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
              },
              body: JSON.stringify({
                reason: "user-initiated-from-settings",
              }),
            });

            const result = await response.json().catch(() => null);

            if (!response.ok || !result?.success) {
              console.error(
                "[delete-account] function error",
                response.status,
                result,
              );
              deleteAccountStatus.style.color = "#b91c1c";
              deleteAccountStatus.textContent =
                result?.error ||
                "We couldn't delete your account. Please try again in a moment.";
              deleteAccountBtn.disabled = false;
              deleteAccountBtn.textContent = "Delete my account";
              return;
            }

            deleteAccountStatus.style.color = "#15803d";
            deleteAccountStatus.textContent =
              "Your account has been deleted. Signing you out...";

            try {
              await supabase.auth.signOut();
            } catch (signOutErr) {
              console.warn("[delete-account] signOut error", signOutErr);
            }

            setTimeout(() => {
              window.location.href = "goodbye.html";
            }, 800);
          } catch (err) {
            console.error("[delete-account] unexpected error", err);
            deleteAccountStatus.style.color = "#b91c1c";
            deleteAccountStatus.textContent =
              "Something went wrong. Please try again.";
            deleteAccountBtn.disabled = false;
            deleteAccountBtn.textContent = "Delete my account";
          }
        });
      }
    }

    // Favorite subjects + preferred output style pills
    // -------------------------------------------------------------
    const subjectPills = document.querySelectorAll("[data-das-subject-pill]");
    if (subjectPills.length) {
      const topFavorites = favoriteSubjects.slice(0, 3);

      subjectPills.forEach((pill) => {
        const slug = (pill.getAttribute("data-das-subject-pill") || "").trim();

        pill.style.background = "#f3f4f6";
        pill.style.color = "#4b5563";

        if (isPaidPlan && topFavorites.includes(slug)) {
          pill.style.background = "#f3f4ff";
          pill.style.color = "#4f46e5";
        }
      });
    }

    const formatPills = document.querySelectorAll("[data-das-format-pill]");
    if (formatPills.length) {
      formatPills.forEach((pill) => {
        const slug = (pill.getAttribute("data-das-format-pill") || "").trim();

        pill.style.background = "#f3f4f6";
        pill.style.color = "#4b5563";

        if (isPaidPlan && defaultFormats.includes(slug)) {
          pill.style.background = "#eef2ff";
          pill.style.color = "#4338ca";
        }
      });
    }

    // -------------------------------------------------------------
    // Avatar display (profile + sidebar)
    // -------------------------------------------------------------
    const profileAvatarEl = document.getElementById("das-profile-avatar-main");
    const sidebarAvatarImg = document.querySelector(".sidebar-avatar img");
    const avatarTargets = document.querySelectorAll("[data-das-avatar]");

    if (avatarUrl) {
      if (profileAvatarEl) profileAvatarEl.src = avatarUrl;
      if (sidebarAvatarImg) sidebarAvatarImg.src = avatarUrl;
      if (avatarTargets.length) {
        avatarTargets.forEach((el) => {
          el.src = avatarUrl;
        });
      }
    }
  } catch (err) {
    console.error("[auth-guard] Auth guard failed:", err);
    revealAccountPage();
    updateAuthUI(null);

    if (isProtected) {
      window.location.replace("login.html");
    }
  }
});

// ---------------------------------------------------------------------
// Toggle desktop account control + mobile slide menu
// ---------------------------------------------------------------------
function updateAuthUI(session) {
  const isLoggedIn = !!session;

  const headerRight = document.querySelector(".header-right");
  const headerLogin = headerRight?.querySelector(".header-login");
  const slideNav = document.querySelector(".slide-nav");
  const slideLoginLink = slideNav?.querySelector(".slide-login-link");

  const loginHref =
    headerRight?.dataset.dasLoginHref ||
    headerLogin?.getAttribute("href") ||
    slideLoginLink?.getAttribute("href") ||
    "login.html";

  const rootPrefix = loginHref.includes("login.html")
    ? loginHref.replace(/login\.html.*$/, "")
    : "";

  const signupHref = `${rootPrefix}signup.html`;

  const libraryHref =
    headerRight?.dataset.dasLibraryHref ||
    document
      .querySelector('.header-nav a[href$="study-library.html"]')
      ?.getAttribute("href") ||
    `${rootPrefix}study-library.html`;

  if (headerRight) {
    headerRight.dataset.dasLoginHref = loginHref;
    headerRight.dataset.dasLibraryHref = libraryHref;
  }

  // Desktop header
  if (headerRight) {
    headerRight.hidden = false;

    if (isLoggedIn) {
      headerRight.innerHTML = `
        <details class="das-account-menu">
          <summary class="das-account-trigger" aria-label="Account menu">
            <span class="das-account-dot" aria-hidden="true"></span>
            <span>Account</span>
          </summary>

          <div class="das-account-dropdown" role="menu">
          <a href="${libraryHref}" role="menuitem">Library</a>
            <a href="${rootPrefix}profile.html" role="menuitem">Profile</a>
            <a href="${rootPrefix}settings.html" role="menuitem">Settings</a>
            <button type="button" role="menuitem" data-das-logout>
              Log out
            </button>
          </div>
        </details>
      `;
    } else {
      headerRight.innerHTML = `
        <div class="das-auth-actions">
          <a href="${loginHref}" class="das-login-link">Sign in</a>
          <a href="${signupHref}" class="das-start-link">Start free</a>
        </div>
      `;
    }
  }

  if (!window.__dasAccountMenuOutsideClickBound) {
    window.__dasAccountMenuOutsideClickBound = true;

    document.addEventListener("click", (event) => {
      const openMenu = document.querySelector(".das-account-menu[open]");
      if (!openMenu) return;

      if (!openMenu.contains(event.target)) {
        openMenu.removeAttribute("open");
      }
    });
  }

  // Mobile menu
  if (slideNav) {
    slideNav
      .querySelectorAll('a[href$="profile.html"], a[href$="settings.html"]')
      .forEach((link) => {
        link.hidden = !isLoggedIn;
      });

    const currentAuthSlot =
      slideNav.querySelector(".das-mobile-auth") || slideLoginLink;

    if (currentAuthSlot) {
      const holder = document.createElement("div");

      holder.innerHTML = isLoggedIn
        ? `
          <div class="das-mobile-auth das-mobile-auth--logged-in">
            <button type="button" class="das-mobile-logout" data-das-logout>
              Log out
            </button>
          </div>
        `
        : `
          <div class="das-mobile-auth">
            <a href="${loginHref}" class="das-mobile-secondary">Sign in</a>
            <a href="${signupHref}" class="das-mobile-primary">Start free</a>
          </div>
        `;

      currentAuthSlot.replaceWith(holder.firstElementChild);
    }
  }
}
