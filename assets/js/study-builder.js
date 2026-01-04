// assets/js/study-builder.js
// DentAIstudy — Study Builder Services + Adapters
// Keeps: Supabase session->access token, Edge headers builder, guest daily limit guard, Markdown->HTML renderer (tables/bold)
// Uses new UI (core.js + composer.js) untouched.

(() => {
  "use strict";

  const AI_ENDPOINT =
    "https://hlvkbqpesiqjxbastxux.functions.supabase.co/ai-generate";
  const ANON_USAGE_KEY = "das_ai_anon_usage";
  const ANON_DAILY_LIMIT = 2;
  const STORAGE_KEY = "das_study_builder_thread_v2";

  function safeJsonParse(s) {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function getAnonUsage() {
    const raw = localStorage.getItem(ANON_USAGE_KEY);
    const obj = safeJsonParse(raw) || {};
    const day = todayKey();
    if (obj.day !== day) return { day, count: 0 };
    return { day, count: Number(obj.count || 0) };
  }

  function incAnonUsage() {
    const cur = getAnonUsage();
    const next = { day: cur.day, count: cur.count + 1 };
    try {
      localStorage.setItem(ANON_USAGE_KEY, JSON.stringify(next));
    } catch {}
    return next;
  }

  function guardGuestLimitOrThrow() {
    const cur = getAnonUsage();
    if (cur.count >= ANON_DAILY_LIMIT) {
      const err = new Error("ANON_LIMIT");
      err.code = "ANON_LIMIT";
      throw err;
    }
  }

  function uuidv4() {
    if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();

    const bytes = crypto?.getRandomValues
      ? crypto.getRandomValues(new Uint8Array(16))
      : Uint8Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));

    bytes[6] = (bytes[6] & 0x0f) | 0x40; // v4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant

    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
      ""
    );
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
      12,
      16
    )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  async function getAccessToken() {
    try {
      if (window.dasSupabase?.auth) {
        const { data } = await window.dasSupabase.auth.getSession();
        return data?.session?.access_token || null;
      }
    } catch (err) {
      console.warn("[study-builder] getAccessToken failed", err);
    }
    return null;
  }

  function buildEdgeHeaders(accessToken) {
    const headers = { "Content-Type": "application/json" };
    try {
      if (typeof SUPABASE_ANON_KEY === "string")
        headers["apikey"] = SUPABASE_ANON_KEY;
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;
      else if (typeof SUPABASE_ANON_KEY === "string")
        headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    } catch {
      // ignore
    }
    return headers;
  }

  function escapeHtml(s) {
    return (s || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function inlineFormat(html) {
    html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
    html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
    html = html.replace(
      /\b(https?:\/\/[^\s<]+)\b/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>'
    );
    return html;
  }

  function isTableSep(line) {
    const t = (line || "").trim();
    return /^\|?[\s:-]+\|[\s|:-]*$/.test(t) && t.includes("|");
  }

  function splitRow(line) {
    let t = (line || "").trim();
    if (t.startsWith("|")) t = t.slice(1);
    if (t.endsWith("|")) t = t.slice(0, -1);
    return t.split("|").map((c) => inlineFormat(escapeHtml(c.trim())));
  }

  function renderMarkdownToHtml(rawText) {
    const raw = (rawText || "").toString().replace(/\r\n/g, "\n");
    const lines = raw.split("\n");
    const out = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // pipe tables
      if (
        line &&
        line.includes("|") &&
        i + 1 < lines.length &&
        isTableSep(lines[i + 1])
      ) {
        const headerCells = splitRow(line);
        i += 2;
        const bodyRows = [];
        while (i < lines.length && lines[i].trim() && lines[i].includes("|")) {
          bodyRows.push(splitRow(lines[i]));
          i += 1;
        }

        let tableHtml =
          '<div class="study-ai-table-wrap"><table class="study-ai-table"><thead><tr>';
        for (const h of headerCells) tableHtml += `<th>${h}</th>`;
        tableHtml += "</tr></thead><tbody>";
        for (const row of bodyRows) {
          tableHtml += "<tr>";
          for (const cell of row) tableHtml += `<td>${cell}</td>`;
          tableHtml += "</tr>";
        }
        tableHtml += "</tbody></table></div>";
        out.push(tableHtml);
        continue;
      }

      // bullets
      const bullet = /^\s*[-*]\s+(.+)$/.exec(line);
      if (bullet) {
        const items = [];
        while (i < lines.length) {
          const m = /^\s*[-*]\s+(.+)$/.exec(lines[i]);
          if (!m) break;
          items.push(`<li>${inlineFormat(escapeHtml(m[1]))}</li>`);
          i += 1;
        }
        out.push(`<ul>${items.join("")}</ul>`);
        continue;
      }

      if (!line.trim()) {
        i += 1;
        continue;
      }

      out.push(`<p>${inlineFormat(escapeHtml(line))}</p>`);
      i += 1;
    }

    return out.join("");
  }

  function loadThread() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const data = safeJsonParse(raw);
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (m) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string"
      )
      .map((m) => ({ role: m.role, content: m.content }));
  }

  function saveThread(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
  }

  function postProcessLastAiBubble(mdText) {
    const bubbles = document.querySelectorAll(".msg.ai .msg-text");
    const el = bubbles[bubbles.length - 1];
    if (!el) return;
    el.innerHTML = renderMarkdownToHtml(mdText);
  }

  // Expose stable hooks
  window.DAS = window.DAS || {};
  window.DAS.getAccessToken = getAccessToken;
  window.DAS.buildEdgeHeaders = buildEdgeHeaders;
  window.DAS.guardGuestLimit = guardGuestLimitOrThrow;
  window.DAS.renderMarkdown = renderMarkdownToHtml;

  function boot() {
    const supa = window.dasSupabase;
    const listEl = document.getElementById("chatList");
    const emptyEl = document.getElementById("chatListEmpty");

    // Close chat menu when tapping/clicking outside (mobile-friendly)
    document.addEventListener(
      "pointerdown",
      (e) => {
        if (e.target.closest(".sb-chatmenu")) return;
        if (e.target.closest(".sb-chatmenu-pop")) return;

        document
          .querySelectorAll(".sb-chatmenu-pop:not([hidden])")
          .forEach((el) => {
            el.hidden = true;
            el.style.left = "";
            el.style.top = "";
          });
      },
      true
    );

    let thread = [];
    let userId = null;
    let isAuthed = false;
    let activeConversationId = null;

    function getUrlChatId() {
      const url = new URL(window.location.href);
      return url.searchParams.get("chat") || null;
    }

    function setUrlChatId(id) {
      const url = new URL(window.location.href);
      if (id) url.searchParams.set("chat", id);
      else url.searchParams.delete("chat");
      window.history.replaceState({}, "", url.toString());
    }

    function setChatListEmptyState(hasItems) {
      if (!emptyEl) return;
      emptyEl.hidden = Boolean(hasItems);
    }

    function titleFromText(text) {
      const t = (text || "").trim().replace(/\s+/g, " ");
      if (!t) return "New chat";
      return t.length > 60 ? `${t.slice(0, 60)}…` : t;
    }

    async function renameConversation(conversationId, currentTitle) {
      if (!isAuthed || !supa || !conversationId) return;

      const next = window.prompt("Rename chat", (currentTitle || "").trim());
      if (next === null) return;

      const cleaned = next.trim().replace(/\s+/g, " ");
      if (!cleaned) return;

      const { error } = await supa
        .from("conversations")
        .update({ title: cleaned })
        .eq("id", conversationId);

      if (error) return;

      await refreshChatList();
    }

    async function deleteConversation(conversationId) {
      if (!isAuthed || !supa || !conversationId) return;

      const ok = window.confirm("Delete this chat?");
      if (!ok) return;

      const { error } = await supa
        .from("conversations")
        .delete()
        .eq("id", conversationId);

      if (error) return;

      if (conversationId === activeConversationId) {
        activeConversationId = null;
        setUrlChatId(null);
        window.ChatUI?.clear?.();
      }

      await refreshChatList();
    }

    async function initAuthUserId() {
      try {
        if (!supa?.auth) return null;
        const { data } = await supa.auth.getSession();
        return data?.session?.user?.id || null;
      } catch {
        return null;
      }
    }

    async function fetchConversations() {
      if (!supa) return [];
      const { data, error } = await supa
        .from("conversations")
        .select("id,title,updated_at,created_at")
        .order("updated_at", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error || !Array.isArray(data)) return [];
      return data;
    }

    function renderConversations(convs) {
      if (!listEl) return;

      listEl.innerHTML = "";
      setChatListEmptyState(convs.length > 0);

      function positionMenu(buttonEl, popEl) {
        const gutter = 8;
        const offset = 8;

        popEl.hidden = false; // must be visible to measure

        const btnRect = buttonEl.getBoundingClientRect();
        const popRect = popEl.getBoundingClientRect();

        // IMPORTANT: when inside .chats-panel (it uses transform), "fixed" is relative to the panel.
        const panel = buttonEl.closest(".chats-panel");
        const baseRect = panel ? panel.getBoundingClientRect() : null;

        let top;
        let left;
        let maxW;
        let maxH;

        if (baseRect) {
          // Coordinates relative to the panel (not the full screen)
          top = btnRect.bottom - baseRect.top + offset;
          left = btnRect.right - baseRect.left - popRect.width;
          maxW = baseRect.width;
          maxH = baseRect.height;
        } else {
          // Desktop: normal viewport positioning
          top = btnRect.bottom + offset;
          left = btnRect.right - popRect.width;
          maxW = document.documentElement.clientWidth;
          maxH = document.documentElement.clientHeight;
        }

        left = Math.max(gutter, Math.min(left, maxW - popRect.width - gutter));
        top = Math.max(gutter, Math.min(top, maxH - popRect.height - gutter));

        popEl.style.left = `${left}px`;
        popEl.style.top = `${top}px`;
      }

      for (const c of convs) {
        const row = document.createElement("div");
        row.className = "sb-chatrow";
        row.setAttribute("role", "listitem");
        row.dataset.chatId = c.id;

        const btn = document.createElement("button");
        btn.className = `sb-chat${
          c.id === activeConversationId ? " active" : ""
        }`;
        btn.type = "button";
        btn.dataset.chatId = c.id;
        btn.textContent = (c.title || "New chat").trim() || "New chat";

        const menuBtn = document.createElement("button");
        menuBtn.className = "sb-chatmenu";
        menuBtn.type = "button";
        menuBtn.setAttribute("aria-label", "Chat menu");
        menuBtn.textContent = "⋯";

        const pop = document.createElement("div");
        pop.className = "sb-chatmenu-pop";
        pop.hidden = true;

        const popRename = document.createElement("button");
        popRename.className = "sb-chatmenu-item";
        popRename.type = "button";
        popRename.textContent = "Rename";

        const popDelete = document.createElement("button");
        popDelete.className = "sb-chatmenu-item danger";
        popDelete.type = "button";
        popDelete.textContent = "Delete";

        pop.appendChild(popRename);
        pop.appendChild(popDelete);

        function closePop() {
          pop.hidden = true;
          pop.style.left = "";
          pop.style.top = "";
        }

        btn.addEventListener("click", async () => {
          closePop();
          activeConversationId = c.id;
          setUrlChatId(activeConversationId);
          await loadConversation(activeConversationId);

          listEl
            .querySelectorAll(".sb-chat")
            .forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
        });

        btn.addEventListener("dblclick", async () => {
          closePop();
          await renameConversation(c.id, c.title || btn.textContent);
        });

        menuBtn.addEventListener("click", (e) => {
          e.stopPropagation();

          const anyOpen = listEl.querySelectorAll(
            ".sb-chatmenu-pop:not([hidden])"
          );
          anyOpen.forEach((el) => {
            el.hidden = true;
            el.style.left = "";
            el.style.top = "";
          });

          const willOpen = pop.hidden;
          pop.hidden = !willOpen ? true : false;

          if (!pop.hidden) {
            positionMenu(menuBtn, pop);
          } else {
            pop.style.left = "";
            pop.style.top = "";
          }
        });

        popRename.addEventListener("click", async (e) => {
          e.stopPropagation();
          closePop();
          await renameConversation(c.id, c.title || btn.textContent);
        });

        popDelete.addEventListener("click", async (e) => {
          e.stopPropagation();
          closePop();
          await deleteConversation(c.id);
        });

        row.appendChild(btn);
        row.appendChild(menuBtn);
        row.appendChild(pop);
        listEl.appendChild(row);
      }
    }

    async function refreshChatList() {
      if (!isAuthed) return;
      const convs = await fetchConversations();
      renderConversations(convs);
    }

    async function loadConversation(id) {
      if (!isAuthed || !supa || !id) return;

      const { data: convRow, error: convErr } = await supa
        .from("conversations")
        .select("id")
        .eq("id", id)
        .maybeSingle();

      if (convErr || !convRow) {
        activeConversationId = null;
        setUrlChatId(null);
        window.ChatUI?.clear?.();
        await refreshChatList();
        return;
      }

      const { data, error } = await supa
        .from("messages")
        .select("role,content,created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error || !Array.isArray(data)) {
        window.ChatUI?.clear?.();
        thread = [];
        return;
      }

      window.ChatUI?.clear?.();
      thread = data.map((m) => ({ role: m.role, content: m.content }));

      for (const m of thread) {
        if (m.role === "user") window.ChatUI?.addUserStatic?.(m.content);
        else {
          window.ChatUI?.addAIStatic?.(m.content);
          postProcessLastAiBubble(m.content);
        }
      }
    }

    async function ensureConversationForFirstMessage(firstText) {
      if (activeConversationId) return;

      activeConversationId = uuidv4();

      const title = titleFromText(firstText);

      const { error } = await supa.from("conversations").insert({
        id: activeConversationId,
        user_id: userId,
        title,
      });

      if (error) {
        activeConversationId = null;
        setUrlChatId(null);
        throw error;
      }

      setUrlChatId(activeConversationId);
      await refreshChatList();
    }

    async function insertMessage(role, content) {
      const { error } = await supa.from("messages").insert({
        conversation_id: activeConversationId,
        user_id: userId,
        role,
        content,
      });
      if (error) throw error;
    }

    (async () => {
      userId = await initAuthUserId();
      isAuthed = Boolean(userId);
      activeConversationId = getUrlChatId();

      if (isAuthed) {
        await refreshChatList();
        if (activeConversationId) await loadConversation(activeConversationId);
        else window.ChatUI?.clear?.();
      } else {
        thread = loadThread();
        if (thread.length && window.ChatUI) {
          window.ChatUI?.clear?.();
          for (const m of thread) {
            if (m.role === "user") window.ChatUI?.addUserStatic?.(m.content);
            else {
              window.ChatUI?.addAIStatic?.(m.content);
              postProcessLastAiBubble(m.content);
            }
          }
        }
      }

      document.querySelectorAll('[data-action="newChat"]').forEach((btn) => {
        btn.addEventListener("click", async () => {
          window.ChatUI?.clear?.();

          if (isAuthed) {
            activeConversationId = null;
            setUrlChatId(null);
            thread.length = 0;
            await refreshChatList();
          } else {
            window.ChatUI?.newChat?.();
            thread.length = 0;
            saveThread(thread);
          }
        });
      });

      const form = document.getElementById("composer");
      const ta = document.getElementById("prompt");
      if (!form || !ta) return;

      let pendingSubmitText = null;

      form.addEventListener(
        "submit",
        (e) => {
          pendingSubmitText = (ta.value || "").trim();
          if (!pendingSubmitText) return;

          // Let composer.js run first (it draws the user bubble + thinking)
          // Then we run the AI call.
          setTimeout(async () => {
            const text = (pendingSubmitText || "").trim();
            pendingSubmitText = null;
            if (!text) return;

            if (window.DentAIPDF?.hasPending?.()) {
              window.ChatUI?.addAI?.(
                "Still reading your PDF… try again in a moment."
              );
              return;
            }

            let accessToken = null;

            try {
              accessToken = await getAccessToken();
              if (!accessToken) guardGuestLimitOrThrow();
            } catch (err) {
              const msg =
                "You've hit today's guest limit. Create a free account (log in) to unlock more AI sessions each day.";
              window.ChatUI?.addAI(msg);
              postProcessLastAiBubble(msg);

              if (!isAuthed) {
                thread.push({ role: "assistant", content: msg });
                saveThread(thread);
              }
              return;
            }

            try {
              if (isAuthed) {
                await ensureConversationForFirstMessage(text);
                await insertMessage("user", text);
                thread.push({ role: "user", content: text });
              } else {
                thread.push({ role: "user", content: text });
                saveThread(thread);
              }

              const headers = buildEdgeHeaders(accessToken);

              const pdfContext =
                window.DentAIPDF?.getActiveContext?.(120000) || "";
              const requestMessages = thread.map((m) => ({
                role: m.role,
                content: m.content,
              }));

              if (pdfContext) {
                requestMessages.unshift({
                  role: "user",
                  content: pdfContext,
                });
              }

              const response = await fetch(AI_ENDPOINT, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  topic: text,
                  messages: requestMessages,
                }),
              });

              let data = null;
              try {
                data = await response.json();
              } catch {
                data = null;
              }

              if (response.ok && data && typeof data.content === "string") {
                const content = data.content || "No answer returned.";
                if (!accessToken) incAnonUsage();

                window.ChatUI?.addAI(content);
                postProcessLastAiBubble(content);

                if (isAuthed) {
                  await insertMessage("assistant", content);
                  thread.push({ role: "assistant", content });
                  await refreshChatList();
                } else {
                  thread.push({ role: "assistant", content });
                  saveThread(thread);
                }
                return;
              }

              if (
                response.status === 429 &&
                data &&
                data.error === "LIMIT_REACHED"
              ) {
                const msg =
                  "You've reached today's AI limit. Please try again tomorrow or upgrade your plan.";
                window.ChatUI?.addAI(msg);
                postProcessLastAiBubble(msg);

                if (isAuthed) {
                  await insertMessage("assistant", msg);
                  thread.push({ role: "assistant", content: msg });
                  await refreshChatList();
                } else {
                  thread.push({ role: "assistant", content: msg });
                  saveThread(thread);
                }
                return;
              }

              const msg = data?.message
                ? `Something went wrong: ${data.message}`
                : `Something went wrong. Status: ${response.status}`;
              window.ChatUI?.addAI(msg);
              postProcessLastAiBubble(msg);

              if (isAuthed) {
                await insertMessage("assistant", msg);
                thread.push({ role: "assistant", content: msg });
                await refreshChatList();
              } else {
                thread.push({ role: "assistant", content: msg });
                saveThread(thread);
              }
            } catch (err) {
              const msg = `Error: ${
                err?.message || "Error contacting AI server."
              }`;
              window.ChatUI?.addAI(msg);
              postProcessLastAiBubble(msg);

              if (isAuthed && activeConversationId) {
                try {
                  await insertMessage("assistant", msg);
                  thread.push({ role: "assistant", content: msg });
                  await refreshChatList();
                } catch {}
              } else {
                thread.push({ role: "assistant", content: msg });
                saveThread(thread);
              }
            }
          }, 0);
        },
        true
      );
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
