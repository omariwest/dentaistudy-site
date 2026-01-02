// composer.js
// Auto-growing textarea (upward), enter-to-send, shift+enter newline, send button state.
// Add menu + PDF attach (up to 5) + attachment chips preview.

(() => {
  const form = document.getElementById("composer");
  const ta = document.getElementById("prompt");
  const send = document.getElementById("send");
  const add = document.getElementById("btnAdd");

  const addMenu = document.getElementById("addMenu");
  const attachBar = document.getElementById("attachBar");
  const pdfInput = document.getElementById("pdfInput");

  if (!form || !ta || !send) return;

  // ========= Composer basics =========
  function setSendState() {
    send.disabled = ta.value.trim().length === 0;
  }

  function autoGrow() {
    ta.style.height = "auto";
    const max = 220;
    ta.style.height = Math.min(ta.scrollHeight, max) + "px";
  }

  ta.addEventListener("input", () => {
    autoGrow();
    setSendState();
  });

  ta.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      form.requestSubmit();
    }
  });

  // ========= Add menu open/close =========
  let closeTimer = null;

  function openAddMenu() {
    if (!addMenu || !add) return;

    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }

    add.classList.add("is-open");
    addMenu.hidden = false;

    requestAnimationFrame(() => addMenu.classList.add("is-open"));

    add.setAttribute("aria-expanded", "true");
  }

  function closeAddMenu() {
    if (!addMenu || !add) return;

    add.classList.remove("is-open");
    addMenu.classList.remove("is-open");
    add.setAttribute("aria-expanded", "false");

    closeTimer = setTimeout(() => {
      if (addMenu) addMenu.hidden = true;
      closeTimer = null;
    }, 170);
  }

  function toggleAddMenu() {
    if (!addMenu || !add) return;
    const isOpen = add.classList.contains("is-open");
    if (isOpen) closeAddMenu();
    else openAddMenu();
  }

  add?.addEventListener("click", (e) => {
    e.preventDefault();
    toggleAddMenu();
  });

  document.addEventListener("click", (e) => {
    if (!addMenu || !add) return;
    const t = e.target;
    if (t.closest && (t.closest("#btnAdd") || t.closest("#addMenu"))) return;
    if (add.classList.contains("is-open")) closeAddMenu();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (add?.classList.contains("is-open")) closeAddMenu();
  });

  // ========= Attachments (PDF only, up to 5) =========
  /** @type {File[]} */
  let attached = [];
  const MAX_PDFS = 5;

  function isPdf(file) {
    const name = (file.name || "").toLowerCase();
    return file.type === "application/pdf" || name.endsWith(".pdf");
  }

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

  function iconPdf() {
    return svgWrap([
      path("M14 2H7a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7z"),
      path("M14 2v5h5"),
    ]);
  }

  function iconX() {
    return svgWrap([path("M18 6L6 18"), path("M6 6l12 12")]);
  }

  function renderAttachments() {
    if (!attachBar) return;

    attachBar.innerHTML = "";

    if (!attached.length) {
      attachBar.hidden = true;
      return;
    }

    attachBar.hidden = false;

    attached.forEach((file, idx) => {
      const chip = document.createElement("div");
      chip.className = "attachchip";

      const ico = document.createElement("div");
      ico.className = "pdfico";
      ico.appendChild(iconPdf());

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = file.name;

      const x = document.createElement("button");
      x.type = "button";
      x.className = "x";
      x.setAttribute("aria-label", "Remove file");
      x.appendChild(iconX());
      x.addEventListener("click", () => {
        attached.splice(idx, 1);
        renderAttachments();
      });

      chip.appendChild(ico);
      chip.appendChild(name);
      chip.appendChild(x);

      attachBar.appendChild(chip);
    });
  }

  function addFiles(list) {
    if (!list || !list.length) return;

    const incoming = Array.from(list).filter(isPdf);
    if (!incoming.length) return;

    for (const f of incoming) {
      if (attached.length >= MAX_PDFS) break;

      const dup = attached.some((x) => x.name === f.name && x.size === f.size);
      if (!dup) attached.push(f);
    }

    renderAttachments();

    // allow picking same file again
    if (pdfInput) pdfInput.value = "";
  }

  function triggerPdfPick() {
    if (!pdfInput) return;
    pdfInput.value = "";
    pdfInput.click();
  }

  // PDF input change (ONE listener)
  pdfInput?.addEventListener("change", () => {
    addFiles(pdfInput.files);
    closeAddMenu();
    ta.focus({ preventScroll: true });
  });

  // ========= Add menu actions =========
  // - click Add PDF: opens picker
  // - click Output style: set active + close
  addMenu?.addEventListener("click", (e) => {
    const styleBtn = e.target.closest ? e.target.closest("[data-style]") : null;
    if (styleBtn) {
      addMenu
        .querySelectorAll("[data-style]")
        .forEach((b) => b.classList.remove("is-active"));
      styleBtn.classList.add("is-active");
      closeAddMenu();
      ta.focus({ preventScroll: true });
      return;
    }

    const item = e.target.closest ? e.target.closest("[data-add]") : null;
    if (!item) return;

    const action = item.dataset.add;
    if (action === "pdf") {
      triggerPdfPick();
    }
  });

  // ========= Submit =========
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = ta.value.trim();
    if (!text) return;

    window.ChatUI?.addUser(text);

    // reset input
    ta.value = "";
    autoGrow();
    setSendState();

    // optional: clear attachments after send (ChatGPT-like)
    attached = [];
    renderAttachments();

    closeAddMenu();

    // AI reply is handled by assets/js/study-builder.js (Supabase Edge Function).
  });

  // init
  autoGrow();
  setSendState();
  renderAttachments();
})();
