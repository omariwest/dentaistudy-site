// Mobile menu panel
const menuToggle = document.querySelector(".menu-toggle");
const slideNav = document.querySelector(".slide-nav");
const slideNavBackdrop = document.querySelector(".slide-nav-backdrop");
const slideNavClose = document.querySelector(".slide-nav-close");

function setMobileMenu(open) {
  if (!menuToggle || !slideNav || !slideNavBackdrop) return;

  slideNav.classList.toggle("active", open);
  slideNavBackdrop.classList.toggle("active", open);
  menuToggle.classList.toggle("is-open", open);
  document.body.classList.toggle("mobile-menu-open", open);
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
}

function closeMobileMenu() {
  setMobileMenu(false);
}

if (menuToggle && slideNav && slideNavBackdrop) {
  menuToggle.setAttribute("aria-expanded", "false");

  menuToggle.addEventListener("click", () => {
    setMobileMenu(!slideNav.classList.contains("active"));
  });

  slideNavBackdrop.addEventListener("click", closeMobileMenu);
  slideNavClose?.addEventListener("click", closeMobileMenu);

  slideNav.addEventListener("click", (event) => {
    if (event.target.closest("a, button")) closeMobileMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMobileMenu();
  });

  window
    .matchMedia("(min-width: 901px)")
    .addEventListener("change", closeMobileMenu);
}

// Header intentionally scrolls with the page.

// FAQ toggle
document.querySelectorAll(".faq-item").forEach((item) => {
  const btn = item.querySelector(".faq-question");
  if (!btn) return;
  btn.addEventListener("click", () => {
    item.classList.toggle("open");
  });
});

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)",
).matches;

// Landing workflow walkthrough
document.querySelectorAll("[data-workflow-walkthrough]").forEach((block) => {
  const tabs = Array.from(block.querySelectorAll("[data-workflow-step]"));
  const panels = Array.from(block.querySelectorAll("[data-workflow-panel]"));

  let activeIndex = 0;

  function activateWorkflowStep(step, shouldScrollTab = false) {
    const nextIndex = tabs.findIndex(
      (tab) => tab.dataset.workflowStep === step,
    );
    activeIndex = nextIndex >= 0 ? nextIndex : 0;

    tabs.forEach((tab, index) => {
      const isActive = index === activeIndex;

      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.workflowPanel === step;

      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (shouldScrollTab) {
      tabs[activeIndex]?.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateWorkflowStep(tab.dataset.workflowStep, true);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;
      tabs[nextIndex].focus();
      activateWorkflowStep(tabs[nextIndex].dataset.workflowStep, true);
    });
  });

  activateWorkflowStep(tabs[0]?.dataset.workflowStep || "1");
});

// Landing output studio
document.querySelectorAll("[data-output-studio]").forEach((studio) => {
  const tabs = Array.from(studio.querySelectorAll("[data-output-tab]"));
  const panels = Array.from(studio.querySelectorAll("[data-output-panel]"));

  function activateOutputPanel(target, shouldScrollTab = false) {
    const activeTab = tabs.find((tab) => tab.dataset.outputTab === target);

    tabs.forEach((tab) => {
      const isActive = tab.dataset.outputTab === target;

      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    panels.forEach((panel) => {
      const isActive = panel.dataset.outputPanel === target;

      panel.classList.toggle("is-active", isActive);
      panel.hidden = !isActive;
    });

    if (shouldScrollTab && activeTab?.parentElement) {
      const rail = activeTab.parentElement;
      const targetLeft =
        activeTab.offsetLeft - (rail.clientWidth - activeTab.clientWidth) / 2;

      rail.scrollTo({
        left: targetLeft,
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    }
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      activateOutputPanel(tab.dataset.outputTab, true);
    });

    tab.addEventListener("keydown", (event) => {
      if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;

      event.preventDefault();

      const direction = event.key === "ArrowRight" ? 1 : -1;
      const nextIndex = (index + direction + tabs.length) % tabs.length;

      tabs[nextIndex].focus();
      activateOutputPanel(tabs[nextIndex].dataset.outputTab, true);
    });
  });

  activateOutputPanel(tabs[0]?.dataset.outputTab || "notes");
});

// Landing testimonial marquee
(() => {
  if (prefersReducedMotion) return;

  const SPEED = 0.5;

  document.querySelectorAll(".testimonials-row").forEach((row) => {
    const track = row.querySelector(".testimonials-track");
    if (!track) return;

    const isReverse = row.classList.contains("testimonials-row--reverse");
    let pos = 0;
    let rafId = null;
    let isDragging = false;
    let dragStartX = 0;
    let dragStartPos = 0;

    function loopWidth() {
      return track.scrollWidth / 2;
    }

    function wrapPos(p) {
      const lw = loopWidth();
      if (!lw) return p;
      return ((p % lw) + lw) % lw;
    }

    function applyPos() {
      track.style.transform = `translateX(${-pos}px)`;
    }

    function tick() {
      pos = wrapPos(pos + (isReverse ? -SPEED : SPEED));
      applyPos();
      rafId = requestAnimationFrame(tick);
    }

    requestAnimationFrame(() => {
      pos = isReverse ? loopWidth() : 0;
      applyPos();
      rafId = requestAnimationFrame(tick);
    });

    row.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      cancelAnimationFrame(rafId);
      rafId = null;
      isDragging = true;
      dragStartX = e.clientX;
      dragStartPos = pos;
      row.classList.add("is-dragging");
      row.setPointerCapture(e.pointerId);
    });

    row.addEventListener("pointermove", (e) => {
      if (!isDragging) return;
      pos = wrapPos(dragStartPos + (dragStartX - e.clientX));
      applyPos();
    });

    function stopDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      row.classList.remove("is-dragging");
      row.releasePointerCapture(e.pointerId);
      rafId = requestAnimationFrame(tick);
    }

    row.addEventListener("pointerup", stopDrag);
    row.addEventListener("pointercancel", stopDrag);
  });
})();

// Landing reveal motion
(() => {
  const revealItems = document.querySelectorAll(
    ".hero-grid, [data-workflow-walkthrough], .output-studio-section, .testimonials-section, .faq-item",
  );

  if (!revealItems.length) return;

  revealItems.forEach((item) => {
    item.classList.add("landing-reveal");
  });

  if (prefersReducedMotion || !("IntersectionObserver" in window)) {
    revealItems.forEach((item) => {
      item.classList.add("is-visible");
    });
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.16 },
  );

  revealItems.forEach((item) => {
    observer.observe(item);
  });
})();

// Copy buttons (for result cards)
document.querySelectorAll(".copy-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const card = btn.closest(".result-card");
    if (!card) return;

    const text = card.innerText.replace("Copy", "").trim();

    navigator.clipboard.writeText(text).then(() => {
      const original = btn.textContent;
      btn.classList.add("copied");
      btn.textContent = "Copied";

      setTimeout(() => {
        btn.classList.remove("copied");
        btn.textContent = original;
      }, 1500);
    });
  });
});

// Blog advertisement loader
(() => {
  const blogBody = document.querySelector("article.blog-body");
  if (!blogBody) return;

  const slots = Array.from(
    document.querySelectorAll(".blog-ad-slot[data-ad-position]"),
  );
  const nativeMount = document.querySelector(".blog-native-ad__mount");

  const isMobile = window.matchMedia("(max-width: 799px)").matches;

  const bannerConfigs = {
    1: isMobile
      ? {
          key: "943a7a0511bd45e05437c89b19845873",
          width: 320,
          height: 50,
          src: "https://www.highperformanceformat.com/943a7a0511bd45e05437c89b19845873/invoke.js",
        }
      : {
          key: "047c9fc095c58faee17f632f468b251f",
          width: 728,
          height: 90,
          src: "https://www.highperformanceformat.com/047c9fc095c58faee17f632f468b251f/invoke.js",
        },
    2: isMobile
      ? {
          key: "ac210d9330bed410bd59f82703a6eb9a",
          width: 320,
          height: 50,
          src: "https://www.highperformanceformat.com/ac210d9330bed410bd59f82703a6eb9a/invoke.js",
        }
      : {
          key: "3f03578df5a36dee4f0bd3a6ae595987",
          width: 728,
          height: 90,
          src: "https://www.highperformanceformat.com/3f03578df5a36dee4f0bd3a6ae595987/invoke.js",
        },
    3: {
      key: "d494c0c8e0c4a60bc5a65dbc24709442",
      width: 300,
      height: 250,
      src: "https://bauval.org/22/d494c0c8e0c4a60bc5a65dbc24709442",
    },
  };

  function loadBanner(slot, config) {
    return new Promise((resolve) => {
      const mount = slot.querySelector(".blog-ad-slot__mount");
      if (!mount || !config) {
        resolve();
        return;
      }

      window.atOptions = {
        key: config.key,
        format: "iframe",
        height: config.height,
        width: config.width,
        params: {},
      };

      const script = document.createElement("script");
      script.src = config.src;
      script.async = false;
      script.onload = resolve;
      script.onerror = resolve;
      mount.appendChild(script);
    });
  }

  function loadNativeBanner() {
    if (!nativeMount) return;

    const script = document.createElement("script");
    script.src = "https://bauval.org/21/e864f3f9ee9696aafa5c0b2e61dedce6";
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    nativeMount.appendChild(script);
  }

  function loadExternalAd(src) {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.setAttribute("data-cfasync", "false");
    document.body.appendChild(script);
  }

  loadExternalAd("https://bauval.org/14/55a3f7bf9e6f868088e91701f888aedb");
  loadExternalAd("https://abscloud.org/1/558b2b91b83dad9283694412d50ab5c5");

  (async () => {
    for (const slot of slots) {
      await loadBanner(slot, bannerConfigs[slot.dataset.adPosition]);
    }

    loadNativeBanner();
  })();
})();

// Cookie banner
(() => {
  const cookieBanner = document.querySelector(".cookie-banner");
  if (!cookieBanner) return;

  let hasAck = false;
  try {
    hasAck = !!localStorage.getItem("das_cookie_ack");
  } catch (err) {
    // If localStorage is blocked, just show the banner and don't crash
    hasAck = false;
  }

  if (!hasAck) {
    cookieBanner.style.display = "flex";
  }

  const cookieAccept = cookieBanner.querySelector(".cookie-accept");
  if (!cookieAccept) return;

  cookieAccept.addEventListener("click", () => {
    try {
      localStorage.setItem("das_cookie_ack", "1");
    } catch (err) {
      // Ignore storage errors
    }
    cookieBanner.style.display = "none";
  });
})();

// Pricing page – handle plan buttons
(() => {
  const planButtons = document.querySelectorAll("[data-pricing-plan]");
  if (!planButtons.length) return;

  /**
   * Provider-neutral checkout URL map.
   * Later, we can set these to:
   * - a Payoneer hosted checkout URL (if static)
   * - OR your internal checkout page (recommended): "checkout.html?plan=pro"
   */
  const checkoutUrls = {
    pro: null,
    pro_yearly: null,
  };

  async function handlePlanClick(event) {
    event.preventDefault();

    const btn = event.currentTarget;
    const plan = btn.getAttribute("data-pricing-plan") || "pro";
    const isFreePlan = plan === "free";

    // If Supabase client is missing, fallback to signup
    if (!window.dasSupabase || !window.dasSupabase.auth) {
      const url = new URL("signup.html", window.location.origin);
      url.searchParams.set("plan", plan);
      window.location.href = url.toString();
      return;
    }

    let sessionRes;
    try {
      sessionRes = await window.dasSupabase.auth.getSession();
    } catch (err) {
      const url = new URL("signup.html", window.location.origin);
      url.searchParams.set("plan", plan);
      window.location.href = url.toString();
      return;
    }

    const session = sessionRes && sessionRes.data && sessionRes.data.session;
    if (!session) {
      // Not logged in → go to signup with plan hint
      const url = new URL("signup.html", window.location.origin);
      url.searchParams.set("plan", plan);
      window.location.href = url.toString();
      return;
    }

    const user = session.user;
    const meta = (user && user.user_metadata) || {};
    const appMeta = (user && user.app_metadata) || {};
    const tier = appMeta.subscription_tier || meta.subscription_tier || "free";
    const partnerProUntil = String(appMeta.partner_pro_until || "").trim();
    const partnerProExpiresAt = partnerProUntil
      ? new Date(`${partnerProUntil}T23:59:59.999Z`).getTime()
      : NaN;
    const hasPartnerPro =
      Number.isFinite(partnerProExpiresAt) && partnerProExpiresAt >= Date.now();
    const isPaid = tier === "pro" || tier === "pro_yearly" || hasPartnerPro;

    // Free plan button: logged-in users go straight to Study builder
    if (isFreePlan) {
      window.location.href = "study.html";
      return;
    }

    // Already paid users → send to Settings (manage plan)
    if (isPaid) {
      window.location.href = "settings.html";
      return;
    }

    // Logged-in free user clicking Pro/Pro Yearly:
    // 1) If a direct checkout URL is configured, go there
    const directUrl = checkoutUrls[plan];
    if (typeof directUrl === "string" && directUrl.length > 0) {
      window.location.href = directUrl;
      return;
    }

    return; // Paddle handled by assets/js/paddle-checkout.js
  }

  planButtons.forEach((btn) => {
    btn.addEventListener("click", handlePlanClick);
  });
})();
