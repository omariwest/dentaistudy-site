// assets/js/study-builder.js
// DentAIstudy Study Builder (AI generation) — premium + tier-aware

document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // DOM ELEMENTS
  // -----------------------------
  const form = document.getElementById("study-form");
  const answerEl = document.getElementById("study-chat");
  const placeholderEl = document.querySelector(".study-answer-placeholder");
  const copyBtn = document.getElementById("copy-answer");
  const topicInput = document.getElementById("study-topic");
  const addFilesBtn = document.getElementById("study-add-file");
  const fileInput = document.getElementById("study-file-input");
  const fileSummary = document.getElementById("study-file-summary");
  const composerMenu = document.getElementById("study-composer-menu");
  const attachActionBtn = document.getElementById("study-attach-action");

  // -----------------------------
  // Fixed composer alignment (respect sidebar width)
  // -----------------------------
  const rootStyle = document.documentElement.style;

  function setComposerVars(leftPx, widthPx) {
    rootStyle.setProperty("--das-composer-left", `${Math.round(leftPx)}px`);
    rootStyle.setProperty("--das-composer-width", `${Math.round(widthPx)}px`);
  }

  function syncFixedComposer() {
    if (!form) return;
    if (!document.body.classList.contains("page-study")) return;

    console.log("==== DEBUG: syncFixedComposer called ====");

    const mainCol = document.querySelector(".page-study .workspace-main");
    const sideCol = document.querySelector(".page-study .workspace-sidebar");

    console.log("Found mainCol:", !!mainCol);
    console.log("Found sideCol:", !!sideCol);

    // If structure is missing, fallback safely.
    if (!mainCol) {
      console.log("No main column, fallback to full width");
      setComposerVars(0, document.documentElement.clientWidth);
      return;
    }

    const mainRect = mainCol.getBoundingClientRect();
    console.log("mainRect:", {
      left: mainRect.left,
      top: mainRect.top,
      width: mainRect.width,
      right: mainRect.right,
    });

    // Detect whether sidebar + main are side-by-side (desktop)
    // or stacked vertically (mobile/tablet OR devtools-docked narrow viewport).
    let isStacked = false;

    if (!sideCol) {
      // If no sidebar exists, treat as stacked (full width).
      isStacked = true;
      console.log("No sidebar, using stacked layout");
    } else {
      const sideRect = sideCol.getBoundingClientRect();
      console.log("sideRect:", {
        left: sideRect.left,
        top: sideRect.top,
        width: sideRect.width,
        right: sideRect.right,
      });

      // If their top positions are not roughly aligned, sidebar is stacked above.
      const sameRow = Math.abs(sideRect.top - mainRect.top) < 24;
      isStacked = !sameRow;

      console.log("sameRow check:", sameRow, "isStacked:", isStacked);
    }

    if (isStacked) {
      console.log("Using STACKED layout (mobile) - full width");
      setComposerVars(0, window.innerWidth);
    } else {
      // Side-by-side: align composer to the main column (respects sidebar width)
      const left = Math.max(0, Math.round(mainRect.left));
      const width = Math.max(320, Math.round(mainRect.width));

      console.log("Using SIDE-BY-SIDE layout (desktop)", { left, width });
      console.log(
        "Setting CSS variables: --das-composer-left:",
        left + "px",
        "--das-composer-width:",
        width + "px"
      );

      setComposerVars(left, width);
    }
  }

  let rafId = 0;
  function requestSyncFixedComposer() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      syncFixedComposer();
    });
  }

  // Initial + responsive updates
  requestSyncFixedComposer();
  window.addEventListener("resize", requestSyncFixedComposer);
  window.addEventListener("load", requestSyncFixedComposer);
  window.addEventListener("scroll", requestSyncFixedComposer);

  // -----------------------------
  // MOBILE KEYBOARD DETECTION (fix composer above keyboard)
  // -----------------------------
  function setupMobileKeyboardDetection() {
    const composer = document.querySelector(".study-chat-composer");
    const textarea = document.querySelector(".study-chat-input#study-topic");

    if (!composer || !textarea || window.innerWidth > 1024) return;

    const rootStyle = document.documentElement.style;
    let keyboardActive = false;

    function applyKeyboardOffset(offsetPx) {
      if (typeof offsetPx === "number" && offsetPx > 0) {
        rootStyle.setProperty("--das-keyboard-offset", `${offsetPx}px`);
        composer.classList.add("keyboard-active");
        keyboardActive = true;
      } else {
        rootStyle.removeProperty("--das-keyboard-offset");
        composer.classList.remove("keyboard-active");
        keyboardActive = false;
      }
    }

    function computeAndApply() {
      const vv = window.visualViewport;

      // visualViewport is the most reliable way to detect the on-screen keyboard
      // on modern mobile browsers. Fallback to window.innerHeight when unavailable.
      const visualHeight = vv ? vv.height : window.innerHeight;

      // Estimated keyboard height (difference between layout viewport and visual viewport)
      const estimatedKeyboard = Math.max(0, window.innerHeight - visualHeight);

      // Heuristic: treat small differences as no keyboard
      if (document.activeElement === textarea && estimatedKeyboard > 80) {
        // Add a small margin so composer isn't flush to keyboard
        const offset = estimatedKeyboard + 12;
        applyKeyboardOffset(offset);

        // Keep composer visible in the visual viewport (helpful on iOS)
        try {
          textarea.scrollIntoView({ block: "center", behavior: "smooth" });
        } catch (e) {
          /* noop */
        }
      } else {
        applyKeyboardOffset(0);
      }
    }

    // Run immediately on focus so composer moves before typing
    textarea.addEventListener("focus", () => {
      // small delay allows visualViewport to update on some devices
      setTimeout(computeAndApply, 50);
      // ensure another check after keyboard animation
      setTimeout(computeAndApply, 350);
    });

    textarea.addEventListener("blur", () => {
      // clear any offset when input loses focus
      setTimeout(() => applyKeyboardOffset(0), 80);
    });

    // Update on visualViewport resize (preferred) and window resize fallback
    if (window.visualViewport && window.visualViewport.addEventListener) {
      window.visualViewport.addEventListener("resize", computeAndApply);
      window.visualViewport.addEventListener("scroll", computeAndApply);
    }

    window.addEventListener("resize", computeAndApply);
    // also update while typing (some keyboards expand)
    textarea.addEventListener("input", computeAndApply);

    // Initial probe
    computeAndApply();
  }

  // -----------------------------
  // CHAT MEMORY (no persistence)
  // -----------------------------
  const CHAT_MAX_MESSAGES = 30;
  let chatMemory = [];

  function loadChatMessages() {
    return Array.isArray(chatMemory) ? chatMemory : [];
  }

  function saveChatMessages(messages) {
    const trimmed = Array.isArray(messages)
      ? messages.slice(-CHAT_MAX_MESSAGES)
      : [];
    chatMemory = trimmed;
  }

  function clearChatMemory() {
    chatMemory = [];
  }

  function escapeHtml(str) {
    return (str || "")
      .toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function appendChatBubble(role, html) {
    if (!answerEl) return;

    const bubble = document.createElement("div");
    const isUser = role === "user";

    bubble.className = isUser
      ? "study-chat-bubble study-chat-bubble--user"
      : "study-chat-bubble study-chat-bubble--ai";

    if (isUser) {
      bubble.innerHTML = html;
      answerEl.appendChild(bubble);
    } else {
      const wrapper = document.createElement("div");
      wrapper.className = "study-ai-message-wrapper";

      const contentDiv = document.createElement("div");
      contentDiv.className = "study-bubble-content";
      contentDiv.innerHTML = html;

      bubble.appendChild(contentDiv);
      wrapper.appendChild(bubble); // ✅ bubble is added first

      const actions = document.createElement("div");
      actions.className = "study-ai-actions";

      const copyBtn = document.createElement("button");
      copyBtn.className = "study-bubble-copy";
      copyBtn.setAttribute("aria-label", "Copy answer");

      copyBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
          <path
            d="M9 9h10v10H9V9Zm-4 6H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <span class="study-copy-feedback">Copied</span>
      `;

      copyBtn.dataset.copy = contentDiv.innerText.trim();
      actions.appendChild(copyBtn);
      wrapper.appendChild(actions); // ✅ actions are after the bubble

      answerEl.appendChild(wrapper);
    }

    // Keep newest in view
    answerEl.scrollTop = answerEl.scrollHeight;
  }

  // Per-bubble copy (copies only the clicked AI answer)
  if (answerEl) {
    answerEl.addEventListener("click", async (e) => {
      const btn = e.target.closest(".study-bubble-copy");
      if (!btn) return;

      const wrapper = btn.closest(".study-ai-message-wrapper");
      const contentEl = wrapper?.querySelector(".study-bubble-content");
      const feedbackEl = btn.querySelector(".study-copy-feedback");

      const textToCopy = (contentEl?.innerText || "").trim();
      if (!textToCopy) return;

      const fallbackCopy = () => {
        const temp = document.createElement("textarea");
        temp.value = textToCopy;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      };

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          fallbackCopy();
        }

        btn.classList.add("is-copied");

        // remove feedback after delay
        setTimeout(() => {
          btn.classList.remove("is-copied");
        }, 1200);
      } catch {
        try {
          fallbackCopy();
          btn.classList.add("is-copied");
          setTimeout(() => {
            btn.classList.remove("is-copied");
          }, 1200);
        } catch {
          // silent fail
        }
      }
    });
  }

  function buildChatMessagesForApi() {
    const messages = loadChatMessages();

    // Keep it small + safe: only role/content
    return messages
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: (m.content || "").toString(),
      }));
  }

  function appendAndPersist(role, content, html) {
    const messages = loadChatMessages();

    const item = {
      role,
      content: (content || "").toString(),
      ts: Date.now(),
    };

    // Store rendered HTML for assistant so formatting survives refresh.
    if (
      role === "assistant" &&
      typeof html === "string" &&
      html.trim().length > 0
    ) {
      item.html = html;
    }

    messages.push(item);
    saveChatMessages(messages);

    appendChatBubble(role, html);
  }

  function renderChatFromStorage() {
    if (!answerEl) return;

    // Fresh chat on every page load (no local restore)
    clearChatMemory();
    answerEl.innerHTML = "";

    showPlaceholder("Start with a topic or question");
    updateCopyVisibility();
  }

  // Base Pro-tier limits
  const MAX_FILE_COUNT = 10;
  const MAX_FILE_SIZE_MB = 20;
  const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

  // Effective per-tier limits (resolved in initUserTier)
  let effectiveMaxFileCount = 0; // guest / unknown → no files
  let effectiveMaxFileSizeMb = 3; // conservative default
  let effectiveMaxFileSizeBytes = effectiveMaxFileSizeMb * 1024 * 1024;

  let attachedFiles = [];

  const ACCESS_TIER_UNKNOWN = "unknown";
  let userTier = ACCESS_TIER_UNKNOWN; // "guest" | "free" | "pro" | "pro_yearly"
  let isProTier = false;

  console.log("[study-builder] init v2", {
    hasForm: !!form,
    hasTopicInput: !!topicInput,
    hasAnswerEl: !!answerEl,
    hasPlaceholderEl: !!placeholderEl,
  });

  // If the form is not present, silently stop (prevents JS errors on other pages)
  if (!form) {
    console.warn("[study-builder] No #study-form found. Skipping init.");
    return;
  }

  const submitBtn =
    form.querySelector('button[type="submit"]') ||
    document.getElementById("study-generate");

  // -----------------------------
  // CONSTANTS
  // -----------------------------
  const AI_ENDPOINT =
    "https://hlvkbqpesiqjxbastxux.functions.supabase.co/ai-generate"; // Supabase Edge Function URL

  // Guest (anonymous) AI usage — per day
  const ANON_USAGE_KEY = "das_ai_anon_usage";
  const ANON_DAILY_LIMIT = 2; // guest sessions per day (client-side guard)

  // Free-tier file usage — per day (logged-in free users)
  const FREE_FILE_USAGE_KEY = "das_free_file_usage";
  const FREE_FILE_DAILY_LIMIT = 5; // max PDFs per day on free tier

  // -----------------------------
  // PDF FILE TEXT EXTRACTION (pdf.js)
  // -----------------------------
  const PDFJS_WORKER_URL =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";

  // Base Pro-tier extraction limits
  const MAX_PAGES_PER_FILE = 10;
  const MAX_FILE_TEXT_LENGTH = 120000; // characters across all PDFs

  // Effective per-tier extraction limits
  let effectiveMaxPagesPerFile = 2; // free default
  let effectiveMaxFileTextLength = 6000;

  if (window.pdfjsLib && window.pdfjsLib.GlobalWorkerOptions) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_URL;
  }

  // -----------------------------
  // USER TIER RESOLUTION (Pro gating)
  // -----------------------------
  async function initUserTier() {
    try {
      if (!window.dasSupabase || !window.dasSupabase.auth) {
        userTier = "guest";
        isProTier = false;
      } else {
        const { data, error } = await window.dasSupabase.auth.getSession();
        if (error || !data || !data.session) {
          userTier = "guest";
          isProTier = false;
        } else {
          const user = data.session.user;
          const meta = user?.user_metadata || {};
          const tier = meta.subscription_tier || "free";

          userTier = tier;
          isProTier = tier === "pro" || tier === "pro_yearly";
        }
      }
    } catch (err) {
      console.warn("[study-builder] initUserTier error", err);
      userTier = "guest";
      isProTier = false;
    }

    // Compute effective limits based on tier
    if (isProTier) {
      // Pro / Pro yearly → full power
      effectiveMaxFileCount = MAX_FILE_COUNT;
      effectiveMaxFileSizeMb = MAX_FILE_SIZE_MB;
      effectiveMaxFileSizeBytes = MAX_FILE_SIZE_BYTES;
      effectiveMaxPagesPerFile = MAX_PAGES_PER_FILE;
      effectiveMaxFileTextLength = MAX_FILE_TEXT_LENGTH;
    } else if (userTier === "free") {
      // Logged-in free users: higher limits (temporary)
      effectiveMaxFileCount = MAX_FILE_COUNT;
      effectiveMaxFileSizeMb = MAX_FILE_SIZE_MB;
      effectiveMaxFileSizeBytes = MAX_FILE_SIZE_BYTES;
      effectiveMaxPagesPerFile = MAX_PAGES_PER_FILE;
      effectiveMaxFileTextLength = MAX_FILE_TEXT_LENGTH;
    } else {
      // Guests / unknown: allow files too (temporary)
      effectiveMaxFileCount = MAX_FILE_COUNT;
      effectiveMaxFileSizeMb = MAX_FILE_SIZE_MB;
      effectiveMaxFileSizeBytes = MAX_FILE_SIZE_BYTES;
      effectiveMaxPagesPerFile = MAX_PAGES_PER_FILE;
      effectiveMaxFileTextLength = MAX_FILE_TEXT_LENGTH;
    }

    console.log("[study-builder] tier resolved", {
      userTier,
      isProTier,
      effectiveMaxFileCount,
      effectiveMaxFileSizeMb,
      effectiveMaxPagesPerFile,
    });
  }

  // Kick off tier resolution (no need to await for the initial UI)
  initUserTier();

  // -----------------------------
  // Composer UX: Enter-to-send (single-line pill)
  // -----------------------------
  function lockToSingleLinePill(el) {
    if (!el) return;

    const maxHeight = 240;

    // Set initial styles
    el.style.height = "auto";
    el.style.maxHeight = `${maxHeight}px`;
    el.style.overflowY = "auto";

    // Auto-expand handler
    function autoGrow() {
      el.style.height = "auto";
      const newHeight = Math.min(el.scrollHeight, maxHeight);
      el.style.height = newHeight + "px";
      el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
    }

    el.addEventListener("input", autoGrow);

    // Trigger initial expansion
    el.dispatchEvent(new Event("input"));
  }

  if (topicInput) {
    lockToSingleLinePill(topicInput);

    topicInput.addEventListener("keydown", (e) => {
      if (e.key !== "Enter") return;

      // Always send. No multi-line.
      e.preventDefault();
      if (form) form.requestSubmit();
    });
  }

  // -----------------------------
  // UI HELPERS
  // -----------------------------
  // -----------------------------
  // ChatGPT-like "thinking" bubble (INSIDE chat stream)
  // -----------------------------
  let loadingBubbleWrapper = null;

  function removeLoadingBubble() {
    if (loadingBubbleWrapper && loadingBubbleWrapper.parentNode) {
      loadingBubbleWrapper.parentNode.removeChild(loadingBubbleWrapper);
    }
    loadingBubbleWrapper = null;
  }

  function appendLoadingBubble() {
    if (!answerEl) return;

    removeLoadingBubble();

    const wrapper = document.createElement("div");
    wrapper.className = "study-ai-message-wrapper";

    const bubble = document.createElement("div");
    bubble.className = "study-chat-bubble study-chat-bubble--ai";

    const contentDiv = document.createElement("div");
    contentDiv.className = "study-bubble-content study-bubble-content--loading";
    contentDiv.innerHTML = `
    <span class="study-thinking">Generating</span>
  `;

    bubble.appendChild(contentDiv);
    wrapper.appendChild(bubble);

    answerEl.appendChild(wrapper);
    answerEl.scrollTop = answerEl.scrollHeight;

    loadingBubbleWrapper = wrapper;
  }

  function setLoading(isLoading) {
    // ChatGPT-like: show loading INSIDE the chat stream (as the last assistant bubble)
    if (isLoading) {
      hidePlaceholder(); // never resurrect the top placeholder during loading
      appendLoadingBubble();
    } else {
      removeLoadingBubble();
    }

    if (submitBtn) {
      submitBtn.disabled = isLoading;
      submitBtn.classList.toggle("is-loading", isLoading);
      submitBtn.setAttribute("aria-busy", isLoading ? "true" : "false");
    }

    if (copyBtn) copyBtn.disabled = isLoading;
  }

  function showPlaceholder(message) {
    if (!placeholderEl) return;

    placeholderEl.style.display = "block";
    placeholderEl.textContent =
      typeof message === "string" && message.trim().length > 0
        ? message
        : "Start with a topic or question";
  }

  function hidePlaceholder() {
    if (!placeholderEl) return;
    placeholderEl.style.display = "none";
  }

  function renderMarkdownToHtml(rawText) {
    const raw = (rawText || "").toString().replace(/\r\n/g, "\n");

    const lines = raw.split("\n");
    const htmlLines = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];

      // ---------- Markdown table detection ----------
      if (
        /^\s*\|.+\|\s*$/.test(line) &&
        i + 1 < lines.length &&
        /^\s*\|\s*-+/.test(lines[i + 1])
      ) {
        const headerLine = line.trim();
        const headerCells = headerLine
          .slice(1, -1)
          .split("|")
          .map((c) => {
            let h = escapeHtml(c.trim());

            // allow only <br> tags (keep everything else escaped)
            h = h.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

            // **bold** -> bold
            h = h.replace(/\*\*\s*(.+?)\s*\*\*/g, "<strong>$1</strong>");
            // *emphasis* -> bold (your preference)
            h = h.replace(
              /(^|[^*])\*\s*(.+?)\s*\*(?!\*)/g,
              "$1<strong>$2</strong>"
            );

            return h;
          });

        i += 2; // skip header + separator row

        const bodyRows = [];
        while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
          const rowLine = lines[i].trim();
          const rowCells = rowLine
            .slice(1, -1)
            .split("|")
            .map((c) => {
              let cell = escapeHtml(c.trim());

              // allow only <br> tags (keep everything else escaped)
              cell = cell.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

              // **bold** -> bold
              cell = cell.replace(
                /\*\*\s*(.+?)\s*\*\*/g,
                "<strong>$1</strong>"
              );
              // *emphasis* -> bold (your preference)
              cell = cell.replace(
                /(^|[^*])\*\s*(.+?)\s*\*(?!\*)/g,
                "$1<strong>$2</strong>"
              );

              return cell;
            });
          bodyRows.push(rowCells);
          i++;
        }

        let tableHtml =
          '<div class="study-ai-table-wrap"><table class="study-ai-table"><thead><tr>';
        headerCells.forEach((h) => {
          tableHtml += `<th>${h}</th>`;
        });
        tableHtml += "</tr></thead><tbody>";

        bodyRows.forEach((row) => {
          tableHtml += "<tr>";
          row.forEach((cell) => {
            tableHtml += `<td>${cell}</td>`;
          });
          tableHtml += "</tr>";
        });

        tableHtml += "</tbody></table></div>";
        htmlLines.push(tableHtml);
        continue;
      }

      // ---------- Normal line ----------
      let htmlLine = escapeHtml(line);
      htmlLine = htmlLine.replace(/&lt;br\s*\/?&gt;/gi, "<br>");

      if (/^\s*-{3,}\s*$/.test(line)) {
        htmlLines.push('<hr class="study-ai-separator">');
        i++;
        continue;
      }

      htmlLine = htmlLine.replace(/^\s*#{1,6}\s+(.*)/, "<strong>$1</strong>");
      // **bold** -> bold
      htmlLine = htmlLine.replace(
        /\*\*\s*(.+?)\s*\*\*/g,
        "<strong>$1</strong>"
      );
      // *emphasis* -> bold (your preference)
      htmlLine = htmlLine.replace(
        /(^|[^*])\*\s*(.+?)\s*\*(?!\*)/g,
        "$1<strong>$2</strong>"
      );

      htmlLines.push(htmlLine);
      i++;
    }

    return htmlLines.join("<br>");
  }

  function renderAnswer(content) {
    if (!answerEl) return;

    const raw = (content || "").toString().replace(/\r\n/g, "\n");
    const finalHtml = renderMarkdownToHtml(raw);

    appendAndPersist("assistant", raw, finalHtml);
  }

  function updateCopyVisibility() {
    if (!copyBtn || !answerEl) return;
    const hasContent =
      answerEl.textContent && answerEl.textContent.trim().length > 0;
    copyBtn.style.display = hasContent ? "inline-flex" : "none";
  }

  // -----------------------------
  // STUDY USAGE TRACKING (Profile activity)
  // -----------------------------
  function trackStudyUsage(modeLabel) {
    if (!window.dasStudyPrefs || !window.dasStudyPrefs.increment) return;

    let category = "theory"; // default
    const label = (modeLabel || "").toLowerCase();

    if (label.includes("osce")) {
      category = "osce";
    } else if (label.includes("flashcard")) {
      category = "flashcard";
    } else if (label.includes("mcq")) {
      category = "packs";
    } else if (label.includes("viva")) {
      category = "viva";
    }

    try {
      window.dasStudyPrefs.increment(category);
    } catch (err) {
      console.warn("[study-builder] Failed to increment study prefs", err);
    }
  }

  // -----------------------------
  // ANONYMOUS (GUEST) LIMIT — LOCALSTORAGE
  // -----------------------------
  function getAnonUsage() {
    try {
      const raw = localStorage.getItem(ANON_USAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setAnonUsage(obj) {
    try {
      localStorage.setItem(ANON_USAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  function enforceAnonLimitOrThrow() {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const data = getAnonUsage() || {};
    let usedToday = typeof data.usedToday === "number" ? data.usedToday : 0;
    const lastDate = typeof data.date === "string" ? data.date : null;

    if (lastDate !== today) {
      usedToday = 0;
    }

    if (usedToday >= ANON_DAILY_LIMIT) {
      const error = new Error("Guest limit reached");
      // @ts-ignore
      error.code = "ANON_LIMIT";
      throw error;
    }

    usedToday += 1;
    setAnonUsage({
      date: today,
      usedToday,
    });
  }

  // Free-tier file usage (per-day) for logged-in "free" users
  function getFreeFileUsage() {
    try {
      const raw = localStorage.getItem(FREE_FILE_USAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  function setFreeFileUsage(obj) {
    try {
      localStorage.setItem(FREE_FILE_USAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  // -----------------------------
  // SUPABASE SESSION HELPERS
  // -----------------------------
  async function getAccessToken() {
    try {
      if (window.dasSupabase && window.dasSupabase.auth) {
        const { data } = await window.dasSupabase.auth.getSession();
        return data?.session?.access_token || null;
      }
    } catch (err) {
      console.warn("[study-builder] Failed to get Supabase session", err);
    }
    return null;
  }

  function buildHeaders(accessToken) {
    const headers = {
      "Content-Type": "application/json",
    };

    // apikey is always the anon key (public)
    if (typeof SUPABASE_ANON_KEY === "string") {
      // @ts-ignore
      headers["apikey"] = SUPABASE_ANON_KEY;
    }

    // Authorization:
    // - Logged in: Bearer <accessToken>
    // - Anonymous: Bearer <SUPABASE_ANON_KEY> (valid JWT, treated as guest)
    if (accessToken) {
      // @ts-ignore
      headers["Authorization"] = `Bearer ${accessToken}`;
    } else if (typeof SUPABASE_ANON_KEY === "string") {
      // @ts-ignore
      headers["Authorization"] = `Bearer ${SUPABASE_ANON_KEY}`;
    }

    return headers;
  }

  // -----------------------------
  // PDF TEXT EXTRACTION (tier-aware)
  // -----------------------------
  async function extractTextFromPdfFiles(files) {
    if (!files || files.length === 0) return "";

    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib || !pdfjsLib.getDocument) {
      console.warn(
        "[study-builder] pdf.js not available; skipping file extraction."
      );
      return "";
    }

    let combinedText = "";
    const maxPages =
      effectiveMaxPagesPerFile || MAX_PAGES_PER_FILE || MAX_PAGES_PER_FILE;
    const maxChars =
      effectiveMaxFileTextLength ||
      MAX_FILE_TEXT_LENGTH ||
      MAX_FILE_TEXT_LENGTH;

    for (const file of files) {
      if (!file) continue;

      const isPdfType =
        (file.type && file.type.toLowerCase() === "application/pdf") ||
        (file.name && file.name.toLowerCase().endsWith(".pdf"));

      if (!isPdfType) continue;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdfDoc = await loadingTask.promise;

        const totalPages = pdfDoc.numPages;
        const pagesToRead = Math.min(totalPages, maxPages);

        for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
          const page = await pdfDoc.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item) => (item.str || "").trim())
            .join(" ");

          if (pageText) {
            combinedText += "\n\n" + pageText;
          }

          if (combinedText.length >= maxChars) break;
        }
      } catch (err) {
        console.warn("[study-builder] Failed to read PDF file", file.name, err);
      }

      if (combinedText.length >= maxChars) break;
    }

    return combinedText.trim();
  }

  function buildTopicWithFiles(baseTopic, fileText) {
    if (!fileText || !fileText.trim()) return baseTopic;

    return (
      baseTopic +
      "\n\n---\n\n" +
      "The following text comes from uploaded study PDFs. " +
      "Use it as reference to generate exam-focused dental content. " +
      "Do not repeat everything; organize it into clear OSCE steps, high-yield notes, or questions as requested:\n\n" +
      fileText
    );
  }

  // -----------------------------
  // MAIN SUBMIT HANDLER
  // -----------------------------
  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const baseTopic = topicInput ? topicInput.value.trim() : "";

    if (!baseTopic) {
      showPlaceholder("Please enter a topic or question first.");
      if (topicInput) topicInput.focus();
      return;
    }

    // USER bubble + clear input immediately
    hidePlaceholder();
    appendAndPersist(
      "user",
      baseTopic,
      escapeHtml(baseTopic).replace(/\n/g, "<br>")
    );

    if (topicInput) {
      topicInput.value = "";
      topicInput.style.height = "38px"; // Reset to initial height
      topicInput.focus();
    }

    // Reset UI
    setLoading(true);
    updateCopyVisibility();

    let topic = baseTopic;

    try {
      const fileText = await extractTextFromPdfFiles(attachedFiles || []);
      topic = buildTopicWithFiles(baseTopic, fileText);
    } catch (err) {
      console.warn("[study-builder] Failed to read attached files", err);
      topic = baseTopic;
    }

    let accessToken = null;

    try {
      accessToken = await getAccessToken();

      // Guest-only limit (no Supabase session)
      if (!accessToken) {
        enforceAnonLimitOrThrow();
      }
    } catch (err) {
      // Anonymous soft limit reached
      // @ts-ignore
      if (err && err.code === "ANON_LIMIT") {
        setLoading(false);
        showPlaceholder(
          "You've hit today's guest limit. Create a free DentAIstudy account to unlock more AI sessions each day."
        );
        updateCopyVisibility();
        return;
      }
    }

    try {
      const headers = buildHeaders(accessToken);

      console.log("[study-builder] Calling ai-generate", {
        isLoggedIn: !!accessToken,
        hasAnonKey: typeof SUPABASE_ANON_KEY === "string",
      });

      const response = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers,
        body: JSON.stringify({
          topic,
          messages: buildChatMessagesForApi(),
        }),
      });

      let data = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      console.log("[study-builder] ai-generate status", response.status, data);

      // Success
      if (response.ok && data && typeof data.content === "string") {
        hidePlaceholder();
        renderAnswer(data.content || "No answer returned.");
        updateCopyVisibility();

        // Track usage for logged-in users (updates counters + last_active_at)
        trackStudyUsage("theory");

        return;
      }

      // Handle rate/usage limit from server
      if (response.status === 429 && data && data.error === "LIMIT_REACHED") {
        const tier = data.tier || "free";

        if (tier === "pro" || tier === "pro_yearly") {
          showPlaceholder(
            "You've reached today's AI limit on your current Pro plan. Your limit will reset tomorrow."
          );
        } else if (tier === "free") {
          showPlaceholder(
            "You've reached today's AI limit on the free plan. Upgrade to Pro to unlock more AI sessions."
          );
        } else {
          showPlaceholder(
            "You've reached today's AI usage limit. Please try again tomorrow."
          );
        }

        updateCopyVisibility();
        return;
      }

      // Other error codes (400/500 etc.)
      if (data && typeof data.message === "string") {
        showPlaceholder(`Something went wrong: ${data.message}`);
      } else {
        showPlaceholder("Something went wrong. Please try again.");
      }
      updateCopyVisibility();
    } catch (err) {
      console.error("[study-builder] Error calling ai-generate", err);
      showPlaceholder("Error contacting AI server. Try again.");
      updateCopyVisibility();
    } finally {
      setLoading(false);
    }
  });

  // -----------------------------
  // COPY BUTTON
  // -----------------------------
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      if (!answerEl) return;

      const raw = (answerEl.innerText || answerEl.textContent || "").toString();
      const textToCopy = raw.trim();

      if (!textToCopy) {
        showPlaceholder(
          "There is nothing to copy yet. Generate an answer first."
        );
        return;
      }

      const fallbackCopy = () => {
        const temp = document.createElement("textarea");
        temp.value = textToCopy;
        temp.style.position = "fixed";
        temp.style.opacity = "0";
        document.body.appendChild(temp);
        temp.focus();
        temp.select();
        document.execCommand("copy");
        document.body.removeChild(temp);
      };

      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(textToCopy);
        } else {
          fallbackCopy();
        }

        copyBtn.textContent = "Copied";
        setTimeout(() => {
          copyBtn.textContent = "Copy";
        }, 1200);
      } catch (err) {
        console.warn("[study-builder] Copy failed, trying fallback", err);
        try {
          fallbackCopy();
          copyBtn.textContent = "Copied";
          setTimeout(() => {
            copyBtn.textContent = "Copy";
          }, 1200);
        } catch (err2) {
          console.warn("[study-builder] Fallback copy failed", err2);
          showPlaceholder(
            "Copy failed. Please select and copy the text manually."
          );
        }
      }
    });
  }

  // -----------------------------
  // FILE SUMMARY RENDERER
  // -----------------------------
  function renderFileSummary(options = {}) {
    if (!fileSummary) return;

    const { skippedTooLarge = 0 } = options;

    if (!attachedFiles || attachedFiles.length === 0) {
      fileSummary.innerHTML = "";
      fileSummary.classList.remove("is-visible", "is-warning");
      return;
    }

    const pillsHtml = attachedFiles
      .map((file, index) => {
        const safeName = (file && file.name) || "File";
        return `
          <button type="button" class="study-file-pill" data-file-index="${index}">
            <span class="study-file-pill-name">${safeName}</span>
            <span class="study-file-pill-remove" aria-label="Remove file">&times;</span>
          </button>
        `;
      })
      .join("");

    let summary = "";
    if (attachedFiles.length === 1) {
      summary = "1 file added";
    } else {
      summary = `${attachedFiles.length} files added`;
    }

    if (skippedTooLarge > 0) {
      const sizeLabel =
        effectiveMaxFileSizeMb && effectiveMaxFileSizeMb > 0
          ? effectiveMaxFileSizeMb
          : MAX_FILE_SIZE_MB;
      summary += ` — ${skippedTooLarge} skipped (too large, max ${sizeLabel} MB on your plan).`;
      fileSummary.classList.add("is-warning");
    } else {
      fileSummary.classList.remove("is-warning");
    }

    if (!isProTier && userTier === "free") {
      summary += " · Free plan: up to 1 PDF per prompt.";
    }

    fileSummary.innerHTML = `
      <div class="study-file-list">
        ${pillsHtml}
      </div>
      <div>${summary}</div>
    `;
    fileSummary.classList.add("is-visible");
  }

  // -----------------------------
  // File input (tier-aware gating + PDF.js + removable pills)
  // -----------------------------
  if (addFilesBtn && fileInput && fileSummary) {
    // Output style (UI-only for now; we will use it in the prompt later)
    let selectedOutput = "notes";

    function setSelectedOutput(next) {
      selectedOutput = next || "notes";
      const chips = composerMenu
        ? composerMenu.querySelectorAll(".study-output-chip")
        : [];
      chips.forEach((btn) => {
        const isActive = btn.getAttribute("data-output") === selectedOutput;
        btn.classList.toggle("is-active", isActive);
      });
    }

    function closeComposerMenu() {
      if (!composerMenu) return;
      composerMenu.classList.remove("is-open");
      composerMenu.setAttribute("aria-hidden", "true");
      if (addFilesBtn) addFilesBtn.classList.remove("is-open");
    }

    function toggleComposerMenu() {
      if (!composerMenu) return;
      const willOpen = !composerMenu.classList.contains("is-open");
      if (willOpen) {
        composerMenu.classList.add("is-open");
        composerMenu.setAttribute("aria-hidden", "false");
        if (addFilesBtn) addFilesBtn.classList.add("is-open");
      } else {
        closeComposerMenu();
      }
    }

    function triggerFilePicker() {
      // Guests / unknown: nudge to sign up for free
      if (
        !isProTier &&
        (userTier === "guest" || userTier === ACCESS_TIER_UNKNOWN)
      ) {
        fileSummary.textContent =
          "Sign in with a free DentAIstudy account to attach PDFs to your prompts.";
        fileSummary.classList.add("is-visible", "is-warning");
        return;
      }

      // Logged-in free tier: limited but allowed
      if (!isProTier && userTier === "free") {
        if (effectiveMaxFileCount <= 0) {
          fileSummary.textContent =
            "Your current plan does not allow file uploads.";
          fileSummary.classList.add("is-visible", "is-warning");
          return;
        }
      }

      try {
        fileInput.click();
      } catch (err) {
        console.warn("[study-builder] File input trigger failed", err);
      }
    }

    // "+" icon now toggles the menu (not file picker)
    addFilesBtn.addEventListener("click", toggleComposerMenu);

    // Attach action inside the menu triggers file picker
    if (attachActionBtn) {
      attachActionBtn.addEventListener("click", () => {
        closeComposerMenu();
        triggerFilePicker();
      });
    }

    // Chip selection
    if (composerMenu) {
      composerMenu.addEventListener("click", (e) => {
        const chip = e.target.closest(".study-output-chip");
        if (!chip) return;
        setSelectedOutput(chip.getAttribute("data-output") || "notes");
        closeComposerMenu();
      });
    }

    // Click outside closes the menu
    document.addEventListener("click", (e) => {
      if (!composerMenu || !addFilesBtn) return;
      const isInside =
        composerMenu.contains(e.target) || addFilesBtn.contains(e.target);
      if (!isInside) closeComposerMenu();
    });

    // Init default chip highlight
    setSelectedOutput(selectedOutput);

    fileInput.addEventListener("change", () => {
      const newFiles = fileInput.files;
      if (!newFiles || newFiles.length === 0) return;

      // Hard guard: if this tier currently has no file capacity
      if (effectiveMaxFileCount <= 0 || effectiveMaxFileSizeBytes <= 0) {
        fileInput.value = "";
        fileSummary.textContent = isProTier
          ? "File uploads are temporarily unavailable."
          : userTier === "free"
          ? "Your current plan does not allow file uploads."
          : "Sign in with a free DentAIstudy account to attach PDFs.";
        fileSummary.classList.add("is-visible", "is-warning");
        return;
      }

      // Free-tier daily limit
      let remainingFreeQuota = Infinity;
      let usageToday = null;
      if (!isProTier && userTier === "free") {
        const today = new Date().toISOString().slice(0, 10);
        const usage = getFreeFileUsage() || {};
        let used = typeof usage.usedFiles === "number" ? usage.usedFiles : 0;
        const lastDate = typeof usage.date === "string" ? usage.date : null;

        if (lastDate !== today) {
          used = 0;
        }

        remainingFreeQuota = Math.max(0, FREE_FILE_DAILY_LIMIT - used);
        usageToday = { date: today, usedFiles: used };

        if (remainingFreeQuota <= 0) {
          fileInput.value = "";
          fileSummary.textContent =
            "You've reached today's free PDF limit. Upgrade to Pro to attach more files.";
          fileSummary.classList.add("is-visible", "is-warning");
          return;
        }
      }

      let skippedTooLarge = 0;
      let acceptedCount = 0;

      // Merge new selection into attachedFiles (respecting per-tier limits)
      for (const file of newFiles) {
        if (!file) continue;

        if (file.size > effectiveMaxFileSizeBytes) {
          skippedTooLarge++;
          continue;
        }

        if (attachedFiles.length >= effectiveMaxFileCount) break;

        if (
          !isProTier &&
          userTier === "free" &&
          acceptedCount >= remainingFreeQuota
        ) {
          break;
        }

        const exists = attachedFiles.some(
          (f) =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
        );
        if (!exists) {
          attachedFiles.push(file);
          acceptedCount++;
        }
      }

      // Update free-tier usage counter
      if (
        !isProTier &&
        userTier === "free" &&
        acceptedCount > 0 &&
        usageToday
      ) {
        usageToday.usedFiles += acceptedCount;
        setFreeFileUsage(usageToday);
      }

      if (attachedFiles.length === 0) {
        renderFileSummary({ skippedTooLarge });
        console.log(
          "[study-builder] Files attached: none (skipped too large, no quota, or invalid)"
        );
        return;
      }

      renderFileSummary({ skippedTooLarge });
      console.log("[study-builder] Files attached:", attachedFiles);
    });

    // Remove file when clicking the small "x" on a pill
    fileSummary.addEventListener("click", (event) => {
      const pill = event.target.closest(".study-file-pill");
      if (!pill) return;

      const indexAttr = pill.getAttribute("data-file-index");
      const index = Number(indexAttr);
      if (Number.isNaN(index) || index < 0 || index >= attachedFiles.length) {
        return;
      }

      attachedFiles.splice(index, 1);
      renderFileSummary();
    });
  }

  updateCopyVisibility();
  renderChatFromStorage();

  // Initialize mobile keyboard detection
  setupMobileKeyboardDetection();
});
