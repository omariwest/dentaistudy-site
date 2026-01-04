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

  function showThinking() {
    if (thinkingEl?.isConnected) return;

    const wrap = document.createElement("div");
    wrap.className = "msg ai thinking";

    const bubble = document.createElement("div");
    bubble.className = "bubble";

    const t = document.createElement("div");
    t.className = "thinking-text";
    t.textContent = "Thinking…";

    bubble.appendChild(t);
    wrap.appendChild(bubble);

    thinkingEl = wrap;
    messagesEl.appendChild(wrap);
  }

  function hideThinking() {
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
    addUser(text) {
      renderMessage({ role: "user", text });
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
        "M14 9V5a3 3 0 0 0-3-3l-4 9v11h10a2 2 0 0 0 2-2l1-9a2 2 0 0 0-2-2h-4Z"
      ),
      path("M7 22H4a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2h3"),
    ]);
  }

  function iconThumbDown() {
    return svgWrap([
      path(
        "M10 15v4a3 3 0 0 0 3 3l4-9V2H7a2 2 0 0 0-2 2l-1 9a2 2 0 0 0 2 2h4Z"
      ),
      path("M17 2h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-3"),
    ]);
  }

  function renderMessage({ role, text }) {
    const wrap = document.createElement("div");
    wrap.className = `msg ${role}`;
    const bubble = document.createElement("div");
    bubble.className = "bubble";
    // message body (text)
    const body = document.createElement("div");
    body.className = "msg-text";
    body.textContent = text;

    bubble.innerHTML = "";
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
