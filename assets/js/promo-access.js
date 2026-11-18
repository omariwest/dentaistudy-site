document.addEventListener("DOMContentLoaded", async () => {
  const titleEl = document.getElementById("promo-title");
  const subtitleEl = document.getElementById("promo-subtitle");
  const primaryEl = document.getElementById("promo-primary");
  const secondaryEl = document.getElementById("promo-secondary");
  const secondaryLinkEl = document.getElementById("promo-secondary-link");
  const noteEl = document.getElementById("promo-note");

  if (
    !titleEl ||
    !subtitleEl ||
    !primaryEl ||
    !secondaryEl ||
    !secondaryLinkEl ||
    !window.dasSupabase
  ) {
    return;
  }

  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim().toUpperCase();
  const functionsBase = String(window.dasSupabaseFunctionsBase || "").replace(
    /\/$/,
    "",
  );
  const endpoint = functionsBase ? `${functionsBase}/promo-redeem` : "";

  const cohortLabels = {
    ORE3FREE: "ORE",
    INBDE3FREE: "INBDE",
    ADC3FREE: "ADC",
  };

  const setPrimary = (label, href) => {
    primaryEl.textContent = label;
    primaryEl.href = href;
    primaryEl.hidden = false;
  };

  const hideSecondary = () => {
    secondaryEl.hidden = true;
  };

  const showSignedOutActions = () => {
    const next = `${window.location.pathname}${window.location.search}`;
    const encodedNext = encodeURIComponent(next);
    setPrimary("Log in to activate", `login.html?next=${encodedNext}`);
    secondaryLinkEl.href = `signup.html?next=${encodedNext}`;
    secondaryEl.hidden = false;
  };

  const showEnded = (message) => {
    titleEl.textContent = "This promotion has ended";
    subtitleEl.textContent =
      message ||
      "This DentAIstudy promotion is no longer accepting new activations.";
    hideSecondary();
    setPrimary("Continue to DentAIstudy", "index.html");
  };

  const showUnavailable = (message) => {
    titleEl.textContent = "Promotion unavailable";
    subtitleEl.textContent =
      message || "This promotion cannot be activated on this account.";
    hideSecondary();
    setPrimary("Continue to DentAIstudy", "study.html");
  };

  const showSuccess = (expiresAt, alreadyActive = false) => {
    const parsed = new Date(expiresAt);
    const expiry = Number.isFinite(parsed.getTime())
      ? parsed.toLocaleDateString(undefined, {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "";

    titleEl.textContent = alreadyActive
      ? "Your promotional Pro access is active"
      : "DentAIstudy Pro is active";
    subtitleEl.textContent = expiry
      ? `You have full Pro access through ${expiry}. No card is connected and there is nothing to cancel.`
      : "Your promotional Pro access is active. No card is connected and there is nothing to cancel.";
    hideSecondary();
    setPrimary("Open Study Suite", "study.html");
    if (noteEl) {
      noteEl.textContent =
        "At the end of the promotional period, your account returns to the normal Free plan unless you choose to subscribe separately.";
    }
  };

  async function callPromo(action, session) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : {}),
      },
      body: JSON.stringify({
        action,
        code,
        utm_source: params.get("utm_source"),
        utm_medium: params.get("utm_medium"),
        utm_campaign: params.get("utm_campaign"),
        utm_content: params.get("utm_content"),
      }),
    });

    const data = await response.json().catch(() => null);
    return { response, data };
  }

  if (!endpoint || !cohortLabels[code]) {
    showEnded("This promotion link is invalid or has expired.");
    return;
  }

  titleEl.textContent = `90 days of DentAIstudy Pro for ${cohortLabels[code]} candidates`;

  try {
    const { data: sessionData } = await window.dasSupabase.auth.getSession();
    const session = sessionData?.session || null;
    const statusResult = await callPromo("status", session);
    const status = statusResult.data;

    if (!statusResult.response.ok || !status) {
      showEnded("This promotion is temporarily unavailable.");
      return;
    }

    if (!status.available) {
      if (status.state === "expired") {
        showEnded(status.message);
      } else {
        titleEl.textContent = "Current promotion allocation claimed";
        subtitleEl.textContent =
          status.message ||
          "The current promotional allocation has been claimed.";
        hideSecondary();
        setPrimary("Continue to DentAIstudy", "index.html");
      }
      return;
    }

    subtitleEl.textContent =
      "Activate 90 days of full DentAIstudy Pro access. No card, no charge, and no automatic renewal.";

    if (!session) {
      showSignedOutActions();
      return;
    }

    subtitleEl.textContent = "Activating your promotional Pro access…";
    hideSecondary();
    primaryEl.hidden = true;

    const redeemResult = await callPromo("redeem", session);
    const result = redeemResult.data;

    if (redeemResult.response.status === 401 || result?.reason === "AUTH_REQUIRED") {
      showSignedOutActions();
      return;
    }

    if (result?.ok) {
      await window.dasSupabase.auth.refreshSession();
      showSuccess(result.expires_at, false);
      return;
    }

    if (
      result?.reason === "ALREADY_USED" &&
      String(result?.code || "").toUpperCase() === code &&
      Date.parse(String(result?.expires_at || "")) > Date.now()
    ) {
      await window.dasSupabase.auth.refreshSession();
      showSuccess(result.expires_at, true);
      return;
    }

    if (result?.reason === "EXPIRED") {
      showEnded(result.message);
      return;
    }

    if (result?.reason === "CAP_REACHED") {
      titleEl.textContent = "Current promotion allocation claimed";
      subtitleEl.textContent =
        result.message ||
        "The current promotional allocation has been claimed.";
      setPrimary("Continue to DentAIstudy", "index.html");
      return;
    }

    if (result?.reason === "NOT_ELIGIBLE") {
      showUnavailable(result.message);
      return;
    }

    if (result?.reason === "ALREADY_USED") {
      showUnavailable(
        "This DentAIstudy account has already used an exam promotion. Promotional access can only be activated once per account.",
      );
      return;
    }

    showUnavailable(
      result?.message ||
        "This promotion could not be activated. Please continue with your current DentAIstudy plan.",
    );
  } catch (error) {
    console.error("[promo-access]", error);
    titleEl.textContent = "Promotion temporarily unavailable";
    subtitleEl.textContent =
      "We couldn't verify this promotion right now. Please try again shortly.";
    hideSecondary();
    setPrimary("Try again", window.location.href);
  }
});
