// assets/js/hamburger-legacy.js
(() => {
  const menuToggle = document.querySelector(".menu-toggle");
  const slideNav = document.querySelector(".slide-nav");
  const backdrop = document.querySelector(".slide-nav-backdrop");

  function closeMenu() {
    slideNav?.classList.remove("active");
    backdrop?.classList.remove("active");
    menuToggle?.classList.remove("is-open");
  }

  function toggleMenu() {
    if (!slideNav || !backdrop || !menuToggle) return;
    const willOpen = !slideNav.classList.contains("active");
    slideNav.classList.toggle("active", willOpen);
    backdrop.classList.toggle("active", willOpen);
    menuToggle.classList.toggle("is-open", willOpen);
  }

  if (menuToggle && slideNav && backdrop) {
    menuToggle.addEventListener("click", toggleMenu);
    backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeMenu();
    });
    slideNav.addEventListener("click", (e) => {
      const a = e.target.closest?.("a");
      if (a) closeMenu();
    });
  }

  // Header hide/show on scroll (mobile only)
  const header = document.querySelector(".site-header");
  const mq = window.matchMedia("(max-width: 900px)");
  if (!header) return;

  let lastY = window.scrollY || 0;
  let lastToggleY = lastY;
  let hidden = false;
  let ticking = false;

  const HIDE_AFTER_PX = 24;
  const SHOW_AFTER_PX = 18;
  const TOP_SAFE_PX = 8;

  function setHidden(next) {
    if (hidden === next) return;
    hidden = next;
    header.classList.toggle("is-hidden", next);
    lastToggleY = lastY;
  }

  function compute() {
    if (!mq.matches) {
      setHidden(false);
      lastY = window.scrollY || 0;
      lastToggleY = lastY;
      ticking = false;
      return;
    }

    const y = window.scrollY || 0;
    const dy = y - lastY;

    if (y <= TOP_SAFE_PX) {
      setHidden(false);
    } else if (dy > 0) {
      if (y - lastToggleY >= HIDE_AFTER_PX) setHidden(true);
    } else if (dy < 0) {
      if (lastToggleY - y >= SHOW_AFTER_PX) setHidden(false);
    }

    lastY = y;
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(compute);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  mq.addEventListener?.("change", compute);
  compute();
})();
