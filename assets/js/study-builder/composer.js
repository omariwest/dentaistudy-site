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

  // Sticky PDF context cache (no visible chat pollution)
  const PDF_CACHE_KEY = "dentai_pdf_cache_v1";

  /** @type {{ activeIds: string[], docs: Record<string, { name: string, size: number, lastModified: number, text: string, pages?: number, updatedAt: number }> }} */
  let pdfCache = { activeIds: [], docs: {} };

  /** @type {Map<string, Promise<void>>} */
  const pdfPending = new Map();

  function safeLoadPdfCache() {
    try {
      const raw = localStorage.getItem(PDF_CACHE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (
        parsed &&
        Array.isArray(parsed.activeIds) &&
        parsed.docs &&
        typeof parsed.docs === "object"
      ) {
        pdfCache = parsed;
      }
    } catch {
      // ignore (storage may be blocked / full)
    }
  }

  function safeSavePdfCache() {
    try {
      localStorage.setItem(PDF_CACHE_KEY, JSON.stringify(pdfCache));
    } catch {
      // ignore (storage may be blocked / full)
    }
  }

  function pdfFileId(file) {
    return `${file.name}|${file.size}|${file.lastModified}`;
  }

  function setPdfActive(id, on) {
    const set = new Set(pdfCache.activeIds || []);
    if (on) set.add(id);
    else set.delete(id);
    pdfCache.activeIds = Array.from(set);
    safeSavePdfCache();
  }

  function getPdfStatus(id) {
    if (pdfPending.has(id)) return "reading";
    const doc = pdfCache.docs[id];
    if (!doc) return "empty";
    if (doc.text) return "ready";
    return "empty";
  }

  function clampText(text, maxChars) {
    if (!text) return "";
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars);
  }

  async function extractPdfTextWithPdfjs(file, opts) {
    const pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib || typeof pdfjsLib.getDocument !== "function") {
      throw new Error("PDFJS_NOT_LOADED");
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    const maxPages = opts?.maxPages ?? Infinity; // was 20 (this is the bug)
    const maxChars = opts?.maxChars ?? 500000; // higher cap, still bounded

    const pagesToRead = Math.min(pdf.numPages, maxPages);

    let out = "";
    for (let pageNum = 1; pageNum <= pagesToRead; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      const strings = (content.items || [])
        .map((it) => (it && it.str ? String(it.str) : ""))
        .filter(Boolean);

      if (strings.length) {
        out += `[Page ${pageNum}]\n` + strings.join(" ") + "\n\n";
      }

      if (out.length >= maxChars) break;
    }

    return {
      text: clampText(out.trim(), maxChars),
      pages: pdf.numPages,
    };
  }

  function ensurePdfParsedAndCached(file) {
    const id = pdfFileId(file);

    // already cached
    if (pdfCache.docs[id]?.text) return;

    // already parsing
    if (pdfPending.has(id)) return;

    // start parsing
    const p = (async () => {
      try {
        const res = await extractPdfTextWithPdfjs(file, {
          maxPages: Infinity,
          maxChars: 500000,
        });

        pdfCache.docs[id] = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          text: res.text || "",
          pages: res.pages,
          updatedAt: Date.now(),
        };
        safeSavePdfCache();
      } catch (err) {
        // keep a stub so we don't loop forever on failing files
        pdfCache.docs[id] = {
          name: file.name,
          size: file.size,
          lastModified: file.lastModified,
          text: "",
          updatedAt: Date.now(),
        };
        safeSavePdfCache();
      }
    })();

    pdfPending.set(id, p);
    p.finally(() => {
      pdfPending.delete(id);
      renderAttachments();
    });

    renderAttachments();
  }

  // API used by study-builder.js (network layer)
  function resetPdfContext() {
    attached.length = 0;
    pdfCache.activeIds = [];
    safeSavePdfCache();

    if (pdfInput) pdfInput.value = "";
    renderAttachments();
  }

  let pendingSendDocs = [];

  function sealForSend() {
    safeLoadPdfCache();
    pendingSendDocs = attached
      .map((f) => {
        const id = pdfFileId(f);
        const d = pdfCache.docs?.[id];
        return d && d.text
          ? {
              file_id: id,
              file_name: d.name || f.name,
              text: d.text,
              pages: d.pages || null,
            }
          : null;
      })
      .filter(Boolean);

    resetPdfContext(); // clears UI chips (your requirement)
  }

  window.DentAIPDF = window.DentAIPDF || {};
  window.DentAIPDF.reset = resetPdfContext;
  window.DentAIPDF.hasPending = () => pdfPending.size > 0;
  window.DentAIPDF.consumePending = () => {
    const out = pendingSendDocs;
    pendingSendDocs = [];
    return out;
  };

  window.DentAIPDF.getActiveContext = (maxChars = 120000) => {
    safeLoadPdfCache();

    const ids = Array.isArray(pdfCache.activeIds) ? pdfCache.activeIds : [];
    const docs = pdfCache.docs || {};

    let out =
      "PDF context (use as reference; do not mention this block unless the user asks):\n";

    for (const id of ids) {
      const d = docs[id];
      if (!d || !d.text) continue;

      const header = `\n--- PDF: ${d.name}${
        d.pages ? ` (${d.pages} pages)` : ""
      } ---\n`;

      // stop if would exceed
      if (out.length + header.length + d.text.length > maxChars) {
        const room = Math.max(0, maxChars - out.length - header.length);
        if (room > 500) {
          out += header + d.text.slice(0, room);
        }
        break;
      }

      out += header + d.text + "\n";
    }

    const trimmed = out.trim();

    if (
      trimmed ===
      "PDF context (use as reference; do not mention this block unless the user asks):"
    ) {
      return "";
    }

    return trimmed.length > maxChars ? trimmed.slice(0, maxChars) : trimmed;
  };
  window.DentAIPDF.setActiveByFile = (file, on) => {
    const id = pdfFileId(file);
    setPdfActive(id, !!on);
  };

  // init cache once
  safeLoadPdfCache();

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
    // Keep active PDF context aligned with what the user actually attached in this chat.
    pdfCache.activeIds = attached.map((f) => pdfFileId(f));
    safeSavePdfCache();

    if (!attached.length) {
      attachBar.hidden = true;
      return;
    }

    attachBar.hidden = false;

    attached.forEach((file, idx) => {
      const id = pdfFileId(file);
      const status = getPdfStatus(id);
      const suffix =
        status === "reading"
          ? " (reading…)"
          : status === "ready"
            ? ""
            : " (failed)";

      const chip = document.createElement("div");
      chip.className = "attachchip";

      const ico = document.createElement("div");
      ico.className = "pdfico";
      ico.appendChild(iconPdf());

      const name = document.createElement("div");
      name.className = "name";
      name.textContent = file.name + suffix;

      const x = document.createElement("button");
      x.type = "button";
      x.className = "x";
      x.setAttribute("aria-label", "Remove file");
      x.appendChild(iconX());
      x.addEventListener("click", () => {
        // remove from visible list
        attached.splice(idx, 1);
        // deactivate from sticky context too
        setPdfActive(id, false);
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

      const dup = attached.some(
        (x) =>
          x.name === f.name &&
          x.size === f.size &&
          x.lastModified === f.lastModified,
      );
      if (!dup) attached.push(f);

      // parse + sticky cache
      ensurePdfParsedAndCached(f);
    }

    renderAttachments();

    // allow picking same file again
    if (pdfInput) pdfInput.value = "";
  }

  async function triggerPdfPick() {
    if (!pdfInput) return;

    // Check if user is authenticated
    let isAuthenticated = false;
    try {
      if (window.dasSupabase?.auth) {
        const { data } = await window.dasSupabase.auth.getSession();
        isAuthenticated = !!data?.session;
      }
    } catch {}

    if (!isAuthenticated) {
      // Professional note for anonymous users
      alert(
        "PDF uploads are available to DentAIstudy members. Sign in or create a free account to upload documents.",
      );
      return;
    }

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
  // - click Generate: set active + close
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

    sealForSend();

    closeAddMenu();

    // AI reply is handled by assets/js/study-builder.js (Supabase Edge Function).
  });

  // init
  autoGrow();
  setSendState();
  renderAttachments();
})();
