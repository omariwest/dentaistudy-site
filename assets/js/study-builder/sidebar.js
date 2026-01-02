// assets/js/study-builder/sidebar.js
// Chats panel wiring (mobile + desktop): open/close + backdrop + ESC + search filter.
// NOTE: This intentionally excludes the NEW hamburger/#sidebar drawer system to avoid conflicts.

(() => {
  const moreBtn = document.getElementById("btnMore");
  const chatsPanel = document.getElementById("chatsPanel");
  const chatsPanelBody = document.getElementById("chatsPanelBody");
  const chatsPanelContent = document.getElementById("chatsPanelContent");
  const chatsSearch = document.getElementById("chatsSearch");
  const chatsPanelClose = document.getElementById("chatsPanelClose");
  const backdrop = document.getElementById("backdrop");

  const chatsSlot = document.getElementById("sbChatsSlot");
  const chatsSection = document.querySelector(".sb-section");

  let hideTimer = null;

  function filterChats(query) {
    const q = (query || "").trim().toLowerCase();
    const list = document.getElementById("chatList");
    if (!list) return;

    list.querySelectorAll(".sb-chat").forEach((b) => {
      const label = (b.textContent || "").trim().toLowerCase();
      b.hidden = Boolean(q) && !label.includes(q);
    });
  }

  function ensureChatsInPanel() {
    if (!chatsSection) return;
    const host = chatsPanelContent || chatsPanelBody;
    if (!host) return;
    if (host.contains(chatsSection)) return;
    host.appendChild(chatsSection);
  }

  function ensureChatsInSidebar() {
    if (!chatsSection || !chatsSlot) return;
    if (chatsSlot.contains(chatsSection)) return;
    chatsSlot.appendChild(chatsSection);
  }

  function closeLegacyMenuIfOpen() {
    document.querySelector(".slide-nav")?.classList.remove("active");
    document.querySelector(".slide-nav-backdrop")?.classList.remove("active");
    document.querySelector(".menu-toggle")?.classList.remove("is-open");
  }

  function openChats() {
    if (!chatsPanel) return;

    closeLegacyMenuIfOpen();
    ensureChatsInPanel();

    if (chatsSearch) {
      chatsSearch.value = "";
      filterChats("");
    }

    chatsPanel.hidden = false;
    chatsPanel.classList.add("open");
    if (backdrop) backdrop.hidden = false;
    moreBtn?.setAttribute("aria-expanded", "true");
    document.documentElement.style.overflow = "hidden";
  }

  function closeChats() {
    if (!chatsPanel) return;

    chatsPanel.classList.remove("open");
    moreBtn?.setAttribute("aria-expanded", "false");

    if (chatsSearch) {
      chatsSearch.value = "";
      filterChats("");
    }

    ensureChatsInSidebar();

    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => {
      chatsPanel.hidden = true;
      if (backdrop) backdrop.hidden = true;
      document.documentElement.style.overflow = "";
    }, 220);
  }

  // Topbar "..." (Chats)
  moreBtn?.addEventListener("click", () => {
    chatsPanel?.classList.contains("open") ? closeChats() : openChats();
  });

  // Desktop sidebar "Search chats" button
  document.addEventListener("click", (e) => {
    const searchBtn = e.target.closest('[data-action="search"]');
    if (searchBtn) {
      chatsPanel?.classList.contains("open") ? closeChats() : openChats();
      return;
    }
  });

  chatsPanelClose?.addEventListener("click", closeChats);
  chatsSearch?.addEventListener("input", (e) => filterChats(e.target.value));

  backdrop?.addEventListener("click", closeChats);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeChats();
  });

  // Close panel after selecting a chat on small screens (keeps UX tidy)
  chatsPanel?.addEventListener("click", (e) => {
    const chat = e.target.closest(".sb-chat");
    if (chat) closeChats();
  });

  // Ensure panel isn't stuck open when resizing up
  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 1025px)").matches) {
      closeChats();
      ensureChatsInSidebar();
    }
  });

  window.ChatsPanelUI = { open: openChats, close: closeChats };
})();
