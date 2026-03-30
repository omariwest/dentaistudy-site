// core.js
// Render messages + scroll anchoring + jump-to-bottom button.

(() => {
  const messagesEl = document.getElementById("messages");
  const jumpBtn = document.getElementById("jump");

  const emptyStateEl = document.createElement("div");
  emptyStateEl.className = "empty-state is-hidden";
  emptyStateEl.innerHTML =
    '<div class="empty-state-title">Start with a topic or question</div>';

  messagesEl.parentElement.insertBefore(emptyStateEl, messagesEl);

  function syncEmptyState() {
    const hasMsgs = messagesEl.children.length > 0;
    emptyStateEl.classList.toggle("is-hidden", hasMsgs);
  }

  new MutationObserver(syncEmptyState).observe(messagesEl, { childList: true });

  function isNearBottom(el) {
    const threshold = 80;
    return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
  }

  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function updateJump() {
    jumpBtn.hidden = isNearBottom(messagesEl);
  }

  jumpBtn.addEventListener("click", scrollToBottom);
  messagesEl.addEventListener("scroll", updateJump, { passive: true });

  function setActiveChatButton(btn) {
    const list = document.getElementById("chatList");
    if (!list) return;

    list
      .querySelectorAll(".sb-chat.active")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
  }

  function createNewChatInList() {
    const list = document.getElementById("chatList");
    if (!list) return;

    const n = list.querySelectorAll(".sb-chat").length + 1;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sb-chat";
    btn.setAttribute("role", "listitem");
    btn.textContent = `Chat ${n}`;

    list.prepend(btn);
    setActiveChatButton(btn);
  }

  function clearThread() {
    messagesEl.innerHTML = "";
    messagesEl.scrollTop = 0;
    jumpBtn.hidden = true;
  }

  let thinkingEl = null;
  let thinkingTimer = null;

  const THINKING_PHASES = [
    "Reading your question…",
    "Scanning the material…",
    "Connecting the concepts…",
    "Structuring the answer…",
    "Almost there…",
  ];

  const THINKING_PHASES_PDF = [
    "Reading the PDF…",
    "Extracting key concepts…",
    "Mapping the clinical points…",
    "Structuring exam notes…",
    "Almost there…",
  ];

  const THINKING_PHASES_DEEP = [
    "Analysing the full chapter…",
    "Identifying core themes…",
    "Building structured notes…",
    "Formatting for your exam…",
    "Almost there…",
  ];

  function getThinkingPhases() {
    const task = window.DentAIstudyTask || "qa";
    const hasPdf = !!window.DentAIPDF?.getActiveContext?.();
    if (task === "chapter_notes") return THINKING_PHASES_DEEP;
    if (hasPdf) return THINKING_PHASES_PDF;
    return THINKING_PHASES;
  }

  function showThinking() {
    if (thinkingEl?.isConnected) return;

    const wrap = document.createElement("div");
    wrap.className = "msg ai thinking";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    // Tooth logo pulse
    const logoWrap = document.createElement("div");
    logoWrap.className = "thinking-logo";
    logoWrap.innerHTML = `<svg viewBox="0 0 32 32" width="22" height="22" fill="none" xmlns="http://www.w3.org/2000/svg">   <path d="M16 4.2C13.9 4.2 12.3 5 10.9 5.8C9.8 6.4 8.8 6.9 7.7 6.9C6.7 6.9 6.1 7.3 5.7 8.1C5.2 9.1 5 10.7 5 12.8C5 15.6 5.8 18.6 6.9 21.8C7.7 24.2 8.2 26.5 9.1 28C9.7 29.1 10.5 29.8 11.7 29.8C12.8 29.8 13.7 29.1 14.5 27.7C15.1 26.6 15.6 25.2 16 24C16.4 25.2 16.9 26.6 17.5 27.7C18.3 29.1 19.2 29.8 20.3 29.8C21.5 29.8 22.3 29.1 22.9 28C23.8 26.5 24.3 24.2 25.1 21.8C26.2 18.6 27 15.6 27 12.8C27 10.7 26.8 9.1 26.3 8.1C25.9 7.3 25.3 6.9 24.3 6.9C23.2 6.9 22.2 6.4 21.1 5.8C19.7 5 18.1 4.2 16 4.2C14.8 4.2 13.9 4.6 13 5.1C14 4.7 15 4.5 16 4.5C17 4.5 18 4.7 19 5.1C18.1 4.6 17.2 4.2 16 4.2Z" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>   <path d="M10.2 14.1C12.4 14.1 14.3 15 16 16.7C17.7 15 19.6 14.1 21.8 14.1" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>   <path d="M10.2 17.3C12.6 17.5 14.5 18.4 16 20C17.5 18.4 19.4 17.5 21.8 17.3" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>   <path d="M10.3 19.7C12.7 20.2 14.5 21.5 16 23.2C17.5 21.5 19.3 20.2 21.7 19.7" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/> </svg>`;

    const t = document.createElement("div");
    t.className = "thinking-text";

    const phases = getThinkingPhases();
    t.textContent = phases[0];

    bubble.appendChild(logoWrap);
    bubble.appendChild(t);
    wrap.appendChild(bubble);

    thinkingEl = wrap;
    messagesEl.appendChild(wrap);

    // Cycle through phases
    let i = 1;
    thinkingTimer = setInterval(() => {
      if (!thinkingEl?.isConnected) return;
      t.style.opacity = "0";
      setTimeout(() => {
        if (!thinkingEl?.isConnected) return;
        t.textContent = phases[Math.min(i, phases.length - 1)];
        t.style.opacity = "1";
        i++;
      }, 200);
    }, 1800);
  }

  function hideThinking() {
    if (thinkingTimer) {
      clearInterval(thinkingTimer);
      thinkingTimer = null;
    }
    if (!thinkingEl) return;
    thinkingEl.remove();
    thinkingEl = null;
  }

  function newChatId() {
    return `c_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 7)}`;
  }

  window.ChatUI = {
    newChat() {
      const url = new URL(window.location.href);
      url.searchParams.set("chat", newChatId());
      window.history.pushState({}, "", url.toString());
      this.clear();
    },
    showThinking() {
      showThinking();
      scrollToBottom();
      updateJump();
    },
    hideThinking() {
      hideThinking();
      updateJump();
    },
    clear() {
      hideThinking();
      messagesEl.innerHTML = "";
      syncEmptyState();
      updateJump();
    },
    addUser(text, pdfMeta) {
      renderMessage({ role: "user", text, pdfMeta });
      showThinking();
      scrollToBottom();
      updateJump();
    },
    addAI(text) {
      hideThinking();
      renderMessage({ role: "ai", text });
      scrollToBottom();
      updateJump();
    },
    addUserStatic(text) {
      renderMessage({ role: "user", text });
      scrollToBottom();
      updateJump();
    },
    addAIStatic(text) {
      hideThinking();
      renderMessage({ role: "ai", text });
      scrollToBottom();
      updateJump();
    },
    shouldAutoScroll() {
      return isNearBottom(messagesEl);
    },
  };

  function buildAiActions(text) {
    const row = document.createElement("div");
    row.className = "msg-actions";
    row.setAttribute("aria-label", "Message actions");

    const copyBtn = makeActBtn("copy", "Copy", iconCopy());
    copyBtn.appendChild(makeCopiedPill());
    row.appendChild(copyBtn);

    row.appendChild(makeActBtn("up", "Thumbs up", iconThumbUp()));
    row.appendChild(makeActBtn("down", "Thumbs down", iconThumbDown()));

    row.addEventListener("click", async (e) => {
      const btn = e.target.closest(".msg-act");
      if (!btn) return;

      const act = btn.dataset.act;

      if (act === "copy") {
        try {
          await navigator.clipboard.writeText(text);
          showCopied(btn);
        } catch {
          // fallback
          const ta = document.createElement("textarea");
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          showCopied(btn);
        }

        return;
      }

      if (act === "up") {
        btn.classList.toggle("is-on");
        const down = row.querySelector('[data-act="down"]');
        if (down) down.classList.remove("is-on");
        return;
      }

      if (act === "down") {
        btn.classList.toggle("is-on");
        const up = row.querySelector('[data-act="up"]');
        if (up) up.classList.remove("is-on");
        return;
      }
    });

    return row;
  }

  function makeActBtn(act, label, svgEl) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "msg-act";
    b.dataset.act = act;
    b.setAttribute("aria-label", label);
    b.appendChild(svgEl);
    return b;
  }

  function makeCopiedPill() {
    const pill = document.createElement("span");
    pill.className = "copied-pill";
    pill.textContent = "Copied";
    pill.setAttribute("aria-hidden", "true");
    return pill;
  }

  function showCopied(btn) {
    btn.classList.add("is-on");
    btn.classList.add("show-copied");

    clearTimeout(btn._copiedT1);
    clearTimeout(btn._copiedT2);

    btn._copiedT1 = setTimeout(() => btn.classList.remove("is-on"), 700);
    btn._copiedT2 = setTimeout(() => btn.classList.remove("show-copied"), 1600);
  }

  /* ===== icons (inline svg) ===== */
  function svgWrap(paths) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    paths.forEach((p) => svg.appendChild(p));
    return svg;
  }

  function path(d) {
    const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
    p.setAttribute("d", d);
    return p;
  }

  function circle(cx, cy, r) {
    const c = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    c.setAttribute("cx", cx);
    c.setAttribute("cy", cy);
    c.setAttribute("r", r);
    return c;
  }

  function iconCopy() {
    return svgWrap([
      path("M9 9h10v10H9z"),
      path("M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"),
    ]);
  }

  function iconThumbUp() {
    return svgWrap([
      path(
        "M14 9V5a3 3 0 0 0-3-3l-4 9v11h10a2 2 0 0 0 2-2l1-9a2 2 0 0 0-2-2h-4Z",
      ),
      path("M7 22H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3"),
    ]);
  }

  function iconThumbDown() {
    return svgWrap([
      path(
        "M10 15v4a3 3 0 0 0 3 3l4-9V2H7a2 2 0 0 0-2 2l-1 9a2 2 0 0 0 2 2h4Z",
      ),
      path("M17 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"),
    ]);
  }

  function renderMessage({ role, text, pdfMeta }) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;

    // Extract PDF lines from user text (history fallback)
    let cleanText = text;
    let pdfNames = [];
    if (role === "user") {
      const lines = text.split("\n");
      const kept = [];
      for (const ln of lines) {
        if (ln.startsWith("📄 ")) pdfNames.push(ln.replace("📄 ", ""));
        else kept.push(ln);
      }
      cleanText = kept.join("\n").trim();
    }

    // Render PDF cards above the bubble
    const cards = pdfMeta || pdfNames.map((n) => ({ name: n, thumb: "" }));
    if (role === "user" && cards.length) {
      cards.forEach((pdf) => {
        const card = document.createElement("div");
        card.className = "msg-pdf-card";
        if (pdf.thumb) {
          const img = document.createElement("img");
          img.className = "msg-pdf-thumb";
          img.src = pdf.thumb;
          img.alt = "";
          card.appendChild(img);
        }
        const label = document.createElement("div");
        label.className = "msg-pdf-label";
        label.innerHTML =
          '<div class="msg-pdf-ico"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"/><path d="M14 2v5h5"/></svg></div>' +
          '<span class="msg-pdf-name">' +
          (pdf.name || "").replace(/</g, "&lt;") +
          "</span>";
        card.appendChild(label);
        wrap.appendChild(card);
      });
    }

    const bubble = document.createElement("div");
    bubble.className = "bubble";
    const body = document.createElement("div");
    body.className = "msg-text";
    body.textContent = cleanText;
    bubble.appendChild(body);

    // AI actions row (only for ai messages)
    if (role === "ai") {
      bubble.appendChild(buildAiActions(text));
    }

    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
  }

  requestAnimationFrame(scrollToBottom);
  requestAnimationFrame(updateJump);
  requestAnimationFrame(syncEmptyState);
})();
