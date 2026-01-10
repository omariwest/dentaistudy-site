console.log("[auth-guard] LOADED FILE v3.1 on", window.location.href);

// DentAIstudy - Auth guard + header/menu UI + user metadata
// ---------------------------------------------------------------------
// Responsibilities
// ---------------------------------------------------------------------
// - Read Supabase session + fresh user (handles stale JWT / Google re-login)
// - Derive subscription_tier from app_metadata (then user_metadata)
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

document.addEventListener("DOMContentLoaded", async () => {
  const path = window.location.pathname || "";
  const fileName = path.split("/").pop() || "index.html";
  const isProfile = fileName === "profile.html";
  const isSettings = fileName === "settings.html";
  const isProtected = isProfile || isSettings;

  try {
    // -------------------------------------------------------------
    // Ensure Supabase client exists
    // -------------------------------------------------------------
    if (!window.dasSupabase || !window.dasSupabase.auth) {
      console.warn("[auth-guard] Supabase client not found on this page");
      updateAuthUI(null);
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
    const lastActive = meta.last_active_at || null;
    const topMode = meta.top_used_category || null;

    // Plan / subscription tier (provider-neutral)
    const subscriptionTier =
      appMeta.subscription_tier || meta.subscription_tier || "free";

    const isPaidPlan =
      subscriptionTier === "pro" || subscriptionTier === "pro_yearly";

    console.log("[auth-guard] derived plan from metadata:", {
      fileName,
      email,
      subscriptionTier,
      fromAppMeta: appMeta.subscription_tier,
      fromUserMeta: meta.subscription_tier,
      isPaidPlan,
    });

    // Favorites and preferred output styles (arrays of slugs)
    const favoriteSubjects = Array.isArray(meta.favorite_subjects)
      ? meta.favorite_subjects
      : [];
    const preferredOutputStyles = Array.isArray(meta.preferred_output_styles)
      ? meta.preferred_output_styles
      : [];

    // -------------------------------------------------------------
    // Fill common workspace header name (top left)
    // -------------------------------------------------------------
    const workspaceNameEl = document.getElementById("das-user-name");
    if (workspaceNameEl && fullName) {
      workspaceNameEl.textContent = fullName;
    }

    // -------------------------------------------------------------
    // Profile page: basic info + counters + preferences card
    // -------------------------------------------------------------
    if (isProfile) {
      // Basic identity
      const profileNameEl = document.getElementById("das-profile-name");
      const profileEmailEl = document.getElementById("das-profile-email");
      const profilePlanBadge = document.getElementById(
        "das-profile-plan-badge"
      );

      if (profileNameEl && fullName) {
        profileNameEl.textContent = fullName;
      }
      if (profileEmailEl && email) {
        profileEmailEl.textContent = email;
      }
      if (profilePlanBadge) {
        if (subscriptionTier === "pro_yearly") {
          profilePlanBadge.textContent = "DentAIstudy Pro yearly plan";
        } else if (subscriptionTier === "pro") {
          profilePlanBadge.textContent = "DentAIstudy Pro plan";
        } else {
          profilePlanBadge.textContent = "DentAIstudy free plan";
        }
      }

      // Study activity numbers
      const packsEl = document.getElementById("das-profile-packs-count");
      const osceEl = document.getElementById("das-profile-osce-count");
      const flashcardEl = document.getElementById(
        "das-profile-flashcard-count"
      );
      const topModeEl = document.getElementById("das-profile-top-mode");
      const lastActiveEl = document.getElementById("das-profile-last-active");
      const starredEl = document.getElementById("das-profile-starred-count");

      if (packsEl) packsEl.textContent = packsCount;
      if (osceEl) osceEl.textContent = osceCount;
      if (flashcardEl) flashcardEl.textContent = flashcardCount;
      if (starredEl) starredEl.textContent = starredCount;

      if (topModeEl) {
        let label = "";
        switch (topMode) {
          case "osce":
            label = "OSCE flows";
            break;
          case "viva":
            label = "Viva questions";
            break;
          case "theory":
            label = "Theory questions";
            break;
          case "packs":
            label = "Study packs";
            break;
          case "flashcard":
          case "flashcards":
            label = "Flashcard decks";
            break;
          default:
            label = "–";
        }
        topModeEl.textContent = label || "–";
      }

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

      // Default level text + chip color
      const defaultLevelEl = document.getElementById(
        "das-profile-default-level"
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
        "das-identity-activity"
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
        } else if (subscriptionTier === "pro") {
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
        "[data-das-profile-preferences-card]"
      );
      const profilePrefsNote = document.getElementById(
        "das-profile-preferences-note"
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
      const settingsDefaultLevelSelect = document.getElementById(
        "settings-default-level"
      );
      const settingsNewPasswordInput = document.getElementById(
        "settings-new-password"
      );
      const settingsSaveBtn = document.getElementById("settings-save-btn");
      const settingsSaveStatus = document.getElementById(
        "settings-save-status"
      );

      // Pre-fill readonly profile info
      if (settingsFullNameInput && fullName) {
        settingsFullNameInput.value = fullName;
      }
      if (settingsEmailInput && email) {
        settingsEmailInput.value = email;
      }

      // Pre-select current default level so Settings matches Profile
      if (settingsDefaultLevelSelect && defaultLevel) {
        settingsDefaultLevelSelect.value = defaultLevel;
      }

      // Handle Save button: update default_level (+ optional password)
      if (settingsSaveBtn && settingsDefaultLevelSelect && settingsSaveStatus) {
        settingsSaveBtn.addEventListener("click", async () => {
          const chosenLevel =
            settingsDefaultLevelSelect.value === "postgraduate"
              ? "postgraduate"
              : "undergraduate";

          const newPassword = settingsNewPasswordInput
            ? settingsNewPasswordInput.value.trim()
            : "";

          settingsSaveStatus.style.opacity = "1";
          settingsSaveStatus.style.color = "#0f3c7d";
          settingsSaveStatus.textContent = "Saving...";

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

            const { error: updateError } = await supabase.auth.updateUser(
              updatePayload
            );

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
    // Settings page: plan label + preferences card + delete account
    // -------------------------------------------------------------
    if (isSettings) {
      const settingsPlanLabel = document.getElementById(
        "das-settings-plan-label"
      );
      const settingsPlanNote = document.getElementById(
        "das-settings-plan-note"
      );
      const settingsPlanUpgrade = document.getElementById(
        "das-settings-plan-upgrade-actions"
      );
      const settingsPlanManage = document.getElementById(
        "das-settings-plan-manage-actions"
      );

      const deleteAccountBtn = document.getElementById("delete-account-btn");
      const deleteAccountStatus = document.getElementById(
        "delete-account-status"
      );

      if (settingsPlanLabel) {
        if (subscriptionTier === "pro_yearly") {
          settingsPlanLabel.textContent = "DentAIstudy Pro yearly plan";
        } else if (subscriptionTier === "pro") {
          settingsPlanLabel.textContent = "DentAIstudy Pro plan";
        } else {
          settingsPlanLabel.textContent = "DentAIstudy free plan";
        }
      }

      if (settingsPlanNote && settingsPlanUpgrade && settingsPlanManage) {
        if (isPaidPlan) {
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

      // Settings Study preferences card (lock / unlock)
      const settingsPrefsCard = document.querySelector(
        "[data-das-settings-preferences-card]"
      );
      const settingsPrefsNote = document.getElementById(
        "das-settings-preferences-note"
      );

      if (settingsPrefsCard) {
        if (isPaidPlan) {
          settingsPrefsCard.style.opacity = "1";
          settingsPrefsCard.style.background = "#ffffff";
          settingsPrefsCard.style.pointerEvents = "auto";
        } else {
          settingsPrefsCard.style.opacity = "0.8";
          settingsPrefsCard.style.background = "#f3f4f6";
          settingsPrefsCard.style.pointerEvents = "none";
        }
      }
      if (settingsPrefsNote) {
        settingsPrefsNote.style.display = isPaidPlan ? "none" : "block";
      }

      // Delete account → automatic via Supabase Edge Function
      if (deleteAccountBtn && deleteAccountStatus) {
        deleteAccountBtn.addEventListener("click", async (event) => {
          event.preventDefault();

          const confirmed = window.confirm(
            "Are you sure you want to delete your DentAIstudy account? This will permanently remove your study activity and preferences."
          );
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
                result
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
        const slug = pill.getAttribute("data-das-subject-pill");

        pill.style.background = "#f3f4f6";
        pill.style.color = "#4b5563";

        if (isPaidPlan && topFavorites.includes(slug)) {
          pill.style.background = "#f3f4ff";
          pill.style.color = "#4f46e5";
        }
      });
    }

    const outputPills = document.querySelectorAll("[data-das-output-pill]");
    if (outputPills.length) {
      outputPills.forEach((pill) => {
        const slug = pill.getAttribute("data-das-output-pill");

        pill.style.background = "#f3f4f6";
        pill.style.color = "#4b5563";

        if (isPaidPlan && preferredOutputStyles.includes(slug)) {
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
    updateAuthUI(null);

    if (isProtected) {
      window.location.replace("login.html");
    }
  }
});

// ---------------------------------------------------------------------
// Toggle header + slide menu between Log in / Log out
// ---------------------------------------------------------------------
function updateAuthUI(session) {
  const isLoggedIn = !!session;

  const pathname = (window.location.pathname || "").toLowerCase();
  const isInBlogsFolder = pathname.includes("/blogs/");
  const loginHref = isInBlogsFolder ? "../login.html" : "login.html";

  // Desktop header buttons
  const headerLogin = document.querySelector(".header-right .header-login");
  const headerSignup = document.querySelector(".header-right .header-signup");

  // Mobile slide menu link
  const slideLoginLink = document.querySelector(".slide-nav .slide-login-link");

  // Header (desktop)
  if (headerLogin) {
    if (isLoggedIn) {
      headerLogin.textContent = "Log out";
      headerLogin.removeAttribute("href");
      headerLogin.setAttribute("data-das-logout", "true");
    } else {
      headerLogin.textContent = "Log in";
      headerLogin.setAttribute("href", loginHref);
      headerLogin.removeAttribute("data-das-logout");
    }
  }

  if (headerSignup) {
    if (isLoggedIn) {
      headerSignup.style.display = "none";
    } else {
      headerSignup.style.display = "";
      headerSignup.setAttribute("href", "signup.html");
    }
  }

  // Slide menu (mobile)
  if (slideLoginLink) {
    if (isLoggedIn) {
      slideLoginLink.textContent = "Log out";
      slideLoginLink.setAttribute("href", "#");
      slideLoginLink.setAttribute("data-das-logout", "true");
    } else {
      slideLoginLink.textContent = "Log in";
      slideLoginLink.setAttribute("href", loginHref);
      slideLoginLink.removeAttribute("data-das-logout");
    }
  }
}
