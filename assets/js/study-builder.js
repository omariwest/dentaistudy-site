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
    const thread = loadThread();

    // Rehydrate messages into new UI
    if (thread.length && window.ChatUI) {
      window.ChatUI.newChat?.();
      for (const m of thread) {
        if (m.role === "user") window.ChatUI.addUser(m.content);
        else {
          window.ChatUI.addAI(m.content);
          postProcessLastAiBubble(m.content);
        }
      }
    }

    // Keep newChat buttons working + wipe storage
    document.querySelectorAll('[data-action="newChat"]').forEach((btn) => {
      btn.addEventListener("click", () => {
        window.ChatUI?.newChat?.();
        thread.length = 0;
        saveThread(thread);
      });
    });

    const form = document.getElementById("composer");
    const ta = document.getElementById("prompt");
    if (!form || !ta) return;

    form.addEventListener("submit", async (e) => {
      // Let composer.js do UI resets, but we handle networking.
      e.preventDefault();

      const text = (ta.value || "").trim();
      if (!text) return;

      thread.push({ role: "user", content: text });
      saveThread(thread);

      window.ChatUI?.showThinking?.();

      let accessToken = null;
      try {
        accessToken = await getAccessToken();
        if (!accessToken) guardGuestLimitOrThrow();
      } catch (err) {
        const msg =
          "You've hit today's guest limit. Create a free account (log in) to unlock more AI sessions each day.";
        window.ChatUI?.hideThinking?.();
        window.ChatUI?.addAI(msg);
        postProcessLastAiBubble(msg);
        thread.push({ role: "assistant", content: msg });
        saveThread(thread);
        return;
      }

      try {
        const headers = buildEdgeHeaders(accessToken);
        const response = await fetch(AI_ENDPOINT, {
          method: "POST",
          headers,
          body: JSON.stringify({
            topic: text,
            messages: thread.map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        let data = null;
        try {
          data = await response.json();
        } catch {
          data = null;
        }

        window.ChatUI?.hideThinking?.();

        if (response.ok && data && typeof data.content === "string") {
          const content = data.content || "No answer returned.";
          if (!accessToken) incAnonUsage();

          window.ChatUI?.addAI(content);
          postProcessLastAiBubble(content);

          thread.push({ role: "assistant", content });
          saveThread(thread);
          return;
        }

        if (response.status === 429 && data && data.error === "LIMIT_REACHED") {
          const msg =
            "You've reached today's AI limit. Please try again tomorrow or upgrade your plan.";
          window.ChatUI?.addAI(msg);
          postProcessLastAiBubble(msg);
          thread.push({ role: "assistant", content: msg });
          saveThread(thread);
          return;
        }

        const msg = data?.message
          ? `Something went wrong: ${data.message}`
          : "Something went wrong. Please try again.";
        window.ChatUI?.addAI(msg);
        postProcessLastAiBubble(msg);
        thread.push({ role: "assistant", content: msg });
        saveThread(thread);
      } catch (err) {
        window.ChatUI?.hideThinking?.();
        const msg = "Error contacting AI server. Try again.";
        window.ChatUI?.addAI(msg);
        postProcessLastAiBubble(msg);
        thread.push({ role: "assistant", content: msg });
        saveThread(thread);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
