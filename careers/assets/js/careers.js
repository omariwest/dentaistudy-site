(() => {
  "use strict";

  const ATTRIBUTION_KEYS = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "source",
    "ref",
    "job_source",
  ];

  const STORAGE_KEY = "dentaistudy_careers_attribution_v1";
  const MAX_RESUME_BYTES = 8 * 1024 * 1024;

  function readStoredAttribution() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function saveAttribution(data) {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Tracking must never block the page.
    }
  }

  function collectAttribution() {
    const url = new URL(window.location.href);
    const stored = readStoredAttribution();
    const incoming = {};

    ATTRIBUTION_KEYS.forEach((key) => {
      const value = url.searchParams.get(key);
      if (value) incoming[key] = value;
    });

    const merged = {
      ...stored,
      ...incoming,
      entry_path: stored.entry_path || window.location.pathname,
      referrer:
        stored.referrer ||
        (document.referrer &&
        !document.referrer.startsWith(window.location.origin)
          ? document.referrer
          : ""),
    };

    saveAttribution(merged);
    return merged;
  }

  function addAttributionToUrl(href, attribution) {
    try {
      const target = new URL(href, window.location.origin);
      if (target.origin !== window.location.origin) return href;

      ATTRIBUTION_KEYS.forEach((key) => {
        if (attribution[key] && !target.searchParams.has(key)) {
          target.searchParams.set(key, attribution[key]);
        }
      });

      return `${target.pathname}${target.search}${target.hash}`;
    } catch {
      return href;
    }
  }

  function trackEvent(name, params = {}) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, {
      ...params,
      page_path: window.location.pathname,
    });
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "";
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function isPdf(file) {
    if (!file) return false;
    return (
      file.type === "application/pdf" ||
      String(file.name || "").toLowerCase().endsWith(".pdf")
    );
  }

  function getFunctionErrorMessage(error) {
    if (!error) return "Your application could not be submitted.";
    return error.message || "Your application could not be submitted.";
  }


  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function closeCareerSelects(except = null) {
    document
      .querySelectorAll(".career-select-enhanced.is-open")
      .forEach((wrap) => {
        if (wrap === except) return;
        wrap.classList.remove("is-open");
        const trigger = wrap.querySelector(".career-select-button");
        if (trigger) trigger.setAttribute("aria-expanded", "false");
      });
  }

  function enhanceCareerSelects() {
    document
      .querySelectorAll("select.career-form-select:not([data-enhanced-select])")
      .forEach((select) => {
        select.setAttribute("data-enhanced-select", "true");

        const wrap = document.createElement("div");
        wrap.className = "career-select-enhanced";

        const button = document.createElement("button");
        button.type = "button";
        button.className = "career-select-button";
        button.setAttribute("aria-haspopup", "listbox");
        button.setAttribute("aria-expanded", "false");

        const menu = document.createElement("div");
        menu.className = "career-select-menu";
        menu.setAttribute("role", "listbox");

        select.parentNode.insertBefore(wrap, select);
        wrap.appendChild(select);
        wrap.appendChild(button);
        wrap.appendChild(menu);

        const close = () => {
          wrap.classList.remove("is-open");
          button.setAttribute("aria-expanded", "false");
        };

        const sync = () => {
          const selected =
            select.options[select.selectedIndex] || select.options[0];
          button.textContent = selected ? selected.textContent : "Select one";

          menu.innerHTML = Array.from(select.options)
            .map((option) => {
              const selectedClass = option.selected ? " is-selected" : "";
              const disabled = option.disabled ? " disabled" : "";
              return `<button type="button" class="career-select-option${selectedClass}" data-value="${escapeHtml(option.value)}" role="option"${disabled}>${escapeHtml(option.textContent)}</button>`;
            })
            .join("");

          menu.querySelectorAll(".career-select-option").forEach((optionButton) => {
            optionButton.addEventListener("click", () => {
              if (optionButton.disabled) return;
              select.value = optionButton.getAttribute("data-value");
              select.dispatchEvent(new Event("change", { bubbles: true }));
              close();
              sync();
            });
          });
        };

        const open = () => {
          closeCareerSelects(wrap);

          const buttonRect = button.getBoundingClientRect();
          const menuHeight = Math.min(menu.scrollHeight, 230) + 16;
          const scrollBoundary = button.closest(".career-drawer-body");
          const boundaryRect = scrollBoundary?.getBoundingClientRect();
          const boundaryTop = Math.max(boundaryRect?.top ?? 0, 8) + 8;
          const boundaryBottom =
            Math.min(boundaryRect?.bottom ?? window.innerHeight, window.innerHeight) - 8;
          const spaceBelow = boundaryBottom - buttonRect.bottom;
          const spaceAbove = buttonRect.top - boundaryTop;
          const shouldDropUp =
            spaceBelow < menuHeight && spaceAbove > spaceBelow;

          wrap.classList.toggle("is-dropup", shouldDropUp);
          wrap.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
        };

        button.addEventListener("click", () => {
          wrap.classList.contains("is-open") ? close() : open();
        });

        select.addEventListener("change", sync);
        select.addEventListener("invalid", () => {
          button.focus({ preventScroll: false });
        });

        new MutationObserver(sync).observe(select, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["selected"],
        });

        sync();
      });
  }

  document.addEventListener("click", (event) => {
    if (!event.target.closest(".career-select-enhanced")) {
      closeCareerSelects();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeCareerSelects();
  });

  const attribution = collectAttribution();

  document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const jobSlug = body.dataset.jobSlug || "dental-education-content-creator";

    enhanceCareerSelects();

    if (body.classList.contains("page-careers") && !body.classList.contains("page-career-detail")) {
      trackEvent("careers_view");
    }

    if (body.classList.contains("page-career-detail")) {
      trackEvent("career_job_view", { job_slug: jobSlug });
    }

    document
      .querySelectorAll('.career-role-title a, [data-career-apply], [data-career-track-link]')
      .forEach((link) => {
        const originalHref = link.getAttribute("href");
        if (!originalHref) return;

        link.setAttribute("href", addAttributionToUrl(originalHref, attribution));
        link.addEventListener("click", () => {
          trackEvent("career_job_click", {
            job_slug: link.dataset.jobSlug || jobSlug,
            link_text: (link.textContent || "").trim().slice(0, 80),
          });
        });
      });

    const drawer = document.querySelector("[data-career-drawer]");
    const backdrop = document.querySelector("[data-career-drawer-backdrop]");
    const openButton = document.querySelector("[data-career-drawer-open]");
    const closeButtons = document.querySelectorAll("[data-career-drawer-close]");
    const successClose = document.querySelector("[data-career-success-close]");
    const form = document.querySelector("[data-career-application-form]");
    const successPanel = document.querySelector("[data-career-success]");
    const statusEl = document.querySelector("[data-career-form-status]");
    const submitButton = document.querySelector("[data-career-submit]");

    const fileInput = document.querySelector("[data-career-file-input]");
    const fileDropzone = document.querySelector("[data-career-file-dropzone]");
    const fileButton = document.querySelector("[data-career-file-button]");
    const fileClear = document.querySelector("[data-career-file-clear]");
    const fileName = document.querySelector("[data-career-file-name]");
    const fileMeta = document.querySelector("[data-career-file-meta]");

    if (!drawer || !openButton || !form) return;

    let selectedResume = null;

    function setStatus(message = "", state = "") {
      if (!statusEl) return;
      statusEl.textContent = message;
      statusEl.classList.remove("is-error", "is-success");
      if (state === "error") statusEl.classList.add("is-error");
      if (state === "success") statusEl.classList.add("is-success");
    }

    function setFile(file) {
      selectedResume = file || null;

      if (!selectedResume) {
        if (fileInput) fileInput.value = "";
        fileDropzone?.classList.remove("has-file", "is-dragover");
        if (fileClear) fileClear.hidden = true;
        if (fileName) fileName.textContent = "Upload your CV";
        if (fileMeta) {
          fileMeta.textContent = "PDF only · up to 8 MB · click or drop a file here";
        }
        return;
      }

      fileDropzone?.classList.add("has-file");
      fileDropzone?.classList.remove("is-dragover");
      if (fileClear) fileClear.hidden = false;
      if (fileName) fileName.textContent = selectedResume.name;
      if (fileMeta) fileMeta.textContent = `PDF · ${formatBytes(selectedResume.size)}`;
    }

    function validateResume(file) {
      if (!file) return "Please attach your resume or CV as a PDF.";
      if (!isPdf(file)) return "Resume or CV must be a PDF file.";
      if (file.size > MAX_RESUME_BYTES) return "Resume or CV must be 8 MB or smaller.";
      return "";
    }

    function resetApplication() {
      form.reset();
      window.setTimeout(() => {
        form.querySelectorAll("select.career-form-select").forEach((select) => {
          select.dispatchEvent(new Event("change", { bubbles: true }));
        });
      }, 0);
      setFile(null);
      setStatus("");
      form.hidden = false;
      if (successPanel) successPanel.hidden = true;
    }

    function openDrawer() {
      drawer.classList.add("is-open");
      drawer.setAttribute("aria-hidden", "false");
      if (backdrop) backdrop.hidden = false;
      requestAnimationFrame(() => backdrop?.classList.add("is-open"));
      document.body.classList.add("career-drawer-open");
      trackEvent("career_apply_open", { job_slug: jobSlug });

      const firstField = form.querySelector('input[name="full_name"]');
      requestAnimationFrame(() => firstField?.focus({ preventScroll: true }));
    }

    function closeDrawer() {
      drawer.classList.remove("is-open");
      drawer.setAttribute("aria-hidden", "true");
      backdrop?.classList.remove("is-open");
      document.body.classList.remove("career-drawer-open");
      window.setTimeout(() => {
        if (backdrop && !drawer.classList.contains("is-open")) backdrop.hidden = true;
      }, 180);
    }

    openButton.addEventListener("click", openDrawer);
    closeButtons.forEach((button) => button.addEventListener("click", closeDrawer));
    successClose?.addEventListener("click", () => {
      closeDrawer();
      window.setTimeout(resetApplication, 220);
    });
    backdrop?.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && drawer.classList.contains("is-open")) {
        closeDrawer();
      }
    });

    fileButton?.addEventListener("click", () => fileInput?.click());
    fileClear?.addEventListener("click", () => setFile(null));

    fileInput?.addEventListener("change", () => {
      const file = fileInput.files?.[0] || null;
      const error = validateResume(file);
      if (error && file) {
        setFile(null);
        setStatus(error, "error");
        return;
      }
      setStatus("");
      setFile(file);
    });

    fileDropzone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      fileDropzone.classList.add("is-dragover");
    });

    fileDropzone?.addEventListener("dragleave", () => {
      fileDropzone.classList.remove("is-dragover");
    });

    fileDropzone?.addEventListener("drop", (event) => {
      event.preventDefault();
      fileDropzone.classList.remove("is-dragover");
      const file = event.dataTransfer?.files?.[0] || null;
      const error = validateResume(file);
      if (error) {
        setFile(null);
        setStatus(error, "error");
        return;
      }
      setStatus("");
      setFile(file);
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      setStatus("");

      if (!form.reportValidity()) return;

      const resumeError = validateResume(selectedResume || fileInput?.files?.[0]);
      if (resumeError) {
        setStatus(resumeError, "error");
        return;
      }

      const supabase = window.dasSupabase;
      if (!supabase?.functions) {
        setStatus("Application service is unavailable. Please try again.", "error");
        return;
      }

      const formData = new FormData(form);
      formData.set("resume", selectedResume || fileInput.files[0]);
      formData.set("attribution", JSON.stringify(attribution));

      const previousText = submitButton?.textContent || "Submit application";
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Submitting…";
      }

      trackEvent("career_application_submit", { job_slug: jobSlug });

      try {
        const { data, error } = await supabase.functions.invoke("career-apply", {
          body: formData,
        });

        if (error) {
          let message = getFunctionErrorMessage(error);
          try {
            const payload = await error.context?.json();
            if (payload?.error) message = payload.error;
          } catch {
            // Keep the function client error message.
          }
          throw new Error(message);
        }

        if (!data?.ok) {
          throw new Error(data?.error || "Your application could not be submitted.");
        }

        trackEvent("career_application_success", { job_slug: jobSlug });
        form.hidden = true;
        if (successPanel) {
          successPanel.hidden = false;
          successPanel.focus({ preventScroll: false });
        }
        setStatus("");
      } catch (error) {
        console.error("Career application error", error);
        trackEvent("career_application_error", { job_slug: jobSlug });
        setStatus(
          error?.message || "Something went wrong. Please try again.",
          "error",
        );
      } finally {
        if (submitButton) {
          submitButton.disabled = false;
          submitButton.textContent = previousText;
        }
      }
    });
  });
})();
