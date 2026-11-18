document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("signup-form");
  if (!form || !window.dasSupabase) return;

  const fullNameInput = document.getElementById("signup-fullname");
  const emailInput = document.getElementById("signup-email");
  const passwordInput = document.getElementById("signup-password");
  const messageEl = document.getElementById("signup-message");
  const passwordToggleButtons = document.querySelectorAll(
    "[data-auth-password-toggle]",
  );

  function showMessage(text, type = "info") {
    if (!messageEl) return;
    messageEl.textContent = text;
    messageEl.style.color =
      type === "error" ? "#b91c1c" : type === "success" ? "#15803d" : "#4b5563";
  }

  function bindPasswordToggles() {
    passwordToggleButtons.forEach((btn) => {
      const input = document.getElementById(btn.dataset.authPasswordToggle);
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
  }

  bindPasswordToggles();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!window.dasSupabase || !window.dasSupabase.auth) return;

    const fullName = (fullNameInput?.value || "").trim();
    const email = (emailInput?.value || "").trim();
    const password = passwordInput?.value || "";

    if (!fullName || !email || !password) {
      showMessage("Please fill in all fields.", "error");
      return;
    }

    // No domain restrictions — allow all valid emails
    showMessage("Creating your account...");

    try {
      const { data, error } = await window.dasSupabase.auth.signUp({
        email,
        password,
        options: {
          // 🔹 User metadata stored on signup
          data: {
            full_name: fullName,
            default_level: "undergraduate", // safe default

            // initial favorite subjects (can be updated later in Supabase or Settings)
            favorite_subjects: ["operative", "endodontics", "orthodontics"],

            // initial preferred output styles (can be updated later)
            // valid slugs: "bullet_points", "osce_checklists", "short_notes"
            preferred_output_styles: [
              "bullet_points",
              "osce_checklists",
              "short_notes",
            ],
          },
        },
      });

      if (error) {
        console.error("Signup error:", error);

        const raw = (error.message || "").toLowerCase();
        let friendly = "Signup failed. Please try again.";

        if (raw.includes("user already registered")) {
          friendly =
            "An account already exists with this email. Log in instead.";
        } else if (raw.includes("password")) {
          friendly = "Please choose a slightly stronger password.";
        }

        showMessage(friendly, "error");
        return;
      }

      console.log("Signup data:", data);

      // Some projects require email confirmation (no active session).
      // Others allow instant login (session is returned).
      const hasActiveSession = !!data?.session && !!data?.user;

      if (hasActiveSession) {
        // Email confirmation is OFF → user is already logged in.
        showMessage(
          "Account created. Redirecting to your study workspace...",
          "success",
        );
        setTimeout(() => {
          const destination =
            window.dasGetSafeAuthNext?.("study.html") || "study.html";
          window.dasClearPendingAuthNext?.();
          window.location.href = destination;
        }, 1200);
      } else {
        // Email confirmation is ON → tell user to check email.
        showMessage(
          "Account created. Please check your email to confirm your account.",
          "success",
        );
      }
    } catch (err) {
      console.error("Unexpected signup error:", err);
      showMessage("Something went wrong. Please try again.", "error");
    }
  });
});
