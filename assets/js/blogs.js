// blogs.js – blog listing engine (reads from window.BLOG_REGISTRY)
document.addEventListener("DOMContentLoaded", () => {
  const blogLibrary = document.getElementById("blog-library");
  const filters = Array.from(document.querySelectorAll(".blog-filter"));
  const searchInput = document.getElementById("blog-search");
  const loadMoreBtn = document.getElementById("load-more");

  if (!blogLibrary) return;

  const BLOG_REGISTRY = window.BLOG_REGISTRY || [];

  const TAG_META = {
    adex: { category: "adex", tag: "ADEX" },
    adc: { category: "adc", tag: "ADC" },
    inbde: { category: "inbde", tag: "INBDE" },
    ndecc: { category: "ndecc", tag: "NDECC" },
    ore: { category: "ore", tag: "ORE" },
    sdle: { category: "sdle", tag: "SDLE" },
    uae: { category: "uae", tag: "UAE" },
    operative: { category: "operative", tag: "Operative" },
    endo: { category: "endo", tag: "Endo" },
    endodontics: { category: "endo", tag: "Endo" },
    prostho: { category: "prostho", tag: "Prostho" },
    prosthodontics: { category: "prostho", tag: "Prostho" },
    ortho: { category: "ortho", tag: "Ortho" },
    orthodontics: { category: "ortho", tag: "Ortho" },
    pedo: { category: "pedo", tag: "Pedo" },
    perio: { category: "perio", tag: "Perio" },
    general: { category: "general", tag: "General" },
  };

  function getNormalizedMeta(url = "", rawTag = "") {
    const href = url.toLowerCase();
    const tag = rawTag.trim().toLowerCase();

    if (href.includes("blogs/adex/")) return TAG_META.adex;
    if (href.includes("blogs/adc/")) return TAG_META.adc;
    if (href.includes("blogs/inbde/")) return TAG_META.inbde;
    if (href.includes("blogs/ndecc/")) return TAG_META.ndecc;
    if (href.includes("blogs/ore/")) return TAG_META.ore;
    if (href.includes("blogs/sdle/")) return TAG_META.sdle;
    if (href.includes("blogs/uae/")) return TAG_META.uae;

    if (tag === "operative") return TAG_META.operative;
    if (tag === "endo" || tag === "endodontics") return TAG_META.endo;
    if (tag === "prostho" || tag === "prosthodontics") return TAG_META.prostho;
    if (tag === "ortho" || tag === "orthodontics") return TAG_META.ortho;
    if (tag === "pedo") return TAG_META.pedo;
    if (tag === "perio") return TAG_META.perio;

    return TAG_META.general;
  }

  function buildSearchText(parts) {
    return parts
      .filter(Boolean)
      .join(" ")
      .replace(/\bendo\b/gi, "endo endodontics endodontic")
      .replace(/\bortho\b/gi, "ortho orthodontics orthodontic")
      .replace(/\bprostho\b/gi, "prostho prosthodontics prosthodontic")
      .replace(/\bpedo\b/gi, "pedo pedodontics pediatric dentistry")
      .replace(/\bperio\b/gi, "perio periodontics periodontology periodontal")
      .toLowerCase()
      .replace(/[-_/]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function injectDynamicBlogs() {
    BLOG_REGISTRY.forEach((blog) => {
      const existing = blogLibrary.querySelector(
        `a.blog-card[href="${blog.url}"]`,
      );
      if (existing) return;

      const normalized = getNormalizedMeta(blog.url, blog.tag || "");

      const link = document.createElement("a");
      link.href = blog.url;
      link.className = "blog-card is-hidden";
      link.dataset.category = normalized.category;
      link.dataset.searchText = buildSearchText([
        normalized.tag,
        normalized.category,
        blog.tag,
        blog.category,
        blog.title,
        blog.description,
        blog.meta,
        blog.url,
      ]);

      const article = document.createElement("article");
      article.className = "subject-card";

      const tagDiv = document.createElement("div");
      tagDiv.className = "sidebar-tag";
      tagDiv.style.width = "max-content";
      tagDiv.textContent = normalized.tag;

      const h3 = document.createElement("h3");
      h3.textContent = blog.title;

      const p = document.createElement("p");
      p.textContent = blog.description;

      const metaDiv = document.createElement("div");
      metaDiv.className = "subject-ai";
      metaDiv.textContent = blog.meta;

      article.appendChild(tagDiv);
      article.appendChild(h3);
      article.appendChild(p);
      article.appendChild(metaDiv);

      link.appendChild(article);
      blogLibrary.appendChild(link);
    });
  }

  function normalizeExistingCards(cards) {
    cards.forEach((card) => {
      const href = card.getAttribute("href") || "";
      const tagEl = card.querySelector(".sidebar-tag");
      const title = card.querySelector("h3")?.textContent || "";
      const description = card.querySelector("p")?.textContent || "";
      const meta = card.querySelector(".subject-ai")?.textContent || "";
      const normalized = getNormalizedMeta(href, tagEl?.textContent || "");
      const rawCategory = card.getAttribute("data-category") || "";

      card.dataset.category = normalized.category;
      card.dataset.searchText = buildSearchText([
        normalized.tag,
        normalized.category,
        rawCategory,
        tagEl?.textContent || "",
        title,
        description,
        meta,
        href,
      ]);

      if (tagEl) tagEl.textContent = normalized.tag;
    });
  }

  injectDynamicBlogs();

  const cards = Array.from(document.querySelectorAll(".blog-card"));
  if (!cards.length) return;

  normalizeExistingCards(cards);

  let activeFilter = "all";
  const DEFAULT_VISIBLE_COUNT = 12;
  let visibleCount = DEFAULT_VISIBLE_COUNT;

  function applyVisibility() {
    const query = (searchInput && searchInput.value ? searchInput.value : "")
      .toLowerCase()
      .trim();

    const searchFilter = getSearchFilter(query);

    const filtered = cards.filter((card) => {
      const category = (card.dataset.category || "").toLowerCase();
      const searchText = (card.dataset.searchText || card.textContent || "")
        .toLowerCase()
        .trim();

      const matchFilter = activeFilter === "all" || category === activeFilter;

      const matchQuery = !query
        ? true
        : searchFilter
          ? category === searchFilter
          : matchesSearchText(searchText, query);

      return matchFilter && matchQuery;
    });

    const shouldPaginate = activeFilter === "all" && !query;
    const visibleCards = shouldPaginate
      ? filtered.slice(0, visibleCount)
      : filtered;

    cards.forEach((card) => {
      card.classList.add("is-hidden");
      card.style.display = "none";
    });

    visibleCards.forEach((card) => {
      card.classList.remove("is-hidden");
      card.style.display = "";
    });

    if (loadMoreBtn) {
      loadMoreBtn.style.display =
        shouldPaginate && filtered.length > visibleCount
          ? "inline-block"
          : "none";
    }
  }

  filters.forEach((btn) => {
    btn.addEventListener("click", () => {
      activeFilter = btn.dataset.filter || "all";
      filters.forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      visibleCount = DEFAULT_VISIBLE_COUNT;
      applyVisibility();
    });
  });

  const TAG_TO_FILTER = {
    adex: "adex",
    adc: "adc",
    inbde: "inbde",
    ndecc: "ndecc",
    ore: "ore",
    sdle: "sdle",
    uae: "uae",
    operative: "operative",
    endo: "endo",
    endodontics: "endo",
    prostho: "prostho",
    prosthodontics: "prostho",
    ortho: "ortho",
    orthodontics: "ortho",
    pedo: "pedo",
    perio: "perio",
    general: "general",
  };

  function getSearchFilter(query) {
    const q = (query || "").toLowerCase().trim();

    if (!q) return null;

    if (TAG_TO_FILTER[q]) return TAG_TO_FILTER[q];
    if (q.length < 3) return null;

    const matchingCategories = [
      ...new Set(
        Object.keys(TAG_TO_FILTER)
          .filter((key) => key.startsWith(q))
          .map((key) => TAG_TO_FILTER[key]),
      ),
    ];

    return matchingCategories.length === 1 ? matchingCategories[0] : null;
  }

  function matchesSearchText(searchText, query) {
    const q = (query || "").toLowerCase().trim();

    if (!q) return true;

    if (q.includes(" ")) {
      return searchText.includes(q);
    }

    return searchText
      .split(/\s+/)
      .filter(Boolean)
      .some((word) => word.startsWith(q));
  }

  function setActiveFilter(nextFilter) {
    activeFilter = nextFilter || "all";

    const pill = filters.find((b) => (b.dataset.filter || "") === activeFilter);
    filters.forEach((b) => b.classList.remove("is-active"));
    if (pill) pill.classList.add("is-active");

    visibleCount = DEFAULT_VISIBLE_COUNT;
    applyVisibility();
  }

  blogLibrary.addEventListener("click", (e) => {
    const tagEl = e.target.closest(".sidebar-tag");
    if (!tagEl) return;

    const raw = (tagEl.textContent || "").trim().toLowerCase();
    const mapped = TAG_TO_FILTER[raw] || raw;
    const exists = filters.some((b) => (b.dataset.filter || "") === mapped);
    if (!exists) return;

    setActiveFilter(mapped);

    if (searchInput) {
      searchInput.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      visibleCount = DEFAULT_VISIBLE_COUNT;
      applyVisibility();
    });
  }

  if (loadMoreBtn) {
    loadMoreBtn.addEventListener("click", () => {
      visibleCount += DEFAULT_VISIBLE_COUNT;
      applyVisibility();
    });
  }

  applyVisibility();
});
