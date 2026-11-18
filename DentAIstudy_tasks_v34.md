# DentAIstudy — Master Task Plan

Updated: 2026-11-18 | Format: Markdown (.md) | Version: 34

## Operating identity — read before every task

Act as a **senior SaaS engineer + product thinker + compliance-aware founder sitting next to Ammar**, not as an online guide or documentation bot.

### 2027 article rollout lock — non-negotiable

- **NO NEW STYLES OR CSS for this rollout.** We are adding articles, not redesigning DentAIstudy. Do not create a new stylesheet, `<style>` block, CSS override, new design system, or visual component. Reuse the existing `assets/css/style-v3.css`, existing article/hub classes, existing inline component markup, existing header/footer and existing JavaScript only.
- Every new article must be built by duplicating the closest existing live article template in the same exam cluster and replacing only the page-specific SEO/head/content fields. Preserve the current shared site chrome and scripts.
- Preserve the approved Oct 19 ad structure exactly: existing banner positions **1, 2 and 3**, the existing Native mount, and the existing loader in `assets/js/main.js`. Do not invent new ad placements or ad CSS.
- **Contextual internal links are mandatory inside the article body.** Each new article should contain at least **5 smart, relevant article-to-article links inside the main content**, separate from the Related Articles block at the end. Links should strengthen the topic cluster naturally, not be stuffed mechanically.
- **Hub architecture is mandatory but happens after the article-page waves.** Every exam hub will receive a dedicated **2027 section above the existing 2026 section**, containing the appropriate new 2027 articles as the roadmap/map for that exam. The existing 2026 hub content and 2026 article URLs stay intact below it.
- Sequence for integration: **article waves first → hub/registry/sitemap discovery pass afterward**. Do not interrupt each article wave to rebuild the hubs. Once article pages are integrated, update the relevant exam hubs, `blogs-*.js` registries and `sitemap.xml` together so all new pages become discoverable in one controlled pass.

Working behaviour:

- Think first; prioritize outcomes over completeness.
- Keep replies short and non-repetitive. Work more, explain less.
- Choose the simplest clean solution that fully fixes the problem.
- Push back calmly on unnecessary, risky, premature, weak, or over-engineered ideas.
- Do not leave temporary hacks, cheap overrides, hidden obsolete code, or “fix later” debt.
- Edit existing code blocks rather than appending competing overrides. HTML stays in HTML, CSS in CSS files, JS in JS files. No `!important` workaround unless technically unavoidable and explicitly justified.
- For production changes, inspect the real code/data first, make the smallest complete edit, verify it, then record the result here.
- For article work, factual accuracy is more important than speed. Use primary exam-authority sources for dates, fees, rules, eligibility, booking and policy claims. Never invent missing 2027 facts.
- Existing 2026 articles and URLs remain untouched unless a separate task explicitly changes that decision.
- Preserve DentAIstudy’s existing article system: exam hubs, contextual internal links, Related Articles, How DentAIstudy Helps, References, approved ads, blog registries and sitemap.
- One clean task/batch at a time to reduce hallucinations and typos. Do not declare completion until the relevant live or source-level verification passes.

At the end of every working response, report:
`Current task: ...`
`Finished: ...`
`Next task: ...`
`Remaining until project plan is complete: ...`

## Objective

Use current search traffic to fund marketing, repair/verify the Study Suite, and publish **40 NEW, distinct 2027 exam articles**. Keep all existing 2026 articles and URLs unchanged. Financial goal: **$300/month** from ads; this is a target, **not** a proven forecast.

## Verified Adsterra baseline — Tasks 1 & 2 (Oct 31, 2026)

- The new daily report covers **Jul 22–Oct 31**, **not January onward**: **35,613 impressions, $24.76 revenue**. The accompanying placement-only report sums to **35,613 impressions, $24.77** (1-cent rounding difference), and every placement names **dentaistudy.com**. Thus this dataset is site-specific.
- The older general Adsterra report differs materially (notably Sep 28–29) and likely has different filters; this is **not evidence of withheld payments or fraud**. For DentAIstudy use the newly reconciled report and do not add the old figures.
- **Comparison:** Oct 1–18 excluding unusual Oct 7 ($7.11): 17 days; 5,424 impressions, $1.89, **319 impressions/day, $0.348 eCPM, $0.111/day**. Oct 19–30: 12 days; 3,029 impressions, $2.19, **252 impressions/day, $0.723 eCPM, $0.183/day**. **Impressions/day down 21%, eCPM up 107%, revenue/day up 64%.** Excluding the exceptional outlier is necessary for a useful normal-day comparison; it was real reported revenue, not erased from the lifetime total.
- **Decision: retain Oct 19 layout.** Its normal-day yield improved, although total impression volume decreased; 12 post-change days do not prove the decline was caused by the layout.
- Lifetime placement breakdown: 728x90 desktop **$18.22**; 320x50 mobile **$5.69**; 300x250 **$0.46**; Native **$0.13**; Social Bar **$0.22**; Popunder **$0.05**. All-time placement revenue includes pre-Oct-19 income and exceptional CPM days, so it cannot identify post-change incremental revenue by format.
- **Actual code issue corrected:** `assets/js/main.js` previously requested the native ad only after awaiting all three display-banner `onload`/`onerror` events. Moved the existing `loadNativeBanner()` call ahead of that loop so a stalled banner request cannot block native initialization. No CSS, markup, configuration, ad frequency, or placement changed. **GitHub commit `be880ee59b2b64cdf7130b92e1ecc6c0494b6ae3`**, verified by re-fetching the file. Production deployment and live-browser ad delivery have **not** been independently verified; revenue effect is not yet known.
- **$300/month:** at Oct 19–30 realized $0.723 eCPM, need **~415,000 ad impressions/month (~13,830/day)**; that is **~55 times** current 252/day. At an aspirational $1.50 eCPM, need 200,000/month. The current pace projects **$5.48/month**, not $300. An exact number of new articles required cannot be inferred from current data. Keep the 40-article publishing target but judge it by new organic sessions and revenue, not quantity alone.
- Strategy: **(1)** keep existing banner layout; **(2)** preserve the independent Native loader fix and observe live performance; **(3)** grow 2027 exam-query traffic via distinct factual pages and internal navigation; **(4)** track per-day ads/organic traffic and revisit yield after 28 days. No added invasive ad units until a measured benefit justifies them.

## Exam Coach incident — Task 3 (Oct 31, 2026; regression correction)

- Initial v97 fix was insufficient. New screenshots and Supabase `public.messages` record 2964 confirmed the model returned **128,393 characters**, including two malformed Markdown table-separator lines of **90,535 and 33,783 characters** (mostly hyphens). Logs showed `MAX_TOKENS` for both Gemini 2.5 Flash-Lite and the fallback Flash. The backend still returned HTTP 200 because its former guard mainly inspected the response ending; GitHub's renderer merely displayed the malformed source. **Not a CSS problem.**
- **Historical v98 change (superseded):** Explicit requests for tables use Gemini 2.5 Flash directly with compact Markdown table instructions; other requests retain Flash-Lite. Before a successful response, check for oversized content (>30,000 chars), oversized lines (>1,500 chars), malformed pipe-table headers/separators, and truncated Markdown. Retry malformed answers once with a fresh compact-table prompt; reject if still invalid. No HTML, CSS, or frontend JavaScript edits.
- **Existing bad chat repaired in database:** only assistant record **2964** was cleaned from 128,393 to **4,033 characters**: removed the four damaged secondary-table rows and inserted a valid separator after the existing ten-principle header. Original clinical text and user messages preserved. Reopening/reloading the chat retrieves the corrected answer.
- **Previously verified for v98 only:** Supabase v98 was deployed and re-fetched with the guard intact; 11 local format-guard cases passed (valid tables, missing separators, runaway 90k-dash line, normal prose); existing GitHub renderer recognizes the repaired `| --- | --- |` separator. **An authenticated, live model-and-browser replay has NOT been performed.** Task 3 stays pending until a clean live answer is observed; do not move the live check to Task 4 or claim a full end-to-end pass.

### Nov 1 — Table request follow-up (v99)

- **Confirmed failure:** Two new messages (2968, 2970) recorded `AI_GENERATION_ERROR`. Supabase Edge logs at 16:36 and 16:39 UTC showed HTTP 500 from our own `EXAM_COACH_INVALID_MARKDOWN` guard. Gemini 2.5 Flash also logged `MAX_TOKENS`. The original orthodontic answer (2966, 3,144 characters) was correctly generated. This was a backend regression, not a styling defect.
- **Change:** Deployed `ai-generate` **v99 (ACTIVE)**. For requests to turn **this/previous/above/last answer into a table**, when the prior answer is a numbered list with bold labels, the existing QA handler converts those items directly into Markdown rows. It skips previous error messages, preserves the clinical wording, and returns a valid `| --- | --- | --- |` header without another Gemini call. Other AI requests and the frontend are unchanged.
- **Verified:** Re-fetched the deployed v99 source; simulated the real saved conversation (including both error messages); verified 10 consecutively numbered rows from answer 2966, no oversized rows, and the correct table separator. The actual production browser replay has **not** been observed from this session. No further QA conclusions until the user verifies one live result.
- **Scope:** Direct conversion applies to structured numbered answers; other table-generating requests still use the existing model path and can require separate diagnosis if they fail. We will not expand functionality speculatively.

### Nov 1 — General Exam Coach response pipeline (v100)

- **Architecture replacement:** V99 table-wording detection, model switching, bespoke numbered-list converter, malformed-Markdown throw, and Exam Coach continuation/retry chain removed from the QA path. Gemini 2.5 Flash-Lite now generates a schema-guided ordered array of markdown/table blocks; the backend renders every table deterministically with standard `| --- |` separators, then returns the existing `{ content }` response. Generic requests, comparisons, prior-answer conversions, MCQs, and mixed content all use this same path.
- **Bounded operation:** Thinking budget 0 for Exam Coach; 6,000 output tokens normally (up to 9,000 for larger MCQs). Maximum **two** provider requests per user turn, beginning each from the original context; no continuation, no joining fragments, 50-second total deadline. `MAX_TOKENS` and malformed/incomplete structured output cannot be returned as completed answers. Responses are checked for valid JSON, field types, table column counts, empty responses, oversized blocks/lines, repetition, and final length. A double failure returns HTTP 502 `OUTPUT_UNAVAILABLE` rather than an internal markdown exception or HTTP 200 with corrupted content.
- **Scope isolation:** Shared Notes/Flashcards/Quiz Gemini-generation functions and their schemas are unchanged. Frontend HTML/CSS and table renderer unchanged. In `assets/js/study-builder.js`, errors are now shown without saving them as assistant messages; valid answers and the existing quota branch remain unchanged.
- **Deployed:** Supabase `ai-generate` **v100 ACTIVE**. GitHub commit **`0258878ad8865e8a6670d93d48cd07cab059b19e`** changes only `assets/js/study-builder.js` error persistence. Both deployed source and committed frontend re-fetched and inspected.
- **Verification:** 14 mocked structured-output validation cases passed (valid/malformed tables, 90k hyphen attacks, oversized blocks, unknown kinds, empty data); 5 actual frontend-renderer integration fixtures passed (10-row table, unnumbered pediatric content, mixed prose/table, MCQs, special characters). Frontend JavaScript syntax validated. **A live authenticated production Gemini response is not yet verified; Task 3 remains OPEN.**
- **Live acceptance:** Test (1) an ordinary dental explanation, (2) converting it into a table without specific wording, (3) a new independent comparison/table question, and (4) a new MCQ or clinical follow-up. Confirm no generation error, malformed rows or stored failure text; verify page reload preserves valid results. If any fails, inspect the `EXAM_COACH_GENERATION` and `EXAM_COACH_UNAVAILABLE` logs before changing code. Continue to Task 4 (Notes/Flashcards/Quiz) only after these pass.

## Working rules

- **One technical/production task per chat.** Article drafting is the exception: up to 8 article drafts may be collected in one review/staging batch because each article is still generated by a separate prompt. Mark `[x]` only after the task is verified.
- Make the smallest complete fix. Touch backend/frontend together only when needed by the same feature.
- Edit existing blocks, not appended overrides. Keep HTML/CSS/JS in their own files. No `!important`, hiding obsolete markup, or unfinished cleanup.
- For articles: verify primary exam-authority sources, publish genuinely updated year-specific facts, include existing approved ad placements, and test desktop/mobile. Do not change 2026 articles.
- Publishing allocations are **targets**. Task 5 assigns real search intent to every URL; reallocate weak slots rather than publish redundant filler.

## Foundation tasks

- [x] **Task 0 — Plan and baseline review.** Compared reports, inspected screenshots, Supabase and GitHub. 2027 article target agreed.
- [x] **Task 1 — Adsterra revenue investigation.** Reconciled the DentAIstudy-only daily and placement reports; compared pre/post Oct 19; old mixed/filtered export no longer used for site revenue. No demonstrated fraud.
- [x] **Task 2 — Ad delivery and yield audit + minimal fix.** Analyzed all placement totals, inspected GitHub ad HTML/JS/CSS, retained Oct 19 placements, decoupled Native load and verified GitHub commit. Live-browser request/fill tests were unavailable, so no claim of a measured post-fix lift. Observe after deployment in Task 46.
- [x] **Task 3 — Exam Coach complete response pipeline.** Supabase V100 and GitHub `0258878` deployed; local validation passed; user confirmed production Exam Coach answers, tables, MCQs and notes successfully (2026-11-01).
- [x] **Task 4 — Study Suite quick end-to-end QA.** User tested Notes, Flashcards and Quizzes successfully and reports all working (2026-11-01). No further changes requested.
- [x] **Task 5 — 2027 article research, drafting and staging.** All 40 research-backed article slots passed the evidence/differentiation gate, were drafted, reviewed and safely staged as branch-only minimal HTML. Production styling/integration remains a separate publication phase.

## Task 5 research basis (2026-11-01)

**Research conducted:** Analyzed Search Console `Queries.csv` (top 1,000 exported queries, last 12 months through 2026-10-19), `Pages.csv` (438 pages), checked all 271 existing `blogs/*.html` paths in GitHub, and verified currently available information from ADC, NDEB, GDC, JCNDE, and UAE residency education sources. No proposed slug currently exists in the GitHub tree. GSC impressions are **site appearances**, not total Google search volume. Queries absent from top 1,000 are **not proven zero-demand**.

**Strongest direct signals:** `acj exam dates 2027` 183 impressions; `ndecc exam dates 2027` 153 (7 clicks); `afk exam dates 2027` 142; `afk registration 2027` 56; `adc exam dates 2027` 52 (2 clicks); `ndeb exam dates 2027` 45. Combined **631 impressions, 9 clicks**. No exported 2027 queries yet for ORE/INBDE/SDLE/UAE. Strong legacy signals include `adc exam fees` 449, `ndecc results 2026` 420, `ore part 1` 565, `inbde results` 718; see each brief.

**Decision:** Reallocate from original 14 ADC / 12 Canada / 8 ORE / 3 INBDE / 3 UAE-SDLE to **10 ADC / 16 Canada / 7 ORE / 3 INBDE / 2 ADEX / 2 UAE-SDLE**. Canada gains four slots because actual 2027 search demand is already measurable. ADEX gains two reserve slots over unproven ADC allied-profession expansions because existing ADEX pages already attract searchers. Preserve exactly **40 new candidate briefs**, not 40 guaranteed winners. Publish **NOW** (12 confirmed useful), then **SOON** (15 supporting intents), and treat **RESERVE** (13) as provisional until additional evidence/official updates justify them. Replace weak reserve ideas rather than fabricate yearly changes or duplicate old content. Keep all existing 2026 URLs and article bodies unchanged.

**Title principle:** Exact searched phrase leads the title; the rest names the reader's action (booking, eligibility, results, fees). The slug is shorter and includes `2027` so the distinct year is unmistakable. Calendar overview pages provide cross-exam comparison and link to deeper exam-specific pages; registration pages explain the _procedure_, not repeat date tables. Each article will include primary-source citations, a visible **last verified** date, an approved ad layout, and internal links to the appropriate existing evergreen/hub content. No invented dates, fees, or registration promises.

**Evidence codes:** `DIRECT` = query explicitly includes 2027 in GSC; `LEGACY` = same intent visible in earlier-year or undated GSC; `OFFICIAL` = confirmed new 2027 calendar or 2026 policy change; `HYP` = keyword opportunity not independently validated by the existing export. Official primary-source reference keys appear after the briefs.

## Proposed publishing tasks — full 40 briefs

### Canada / NDEB

| Task | Priority | Exact proposed article title                                         | New path / slug                                      | Intent and evidence: why this title                                                                                    | Source     |
| ---: | -------- | -------------------------------------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ---------- |
|    6 | NOW      | **ACJ Exam Dates 2027: May and November Sessions & Deadlines**       | `/blogs/ndecc/acj-exam-dates-2027.html`              | **DIRECT ·** 183 direct 2027 GSC impressions; NDEB calendar names sessions.                                            | NDEB-DATES |
|    7 | NOW      | **NDECC Exam Dates 2027: Calendar, Ottawa Sessions & Registration**  | `/blogs/ndecc/ndecc-exam-dates-2027.html`            | **DIRECT ·** 153 direct impressions/7 clicks; existing 2026 calendar has 188 clicks.                                   | NDEB-DATES |
|    8 | NOW      | **AFK Exam Dates 2027: February, August & Registration Deadlines**   | `/blogs/ndecc/afk-exam-dates-2027.html`              | **DIRECT ·** 142 direct impressions; NDEB lists 2027 sittings.                                                         | NDEB-DATES |
|    9 | NOW      | **AFK Registration 2027: Booking, Seat Availability & Deadlines**    | `/blogs/ndecc/afk-registration-2027.html`            | **DIRECT ·** 56 direct impressions; distinct booking task, with new NDEB two-window process.                           | NDEB-REG   |
|   10 | NOW      | **NDEB 2027 Exam Calendar: Compare AFK, ACJ, NDECC & OSCE**          | `/blogs/ndecc/ndeb-exam-calendar-2027.html`          | **DIRECT ·** 45 direct impressions; one at-a-glance overview linking to exam-specific pages.                           | NDEB-DATES |
|   11 | SOON     | **ACJ Registration 2027: Prometric Booking, Deadlines & Transfers**  | `/blogs/ndecc/acj-registration-2027.html`            | **LEGACY ·** 197 non-year GSC impressions; NDEB changed registration/transfer rules.                                   | NDEB-REG   |
|   12 | SOON     | **NDECC Registration 2027: Eligibility, Ottawa Booking & Documents** | `/blogs/ndecc/ndecc-registration-2027.html`          | **OFFICIAL ·** Distinct action intent from NDECC dates; the 2026 calendar page has 15,894 impressions.                 | NDEB-DATES |
|   13 | SOON     | **NDECC Results 2027: Where to Check, Timing & Next Steps**          | `/blogs/ndecc/ndecc-results-2027.html`               | **LEGACY ·** Legacy query ndecc results 2026 had 420 impressions/17 clicks; do not promise exact release dates.        | NDEB-HOME  |
|   14 | RESERVE  | **AFK Results 2027: Score Reports, Passing & Next Steps**            | `/blogs/ndecc/afk-results-2027.html`                 | **HYP ·** AFK result intent inferred from NDEB pathway, not shown as 2027 query in exported top 1,000.                 | NDEB-AFK   |
|   15 | RESERVE  | **ACJ Results 2027: Score Reports and Retake Decisions**             | `/blogs/ndecc/acj-results-2027.html`                 | **HYP ·** ACJ result-stage intent; reserve pending additional query evidence.                                          | NDEB-ACJ   |
|   16 | SOON     | **NDECC Protocol 2027: Candidate Rules, Preparation & Grading**      | `/blogs/ndecc/ndecc-protocol-2027.html`              | **LEGACY ·** 310 impressions for ndecc protocol + 233 for ndecc protocol 2026; check official 2027 protocol version.   | NDEB-HOME  |
|   17 | RESERVE  | **NDECC Clinical Skills 2027: Procedures and Candidate Checklist**   | `/blogs/ndecc/ndecc-clinical-skills-2027.html`       | **LEGACY ·** 222 impressions for ndecc practical guide, but a year-specific change is not yet established.             | NDEB-HOME  |
|   18 | RESERVE  | **NDECC Situational Judgement 2027: Tasks, Preparation & Scoring**   | `/blogs/ndecc/ndecc-situational-judgement-2027.html` | **HYP ·** Separately defined exam component; no direct 2027 query evidence; verify official blueprint first.           | NDEB-HOME  |
|   19 | RESERVE  | **AFK 2027 Format and Syllabus: Questions, Timing & Topics**         | `/blogs/ndecc/afk-format-syllabus-2027.html`         | **HYP ·** NDEB documents 200 MCQs; stable evergreen topic, so publish only if 2027-specific gap exists.                | NDEB-AFK   |
|   20 | RESERVE  | **ACJ 2027 Exam Format and Scoring: What Candidates Face**           | `/blogs/ndecc/acj-format-scoring-2027.html`          | **HYP ·** Official exam mechanics support substance, but no measured 2027 query; avoid copying evergreen pathway page. | NDEB-ACJ   |
|   21 | SOON     | **NDEB Equivalency Timeline 2027: Planning AFK, ACJ and NDECC**      | `/blogs/ndecc/ndeb-equivalency-timeline-2027.html`   | **OFFICIAL ·** The new registration windows change scheduling decisions; distinct from evergreen pathway explanation.  | NDEB-REG   |

### ADC Australia

| Task | Priority | Exact proposed article title                                               | New path / slug                                        | Intent and evidence: why this title                                                                             | Source        |
| ---: | -------- | -------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ------------- |
|   22 | NOW      | **ADC Exam Dates 2027: Written, Practical & Application Calendar**         | `/blogs/adc/adc-exam-dates-2027.html`                  | **DIRECT ·** 52 direct 2027 impressions/2 clicks; 2026 calendar earned 363 clicks; ADC published 2027 calendar. | ADC-WRITTEN   |
|   23 | NOW      | **ADC March 2027 Written Exam: Dates, Eligibility & Application Deadline** | `/blogs/adc/adc-march-2027-written-exam.html`          | **LEGACY ·** Official March 17–18 exam and December 2026 application period; distinct urgent sitting intent.    | ADC-WRITTEN   |
|   24 | NOW      | **ADC September 2027 Written Exam: Dates & June Applications**             | `/blogs/adc/adc-september-2027-written-exam.html`      | **OFFICIAL ·** Official September 8–9 sitting and June booking window; separate cycle from March.               | ADC-WRITTEN   |
|   25 | NOW      | **ADC Practical Exam Dates 2027: Periods 1–3 & Date Selection**            | `/blogs/adc/adc-practical-exam-dates-2027.html`        | **LEGACY ·** Legacy 2026 practical date queries: 374+265 impressions; three official 2027 periods.              | ADC-PRACTICAL |
|   26 | SOON     | **ADC Practical Exam Waitlist 2027: Priority and Eligibility Rules**       | `/blogs/adc/adc-practical-waitlist-2027.html`          | **OFFICIAL ·** ADC October 2026 release introduced specific 2027 application stages and waitlist policy.        | ADC-WAIT      |
|   27 | SOON     | **ADC Initial Assessment 2027: Documents, Eligibility & Deadlines**        | `/blogs/adc/adc-initial-assessment-2027.html`          | **LEGACY ·** Legacy initial assessment 768 impressions, documents 297; old 2026 assessment page 237 clicks.     | ADC-WRITTEN   |
|   28 | SOON     | **ADC Written Exam Booking 2027: Pearson VUE Procedure**                   | `/blogs/adc/adc-written-booking-pearson-vue-2027.html` | **LEGACY ·** 256 impressions for pearsonvue adc; ADC announced a booking-procedure update in Sep 2026.          | ADC-NEWS      |
|   29 | SOON     | **ADC Exam Fees 2027: Written, Practical & Assessment Costs**              | `/blogs/adc/adc-exam-fees-2027.html`                   | **LEGACY ·** 449 impressions for adc exam fees; verify each rate and label source update date.                  | ADC-OVERVIEW  |
|   30 | RESERVE  | **ADC Practical Exam Results 2027: Timing, Validity & Next Steps**         | `/blogs/adc/adc-practical-results-2027.html`           | **HYP ·** Official timing/validity exist; no confirmed 2027 query in export.                                    | ADC-PRACTICAL |
|   31 | RESERVE  | **ADC Practical Eligibility 2027: Valid Written and Initial Assessment**   | `/blogs/adc/adc-practical-eligibility-2027.html`       | **HYP ·** Distinct deadline/expiry decision; existing written-validity page must not be repeated.               | ADC-PRACTICAL |

### ADEX USA

| Task | Priority | Exact proposed article title                                           | New path / slug                                     | Intent and evidence: why this title                                                                                                      | Source        |
| ---: | -------- | ---------------------------------------------------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
|   32 | RESERVE  | **ADEX Exam Dates 2027: CDCA-WREB-CITA Sites and Registration**        | `/blogs/adex/adex-exam-dates-2027.html`             | **OFFICIAL ·** ADEX exam 486 GSC impressions; adex testing 374; site-level schedules differ by test center, not a single national date.  | ADEX-CALENDAR |
|   33 | RESERVE  | **ADEX 2027 Candidate Guide: DLOSCE, Exam Components and Eligibility** | `/blogs/adex/adex-candidate-guide-dlosce-2027.html` | **OFFICIAL ·** ADEX OSCE 83 impressions; California board notes 2026 DLOSCE change; verify applicability by jurisdiction and 2027 guide. | ADEX-DLOSCE   |

### ORE UK

| Task | Priority | Exact proposed article title                                          | New path / slug                                | Intent and evidence: why this title                                                                                     | Source      |
| ---: | -------- | --------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------- |
|   34 | NOW      | **ORE Exam Dates 2027: Part 1 and Part 2 Confirmed Sittings**         | `/blogs/ore/ore-exam-dates-2027.html`          | **LEGACY ·** GDC has published confirmed Jan–Apr 2027 sittings; no 2027 GSC query yet.                                  | GDC-2027    |
|   35 | NOW      | **ORE Part 1 Booking 2027: February/April Dates and Exam Seats**      | `/blogs/ore/ore-part-1-booking-2027.html`      | **LEGACY ·** GDC confirmed Feb/Apr sittings, 600 seats per sitting; more specific booking intent.                       | GDC-ORE1    |
|   36 | NOW      | **ORE Part 2 Booking 2027: January, March and April Sittings**        | `/blogs/ore/ore-part-2-booking-2027.html`      | **LEGACY ·** GDC confirmed three early-2027 Part 2 sittings; distinct limited-seat decision.                            | GDC-ORE2    |
|   37 | SOON     | **ORE Exam Fees 2027: Part 1, Part 2 and Total Exam Costs**           | `/blogs/ore/ore-exam-fees-2027.html`           | **LEGACY ·** 70 GSC impressions for ore exam fees; GDC new contract changed fees.                                       | GDC-2027    |
|   38 | SOON     | **ORE Booking 2027: MyGDC, Waiting for Seats and Cancellations**      | `/blogs/ore/ore-booking-system-2027.html`      | **OFFICIAL ·** Official guidance documents scarce seats and reopened cancellations; actionable separate booking intent. | GDC-BOOKING |
|   39 | SOON     | **ORE 2027 Changes: UCL Exam Provider, Capacity and New Booking**     | `/blogs/ore/ore-2027-ucl-booking-changes.html` | **OFFICIAL ·** GDC changed provider/capacity, giving a genuine 2027 policy story beyond rewriting old guides.           | GDC-2027    |
|   40 | RESERVE  | **ORE Priority Booking 2027: Five-Year Limit & Refugee Arrangements** | `/blogs/ore/ore-priority-booking-2027.html`    | **OFFICIAL ·** Official GDC priority rules; avoid copying the evergreen five-year rule article.                         | GDC-BOOKING |

### INBDE USA

| Task | Priority | Exact proposed article title                                        | New path / slug                           | Intent and evidence: why this title                                                                                                       | Source         |
| ---: | -------- | ------------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
|   41 | SOON     | **INBDE Exam Dates 2027: How Prometric Scheduling Actually Works**  | `/blogs/inbde/inbde-exam-dates-2027.html` | **LEGACY ·** Legacy 2026 dates query 187 impressions; there is no fixed annual national sitting list.                                     | INBDE-OFFICIAL |
|   42 | SOON     | **INBDE Exam Fees 2027: Application and Rescheduling Costs**        | `/blogs/inbde/inbde-exam-fees-2027.html`  | **LEGACY ·** Legacy fee query 235 impressions + exam cost 137; confirm 2027 candidate guide prices before publication.                    | INBDE-OFFICIAL |
|   43 | SOON     | **INBDE Results 2027: Score Reports, Timing and What Happens Next** | `/blogs/inbde/inbde-results-2027.html`    | **LEGACY ·** Legacy results query 718 impressions, scores 316, score report 186; separate timing/reporting from existing scoring article. | INBDE-OFFICIAL |

### UAE / SDLE

| Task | Priority | Exact proposed article title                                       | New path / slug                                          | Intent and evidence: why this title                                                                                                                                                                                                      | Source        |
| ---: | -------- | ------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
|   44 | RESERVE  | **EDREE 2027: UAE Dental Residency Exam and Application Planning** | `/blogs/uae/edree-2027-uae-dental-residency-exam.html`   | **LEGACY ·** EDREE site page has 162 clicks/6,308 impressions. Final draft explicitly states that NIHS has not yet published a public 2027 sitting calendar and uses current registration/format/result rules instead of invented dates. | EDREE-UNI     |
|   45 | RESERVE  | **SDLE 2027: Registration, Prometric Booking and Exam Fees**       | `/blogs/sdle/sdle-2027-registration-prometric-fees.html` | **LEGACY ·** sdle generic 651 impressions and sdle exam 225; no verified 2027 schedule/fee change.                                                                                                                                       | SDLE-PROVIDER |

## Primary-source references for proposed articles

- **NDEB-DATES:** https://ndeb-bned.ca/examination-dates-and-locations/ — session schedules and deadlines (recheck immediately before drafting).
- **NDEB-REG:** https://ndeb-bned.ca/2026/08/13/changes-to-the-exam-registration-process/ — new two-window registration/transfer policies.
- **NDEB-HOME:** https://ndeb-bned.ca/ — official candidate routes and examination resources; verify relevant protocol/result pages per article.
- **NDEB-AFK:** https://ndeb-bned.ca/equivalency-process/assessment-of-fundamental-knowledge/ — format and official details.
- **NDEB-ACJ:** https://ndeb-bned.ca/equivalency-process/assessment-of-clinical-judgement-acj/ — ACJ requirements and registration.
- **ADC-WRITTEN:** https://www.adc.org.au/internationally-qualified-dental-practitioners/dentists/written-examination/ — two confirmed 2027 written sittings.
- **ADC-PRACTICAL:** https://www.adc.org.au/internationally-qualified-dental-practitioners/dentists/practical-examination/ — three 2027 practical periods.
- **ADC-WAIT:** https://www.adc.org.au/news/2027-period-1-general-dentistry-practical-examination-application-period-stages-have-been-released/ — priority and waiting-list stages.
- **ADC-OVERVIEW:** https://www.adc.org.au/internationally-qualified-dental-practitioners/dentists/overview/ — fees and eligibility (recheck rates).
- **ADC-NEWS:** https://www.adc.org.au/about-the-adc/resources/news/ — September 2026 booking-procedure notice.
- **ADEX-CALENDAR:** https://adextesting.org/exam-calendars/ — official CDCA-WREB-CITA calendar by location; verify active dates from the production site.
- **ADEX-DLOSCE:** https://www.dbc.ca.gov/applicants/licensure_by_adex.shtml — state-board guidance on DLOSCE replacement; other states may differ.
- **GDC-2027:** https://www.gdc-uk.org/news-blogs/news/detail/2026/05/06/first-ore-sittings-and-fees-under-new-contract-confirmed — confirmed sittings, capacity, fees.
- **GDC-ORE1:** https://www.gdc-uk.org/registration/overseas-registration-exam/ore-part-1 — part 1 details.
- **GDC-ORE2:** https://www.gdc-uk.org/registration/overseas-registration-exam/ore-part-2 — part 2 details.
- **GDC-BOOKING:** https://www.gdc-uk.org/registration/overseas-registration-exam/applying-for-ore/booking-your-exam — booking and cancellations.
- **INBDE-OFFICIAL:** https://jcnde.ada.org/inbde — JCNDE exam, guide, scheduling and score reports; 2027 edition/rates must be verified when available.
- **EDREE-UNI:** https://www.mbru.ac.ae/graduate-medical-education/residency-admissions/ — program eligibility references EDREE; **not** confirmed 2027 exam dates.
- **SDLE-PROVIDER:** https://scfhs.org.sa/ — verify current licensure exam details from official SCFHS pages; **no independently verified 2027 date or fee claim**.

## Article-writer benchmark — 2026-11-17

Four long-form drafting approaches were compared for factual discipline, source handling, useful depth, internal-link hygiene and cleanup cost.

1. **PRIMARY WRITER + FINAL EDITOR — ChatGPT GPT-5.6 Sol.** From V13 onward, ChatGPT is allowed to write production articles directly, not only review them. It must browse current primary exam-authority sources before drafting and remains the final factual/editorial gate before staging or publication.
2. **PARALLEL DRAFTING LANE — Gemini Pro, High Thinking.** Keep using Gemini because it materially increases throughput and its long-form structure is useful. However, every Gemini draft must be checked before staging. Recurrent cleanup risks already observed: Google Search wrappers around internal links, overconfident secondary claims, malformed Markdown tables, and stale/wrong policy durations.
3. **CLAUDE SONNET 5.5 HIGH — PAUSED FOR QUOTA, NOT QUALITY.** Claude produced strong research-first drafts, but the free-plan allowance ended. Do not wait for quota restoration; continue with ChatGPT + Gemini.
4. **RETIRED — DeepSeek and Gemini Pro default.** DeepSeek is no longer needed; Gemini default previously produced material factual-risk issues.

**Production cadence:** Article drafting is complete. Production integration now uses **article-page waves first**, without changing hubs/registries/sitemap during the page wave. Use the closest existing live template, existing CSS/classes/scripts and approved ad markup only. After the article waves are complete, run a separate **Hub + Discovery Pass** that puts each exam's 2027 section above its existing 2026 section and then updates the relevant `blogs-*.js` registries and `sitemap.xml`.

**Integration rule:** Drafts are converted mechanically into the existing live article system: duplicate the closest article in the same cluster; preserve `style-v3.css`, header/footer/scripts, existing component markup and approved ad mounts; insert the reviewed content; add at least 5 contextual body links plus Related Articles and official References. **Do not create or edit CSS for this rollout.** Hubs/registries/sitemap are intentionally deferred until the article waves finish; then add 2027 hub sections above untouched 2026 sections and update discovery files in one controlled pass.

## Draft staging workflow — 2026-11-17

- Founder approved using a **GitHub staging branch as the safe article warehouse** while content production continues.
- GitHub cannot store remote “uncommitted” files. Therefore the clean equivalent is a dedicated branch with commits that **never touch `main`** until the complete article batch is ready. Final publication can later be squash-merged or rebuilt cleanly on `main`.
- **Branch clarification (V29):** `drafts/2027-articles` is a normal committed Git branch, not an uncommitted remote workspace. Because a branch contains a full repository snapshot, it also contains the pre-existing hub HTML, `assets/js/blogs-*.js` registry files, `sitemap.xml`, CSS, JS and all other files inherited from `main`. Their presence on the staging branch does **not** mean they were duplicated or already changed for the 2027 rollout. Up through the completed article-page phase, the 40 new article changes are committed on the staging branch while the hub/registry/sitemap discovery files remain inherited/unchanged until the Hub + Discovery Pass.
- **Verified 2026-11-18:** staging head is `a895092bb6a5b3e64632e9e02e047bf3766cbe89`; `main` is still on `0cc53819446968a15b19f5d7751a1cf270615d2f`. The branches are separate and the 2027 article rollout has not been merged to `main`.
- Staging branch: **`drafts/2027-articles`**
- Initial staging commit: **`61230b4a6e8b08ba54d71de78090cd80c7af72f4`**
- `main` was verified unchanged after staging.
- Draft HTML is intentionally minimal: semantic article content + SEO metadata only, with **no CSS, no shared header/footer, no JS, no ads, no registry/hub/sitemap edits**. Draft files use `noindex,nofollow` and are not production-ready.
- Small cleanup is allowed before staging when the draft is fundamentally sound (for example: remove Google-search link wrappers, remove model notes, fix obvious internal-link formatting). Material factual problems require redrafting rather than cosmetic repair.
- Five accepted drafts are staged:
  - `/blogs/ndecc/acj-exam-dates-2027.html` — Gemini Pro High Thinking; minor link cleanup applied.
  - `/blogs/ndecc/afk-exam-dates-2027.html` — Claude Sonnet 5.5 High; model-only notes removed.
  - `/blogs/ndecc/afk-registration-2027.html` — DeepSeek benchmark draft retained because content was usable, although DeepSeek is retired from future production.
  - `/blogs/ndecc/ndecc-exam-dates-2027.html` — fresh Claude Sonnet 5.5 High redraft; accepted after current NDEB spot-check. It correctly uses the two currently confirmed 2027 periods and the May 2027 non-reapplication consequence. - `/blogs/adc/adc-exam-dates-2027.html` — Gemini Pro High Thinking; accepted after current ADC spot-check. Google-search wrappers removed and one overbroad practical-attempt statement narrowed to current ADC wording.
- `/blogs/ndecc/ndeb-exam-calendar-2027.html` — Claude Sonnet 5.5 High; accepted after current NDEB date/calendar spot-check.
- Additional reviewed drafts staged in V13:
  - `/blogs/ore/ore-exam-dates-2027.html` — Claude; current GDC dates, capacity and fees verified.
  - `/blogs/adc/adc-march-2027-written-exam.html` — Gemini High; internal-link wrappers removed. **Historical V13 note about 3-year written validity was superseded in V15; current dentist-specific guidance used by the draft is 5 years.**
  - `/blogs/adc/adc-practical-exam-dates-2027.html` — Gemini High; malformed calendar table repaired and unsupported practical-attempt-cap claim removed. **Historical 3-year validity edit was superseded in V15; current dentist-specific guidance used by the draft is 5 years.**
  - `/blogs/ndecc/acj-registration-2027.html` — Gemini High; Google wrappers removed and unsupported/overconfident registration wording softened to current NDEB rules.
- Existing staged `/blogs/adc/adc-exam-dates-2027.html` was temporarily changed to a 3-year rule in V13, then **corrected back to 5 years in V15** after checking the newer/current dentist written/practical guidance and June 2026 practical handbook.
- Direct ChatGPT drafting batch added in V14:
  - `/blogs/ore/ore-part-1-booking-2027.html` — written by ChatGPT from current GDC Part 1, booking, contract and ORE policy pages. Exact February/April booking timestamps intentionally left unannounced because GDC had not published them.
  - `/blogs/ore/ore-part-2-booking-2027.html` — written by ChatGPT from current GDC Part 2/booking pages; January booking opening fixed at 24 Nov 2026 14:30 UK time; March/April exact booking openings left unannounced.
  - `/blogs/ndecc/ndecc-registration-2027.html` — written by ChatGPT from current NDEB NDECC, dates, by-laws/policies, fees, withdrawal, accommodations and language guidance.
- Latest staging commit: **`a81296f15ba12e4f37dd277494d9c774c64e47dc`**.
- **20 new branch-only article drafts are now staged.**
- `main` re-verified untouched after the latest staging batch.
- **ADC validity correction (V15):** the V13/V14 conclusion that the dentist written pass had changed to 3 years was incorrect. Current ADC dentist written/practical pages and the June 2026 practical handbook state **5 years**. One ADC FAQ still displays 3 years, so the official site is internally inconsistent. For the 2027 drafts we now use the newer/current dentist-specific 5-year guidance, explicitly note the inconsistency where useful, and instruct candidates to verify the expiry shown in ADC Connect. The existing production page `/blogs/adc/adc-written-exam-validity-5-year-rule.html` is therefore **not presumed stale merely because it says 5 years**; it still needs a normal source audit before publication integration.
- Gemini review batch added in V15:
  - `/blogs/adc/adc-september-2027-written-exam.html` — accepted after correction to current 5-year dentist written validity, removal of Google Search wrappers, safer treatment of the Sep 2026 booking trial, and withdrawal cleanup.
  - `/blogs/ndecc/ndecc-results-2027.html` — corrected the NDECC five-year clock to **60 months from first passing ACJ** and corrected the Situational Judgement description to the current 10-station structure.
  - `/blogs/ndecc/ndecc-protocol-2027.html` — corrected to the current **2026 NDECC Protocol effective June 15, 2026**, 10 Situational Judgement stations (5 written + 5 conversation), and current Pass/Fail reporting.
  - `/blogs/ndecc/ndeb-equivalency-timeline-2027.html` — removed unsupported 18–30 month “typical” completion claims and kept NDEB's official position that total timing varies by registration availability and attempts.
  - Gemini review/correction staging commit: **`4d9554f7e09cf6ab826b1ea634fd40e1bb6a3e9b`**.
- Direct ChatGPT batch added in V15:
  - `/blogs/adc/adc-practical-waitlist-2027.html` — Period 1 Stage 1/Stage 2 priority rules, official waitlist criteria, no-consecutive-period rule; does **not** assume identical priority stages for Periods 2/3.
  - `/blogs/adc/adc-initial-assessment-2027.html` — current $647 fee, 7-year validity, document checklist, renewal logic and 2027 written-exam deadlines.
  - `/blogs/adc/adc-written-booking-pearson-vue-2027.html` — Sep 2026 Pearson booking trial, two-hour seat hold, same-centre rule, while clearly noting the standing ADC page still contains the older ATT flow and candidates must follow live 2027 ADC Connect instructions.
  - Direct-writing staging commit: **`a81296f15ba12e4f37dd277494d9c774c64e47dc`**.
- **20 new branch-only 2027 drafts are now staged** on `drafts/2027-articles`; branch tree was rechecked and these draft paths are absent from `main`.
- Gemini reserve-prep batch review added in V16:
  - `/blogs/adc/adc-exam-fees-2027.html` — accepted after removing Google Search wrappers and rewriting the September 2026 Pearson process as a **trial**, not a guaranteed 2027 workflow.
  - `/blogs/ore/ore-exam-fees-2027.html` — accepted after current GDC fee/refund spot-check and link cleanup.
  - `/blogs/ore/ore-booking-system-2027.html` — accepted after current MyGDC rules were checked (one device, 15-minute inactivity logout, 8-hour preview, one-hour payment, reopened withdrawal seats).
  - `/blogs/ore/ore-2027-ucl-booking-changes.html` — accepted after rebuilding the malformed capacity table and checking current UCLC capacity/fee/portal status.
  - Gemini review staging commit: **`14f45ae4254249b441076908a6b3be22bb77959f`**.
- Direct ChatGPT INBDE batch added in V16:
  - `/blogs/inbde/inbde-exam-dates-2027.html` — no fabricated annual calendar; explains Prometric scheduling, six-month eligibility, 60–90 day booking guidance, same-centre/two-day rules and one 45-day extension.
  - `/blogs/inbde/inbde-exam-fees-2027.html` — current 2026 Guide fees used only as **current 2027-planning figures** because no separate 2027 guide exists yet; documents the official $105-guide vs $65-results-page audit-fee conflict.
  - `/blogs/inbde/inbde-results-2027.html` — current 3–4 week result timing, Pass/Fail reporting, scale-score context, 60-day retest rule and updated six-month post-limit retest interval.
  - INBDE staging commit: **`1f12239bcd113a8f5701388b44cadabc0d65c272`**.
- **All 12 NOW + all 15 SOON drafts remain complete. Ten RESERVE articles have now also passed review, bringing staging to 37 new branch-only 2027 drafts.** Three RESERVE candidates remain and must still pass the evidence/differentiation gate; weak ideas can be replaced rather than forced.
- Gemini final quota batch reviewed in V17:
  - `/blogs/ore/ore-priority-booking-2027.html` — accepted after removing Google wrappers, narrowing the universal 14:30 claim, and keeping the official 48-hour priority payment rule.
  - `/blogs/adex/adex-exam-dates-2027.html` — accepted after marking host-site examples as time-sensitive snapshots; official calendar remains dynamic and must be rechecked before registration.
  - `/blogs/adex/adex-candidate-guide-dlosce-2027.html` — accepted after current August 1, 2026–July 31, 2027 manual-season/source checks.
  - `/blogs/adc/adc-practical-results-2027.html` — Gemini quota cut the ending and contained a material error. ChatGPT completed the missing Common Mistakes/FAQs/How DentAIstudy Helps sections, corrected initial-assessment validity from **5 years to 7 years**, retained current dentist written validity at **5 years**, and removed an unsupported fixed Ahpra processing timeline.
  - Corrected Gemini-batch staging commit: **`de3ade44da1d074bebf5a77cd0a2b4f1ff0800e7`**.
- Direct ChatGPT reserve batch added in V17:
  - `/blogs/adc/adc-practical-eligibility-2027.html` — current 7-year initial-assessment validity, 5-year dentist written validity, no-consecutive-practical-period rule, period-specific eligibility and waitlist logic.
  - `/blogs/ndecc/afk-results-2027.html` — Pass/Fail and rescaled-75 rules, failed-candidate score reporting, $200 score verification, three-attempt maximum, ACJ next steps; deliberately **no invented fixed 2027 result-release date**.
  - `/blogs/ndecc/acj-results-2027.html` — Pass/Fail and rescaled-75 rules, $200 verification, three-attempt maximum, NDECC next steps and correct **60-month clock from first passing ACJ**; deliberately **no invented fixed 2027 result-release date**.
  - Direct-writing staging commit: **`85513bc2becc37bf19a11d35d11a6098b2ae0a13`**.
- Branch verification after V17 shows **34 new branch-only 2027 drafts**; all seven V17 additions are absent from `main`. `main` remains untouched.
- Direct ChatGPT reserve batch added in V18:
  - `/blogs/ndecc/ndecc-clinical-skills-2027.html` — current seven Clinical Skills requirements, full-day structure, supplied equipment/instruments, infection-control threshold, pass-all-requirements rule, component-only retake rule and candidate checklist. It explicitly identifies the latest governing document as the **2026 NDECC Protocol effective June 15, 2026**, not a fabricated 2027 protocol.
  - `/blogs/ndecc/ndecc-situational-judgement-2027.html` — current **10-station** structure (5 written + 5 conversation), five requirement areas, exact passing rule (minimum 6 stations plus at least 1 pass in every requirement), official reference-list/orientation resources and failed-component retake logic.
  - `/blogs/ndecc/afk-format-syllabus-2027.html` — current **200 single-answer MCQs**, two 2-hour parts, one scheduled break, official AFK blueprint percentages, Prometric/booklet delivery, no negative marking, rescaled-75 scoring context and official preparation resources. It explains that NDEB uses a blueprint/KSAs rather than a separate 2027 “syllabus.”
  - Direct-writing staging commit: **`685dba2a077d3d8fca941c83e05b56f0be7dc855`**.
- Branch verification after V18 shows **37 new branch-only 2027 drafts**; all three V18 additions are absent from `main`. `main` remains untouched.
- Final direct ChatGPT reserve batch added in V19:
  - `/blogs/ndecc/acj-format-scoring-2027.html` — current **2026 ACJ Protocol effective January 19, 2026**; approximately 150 single-/multiple-answer MCQs, 5-hour duration, official blueprint, multi-answer scoring logic, rescaled-75 pass standard, normal result timing within 8 weeks and 3-attempt maximum. No fake 2027 protocol was created.
  - `/blogs/uae/edree-2027-uae-dental-residency-exam.html` — final title adjusted to **EDREE 2027: UAE Dental Residency Exam and Application Planning** because NIHS has not yet published a public 2027 sitting calendar. Draft uses current NIHS/UAEU rules: AED 1,000 fee, online registration, up to 3 attempts/year until pass, current 120-MCQ/3-hour structure, result statement within 10 working days, current 2025–26 EDREE blueprint, and explicit separation between exam qualification and residency-program admission.
  - `/blogs/sdle/sdle-2027-registration-prometric-fees.html` — official SCFHS 2027 testing windows, Mumaris+ → scheduling permit → Prometric flow, current **SAR 120 eligibility-service fee**, current 200-question/2×120-minute format, 542 scaled pass score and attempt/result rules. The draft **does not invent a fixed Prometric test-booking fee** because SCFHS does not publish one fixed amount on the public pages checked.
  - Final-writing staging commit: **`c966bedea0fcb03dbda0ff4bfa8e4e0583543d36`**.
- Branch verification after V19: the staging branch contains **41 paths with `2027` in the filename**, but one already existed on `main`; therefore the verified project result is exactly **40 NEW branch-only 2027 article drafts**. All three V19 paths are absent from `main`, and `main` remains untouched by the draft batch.
- Final integration is split into two phases: **(1) article-page waves** using the closest live cluster template, shared site chrome, existing styles/scripts, approved ad mounts, contextual internal links, Related Articles and References; then **(2) Hub + Discovery Pass** for exam-hub 2027 sections, blog registries and sitemap, followed by final responsive/source QA.

## Production integration — Wave 1 (NDEB NOW) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated five NDEB NOW pages using the existing live NDECC article template only:
  - `/blogs/ndecc/acj-exam-dates-2027.html`
  - `/blogs/ndecc/ndecc-exam-dates-2027.html`
  - `/blogs/ndecc/afk-exam-dates-2027.html`
  - `/blogs/ndecc/afk-registration-2027.html`
  - `/blogs/ndecc/ndeb-exam-calendar-2027.html`
- Main integration commit: **`e00fb42933a48107ff8d10efeac8be705ae6f327`**.
- Existing-markup normalization commit: **`932384e39f473bb7a6d2564054ff24fc2c329ff9`**.
- **No CSS files changed. No new `<style>` blocks. No new styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing header/footer, auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual article links inside the body, excluding Related Articles:
  - ACJ Exam Dates 2027: **6**
  - NDECC Exam Dates 2027: **8**
  - AFK Exam Dates 2027: **6**
  - AFK Registration 2027: **6**
  - NDEB 2027 Exam Calendar: **6**
- All contextual article targets exist on the staging branch; no broken contextual target was found.
- Every Wave 1 page now has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related Articles, References, one H1, canonical URL, shared header/footer/scripts, and no draft `noindex`.
- **Intentionally deferred:** `exams/ndecc.html`, `assets/js/blogs-ndecc.js`, and `sitemap.xml`. Per rollout lock, these are updated only during the later Hub + Discovery Pass. At that time the NDECC hub gets its **2027 section above the current 2026 content**, with 2026 left intact.

## Production integration — Wave 2 (ADC NOW) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated four ADC NOW pages using the existing live ADC article template only:
  - `/blogs/adc/adc-exam-dates-2027.html`
  - `/blogs/adc/adc-march-2027-written-exam.html`
  - `/blogs/adc/adc-september-2027-written-exam.html`
  - `/blogs/adc/adc-practical-exam-dates-2027.html`
- Integration commit: **`45fab93dde64da3ffcdba6e0ef4016f4c5e8f2be`**.
- Rechecked current official ADC pages before integration: written dates remain **17–18 March 2027** and **8–9 September 2027**; practical periods remain Jan–May, May–Aug and Aug–Dec 2027 with the published application/date-selection windows; Period 1 priority-stage rules remain current.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing ADC header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual ADC article links inside the body, excluding Related Articles:
  - ADC Exam Dates 2027: **11**
  - ADC March 2027 Written Exam: **8**
  - ADC September 2027 Written Exam: **8**
  - ADC Practical Exam Dates 2027: **10**
- Contextual linking deliberately strengthens the new 2027 ADC cluster by linking into Initial Assessment 2027, Written Booking 2027, Exam Fees 2027, Practical Eligibility 2027, Practical Waitlist 2027 and Practical Results 2027 where relevant, while preserving useful evergreen/2026 links.
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 2 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related ADC Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **Intentionally deferred:** `exams/adc.html`, `assets/js/blogs-adc.js`, and `sitemap.xml`. They will be updated during the later Hub + Discovery Pass, where the ADC hub receives its **2027 section above the existing 2026 content** and all 2026 material remains intact.

## Production integration — Wave 3 (ORE NOW) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated three ORE NOW pages using the closest existing live ORE templates only:
  - `/blogs/ore/ore-exam-dates-2027.html`
  - `/blogs/ore/ore-part-1-booking-2027.html`
  - `/blogs/ore/ore-part-2-booking-2027.html`
- Integration commit: **`d6f2d9c5aaaec75276c462aeaf759c89949dc08e`**.
- Rechecked current GDC sources immediately before integration:
  - Part 1 remains **2–3 February 2027** and **6–7 April 2027**, **600 places per sitting**.
  - Part 2 remains **21–24 January**, **4–7 March**, and **15–18 April 2027**, **200 places per sitting**.
  - January Part 2 booking still opens **24 November 2026 at 14:30 UK time**.
  - Exact February/April Part 1 and March/April Part 2 opening timestamps are still not published on the current booking-dates page.
  - Current general booking guidance says ORE sittings open **eight weeks in advance**, and ordinary booking payment must be completed within **one hour**; priority candidates receive separate instructions and the current January notice gives them **48 hours** to pay.
- Freshness cleanup during integration:
  - replaced softer “around eight weeks” wording with the current GDC **eight weeks** rule;
  - clarified that the GDC announced a new 2027 candidate portal, but the current live booking instructions still direct candidates to the GDC online account;
  - clarified the one-hour ordinary booking payment window where relevant.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing ORE header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual ORE article links inside the body, excluding Related Articles:
  - ORE Exam Dates 2027: **7**
  - ORE Part 1 Booking 2027: **8**
  - ORE Part 2 Booking 2027: **8**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 3 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related ORE Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **Intentionally deferred:** `exams/ore.html`, `assets/js/blogs-ore.js`, and `sitemap.xml`. They will be updated during the later Hub + Discovery Pass, where the ORE hub receives its **2027 section above the existing 2026 content** and all 2026 material remains intact.

## Production integration — Wave 4 (NDEB SOON) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated five NDEB SOON pages using the closest existing live NDECC templates only:
  - `/blogs/ndecc/acj-registration-2027.html`
  - `/blogs/ndecc/ndecc-registration-2027.html`
  - `/blogs/ndecc/ndecc-results-2027.html`
  - `/blogs/ndecc/ndecc-protocol-2027.html`
  - `/blogs/ndecc/ndeb-equivalency-timeline-2027.html`
- Integration commit: **`a790efc69a27ec9d442cebf8171b3481f5615b46`**.
- Current NDEB source verification before integration confirmed:
  - ACJ registration remains a three-step NDEB online profile → notification → Prometric scheduling flow.
  - May 2027 ACJ registration opens **8 Dec 2026 at 10:00 ET** for US/Canada and **15 Dec 2026 at 10:00 ET** for Australia/New Zealand; deadline **5 Apr 2027 at 21:00 ET**.
  - The second registration period remains current for AFK/ACJ/Virtual OSCE, opening about **6–8 weeks before the exam** when seats become available; transfers are allowed only while registration is open and not between registration periods.
  - NDECC registration remains a three-stage system: latest ACJ passers → approved Canadian citizenship/PR candidates → all NDECC-eligible candidates.
  - NDECC results are typically released about **8 weeks after the evaluation session**; NDEB currently plans four evaluation sessions per year.
  - The NDECC 60-month period remains measured from the date the candidate **first passes ACJ**; effective May 2027, candidates who fail to complete NDECC within the applicable five-year period can cease to be Equivalency Process candidates and cannot simply reapply.
  - The current Exam Resources page still lists the **2026 NDECC Protocol effective June 15, 2026**; no separate 2027 protocol has been invented.
  - Current credential verification time remains approximately **10 weeks** when documents are correctly submitted.
- Factual cleanup during integration:
  - removed the unsupported statement that completing the full Equivalency Process during 2027 is “virtually impossible”;
  - replaced the fixed “six to twelve month” delay claim with NDEB-supported variable timing language;
  - clarified that a February 2027 AFK candidate cannot use the December first-registration opening for May ACJ, but may still reach May ACJ if the AFK result posts in time and a later seat becomes available; this is possible, not guaranteed.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing NDECC header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual NDEB article links inside the body, excluding Related Articles:
  - ACJ Registration 2027: **9**
  - NDECC Registration 2027: **7**
  - NDECC Results 2027: **8**
  - NDECC Protocol 2027: **10**
  - NDEB Equivalency Timeline 2027: **12**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 4 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related NDEB Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **Intentionally deferred:** `exams/ndecc.html`, `assets/js/blogs-ndecc.js`, and `sitemap.xml`. They remain part of the later Hub + Discovery Pass, where the NDECC hub gets its **2027 section above the existing 2026 content** and all 2026 material stays intact.

## Production integration — Wave 5 (NDEB RESERVE) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated the six remaining NDEB RESERVE pages using existing NDECC templates only:
  - `/blogs/ndecc/afk-results-2027.html`
  - `/blogs/ndecc/acj-results-2027.html`
  - `/blogs/ndecc/ndecc-clinical-skills-2027.html`
  - `/blogs/ndecc/ndecc-situational-judgement-2027.html`
  - `/blogs/ndecc/afk-format-syllabus-2027.html`
  - `/blogs/ndecc/acj-format-scoring-2027.html`
- GitHub connector write limits required this wave to be stored as six small sequential file commits rather than one combined tree commit. Final branch head after Wave 5: **`1f6d34a46ee9be8a957f027152bb98c939775911`**.
- Sequential commits:
  - AFK Results: `2152890ebde61c3f84402492bec228e547bffa91`
  - ACJ Results: `ec626f39813c2c53e54386e933e088b8dce3c191`
  - NDECC Clinical Skills: `853df4cc6ce3466c08662b545e8950177dbbce63`
  - NDECC Situational Judgement: `957587e69a61345500ee11db20ad9257e0b4dd26`
  - AFK Format/Syllabus: `17dd955fea2b69b2113bd090dd712a493baf3d1e`
  - ACJ Format/Scoring: `1f6d34a46ee9be8a957f027152bb98c939775911`
- Current NDEB source verification before integration confirmed:
  - Exam Resources still lists **2026 AFK Protocol – Revised**, **2026 ACJ Protocol – Revised**, and **2026 NDECC Protocol effective June 15, 2026**; no separate 2027 protocol was invented.
  - AFK remains **200 single-answer MCQs in two 2-hour parts**, passing standard **75**, maximum **3 attempts**.
  - Current live ACJ guidance now states **120–150 single-/multi-answer MCQs**, **5.5 hours with one scheduled 30-minute break**, passing standard **75**, maximum **3 attempts**.
  - NDECC remains seven Clinical Skills procedures plus a 10-station Situational Judgement component; candidates must pass all clinical requirements, and Situational Judgement requires at least 6/10 stations with at least one pass in each competency domain.
  - Failed candidates may request score verification through NDEBConnect within **30 days** of score release; the current fee is **CAD 200**. Verification checks calculation/recording and does not re-evaluate NDECC typodonts or stations.
  - NDECC results are typically released **8 weeks after the evaluation session**.
- Material correction during integration:
  - the staged ACJ Format/Scoring draft still said approximately 150 questions in 5 hours. It was corrected to the current live NDEB rule: **120–150 questions, 5.5 hours, one scheduled 30-minute break**. The meta description, Quick Answers and format table were updated consistently.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing NDECC header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual NDEB article links inside the body, excluding Related Articles:
  - AFK Results 2027: **7**
  - ACJ Results 2027: **8**
  - NDECC Clinical Skills 2027: **8**
  - NDECC Situational Judgement 2027: **7**
  - AFK 2027 Format and Syllabus: **7**
  - ACJ 2027 Exam Format and Scoring: **7**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 5 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related NDEB Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **Canada/NDEB article integration is now complete: all 16 new NDEB 2027 pages are full production-style pages on the staging branch.**
- **Intentionally deferred:** `exams/ndecc.html`, `assets/js/blogs-ndecc.js`, and `sitemap.xml`. They remain part of the later Hub + Discovery Pass, where the NDECC hub gets its **2027 section above the existing 2026 content** and all 2026 material stays intact.

## Production integration — Wave 6 (ADC remaining) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated the six remaining ADC pages using existing live ADC templates only:
  - `/blogs/adc/adc-practical-waitlist-2027.html`
  - `/blogs/adc/adc-initial-assessment-2027.html`
  - `/blogs/adc/adc-written-booking-pearson-vue-2027.html`
  - `/blogs/adc/adc-exam-fees-2027.html`
  - `/blogs/adc/adc-practical-results-2027.html`
  - `/blogs/adc/adc-practical-eligibility-2027.html`
- GitHub connector write limits were avoided by storing the wave as six small sequential file commits. Final branch head after Wave 6: **`beffaf4036659ea735eab628b22fab7653dfd6d6`**.
- Sequential commits:
  - Practical Waitlist: `27a27cf0acd252618bed3fafe8fa7e8e3d91f9f7`
  - Initial Assessment: `fdcf082d26753510f75824bef34d16bfccf46b42`
  - Written Booking: `ecf32f55563e04da0a74a2db2d912e502658bed9`
  - Exam Fees: `c1562a94b9142e0c2d65373c66911814c276f87c`
  - Practical Results: `1054100641bba9fb92414ff8be732ec975c79312`
  - Practical Eligibility: `beffaf4036659ea735eab628b22fab7653dfd6d6`
- Current ADC source verification immediately before integration confirmed:
  - Dentist **initial assessment validity = 7 years**.
  - Dentist **written examination validity = 5 years** on the current dentist written/practical pages. The generic FAQ still contains older 3-year wording, so the article set uses the newer dentist-specific guidance and tells candidates to verify the expiry shown in ADC Connect.
  - Current dentist fees: **AUD 647 initial assessment**, **AUD 35 registration-only initial-assessment renewal**, **AUD 2,122 written examination**, **AUD 4,775 practical examination**.
  - ADC announced a further **12-month fee freeze on 24 June 2026**; the fee article therefore labels these as current 2027-planning figures and tells candidates to verify the live amount before payment rather than presenting them as permanently fixed for all of 2027.
  - The September 2026 Pearson written-booking change remains explicitly described by ADC as a **trial**. The article retains the trial caveat and directs candidates to the live ADC Connect/Pearson instructions for their actual 2027 sitting.
  - 2027 Period 1 practical waitlist criteria and the Stage 1/Stage 2 priority rules remain published. The generic FAQ still has older “no waitlists” wording, but the newer period-specific October 2026 notice and current dentist practical page explicitly provide for waitlists; the 2027 article uses the newer specific guidance.
  - Practical results remain released through **ADC Connect approximately six weeks after the exam**.
  - Current ADC FAQ guidance says there is **no numerical limit on practical examination attempts**; reapplication still depends on a valid initial assessment, valid written examination, and the eligibility rules for the application period. No previous practical tasks/stations are carried forward after an overall fail.
- Factual/editorial cleanup during integration:
  - Practical Results no longer implies a vague “assessment framework” attempt rule; it now states the actual ADC FAQ rule: no numerical practical-attempt limit, subject to current prerequisite validity and period eligibility.
  - Removed unsupported narrative about CCTV/grading moderation from the Practical Results introduction and replaced it with the official result-delivery wording.
  - Exam Fees now labels the fee table as **current ADC fees for 2027 planning**, not a permanently guaranteed all-year fee schedule.
  - Preserved the five-year-written/seven-year-initial-assessment distinction consistently across the eligibility/results/fees/waitlist pages.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing ADC header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual ADC article links inside the body, excluding Related Articles:
  - ADC Practical Waitlist 2027: **6**
  - ADC Initial Assessment 2027: **6**
  - ADC Written Exam Booking 2027: **7**
  - ADC Exam Fees 2027: **6**
  - ADC Practical Results 2027: **6**
  - ADC Practical Eligibility 2027: **6**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 6 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related ADC Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **ADC article integration is now complete: all 10 new ADC 2027 pages are full production-style pages on the staging branch.**
- **Intentionally deferred:** `exams/adc.html`, `assets/js/blogs-adc.js`, and `sitemap.xml`. They remain part of the later Hub + Discovery Pass, where the ADC hub gets its **2027 section above the existing 2026 content** and all 2026 material stays intact.

## Production integration — Wave 7 (ORE remaining) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated the four remaining ORE pages using existing live ORE templates only:
  - `/blogs/ore/ore-exam-fees-2027.html`
  - `/blogs/ore/ore-booking-system-2027.html`
  - `/blogs/ore/ore-2027-ucl-booking-changes.html`
  - `/blogs/ore/ore-priority-booking-2027.html`
- Stored as four small sequential commits to keep connector usage bounded. Final branch head after Wave 7: **`a74c63fc1f05d5af0a56b0a8eb052888e00c508d`**.
- Sequential commits:
  - ORE Exam Fees: `71b535cef24180e5b4f2fb8d1f24df44005710a6`
  - ORE Booking System: `ad2ec021670e438e6533adcc4c4151a2dce82abb`
  - ORE 2027 UCL/Booking Changes: `ac17e6d988416556b76d0ae5d0dbcb43cd40816f`
  - ORE Priority Booking: `a74c63fc1f05d5af0a56b0a8eb052888e00c508d`
- Current GDC source verification immediately before integration confirmed:
  - Application processing fee **£115**; ORE Part 1 **£485**; ORE Part 2 **£6,967**; Medical Emergencies-only retake **£686**.
  - The UCL Consultants Ltd contract remains the active delivery arrangement. Contract Year 1 provides **2,400 Part 1 places** and **944 Part 2 places**; the GDC has stated a future Part 2 target of **1,500 places/year by Contract Year 3**.
  - Early-2027 confirmed capacity remains **600 places per Part 1 sitting** and **200 places per Part 2 sitting**.
  - Current live booking guidance states ORE sittings open **eight weeks in advance**, not “around eight weeks”.
  - Current booking still runs through the GDC online/MyGDC account. The replacement candidate portal and revised booking system remain **announced but without a published launch date or migration instructions** as of 18 Nov 2026.
  - Current online booking rules still include one-device login, 15-minute inactivity logout, the 8-hour pre-opening preview state, general payment within **one hour**, and reopened booking windows when withdrawals free seats.
  - Priority access still covers candidates approaching the five-year limit and eligible refugee candidates. Refugee priority remains available for **up to two attempts at Part 1 and two attempts at Part 2**, inside the normal four-attempt cap per part.
  - The current **January 2027 Part 2** booking notice gives successful priority candidates **48 hours** to pay. The priority article now treats this as sitting-specific current guidance and tells candidates to recheck later notices instead of claiming 48 hours is a permanent universal rule.
- Factual/editorial cleanup during integration:
  - Booking System changed “around eight weeks” to the current official **eight weeks** rule.
  - Booking System and UCL Changes now clearly distinguish the announced replacement portal from the still-active current GDC online-account/MyGDC booking process.
  - Priority Booking no longer presents the 48-hour payment window as a guaranteed rule for every future 2027 sitting; it is tied to the current January 2027 notice and later sittings must be rechecked.
  - Exam Fees is framed as the **current GDC fee schedule for 2027 planning**, not an irreversible guarantee that statutory fees can never change.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing ORE header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual ORE article links inside the body, excluding Related Articles:
  - ORE Exam Fees 2027: **7**
  - ORE Booking 2027: **7**
  - ORE 2027 Changes: **8**
  - ORE Priority Booking 2027: **7**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 7 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related ORE Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **ORE article integration is now complete: all 7 new ORE 2027 pages are full production-style pages on the staging branch.**
- **Intentionally deferred:** `exams/ore.html`, `assets/js/blogs-ore.js`, and `sitemap.xml`. They remain part of the later Hub + Discovery Pass, where the ORE hub gets its **2027 section above the existing 2026 content** and all 2026 material stays intact.

## Production integration — Wave 8 (INBDE) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated all three INBDE 2027 pages using existing live INBDE templates only:
  - `/blogs/inbde/inbde-exam-dates-2027.html`
  - `/blogs/inbde/inbde-exam-fees-2027.html`
  - `/blogs/inbde/inbde-results-2027.html`
- Stored as three small sequential commits. Final branch head after Wave 8: **`25b72f43b2b1118bdd994f895ce5011aaea35dee`**.
- Sequential commits:
  - INBDE Exam Dates: `93f79dc380a475f4ce809d27e34916ea48567847`
  - INBDE Exam Fees: `577b81f5957969078c4c96fb51675a3d2634d08f`
  - INBDE Results: `25b72f43b2b1118bdd994f895ce5011aaea35dee`
- Current JCNDE verification immediately before integration confirmed:
  - There is still **no separate 2027 INBDE Candidate Guide** on the JCNDE site. The current official guide is the **2026 INBDE Candidate Guide, updated 4 Aug 2026**. The 2027 pages therefore use current rules for planning and explicitly instruct candidates to recheck for later updates.
  - INBDE does **not** use a fixed national annual sitting calendar. Candidates apply, receive an eligibility email, and schedule available dates directly through **Prometric**.
  - JCNDE currently recommends scheduling **60–90 days before** the desired test date.
  - After DTS processes the application, the normal eligibility period is **six months**, unless another rule shortens it.
  - One **45-day eligibility extension** is available per application under the current guide; the current extension fee is **$150**.
  - The INBDE is administered over **two days**; Day 2 must occur within **7 days** of Day 1 and both days must be at the **same test centre**. The two days do not need to be consecutive.
  - Current individual INBDE examination fee: **$890**.
  - Current international processing fee for students/graduates of non-CODA-accredited programs: **$435**.
  - Current additional results report fee: **$55**.
  - Current Prometric rescheduling fees: **$50** at 30+ business days, **$70** at 5–29 business days, **$150** at 1–4 business days; a no-show or sufficiently late arrival can forfeit the full testing fee.
  - Official JCNDE sources still conflict on the result-audit fee: the Aug 2026 Candidate Guide lists **$105**, while the current public INBDE page displays **$65**. Both the Fees and Results articles retain this discrepancy transparently and tell candidates to verify the amount shown in DENTPIN at the time of request.
  - INBDE results remain typically available **approximately 3–4 weeks after the examination date**.
  - Results are officially **Pass/Fail**. The underlying scale runs **49–99**, with **75** representing the minimum passing scale score; unsuccessful candidates receive the overall scale score plus performance information for the three clinical-content areas and 10 foundation-knowledge areas.
  - Current retest policy remains a minimum **60-day** wait after an unsuccessful attempt, maximum **four administrations in any 12-month period**, and the **5 Years/5 Attempts** rule. After the fifth year or fifth attempt, the current Aug 2026 guide permits testing once every **six months** after the most recent attempt.
- Factual/editorial cleanup during integration:
  - Kept the Exam Dates page explicitly framed around **Prometric availability**, not a fabricated “2027 INBDE calendar.”
  - Updated verification-date wording from 17 Nov to **18 Nov 2026**.
  - Kept the fee article labelled as **current fees for 2027 planning**, not guaranteed future 2027 prices.
  - Preserved the official **$105 guide vs $65 live-page audit-fee conflict** instead of silently choosing one.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** Every page uses the existing `../../assets/css/style-v3.css`, existing INBDE header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual INBDE article links inside the body, excluding Related Articles:
  - INBDE Exam Dates 2027: **6**
  - INBDE Exam Fees 2027: **6**
  - INBDE Results 2027: **6**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 8 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, Related INBDE Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- **INBDE article integration is now complete: all 3 new INBDE 2027 pages are full production-style pages on the staging branch.**
- **Intentionally deferred:** `exams/inbde.html`, `assets/js/blogs-inbde.js`, and `sitemap.xml`. They remain part of the later Hub + Discovery Pass, where the INBDE hub gets its **2027 section above the existing 2026 content** and all existing content stays intact.

## Production integration — Wave 9 (ADEX + EDREE + SDLE final wave) — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Integrated the final four 2027 article pages using the closest existing live cluster templates only:
  - `/blogs/adex/adex-exam-dates-2027.html`
  - `/blogs/adex/adex-candidate-guide-dlosce-2027.html`
  - `/blogs/uae/edree-2027-uae-dental-residency-exam.html`
  - `/blogs/sdle/sdle-2027-registration-prometric-fees.html`
- Final staging branch head after Wave 9 and ADEX cleanup: **`a895092bb6a5b3e64632e9e02e047bf3766cbe89`**.
- Relevant Wave 9 commits:
  - ADEX Exam Dates integration: `6cae52e841841f84382f0171e245a6bb133dd63c`
  - ADEX Candidate Guide/DLOSCE: `82b21ca95072dc05c04dda8be62555c1b4af90d6`
  - EDREE 2027: `18b936e34dfbeea3b4087adf42d4d6d8824475b5`
  - SDLE 2027: `ddc99894cd06c6b69bc4fc0b315b5c982887435d`
  - ADEX static-calendar cleanup: `9d4d3d005e42b4107db1ddf1cc65ca258c2b88e3`
  - Final removal of residual time-sensitive ADEX host example: `a895092bb6a5b3e64632e9e02e047bf3766cbe89`
- Current ADEX verification immediately before integration confirmed:
  - The active dental documentation season is **August 1, 2026 through July 31, 2027**.
  - The official Exam Calendar is **real-time and location-specific**, not one national 2027 sitting calendar.
  - `Outside Candidates: YES` means outside/non-student candidates may register while capacity remains; `NO` restricts registration to students of record of the host program.
  - Registration is first-come, first-served; ADEX explicitly says it **does not offer waitlists** for full exam locations.
  - `TBA` means the host plans an exam but its date is not yet finalized.
  - Candidate schedules/Q&A information are normally posted approximately **2–3 weeks before** the clinical exam; once released, schedule changes are not permitted.
  - Current ADEX Dental series fee is **$2,995 plus the location-specific facility fee**. The series includes Periodontal, Endodontic, Prosthodontic, Anterior Restorative, Posterior Restorative and the computer-based DLOSCE.
  - Periodontal became a required component effective **August 1, 2026**.
  - DLOSCE is now the integrated computer-based component; the old DSE OSCE transition rules remain only for legacy candidates.
  - All ADEX series components must be passed within **18 months** of the first attempt. ADEX's 3-Time Fail Policy also remains current.
  - California's DLOSCE transition is used only as a **jurisdiction-specific example**; the articles do not generalize California licensure law nationwide.
  - Because the calendar is dynamic, the final ADEX Dates page deliberately **does not republish a static host-school/date table**. Two cleanup commits removed all time-sensitive school examples after QA found one residual host example.
- Current EDREE / NIHS verification immediately before integration confirmed:
  - NIHS/UAEU still does **not publish an exact public 2027 EDREE sitting calendar**. The article remains an application-planning guide and does not invent a date.
  - Current online EDREE/EMREE/EPREE examination fee is **AED 1,000**, non-refundable and non-transferable after enrolment.
  - Eligible candidates may take EDREE **up to three times in a year starting from the first attempt to obtain a pass**; after passing, candidates cannot keep retaking within the same academic year just to improve the mark.
  - The current exam-structure page says the residency entrance examination usually contains **120 MCQs completed within 3 hours**.
  - Current NIHS results guidance says the electronic score/ranking statement is issued within **10 working days**; results are valid for **24 months from submission to the authorities** under the current portal wording.
  - Passing EDREE is only a qualifying step; residency programs retain their own admission, document, interview and licensing requirements.
- Current SDLE / SCFHS verification immediately before integration confirmed:
  - SCFHS currently publishes **nine 2027 Professional Practice Licensure Exam windows from January through October**. The public table still shows 2026 dates in the later November/December rows, so the article does not invent November/December 2027 windows.
  - Current Professional Practice Licensure Exams Eligibility service cost is **SAR 120** through Mumaris+; this is the eligibility-service charge, not proof of a fixed all-in Prometric test price.
  - Current SDLE Applicant Guide describes **200 questions**, two **120-minute** blocks, a scheduled **30-minute break**, and passing score **542** on the 200–800 reporting scale.
  - Results are announced within **2–6 weeks after the end of a test window**.
  - The exam-specific SDLE Applicant Guide states eligible candidates may test **up to four times a year** while working toward a pass. The broader Professional Practice Licensure Exams page describes attempts more generally, so the article explicitly tells candidates to use the exam-specific SDLE guide plus their live Mumaris+ eligibility status for retake planning.
  - The current public SCFHS pages checked still do **not publish one fixed SDLE Prometric appointment fee**; the article tells candidates to verify the live amount shown during booking rather than quote a third-party number.
- **No CSS files changed. No new `<style>` blocks. No new visual styles/classes were created.** All four pages use the existing `../../assets/css/style-v3.css`, existing header/footer/auth scripts and `main.js`.
- Approved ad structure verified on every page: exactly one display slot for positions **1, 2 and 3** plus exactly one existing Native mount.
- Contextual article links inside the body, excluding Related Articles:
  - ADEX Exam Dates 2027: **6**
  - ADEX 2027 Candidate Guide / DLOSCE: **8**
  - EDREE 2027: **5**
  - SDLE 2027: **8**
- All contextual article targets were rechecked on the stored staging branch; **no broken contextual target** was found.
- Every Wave 9 page has the existing Quick Answers treatment, existing DentAIstudy CTA card, cluster-specific Related Articles, References, one H1, canonical URL, shared header/footer/scripts and no draft `noindex`.
- Final tree verification: staging contains **exactly 40 new branch-only 2027 article pages** absent from `main`.
- **ARTICLE-PAGE INTEGRATION PHASE COMPLETE: 40/40.**
- `main` remains untouched by the 2027 publishing batch.
- **Next phase is the Hub + Discovery Pass only:** add each cluster's 2027 roadmap above its existing 2026 content, keep all 2026 content and URLs intact, update the relevant `blogs-*.js` registries, then update `sitemap.xml`. No CSS/style work is required.

## Hub + Discovery Pass — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Final staging head after the discovery pass: **`68ff74e97942333e2f9488d941433b132dc937bf`**.
- Updated the seven existing exam hubs already inherited on the staging branch:
  - `exams/ndecc.html`
  - `exams/adc.html`
  - `exams/ore.html`
  - `exams/inbde.html`
  - `exams/adex.html`
  - `exams/uae.html`
  - `exams/sdle.html`
- Each hub now has one dedicated **2027 roadmap immediately below the existing hub hero and above the previous hub library**, using only the existing `section`, container and `study-answer-card` markup. Existing 2026/evergreen hub content remains below; no existing hub line was deleted during this pass.
- Hub roadmap commits:
  - NDEB/NDECC: `e5d9388990bd6e9063cd67e6a3bccf1054660909`
  - ADC: `89e8207e98e4a12325dcb67264fa6f7a5544d84c`
  - ORE: `f96721f9e54beb285087e07a55f486b988d9908c`
  - INBDE: `943607a30bb7ea6d8f2a2b1dffc15489eebea95d`
  - ADEX: `42b730b1c68de9dc3ef0d1cd3ff3df1de60a54d9`
  - UAE/EDREE: `e9b268b1916118a52c8f9d6deeeb7955b01cc25d`
  - SDLE: `d1f78a839ac7efce5ecd9bfd2fb0364b70adb54d`
- Updated the seven existing matching blog registries; no duplicate registry files were created:
  - `assets/js/blogs-ndecc.js`
  - `assets/js/blogs-adc.js`
  - `assets/js/blogs-ore.js`
  - `assets/js/blogs-inbde.js`
  - `assets/js/blogs-adex.js`
  - `assets/js/blogs-uae.js`
  - `assets/js/blogs-sdle.js`
- Registry commits: - NDEB/NDECC: `f1b23351039cafd651b4c125efe23b6d734a93a8`
  - ADC: `28bf93a243ad5d5182eb8b4acd3665fa3cee5246`
  - ORE: `5d733b02f9ec7f99eb3daf90a2ba9318224c43aa`
  - INBDE: `b8dbe2438df1118d106c98810571bdd720312aed`
  - ADEX: `87ba161832f5a5d2f1119dc7953de150baa43838`
  - UAE/EDREE: `ed5488f693a19e8bb178590d036afa06ded6cbcd`
  - SDLE: `185768e58aabacd33f032b7c35f28983b87641fc`
- Added all **40 new canonical article URLs** to their existing exam-cluster sections in `sitemap.xml`, above the older cluster URLs rather than appending a disconnected block at the file bottom. Sitemap commit: **`68ff74e97942333e2f9488d941433b132dc937bf`**.
- During source inspection, `/blogs/ndecc/afk-exam-dates-2027.html` was found to have an empty existing meta-description field. Filled that existing `<meta name="description">` value only; no new block was added. Commit: **`a7ade8d2a10eed66a6ee95bc3eea2332e08078a2`**.
- **Stored-branch discovery QA passed:**
  - 40/40 new paths appear **exactly once** in the intended hub roadmap.
  - 40/40 new paths appear **exactly once** in the matching `blogs-*.js` registry.
  - 40/40 new canonical URLs appear **exactly once** in `sitemap.xml`.
  - Sitemap now contains **347 `<url>` entries** total.
  - All seven modified registry files pass JavaScript syntax compilation.
  - Every modified hub still references `style-v3.css` exactly once and contains **zero `<style>` blocks**.
  - Comparison from article-phase head `a895092bb6a5b3e64632e9e02e047bf3766cbe89` to the discovery head changed only the seven hubs, seven registries, `sitemap.xml`, and the one AFK meta-description field.
  - The hub/registry/sitemap diff contains **zero deletions**; existing 2026/evergreen discovery entries were preserved.
  - **No CSS file, `main.js`, ad loader, ad placement, auth file or Study Suite code changed.**
- The approved article ad structure remains unchanged on all 40 pages: display positions **1, 2 and 3** plus the existing **Native** mount.

## Final staged-rollout QA — 2026-11-18

- **Status: COMPLETE on `drafts/2027-articles`; not merged to `main`.**
- Final QA head: **`35444430e907d2baa77079a5aa724a1c00f8d001`**.
- Audited all **40 new 2027 article pages** against the stored staging tree.
- **Article-page source QA passed after correction:**
  - title present and one H1 per page;
  - non-empty meta description and canonical URL matching the page path;
  - no `noindex` / `nofollow`;
  - zero new `<style>` blocks and one shared `style-v3.css` reference per page;
  - existing shared auth scripts and `main.js` present;
  - approved ads remain exactly **position 1 + Native + position 2 + position 3** on every page;
  - no duplicate IDs found;
  - no ChatGPT/Gemini/Claude/DeepSeek/TODO/FIXME/Google-search-wrapper traces found;
  - all checked local/internal hrefs resolve to paths in the staging repository.
- **Responsive/template source structure passed on all 40 pages:** doctype, viewport meta, `main-wrapper`, shared site header, `blog-body`, shared footer, `style-v3.css`, `main.js`, and balanced HTML/body structure are present. This is source-level QA; a true production browser render requires the branch to be deployed and is therefore part of the immediate post-publish smoke check rather than something to falsely claim before deployment.
- **Real defects found and fixed during final QA:**
  - `/blogs/ndecc/ndeb-equivalency-timeline-2027.html` contained one broken internal link to the non-existent `/blogs/ndecc/ndeb-equivalency-process-afk-acj-pathway.html`; corrected it to the existing `/blogs/ndecc/ndecc-equivalency-process-afk-acj-pathway.html`.
  - Six article meta descriptions contained a double-escaped `&amp;amp;`; each was cleaned in the existing meta field to normal `&amp;`:
    - `/blogs/ndecc/acj-registration-2027.html`
    - `/blogs/ndecc/ndecc-results-2027.html`
    - `/blogs/ndecc/ndecc-protocol-2027.html`
    - `/blogs/ndecc/ndeb-equivalency-timeline-2027.html`
    - `/blogs/adc/adc-september-2027-written-exam.html`
    - `/blogs/adc/adc-practical-exam-dates-2027.html`
- Final-QA correction commits:
  - ACJ Registration metadata: `548ebe0e75356148166d73f5d69aac4b06aac965`
  - NDECC Results metadata: `5ca43c7fa84cdc149612e0a9e125271bbb642838`
  - NDECC Protocol metadata: `01c5711e0390096fbb492e292dcfbd38d7b8e9a2`
  - NDEB Timeline metadata + broken link: `1de8da65073f4fc7e9287fda3badcbe6cb669c03`
  - ADC September metadata: `4460559e2842d9490fd46f2d9e59e2b6f0f9244b`
  - ADC Practical Dates metadata: `35444430e907d2baa77079a5aa724a1c00f8d001`
- Recheck after those corrections: all six corrected files have no remaining double-escaped metadata, no broken local hrefs and no `noindex`.
- **Hub/discovery recheck at final head:**
  - all seven hubs contain exactly one 2027 roadmap and all 40 intended roadmap links exactly once;
  - hub local links resolve; viewport remains present; zero hub `<style>` blocks;
  - all seven `blogs-*.js` registries compile successfully and contain their 40 new entries exactly once;
  - `sitemap.xml` contains all 40 new canonical URLs exactly once and remains at **347 total `<url>` entries**.
- **Rollout isolation:** compared with `main`, staging is ahead and not behind. The rollout changes **55 files** and contains no changes to CSS files, `assets/js/main.js`, auth scripts, Supabase code or Study Suite files. The final-QA delta itself changed only the six article files listed above.
- `main` remains at **`0cc53819446968a15b19f5d7751a1cf270615d2f`**; no 2027 rollout change has been merged yet.

## Merge + production publication — 2026-11-18

- **Status: COMPLETE.**
- Pre-merge verification confirmed `main` at `0cc53819446968a15b19f5d7751a1cf270615d2f` and `drafts/2027-articles` at `35444430e907d2baa77079a5aa724a1c00f8d001`, with staging **65 commits ahead, 0 behind**, across the expected 55 rollout files.
- Opened GitHub pull request **#5 — “Publish 2027 exam article rollout”** from `drafts/2027-articles` into `main`.
- GitHub rechecked the PR as mergeable before publication.
- Published with a **squash merge** so the 65 staging commits became one clean production commit:
  - production commit: **`4db8ef99ab9284bde39fbbeca488a2a9bbceeb63`**
  - commit title: `Publish 2027 exam article rollout`
- GitHub Pages workflow run **44248266673** completed successfully:
  - build: success
  - deploy: success
  - report-build-status: success
  - deployed Pages version: `4db8ef99ab9284bde39fbbeca488a2a9bbceeb63`
  - production environment: `https://dentaistudy.com/`
- Deployment logs explicitly reported **“Reported success!”** and evaluated the environment URL as `https://dentaistudy.com/`.
- **Post-merge `main` source verification passed across all seven clusters.** Representative NDEB, ADC, ORE, INBDE, ADEX, UAE/EDREE and SDLE 2027 pages are present on `main`, each with one H1, no `noindex`, one shared `style-v3.css`, and the approved **1 + Native + 2 + 3** ad structure.
- Rechecked production-source discovery on `main`: the NDECC hub contains the 2027 roadmap, the matching NDECC registry contains the new ACJ 2027 entry, and `sitemap.xml` contains the canonical ACJ 2027 URL; sitemap remains at **347 URLs**.
- **Browser-verification limitation:** the available browsing crawler could load the production root but returned cached/blocked views for brand-new article URLs and older cached hub snapshots immediately after deployment. Therefore no false claim is made that a fresh external browser render of every new URL was observed from this session. This did **not** indicate a GitHub Pages deployment failure; the Pages build/deploy itself completed successfully and `main` contains the published files.
- No additional code change was made after publication.

## Historical publication prioritization — superseded by completed rollout

- **Now:** Tasks 6–10, 22–25, 34–36. Create in that order unless a newly published official update requires moving a date-sensitive page earlier.
- **Soon:** Tasks 11–13, 16, 21, 26–29, 37–39, 41–43. Distinct intents, but demand has been inferred from earlier-year queries or authority developments rather than measured 2027 search counts.
- **Reserve (historical planning label):** Tasks 14–15, 17–20, 30–33, 40, 44–45 were originally conditional. Each later passed the evidence/differentiation gate during drafting and final source review, so all 40 approved pages were ultimately published.
- Avoid keyword cannibalization: an umbrella calendar page should summarize and link; each child answers its specific booking/registration/sitting question. No two pages with the same primary user intent. 2026 pages stay intact; new 2027 pages contain genuinely new dates, policy/cycle logic, and verification.
- Blog-index registry entries and sitemap updates were completed in the Hub + Discovery Pass before publication; the approved Oct 19 ad configuration remained unchanged.
- This prioritization section is retained only as the historical planning record. The 40-article rollout has now completed research, integration, discovery, QA and publication.

## V33 — Production article consistency + mobile overflow cleanup — 2026-11-18

- **Status: COMPLETE and deployed.**
- Live production screenshots exposed markup-integration inconsistencies that source-only rollout QA had missed visually: whole-page horizontal overflow on some new articles, crowded Quick Answers, non-swipeable summary tables, duplicated tables inside Quick Answers, and ordinary prose rendered in code/monospace typography.
- **Root causes were in article HTML, not the locked shared styling.** `assets/css/style-v3.css` and all imported CSS remained unchanged.
- Normalized all **40 new 2027 article pages** back to the established DentAIstudy article pattern:
  - Quick Answers now use the existing **`h3` question + `p` answer** structure so the site's existing spacing rules apply.
  - Removed lists, tables and stray `<hr>` elements from Quick Answers.
  - Removed the four duplicated summary tables that had been incorrectly placed inside Quick Answers:
    - `blogs/adex/adex-exam-dates-2027.html`
    - `blogs/adex/adex-candidate-guide-dlosce-2027.html`
    - `blogs/adc/adc-practical-results-2027.html`
    - `blogs/ore/ore-priority-booking-2027.html`
  - Unwrapped inappropriate `<code>` tags used for ordinary prose/data such as `Outside Candidates: YES`, `Restorative`, `Verified`, dates and fee values. The wording stayed intact; only the wrong typography markup was removed.
  - Preserved legitimate body tables. Every remaining table on the 40 pages uses the existing `.blog-table-wrap` horizontal-swipe container; **no new table class or CSS was created**.
  - Replaced long visible raw URLs in References with short **Official source** link text while preserving the exact original `href`. This removes unbreakable text that could widen the mobile document and produce the white horizontal-swipe area.
- **Four independent pre-commit source/DOM QA passes were completed before merge:**
  1. Quick Answers: 40/40 use relaxed h3/p markup; zero Quick Answer lists, tables or stray hr elements.
  2. Mobile-overflow/tables: zero prose `<code>` tags, zero visible raw Reference URLs, and every remaining table has the existing swipe wrapper.
  3. Regression protection: title/meta/canonical, one H1, shared `style-v3.css`, auth/main scripts, no `noindex`, and exact **1 + Native + 2 + 3** ad structure all preserved.
  4. Content/link sanity: no AI/dev traces, local links resolve, ADEX wording remains present as normal text, and no article URL/slug was changed.
- Main V33 fix branch: `fix/v33-article-consistency-20261118`. PR **#6** squash-merged the cleanup into production commit **`5a5f92702c003127c175355530e22a1066849b33`**.
- GitHub Pages workflow **44258542511** completed build + deploy successfully for that commit.
- **Safe year refresh:** five generic exam-hub hero lines were changed from “taking ... in 2026” to **2027** on NDECC, ADC, ORE, INBDE and SDLE. Existing 2026 article links, historical 2026 facts, official 2026 protocol/guide names and URLs remain unchanged.
- **Mumaris Plus judgment:** current SCFHS material confirms Mumaris+ remains the active service channel and publishes 2027 testing windows, but it does not restate every detailed legacy claim in the older Mumaris article. Therefore the page was deliberately finalized as **evergreen**, not falsely stamped as a fully reverified 2027 article. Its existing slug/canonical is unchanged, current Mumaris wording is retained, and it links to the verified 2027 SDLE article. PR **#7** squash-merged this correction into final production commit **`b2b22141e46d8f463e7d1258a3cbb4bfbde4e01e`**.
- GitHub Pages workflow **44258923747** completed build + deploy successfully for the final V33 commit.
- **Post-deploy source verification:** representative INBDE, SDLE and ADEX pages have zero prose `<code>` tags, h3/p Quick Answers, zero Quick Answer tables, zero visible raw Reference URLs, and every remaining table matches an existing swipe wrapper. The older reference article `ndecc-after-passing-provincial-licensing.html` is byte-identical to its pre-V33 version, and `style-v3.css` is also unchanged.
- **Desktop hub-line finding:** the reported hub-header line was **not introduced by the 2027 rollout**. Hub header markup is identical to the pre-rollout version, and the shared `.site-header` rule already has `border-bottom: 0` and `box-shadow: none`. No speculative CSS override was added because there is no verified new border element to delete.
- No slug, canonical path, registry entry, sitemap URL, CSS file, JavaScript file, auth code, ad loader, Study Suite code or Supabase code changed in V33.

## V34 — Subjects/Exams divider + residual mobile overflow cleanup — 2026-11-18

- **Status: COMPLETE and deployed.**
- Live screenshots confirmed a thin horizontal divider directly below the global header on **`subjects.html`** and **`exams.html`** on both desktop and mobile, while the rest of the main site did not show it.
- **Exact cause identified:** both landing pages use the existing `.subjects-shell` wrapper. In `assets/css/components-workspace-core.css`, that wrapper contained `border-top: 1px solid rgba(17, 24, 39, 0.06);`.
- That shell is used by the Subjects and Exams landing pages, explaining why the divider appeared only there. The line was **not** coming from `.site-header`.
- **Fix:** removed that single existing `border-top` declaration from `.subjects-shell`. No replacement override, new class, `!important`, or new CSS rule was added.
- Header safety was explicitly protected: `subjects.html`, `exams.html`, `assets/css/components-global.css`, `assets/css/hamburger-legacy.css`, and `assets/js/main.js` are unchanged from V33. No sticky/fixed behavior, menu-toggle behavior, header spacing, nav layout, or mobile hamburger logic was edited.
- **Residual ADEX mobile horizontal-swipe issue:** source inspection of `/blogs/adex/adex-candidate-guide-dlosce-2027.html` found a few long visible authority paths, including the ADEX Forms URL and California licensure URL. These were converted to short human-readable links while preserving the exact official destinations.
- The same audit found a V33 cleanup defect: several 2027 References contained invalid **nested `<a>` tags** around the `Official source` label. They often rendered normally but were invalid HTML and could create browser-dependent layout behavior.
- Normalized the nested `Official source` anchors to one valid anchor in the **16 affected 2027 article files**. No source URL was removed or changed.
- Proactive overflow cleanup also replaced the few other long visible authority-path strings found in NDEB Protocol, NDEB Timeline and ORE Booking with normal readable source links. Clinical wording and factual content were not changed.
- **Pre-merge QA:** branch changed exactly **17 files**: one CSS file + 16 article HTML files; the CSS diff was exactly **one deletion and zero additions**; zero JavaScript files changed; zero nested `Official source` anchors remained in the changed articles; no long visible URL-like token remained in the ADEX Candidate Guide after cleanup; existing Quick Answers structure, shared `style-v3.css` reference, approved **1 + Native + 2 + 3** ads, and indexability were rechecked.
- Fix branch: `fix/v34-hub-divider-mobile-overflow-20261118`.
- Pull request: **#8 — Fix Subjects/Exams divider and residual article overflow**.
- Production commit: **`f2e148a3a0e437811d6cc5c61c41c8e8f72ddf20`**.
- GitHub Pages workflow **44264241630** completed build, deploy and status reporting successfully.
- **Post-deploy source verification:** `.subjects-shell` now contains only `background: transparent;` with no top border; `subjects.html` and `exams.html` are byte-identical to V33; global header CSS, hamburger CSS and `main.js` are byte-identical to V33; ADEX Candidate Guide has zero nested source anchors and zero long visible URL-like overflow tokens from the audited pattern.
- No slug, canonical URL, sitemap entry, blog registry, auth code, ad loader, Study Suite code, Supabase code or global header behavior changed in V34.

## Measurement

- [ ] **Task 46 — 28-day impact review (measurement date: 2026-12-16).** Compare GSC clicks/queries, organic sessions, DentAIstudy-only impressions, RPM/eCPM, revenue and Study Suite conversions. Set next publishing/marketing investment on measured return. Do not judge the rollout from same-day indexing or revenue noise.

## Progress log

- **2026-10-31:** Task 0 complete.
- **2026-10-31:** Tasks 1 and 2 completed as revenue/code audits; one minimal production-repository patch committed and source-verified, not browser-verified. Next chat: **Task 3 — Exam Coach broken table**. Task 46 measures ad outcomes after deployment.

- **2026-10-31 (Task 3):** v97 failed a live replay: malformed 128k-character answer. Deployed and inspected v98, corrected malformed assistant row 2964, and passed 11 local validator checks. **Task 3 remains open pending an authenticated fresh live response.** Next: finish Task 3 before Task 4.

- **2026-11-01 (Task 3):** Live user test identified repeated `AI_GENERATION_ERROR` on table reformatting. Supabase logs confirmed our guard caused 500s. Deployed v99 deterministic numbered-answer-to-table path; validated against saved conversation with two preceding error messages. Live reply not yet observed; Task 3 stays open.

- **2026-11-01 (Task 3):** Replaced V99 QA path with Supabase V100 structured-response pipeline and committed frontend failure non-persistence (`0258878`). 14 backend fixture tests + 5 renderer integration tests passed, and deployed source re-fetched. Live production browser acceptance is still required; Task 3 pending.

- **2026-11-01 (Tasks 3–5):** Founder confirmed live Exam Coach explanations, tables, MCQs and Notes; Notes, Flashcards and Quizzes all working. Tasks 3 and 4 checked. Task 5 assembled 40 ranked, deduplicated 2027 research briefs with source URLs and measurable-vs-hypothetical evidence; pending final editorial approval.

- **2026-11-17 (Task 5 model benchmark):** Founder approved the first 12 NOW articles. Compared four production drafts: Gemini Pro High Thinking (ACJ), Gemini Pro default (NDECC), Claude Sonnet 5.5 High (AFK dates), and DeepSeek Search ON/DeepThink OFF (AFK registration). **Decision: Claude Sonnet 5.5 High is primary; Gemini Pro High Thinking is secondary; DeepSeek is backup; Gemini Pro default is removed from primary drafting.** Use two articles per prompt and review each four-article round before continuing. Gemini default NDECC draft requires a full redraft because of material factual-risk issues.

- **2026-11-17 (Task 5 staging):** Created `drafts/2027-articles` because GitHub cannot retain remote uncommitted files. Staged three usable drafts in one branch-only commit (`61230b4a6e8b08ba54d71de78090cd80c7af72f4`); verified `main` unchanged. Founder simplified production to Claude Sonnet 5.5 High + Gemini Pro High Thinking only, one article per prompt and two sequential prompts per model chat.

- **2026-11-17 (Task 5 second drafting round):** User accidentally pasted both planned prompts at once, but each model returned only the first requested article. Claude produced the fresh NDECC 2027 article; Gemini produced the ADC 2027 calendar. Both were reviewed against current official pages and accepted with small cleanup only. Added them to `drafts/2027-articles` in staging commit `df1beb8c87938d1791fa13223d2320d4b71f3974`; five total drafts are now staged and `main` remains unchanged.

- **2026-11-17 (Task 5 third drafting round):** Claude returned the NDEB 2027 umbrella calendar and it passed current NDEB calendar spot-checks; staged as `/blogs/ndecc/ndeb-exam-calendar-2027.html` in commit `0d13bcaa1befc50f857264643620c98e85a1ea85`. Gemini upload contained only the ADC March prompt, not an article, so it was not staged. Six total drafts are now safely stored on `drafts/2027-articles`; `main` remains untouched. Founder approved increasing article drafting throughput to 8 articles per review round using 4 sequential Claude prompts + 4 sequential Gemini prompts.

- **2026-11-17 (Task 5 V13 review/staging):** Claude quota ended after one ORE article; user moved primary writing into ChatGPT instead of waiting. Reviewed the combined Gemini file: it contained three real articles (ADC March 2027, ADC Practical Dates 2027, ACJ Registration 2027) plus an ADC September prompt without generated article. At that V13 checkpoint, ADC material was interpreted as 3-year written-exam validity rather than 5 years; this historical conclusion was later superseded in V15 by the newer/current dentist-specific 5-year guidance. The affected drafts were corrected again accordingly; repaired the malformed practical calendar table, removed Google-search wrappers, removed unsupported practical-attempt language and softened unsupported ACJ wording. Staged four new drafts in commit `916a80ca7d4f9210e24496f3661cd4f0f6aaeafb`. Ten new branch-only drafts are now staged; `main` remains untouched.

- **2026-11-17 (Task 5 V14 direct-writing batch):** ChatGPT researched and wrote three missing first-wave/support articles directly from current primary sources: ORE Part 1 Booking 2027, ORE Part 2 Booking 2027, and NDECC Registration 2027. Staged all three on `drafts/2027-articles` in commit `bf61eab56dde2d173e3e9da8c56c2b55af695ef0`; exact unpublished booking dates were not guessed. Branch verification shows 13 new branch-only 2027 drafts and none of these three paths on `main`.

- **2026-11-17 (Task 5 V15 Gemini review):** Reviewed all four Gemini High drafts. All four were usable after correction and were staged in commit `4d9554f7e09cf6ab826b1ea634fd40e1bb6a3e9b`. Material corrections: restored current ADC dentist written validity to 5 years (current dentist/practical pages and June 2026 handbook), rewrote the Sep 2026 booking-trial section to reflect the live-page inconsistency, corrected NDECC five-year timing to first ACJ pass, corrected the current NDECC Protocol to 10 Situational Judgement stations, removed Google Search wrappers, and removed an unsupported 18–30 month NDEB timeline claim.
- **2026-11-17 (Task 5 V15 direct-writing batch):** ChatGPT researched and wrote ADC Practical Waitlist 2027, ADC Initial Assessment 2027, and ADC Written Exam Booking 2027 from current ADC primary sources, then staged them in commit `a81296f15ba12e4f37dd277494d9c774c64e47dc`. Branch verification now shows **20 new branch-only 2027 drafts**; `main` remains untouched by the draft batch.

- **2026-11-17 (Task 5 V16 Gemini review):** Reviewed the next four Gemini articles. All were salvageable. Removed Google Search wrappers, softened the ADC Pearson trial wording, verified current GDC fees/MyGDC mechanics, and rebuilt the malformed ORE UCLC capacity table. Staged the four corrected drafts in commit `14f45ae4254249b441076908a6b3be22bb77959f`.
- **2026-11-17 (Task 5 V16 INBDE batch):** ChatGPT wrote the three INBDE SOON pages directly from the current JCNDE site and 2026 Candidate Guide. No fixed 2027 INBDE dates or unconfirmed 2027 fee schedule were invented. Staged all three in commit `1f12239bcd113a8f5701388b44cadabc0d65c272`. Branch verification confirms **27 new branch-only drafts**, meaning every NOW and SOON article is now drafted and staged.

- **2026-11-17 (Task 5 V17 Gemini quota batch):** Gemini reached its usage limit during the fourth article. Reviewed all four outputs. ORE Priority Booking, ADEX Exam Dates and ADEX Candidate Guide were usable after cleanup. ADC Practical Results was cut before completion and incorrectly said initial assessment validity was 5 years; ChatGPT completed it and corrected the official validity to 7 years while preserving current dentist written validity at 5 years. Staged the corrected four in commit `de3ade44da1d074bebf5a77cd0a2b4f1ff0800e7`.
- **2026-11-17 (Task 5 V17 direct reserve batch):** ChatGPT researched and wrote ADC Practical Eligibility 2027, AFK Results 2027 and ACJ Results 2027 from current ADC/NDEB primary sources. Staged all three in commit `85513bc2becc37bf19a11d35d11a6098b2ae0a13`. Branch verification confirms **34 new branch-only drafts** and no V17 draft on `main`.
- **2026-11-17 (workflow decision):** External drafting is paused; ChatGPT will finish the final six reserve candidates alone. Standard batch size is **3 articles per chat**, giving two remaining writing chats before final integration.

- **2026-11-17 (Task 5 V18 direct reserve batch):** ChatGPT researched and wrote NDECC Clinical Skills 2027, NDECC Situational Judgement 2027 and AFK 2027 Format and Syllabus from current NDEB primary sources and the latest official protocols. The NDECC articles use the 2026 Protocol effective June 15, 2026; the AFK article uses the 2026 Protocol effective January 19, 2026. No 2027 protocol/syllabus was invented. Staged all three in commit `685dba2a077d3d8fca941c83e05b56f0be7dc855`. Branch verification confirms **37 new branch-only drafts** and none of the V18 paths on `main`.

- **2026-11-18 (Task 5 V19 final writing batch):** ChatGPT completed ACJ 2027 Format and Scoring, EDREE 2027 and SDLE 2027 using current NDEB, NIHS/UAEU/MBRU and SCFHS primary sources. EDREE remained publishable only after changing the framing from a claimed 2027 timeline to evidence-backed application planning with an explicit “2027 dates not yet published” statement. SDLE retained the fees intent but quotes only the confirmed SAR 120 eligibility-service fee and directs candidates to verify the live Prometric charge. Staged all three in commit `c966bedea0fcb03dbda0ff4bfa8e4e0583543d36`. Branch verification confirms **exactly 40 new branch-only 2027 drafts**. Task 5 drafting/staging is complete.

- **2026-11-18 (Production Integration Wave 1):** Converted the five NDEB NOW drafts into full existing-site article HTML on `drafts/2027-articles`. Reused the live NDECC template, `style-v3.css`, shared header/footer/scripts and existing approved ad markup only. Added/verified 6–8 contextual body links per page, normalized existing CTA/References markup, and source-level QA confirmed no new style tags/CSS and no broken contextual targets. Commits: `e00fb42933a48107ff8d10efeac8be705ae6f327`, then normalization `932384e39f473bb7a6d2564054ff24fc2c329ff9`. Hubs/registries/sitemap deliberately deferred until the article waves are finished.

- **2026-11-18 (Production Integration Wave 2):** Converted the four ADC NOW drafts into full existing-site article HTML on `drafts/2027-articles` using the existing ADC 2026 calendar template. Current ADC source spot-check confirmed the 2027 written/practical calendar and Period 1 priority rules. Added/verified **11, 8, 8 and 10 contextual body links** respectively, with no broken targets. Existing `style-v3.css`, shared scripts/header/footer and approved ad markup were preserved exactly; no CSS or new style block was created. Commit: `45fab93dde64da3ffcdba6e0ef4016f4c5e8f2be`. Hubs/registries/sitemap remain deliberately deferred.

- **2026-11-18 (Production Integration Wave 3):** Converted the three ORE NOW drafts into full existing-site article HTML on `drafts/2027-articles` using the existing ORE complete-guide/booking templates. Current GDC verification confirmed the five early-2027 sittings, capacities and January Part 2 booking timestamp; unpublished opening timestamps were not invented. Added/verified **7, 8 and 8 contextual body links** respectively, with no broken targets. Existing `style-v3.css`, shared scripts/header/footer and approved ad markup were preserved exactly; no CSS or new style block was created. Commit: `d6f2d9c5aaaec75276c462aeaf759c89949dc08e`. Hubs/registries/sitemap remain deliberately deferred.

- **2026-11-18 (Production Integration Wave 4):** Converted the five NDEB SOON drafts into full existing-site article HTML on `drafts/2027-articles` using the closest NDECC live templates. Current NDEB verification confirmed ACJ registration windows/process, the two-window registration policy, three-stage NDECC registration, current 10-week credential verification, NDECC result timing, the 60-month ACJ-to-NDECC rule and the continuing 2026 NDECC Protocol. Corrected three overconfident timeline statements before integration. Added/verified **9, 7, 8, 10 and 12 contextual body links** respectively, with no broken targets. Existing `style-v3.css`, shared scripts/header/footer and approved ad markup were preserved exactly; no CSS or new style block was created. Commit: `a790efc69a27ec9d442cebf8171b3481f5615b46`. Hubs/registries/sitemap remain deliberately deferred.

- **2026-11-18 (Production Integration Wave 5):** Integrated the final six NDEB RESERVE pages. Current NDEB verification confirmed the AFK/ACJ/NDECC protocols, AFK scoring/attempts, NDECC component structure and result/verification rules. A material stale value was caught in ACJ Format/Scoring and corrected from 5 hours/~150 questions to the live NDEB **5.5 hours / 120–150 questions / 30-minute break** rule. Stored-branch QA verified **7, 8, 8, 7, 7 and 7 contextual body links**, no broken targets, exact approved ads, no CSS/style changes and no `noindex`. Due connector per-run limits, the six files were committed sequentially; final Wave 5 head is `1f6d34a46ee9be8a957f027152bb98c939775911`. The full 16-page Canada/NDEB 2027 cluster is now integrated at article-page level.

- **2026-11-18 (Production Integration Wave 6):** Integrated the six remaining ADC pages and completed the full 10-page ADC 2027 article cluster. Current ADC verification confirmed 7-year initial-assessment validity, current dentist-specific 5-year written validity, current $647/$2,122/$4,775 core fees, the September 2026 Pearson trial status, Period 1 waitlist rules and approximately six-week practical-result timing. The generic ADC FAQ still contains older conflicting 3-year/no-waitlist/$265-renewal language; where conflicts exist, the 2027 pages use the newer dentist-specific pages, official current fees page and period-specific notices, while directing candidates to ADC Connect for their personal expiry/payment status. Stored-branch QA verified **6, 6, 7, 6, 6 and 6 contextual body links**, no broken targets, exact approved ads, no CSS/style changes and no `noindex`. Final Wave 6 head: `beffaf4036659ea735eab628b22fab7653dfd6d6`.

- **2026-11-18 (Production Integration Wave 7):** Integrated the four remaining ORE pages and completed the full 7-page ORE 2027 article cluster. Current GDC verification confirmed the £115/£485/£6,967/£686 fee structure, UCLC capacity plan, current eight-week booking rule, live MyGDC/online-account workflow, reopened-seat process and existing priority groups. The announced replacement candidate portal still has no published launch/migration date. The current January 2027 Part 2 notice gives successful priority candidates 48 hours to pay, so the priority article now treats that timing as sitting-specific rather than universal. Stored-branch QA verified **7, 7, 8 and 7 contextual body links**, no broken targets, exact approved ads, no CSS/style changes and no `noindex`. Final Wave 7 head: `a74c63fc1f05d5af0a56b0a8eb052888e00c508d`.

- **2026-11-18 (Production Integration Wave 8):** Integrated all three INBDE 2027 pages and completed the INBDE article cluster. Current JCNDE verification confirmed that there is still no separate 2027 Candidate Guide, so the pages use the 2026 Guide updated 4 Aug 2026 as current planning guidance without inventing a fixed annual 2027 calendar. Confirmed Prometric scheduling, six-month eligibility, one 45-day extension, $890 exam fee, $435 international processing fee, current rescheduling fees, 3–4 week result timing, Pass/Fail reporting, scale-75 context and current retest rules. Preserved the official $105 Candidate Guide vs $65 live-page result-audit fee discrepancy. Stored-branch QA verified **6, 6 and 6 contextual body links**, no broken targets, exact approved ads, no CSS/style changes and no `noindex`. Final Wave 8 head: `25b72f43b2b1118bdd994f895ce5011aaea35dee`.

- **2026-11-18 (Production Integration Wave 9):** Integrated the final four article pages: ADEX Exam Dates 2027, ADEX Candidate Guide/DLOSCE 2027, EDREE 2027 and SDLE 2027. Current ADEX verification confirmed the Aug 1 2026–Jul 31 2027 manual season, real-time calendar, outside-candidate rules, no-waitlist policy, $2,995 series fee, DLOSCE integration and 18-month rule. Static ADEX school/date snapshots were removed so the article cannot go stale as the live calendar changes. NIHS/UAEU verification confirmed AED 1,000, up to three EDREE attempts/year until pass, usual 120-MCQ/3-hour structure, 10-working-day results and no exact public 2027 date table. SCFHS verification confirmed nine Jan–Oct 2027 windows, SAR 120 eligibility-service fee, current 200-question SDLE format, 542 pass score, 2–6 week result timing and the exam-specific four-attempt/year guidance. Stored-branch QA verified **6, 8, 5 and 8 contextual body links**, no broken targets, exact approved ads, no CSS/style changes and no `noindex`. Final Wave 9 head: `a895092bb6a5b3e64632e9e02e047bf3766cbe89`. **All 40/40 article pages are now production-integrated on the staging branch.**

- **2026-11-18 (V29 branch-state clarification):** Rechecked the actual GitHub refs after the prior chat interruption. `drafts/2027-articles` is a committed staging branch at `a895092bb6a5b3e64632e9e02e047bf3766cbe89`; `main` remains separately at `0cc53819446968a15b19f5d7751a1cf270615d2f`. Existing hub files, `blogs-*.js` registries and `sitemap.xml` appear on the staging branch because the branch inherited the full repository from `main`; they have not yet received the 2027 discovery edits. V28 was compared with V27 and is not truncated: it contains the V27 plan plus the completed Wave 9 and updated execution state. Next work is therefore to edit those existing discovery files on the staging branch, not to recreate article pages or create duplicate JS files.

- **2026-11-18 (Hub + Discovery Pass / V30):** Added 2027 roadmap sections to the seven existing exam hubs, added all 40 new article entries to the seven existing matching `blogs-*.js` registries, and added all 40 canonical URLs to the appropriate existing sitemap clusters. Stored-branch QA confirmed 40/40 exact-once hub entries, 40/40 exact-once registry entries, 40/40 exact-once sitemap URLs, valid registry JavaScript syntax, no hub/registry/sitemap deletions, no CSS/style-block changes, and no ad-loader or placement changes. One real SEO defect found during inspection—an empty AFK Exam Dates 2027 meta description—was filled in place. Final discovery head: `68ff74e97942333e2f9488d941433b132dc937bf`. `main` remains untouched.

- **2026-11-18 (Final staged-rollout QA / V31):** Audited all 40 new article pages plus the seven hubs, seven registries and sitemap at the stored staging branch. Found and fixed one broken NDEB Timeline internal link and six double-escaped meta-description ampersands. Rechecked the corrected files and the full discovery layer. All 40 article pages now pass source-level canonical/meta/H1/noindex/style/script/ad/internal-link checks; all 40 also retain the existing responsive template structure. Hub links resolve, all seven registries compile, all 40 sitemap URLs remain exact-once, and no CSS, `main.js`, auth, Supabase or Study Suite files are part of the rollout diff. Final staging head: `35444430e907d2baa77079a5aa724a1c00f8d001`. `main` remains `0cc53819446968a15b19f5d7751a1cf270615d2f`. Next task is clean merge/publish followed immediately by a live production smoke check.

- **2026-11-18 (Merge + publish / V32):** Created PR #5 from `drafts/2027-articles` to `main` after confirming staging was 65 commits ahead and 0 behind. Squash-merged the complete 55-file rollout into production commit `4db8ef99ab9284bde39fbbeca488a2a9bbceeb63`. GitHub Pages run 44248266673 completed build/deploy/report successfully and deployed that exact commit to `https://dentaistudy.com/`. Post-merge `main` source checks across all seven exam clusters confirmed the representative 2027 pages, approved 1 + Native + 2 + 3 ads, shared stylesheet, no `noindex`, hub roadmap, registry discovery and sitemap presence. The available external crawler could not provide fresh renders of the brand-new article URLs immediately after deployment, so browser rendering is not overstated. The 2027 rollout is published; Task 46 is the remaining measurement task.

- **2026-11-18 (V33 production consistency cleanup):** Live screenshots exposed real HTML integration inconsistencies missed by source-only rollout QA. Normalized all 40 new 2027 pages to the established h3/p Quick Answers structure, removed four duplicated Quick Answer tables, removed prose `<code>` markup, preserved only existing swipe-wrapped tables, and shortened displayed Reference URLs without changing their targets. Four independent pre-commit source/DOM QA passes protected Quick Answers structure, mobile-overflow/table behavior, SEO/ads/shared scripts, and links/content. Five safe generic exam-hub hero year labels were refreshed to 2027. The legacy Mumaris Plus article was deliberately kept evergreen after current SCFHS review rather than falsely stamping every legacy detail as 2027. PR #6 deployed the main cleanup (`5a5f92702c003127c175355530e22a1066849b33`); PR #7 deployed the Mumaris correction. Final production commit: `b2b22141e46d8f463e7d1258a3cbb4bfbde4e01e`. Both GitHub Pages deployments succeeded. Shared CSS/JS, slugs, ads, registries and sitemap remain unchanged.

- **2026-11-18 (V34 production bug cleanup):** Live desktop/mobile screenshots isolated the Subjects/Exams-only divider to the existing `.subjects-shell` border in `components-workspace-core.css`; removed that one declaration without touching the header, hamburger or JS. Also fixed the remaining ADEX candidate mobile-width risk by replacing long visible authority paths with readable links and normalized invalid nested `Official source` anchors across the 16 affected 2027 articles. PR #8 squash-merged to production commit `f2e148a3a0e437811d6cc5c61c41c8e8f72ddf20`; GitHub Pages workflow 44264241630 deployed successfully. Post-deploy source checks confirm Subjects/Exams HTML, global header CSS, hamburger CSS and `main.js` are unchanged from V33.

## Current execution state

- **Current task:** V34 live divider/mobile-overflow cleanup complete and deployed.
- **Finished:** Subjects/Exams-only header divider removed at its actual `.subjects-shell` source; header/hamburger behavior untouched; remaining ADEX mobile-width risk removed; invalid nested source links normalized across all 16 affected 2027 articles. Final production commit: **`f2e148a3a0e437811d6cc5c61c41c8e8f72ddf20`**.
- **Next task — Task 46:** perform the 28-day impact review on **2026-12-16** using fresh GSC, GA4 and DentAIstudy-only Adsterra data. Until then, only real production defects should interrupt measurement.
- **Remaining until the current publishing plan is complete:** Task 46 — 28-day impact review.