// assets/js/study-builder/pro-gate.js
// Shared Study Suite auth, Pro gate, AI helper, and small UI helpers.
(() => {
  "use strict";

  document.documentElement.dataset.dasPlan = "loading";

  const AI_ENDPOINT =
    "https://hlvkbqpesiqjxbastxux.functions.supabase.co/ai-generate";

  const state = {
    supabase: null,
    session: null,
    user: null,
    tier: "free",
    isPro: false,
    readyPromise: null,
  };

  function waitForSupabase() {
    return new Promise((resolve) => {
      if (window.dasSupabase?.auth) {
        resolve(window.dasSupabase);
        return;
      }

      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (window.dasSupabase?.auth || attempts > 80) {
          clearInterval(timer);
          resolve(window.dasSupabase || null);
        }
      }, 50);
    });
  }

  function deriveTier(user) {
    const appMeta = user?.app_metadata || {};
    const tier = appMeta.subscription_tier || "free";
    if (tier === "pro" || tier === "pro_yearly") return tier;

    const partnerProUntil = String(appMeta.partner_pro_until || "").trim();
    const partnerProExpiresAt = partnerProUntil
      ? new Date(`${partnerProUntil}T23:59:59.999Z`).getTime()
      : NaN;
    const hasPartnerPro =
      Number.isFinite(partnerProExpiresAt) &&
      partnerProExpiresAt >= Date.now();

    const promoProUntil = String(appMeta.promo_pro_until || "").trim();
    const promoProExpiresAt =
      appMeta.promo_program === true && promoProUntil
        ? Date.parse(promoProUntil)
        : NaN;
    const hasPromoPro =
      Number.isFinite(promoProExpiresAt) && promoProExpiresAt >= Date.now();

    return hasPartnerPro || hasPromoPro ? "pro" : tier;
  }

  function isProTier(tier) {
    return tier === "pro" || tier === "pro_yearly";
  }

  function setText(id, value) {
    const el = document.getElementById(id);
    if (el && value) el.textContent = value;
  }

  function setAvatar(user) {
    const meta = user?.user_metadata || {};
    const avatarUrl = meta.custom_avatar_url || meta.avatar_url || meta.picture;
    if (!avatarUrl) return;

    document.querySelectorAll("[data-das-avatar]").forEach((img) => {
      img.src = avatarUrl;
    });
  }

  function updateGateUI() {
    const fileName =
      (window.location.pathname || "").split("/").pop() || "index.html";
    const isLibraryPage = fileName === "study-library.html";
    const canViewPanel = state.isPro || (isLibraryPage && state.user);

    document.documentElement.dataset.dasPlan = state.isPro ? "pro" : "free";

    document.querySelectorAll("[data-pro-panel]").forEach((el) => {
      el.hidden = !canViewPanel;
    });

    document.querySelectorAll("[data-pro-lock]").forEach((el) => {
      el.hidden = canViewPanel;
    });

    document.querySelectorAll("[data-pro-action]").forEach((el) => {
      el.disabled = !state.isPro;
    });
  }

  function syncUserUI() {
    const meta = state.user?.user_metadata || {};
    const name =
      meta.full_name ||
      meta.name ||
      (state.user?.email ? state.user.email.split("@")[0] : "");

    setText("das-user-name", name);
    const planBadge = document.getElementById("das-study-plan-badge");
    if (planBadge) {
      if (!state.user) {
        planBadge.hidden = true;
        planBadge.removeAttribute("data-plan");
        return;
      }

      const planText = planBadge.querySelector(".sb-plan-text");
      planBadge.dataset.plan = state.isPro ? "pro" : "free";
      if (planText) {
        planText.textContent = state.isPro ? "Pro Member" : "Free Member";
      } else {
        planBadge.textContent = state.isPro ? "Pro Member" : "Free Member";
      }
      planBadge.hidden = false;
    }
    setAvatar(state.user);
  }

  async function init() {
    state.supabase = await waitForSupabase();

    if (!state.supabase?.auth) {
      syncUserUI();
      updateGateUI();
      return state;
    }

    try {
      const { data: sessionData } = await state.supabase.auth.getSession();
      state.session = sessionData?.session || null;

      const { data: userData } = await state.supabase.auth.getUser();
      state.user = userData?.user || state.session?.user || null;
      state.tier = deriveTier(state.user);
      state.isPro = isProTier(state.tier);
    } catch {
      state.session = null;
      state.user = null;
      state.tier = "free";
      state.isPro = false;
    }

    syncUserUI();
    updateGateUI();
    return state;
  }

  function ready() {
    if (!state.readyPromise) state.readyPromise = init();
    return state.readyPromise;
  }

  async function getAccessToken() {
    const s = await ready();
    if (!s.supabase?.auth) return null;
    const { data } = await s.supabase.auth.getSession();
    return data?.session?.access_token || null;
  }

  async function ai(payload) {
    const token = await getAccessToken();
    const headers = { "Content-Type": "application/json" };

    try {
      if (typeof SUPABASE_ANON_KEY === "string") {
        headers.apikey = SUPABASE_ANON_KEY;
        if (!token) headers.Authorization = `Bearer ${SUPABASE_ANON_KEY}`;
      }
    } catch {}

    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(AI_ENDPOINT, {
      method: "POST",
      headers,
      body: JSON.stringify(payload || {}),
    });

    const rawText = await res.text();
    let data = null;
    try {
      data = rawText ? JSON.parse(rawText) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const message =
        data?.message ||
        data?.error ||
        rawText ||
        `AI request failed: ${res.status}`;
      throw new Error(message);
    }

    return data || {};
  }

  let toastTimer = null;
  let toastExitTimer = null;

  function toast(message, type) {
    let el = document.getElementById("studyToast");
    if (!el) {
      el = document.createElement("div");
      el.id = "studyToast";
      el.className = "study-toast";
      el.hidden = true;
      document.body.appendChild(el);
    }

    clearTimeout(toastTimer);
    clearTimeout(toastExitTimer);

    el.textContent = message || "";
    el.classList.toggle("is-error", type === "error");
    el.hidden = false;

    window.requestAnimationFrame(() => {
      el.classList.add("is-visible");
    });

    toastTimer = setTimeout(() => {
      el.classList.remove("is-visible");

      toastExitTimer = setTimeout(() => {
        el.hidden = true;
      }, 220);
    }, 2600);
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatRelativeTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "Recently";

    const diff = Date.now() - d.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;

    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;

    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  async function fetchConversations(limit = 30) {
    const s = await ready();
    if (!s.supabase || !s.user) return [];

    const { data, error } = await s.supabase
      .from("conversations")
      .select("id,title,updated_at,created_at")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) return [];
    return data;
  }

  async function fetchConversationText(conversationId) {
    const s = await ready();
    if (!s.supabase || !conversationId) return "";

    const { data, error } = await s.supabase
      .from("messages")
      .select("role,content,created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error || !Array.isArray(data)) return "";

    return data
      .map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`)
      .join("\n\n")
      .trim();
  }

  async function fetchNotes(limit = 30) {
    const s = await ready();
    if (!s.supabase || !s.user) return [];

    const { data, error } = await s.supabase
      .from("study_notes")
      .select("id,title,source_file_name,page_count,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !Array.isArray(data)) return [];
    return data;
  }

  async function fetchNoteText(noteId) {
    const s = await ready();
    if (!s.supabase || !s.user || !noteId) return null;

    const { data, error } = await s.supabase
      .from("study_notes")
      .select(
        "id,title,source_file_name,content,page_count,created_at,updated_at",
      )
      .eq("id", noteId)
      .single();

    if (error || !data) return null;
    return data;
  }

  async function saveGeneratedNote({
    title,
    sourceFileName,
    content,
    pageCount = null,
  }) {
    const s = await ready();
    if (!s.supabase || !s.user) throw new Error("Sign in to save notes.");
    if (!state.isPro) throw new Error("Notes are a Pro feature.");

    const cleanContent = String(content || "").trim();
    if (!cleanContent) throw new Error("No notes to save.");

    const cleanTitle = String(title || sourceFileName || "Untitled note")
      .replace(/\.pdf$/i, "")
      .replace(/[_-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160);

    const { data, error } = await s.supabase
      .from("study_notes")
      .insert({
        user_id: s.user.id,
        title: cleanTitle || "Untitled note",
        source_file_name: String(sourceFileName || "Dental PDF").slice(0, 240),
        content: cleanContent,
        page_count: Number.isFinite(Number(pageCount))
          ? Number(pageCount)
          : null,
      })
      .select("id")
      .single();

    if (error || !data?.id) throw error || new Error("Could not save notes.");
    return data.id;
  }

  function cleanSidebarTitle(value) {
    return (value || "New chat").trim().replace(/\s+/g, " ") || "New chat";
  }

  let activeChatMenu = null;

  function closeChatMenu() {
    activeChatMenu?.remove();
    activeChatMenu = null;
  }

  function askChatModal({
    title,
    message,
    value = "",
    input = false,
    danger = false,
  }) {
    let overlay = document.getElementById("dasModalOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.className = "das-modal-overlay";
      overlay.id = "dasModalOverlay";
      overlay.hidden = true;
      overlay.innerHTML = `
        <div class="das-modal" role="dialog" aria-modal="true" aria-labelledby="dasModalTitle">
          <h3 class="das-modal__title" id="dasModalTitle"></h3>
          <p class="das-modal__message" id="dasModalMessage"></p>
          <input class="das-modal__input" id="dasModalInput" type="text" autocomplete="off" spellcheck="false" />
          <div class="das-modal__actions">
            <button type="button" class="das-modal__btn das-modal__btn--ghost" id="dasModalCancelBtn">Cancel</button>
            <button type="button" class="das-modal__btn das-modal__btn--primary" id="dasModalOkBtn">OK</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);
    }

    const titleEl = document.getElementById("dasModalTitle");
    const messageEl = document.getElementById("dasModalMessage");
    const inputEl = document.getElementById("dasModalInput");
    const cancelBtn = document.getElementById("dasModalCancelBtn");
    const okBtn = document.getElementById("dasModalOkBtn");

    if (
      !overlay ||
      !titleEl ||
      !messageEl ||
      !inputEl ||
      !cancelBtn ||
      !okBtn
    ) {
      if (input) return Promise.resolve(window.prompt(message, value));
      return Promise.resolve(window.confirm(message));
    }

    return new Promise((resolve) => {
      titleEl.textContent = title;
      messageEl.textContent = message;
      inputEl.value = value;
      inputEl.hidden = !input;
      okBtn.textContent = danger ? "Delete" : "OK";
      okBtn.classList.toggle("das-modal__btn--danger", danger);
      okBtn.classList.toggle("das-modal__btn--primary", !danger);
      overlay.hidden = false;

      if (input) {
        requestAnimationFrame(() => {
          inputEl.focus();
          inputEl.select();
        });
      }

      function cleanup(result) {
        overlay.hidden = true;
        cancelBtn.removeEventListener("click", onCancel);
        okBtn.removeEventListener("click", onOk);
        overlay.removeEventListener("click", onOverlay);
        document.removeEventListener("keydown", onKeydown);
        resolve(result);
      }

      function onCancel() {
        cleanup(null);
      }

      function onOk() {
        cleanup(input ? inputEl.value : true);
      }

      function onOverlay(event) {
        if (event.target === overlay) cleanup(null);
      }

      function onKeydown(event) {
        if (event.key === "Escape") cleanup(null);
        if (event.key === "Enter" && input) cleanup(inputEl.value);
      }

      cancelBtn.addEventListener("click", onCancel);
      okBtn.addEventListener("click", onOk);
      overlay.addEventListener("click", onOverlay);
      document.addEventListener("keydown", onKeydown);
    });
  }

  async function renameSidebarChat(chat) {
    const currentTitle = cleanSidebarTitle(chat.title);
    const nextTitle = await askChatModal({
      title: "Rename chat",
      message: "Name this study chat.",
      value: currentTitle,
      input: true,
    });
    const title = cleanSidebarTitle(nextTitle);
    if (!nextTitle || title === currentTitle) return;

    const s = await ready();
    const { error } = await s.supabase
      .from("conversations")
      .update({ title })
      .eq("id", chat.id);

    if (error) {
      toast("Could not rename this chat.", "error");
      return;
    }

    toast("Chat renamed.");
    await hydrateSidebarChats();
  }

  async function deleteSidebarChat(chat) {
    const ok = await askChatModal({
      title: "Delete chat",
      message: "Delete this study chat? This can't be undone.",
      danger: true,
    });
    if (!ok) return;

    const s = await ready();
    const { error } = await s.supabase
      .from("conversations")
      .delete()
      .eq("id", chat.id);

    if (error) {
      toast("Could not delete this chat.", "error");
      return;
    }

    toast("Chat deleted.");
    const activeChatId = new URLSearchParams(window.location.search).get(
      "chat",
    );
    if (activeChatId === String(chat.id)) {
      window.location.href = "study.html";
      return;
    }
    await hydrateSidebarChats();
  }

  function openChatMenu(button, chat) {
    closeChatMenu();

    const menu = document.createElement("div");
    menu.className = "sb-chatmenu-pop";
    menu.innerHTML = `
      <button class="sb-chatmenu-item" type="button" data-chat-rename>Rename</button>
      <button class="sb-chatmenu-item danger" type="button" data-chat-delete>Delete</button>
    `;

    document.body.appendChild(menu);
    activeChatMenu = menu;

    const rect = button.getBoundingClientRect();
    const menuRect = menu.getBoundingClientRect();
    menu.style.top = `${Math.min(rect.bottom + 6, window.innerHeight - menuRect.height - 8)}px`;
    menu.style.left = `${Math.max(8, rect.right - menuRect.width)}px`;

    menu
      .querySelector("[data-chat-rename]")
      ?.addEventListener("click", async () => {
        closeChatMenu();
        await renameSidebarChat(chat);
      });

    menu
      .querySelector("[data-chat-delete]")
      ?.addEventListener("click", async () => {
        closeChatMenu();
        await deleteSidebarChat(chat);
      });
  }

  function renderSidebarChats(conversations) {
    const list = document.getElementById("chatList");
    const empty = document.getElementById("chatListEmpty");
    if (!list) return;

    list.innerHTML = "";

    if (!conversations.length) {
      if (empty) empty.hidden = false;
      return;
    }

    if (empty) empty.hidden = true;

    conversations.forEach((chat) => {
      const row = document.createElement("div");
      row.className = "sb-chatrow is-entering";
      row.setAttribute("role", "listitem");

      const link = document.createElement("a");
      link.className = "sb-chat sb-chat-link";
      link.href = `study.html?chat=${encodeURIComponent(chat.id)}`;
      link.textContent = cleanSidebarTitle(chat.title);
      link.title = link.textContent;

      const menuBtn = document.createElement("button");
      menuBtn.className = "sb-chatmenu";
      menuBtn.type = "button";
      menuBtn.setAttribute(
        "aria-label",
        `Chat options for ${link.textContent}`,
      );
      menuBtn.innerHTML =
        '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h.01M12 12h.01M18 12h.01" /></svg>';
      menuBtn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        openChatMenu(menuBtn, chat);
      });

      row.appendChild(link);
      row.appendChild(menuBtn);
      list.appendChild(row);
    });

    window.requestAnimationFrame(() => {
      list.querySelectorAll(".sb-chatrow.is-entering").forEach((row) => {
        row.classList.remove("is-entering");
      });
    });
  }

  async function hydrateSidebarChats() {
    const list = document.getElementById("chatList");
    const empty = document.getElementById("chatListEmpty");
    if (!list) return;

    const s = await ready();
    if (!s.supabase || !s.user) {
      list.innerHTML = "";
      if (empty) {
        empty.textContent = "Log in to see chats";
        empty.hidden = false;
      }
      return;
    }

    const conversations = await fetchConversations(30);
    if (empty) empty.textContent = "No chats yet";
    renderSidebarChats(conversations);
  }

  document.addEventListener("click", (event) => {
    if (!activeChatMenu) return;
    if (activeChatMenu.contains(event.target)) return;
    if (event.target.closest(".sb-chatmenu")) return;
    closeChatMenu();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeChatMenu();
  });

  window.addEventListener("resize", closeChatMenu);
  window.addEventListener("scroll", closeChatMenu, true);

  window.DentAIStudyTools = {
    state,
    ready,
    ai,
    toast,
    askModal: askChatModal,
    escapeHtml,
    formatRelativeTime,
    fetchConversations,
    fetchConversationText,
    fetchNotes,
    fetchNoteText,
    saveGeneratedNote,
  };

  async function boot() {
    await ready();
    await hydrateSidebarChats();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
