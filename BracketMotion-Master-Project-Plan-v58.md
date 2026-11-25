# BracketMotion — Master Project Plan v58
> **Status:** Working on UI refinements with the existing DentAIstudy Supabase backend retained by founder decision on 26 November 2026.
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site` only; `main` untouched.
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md).
> **Previous master tracker:** [v57](BracketMotion-Master-Project-Plan-v57.md); all v7–v57 remain historical records.
> **Current gate:** Tasks 13–15 founder approved. Task 16 fixes deployed (READY): Diagnosis empty scrolling removed, balanced sections and compact workspace. Clinical build and isolated six-width dropdown tests pass; founder visual approval pending. DentAIstudy Supabase unchanged.

## Product direction (unchanged)
Photo-first, clinician-controlled visual fixed-appliance planning; five intraoral photos; editable AI draft diagnosis and up to three editable treatment suggestions; approximate clinician-reviewed 3D crown/gingiva representation; illustrative mechanics, not biological prediction. No domain purchase, paid service, uncontrolled patient-photo upload or removal of the working STL/PLY engine until photo matching is proven.

## Approved implementation queue

| Task | Scope | Current status |
| --- | --- | --- |
| 1–9 | Existing photo-first workflow, 3D mechanics prototype, responsive improvements and Patients workspace | **Founder approved** — details in v52 |
| 10 | Settings, clinician profile, private circular avatar, subtle focus work | **Implemented** in deployed preview; founder final visual approval / authenticated behavior pending |
| 11 | Separate Supabase backend, owner-scoped cases/buckets and AI function | **Deferred by founder** — stay on the existing DentAIstudy backend for now; migration source prepared but not activated |
| 12 | BracketMotion-specific auth, professional danger-zone account deletion modeled on DentAIstudy; real authenticated profile and patient persistence QA | **Pending** — independent deletion must not affect a shared DentAIstudy account; do not claim signed-in tests passed |
| 13 | Focus/border/button refinements; subtle single-focus outline, selectively darker 1px borders and compact text-fitting buttons, including public pages | **Approved by founder 26 Nov 2026** |
| 14 | Header/wordmark: `bracket` light and **motion** bold across app, public site, legal pages, footer; Patients/Settings right; circular clinician portrait/name | **Approved by founder 26 Nov 2026** |
| 15 | Five compact icon-plus-label clinical workflow steps on existing horizontal ribbon; contextual tools stay in side panel; avoid duplicating LightForce | **Approved by founder 26 Nov 2026** |
| 16 | Reduce surrounding chrome/padding, remove Diagnosis trailing blank scroll, rebalance section columns; responsive dropdown QA and clinical regression | **Implemented, Vercel READY and build validated; founder visual approval pending** |
| 17 | Clinician-editable cephalometric landmarks and deterministic measurements from legally reusable code **and weights** | Pending / heavy |
| 18 | Five-photo approximate 3D reconstruction, corrections, measured feasibility and integrated clinician alpha | Pending / heaviest and last |

## Task 11 — historical migration preparation; deferred at founder request
- Existing DentAIstudy Supabase project: `hlvkbqpesiqjxbastxux`. BracketMotion case table contained **zero** rows on 25 Nov 2026. Keep this shared backend fully operational now; no auth, data, storage or AI migration.
- Source-only SQL: [independent Supabase bootstrap](bracketmotion-site/supabase/migrations/20261125_bracketmotion_independent_backend.sql). **Not applied** to either project; requires a newly created project.
- Source-only Edge Function: [bracketmotion-clinical-reasoning](bracketmotion-site/supabase/functions/bracketmotion-clinical-reasoning/index.ts), copied from currently active v3. It expects its own `GEMINI_API_KEY` secret and verified user auth; do not claim it was deployed to the new backend.
- Future client cutover is limited to the BracketMotion-specific Supabase URL/publishable key in `bracketmotion-site/src/supabase.ts`, the **new** project's redirect settings and signed-in verification. Remove DentAIstudy-specific signup/account labels and metadata **at the source** during cutover. Do not swap before backend exists.
- Auth user IDs do not need to be migrated because there are no BracketMotion users. This is a new product signup, not a DentAIstudy account migration.
- Profile/scan storage remains private; the **five intraoral photographs stay browser-local** during Task 11. No photos to Gemini.
- Founder confirmed there is another project in a separate organization, accounting for the two-Free-project quota. **Do not pursue new project creation now.** No authorization bypass, payment or changes to either live project.
- **Task 11 completion requires:** new project healthy, SQL applied and inspected, Edge Function deployed with secret, auth URL/email flow configured, separate client preview deployed, signed-in patient row and avatar read/write/delete tested without accessing another account, and DentAIstudy unaffected.

## Task 13 — first small subgate (focus-only)

- [x] Reworked existing focus states for clinical record inputs, shared dropdowns, unit fields, diagnosis/plan text areas, plan option inputs, patient search, auth dialog and 3D target values.
- [x] Removed the duplicate `.plan-textarea:focus-visible` outline and overlapping clinical input outline selectors at their source.
- [x] Used restrained 1px low-opacity shadow and subtle visible border-color on focus; no changes to control width, height, margins, padding, breakpoints, layouts or fonts.
- [x] Exact CSS-only commit: `7b1744666ca90530519eeaf7ad976962aa5070c9`; Vercel preview: https://bracketmotion-preview-3tjqrcjy0-amarsaaliomer-6121.vercel.app/app
- [x] Production deployment **READY**. Build logs: V1 guard (6 profiles, 7 records, 34 exclusions) PASS; TypeScript and Vite PASS. Existing large-chunk warning remains nonblocking.
- [ ] Human/browser visual inspection of focused fields on actual devices not independently completed; do not claim screenshot validation.
- [ ] Remaining Task 13 darker neutral 1px actionable borders and tighter/thinner button fit, including public pages, deliberately not mixed into this focus gate.

## Task 13 — border/button subgate, 26 November 2026

- [x] Edited the original `bracketmotion-site/src/styles.css` only, without new files, copied styling systems, appended overrides, `!important`, HTML inline styles or React/JavaScript changes.
- [x] Selectively strengthened existing **1px** neutral borders on patient/diagnosis records, input/select/textarea fields, panels, clinical cards, settings, dialog and primary/secondary actions; preserved intentional purple selected states and colored warnings.
- [x] Reduced common public/clinical action heights and padding: public CTA 48→42px (compact 40→34), quiet app buttons 34→30, primary app buttons 38→34; removed enforced large minimum widths on clinical page/approval actions. Full-width account/inspector actions remain appropriate.
- [x] Updated **existing narrow-screen rules** for label-fitting clinical and public action buttons. No new breakpoint, fixed container width, geometry change, AI change or database change.
- [x] Removed public install-button upward movement on hover; stable hover state remains.
- [x] CSS-only implementation commit: `1b6d2b3d83e7c07d51fe18eb128d3f22fdf3266d`.
- [x] Vercel preview: https://bracketmotion-preview-8igi3y0f7-amarsaaliomer-6121.vercel.app/app — **READY**, correct commit SHA. Build logs confirmed 6/6 V1 profiles, 7 required record groups, 34 exclusions, clinical approval/PWA invariants; TypeScript and Vite production build passed.
- [ ] Independent browser screenshot and interactive QA at 1440, 1280, 1024, 768, 390 and 320px has **not been executed in this gate**; do not assert no overflow from build alone. Founder preview review still pending.
- **Next after approval:** Task 14 split light `bracket` / bold `motion` wordmark and app header account/Patients/Settings alignment; keep design inside current components.

## Task 14 — header, branding and clinician account, 26 November 2026

- [x] Edited the **existing** `bracketmotion-site/src/App.tsx` and `src/styles.css` only. No new components, dependencies, CSS files, cloned styles, backend changes or overrides.
- [x] All three shared wordmark occurrences changed to lowercase light `bracket` + bold **motion**, via the existing wordmark styling: landing/header, footer (including legal pages through the shared layout), clinical app header.
- [x] Moved existing Patients and Settings controls to the right-side topbar actions without changing their handlers, active states or navigation conditions; no Help link.
- [x] Restyled existing account control as subtle capsule with circular 28px saved-avatar/initial and existing clinician name, ellipsis for long names. Signed-out state says Sign in; mobile shows avatar-only, retaining accessible button label.
- [x] Under existing 1180px breakpoint, hide long case title to protect action space; at existing 640px breakpoint, show avatar only and retain compact Patients/Settings buttons. No new breakpoint or fixed-page width.
- [x] Source commit: `30482e1da0b7124bfd0347fa657c57c0c6e6ecfb`; Vercel **READY** preview: https://bracketmotion-preview-fl4zksa14-amarsaaliomer-6121.vercel.app/app
- [x] Production build logs: 6/6 V1 family profile regression, 7 required record groups, 34 exclusions, clinician gates, PWA invariants, TypeScript and Vite completed without errors.
- [x] Isolated **header-only** Chromium layout fixture using matching revised markup/CSS measured browser viewport and bounding boxes at 1440, 1280, 1180, 1024, 768, 640, 390 and 320px with a deliberately long name: no fixture overflow or clipped action row; profile name hidden under 640px.
- [ ] **Live** interactive browser QA at all widths not completed. Preview requires Vercel SSO; do not conflate fixture or build validation with a live authenticated browser test. Avatar save and name persistence also remain signed-in QA work from Task 12.
- [ ] Founder to inspect live preview and approve Task 14 before starting Task 15 workflow ribbon.

## Task 15 — five-step icon-and-label workflow ribbon, 26 November 2026

- [x] Edited existing `bracketmotion-site/src/App.tsx` `clinicalFlow` and existing ribbon render block; added five lightweight outlined SVG icon paths in existing flow data, drawn through the same small reusable SVG in the existing item markup. No icon library, dependencies, new components or external artwork.
- [x] Removed obsolete step-number markup and its original `.app-flow-item__index` CSS; used original `.app-flow-nav`, `.app-flow-item`, `.app-flow-item__copy` and the existing 640px media block for all changes. No appended CSS overrides, `!important` or inline styling.
- [x] Kept the exact five workflow labels and current implementation semantics: Case Presentation → Diagnosis → Treatment Plans → 3D Setup (existing scan workspace, **not yet photo-to-3D**) → Mechanics. Did not claim unbuilt five-photo matching is live.
- [x] Kept `openSection` handlers, `aria-current`, title/tooltips, all clinician approval gates, existing 48px desktop / 42px mobile ribbon grid rows and contextual 3D toolbars/inspector untouched.
- [x] Selected state is subdued lavender, regular actions stay neutral. Five controls use small icon above label inside the fixed ribbon; narrow screens keep its original independent horizontal scrolling rather than forcing page-level overflow.
- [x] Exact frontend commit `28a984819b4e19b129793db11ae98baced975d11`; **READY** preview: https://bracketmotion-preview-ev9i34zmz-amarsaaliomer-6121.vercel.app/app
- [x] Vercel production build PASS: 6/6 representative V1 family profiles, 7 Gate 2 record groups, 34 Gate 4 exclusions, clinician gates/PWA invariants, TypeScript and Vite. No build errors.
- [x] Isolated **Chromium ribbon fixture** tested at 1440, 1280, 1180, 1024, 768, 640, 390 and 320 px. No document horizontal overflow or vertically clipped ribbon items; all five actions reachable with horizontal nav scroll at 390/320. This is not a whole-app browser regression test.
- [ ] Full authenticated live-app browser inspection blocked by Vercel Deployment Protection; do not claim live responsive screenshots or auth testing were performed. Leave protection in place.
- [ ] Founder visual approval of Task 15. **Next task after approval: Task 16** stage density and comprehensive responsive/clinical-gate checks.

## Task 16 — compact workspace and Diagnosis empty-scroll fix, 26 November 2026

- [x] Root cause of the reported Diagnosis bottom blank region traced to the shared `.ui-select-menu`. A closed dropdown previously used `visibility:hidden` but still occupied an **absolutely positioned 230px scrollable box**, extending its ancestor scrollable area. An isolated Chromium reproduction showed roughly **191px of phantom extra scroll** in a representative case.
- [x] Edited the original hidden/open menu rules in `src/styles.css`: closed menus now have zero box height, maximum height, padding, border and shadow. The **same menu** regains its original padding, border, 230px maximum and shadow while open. Did **not** hide a broken container, change placement to fixed, or introduce CSS overrides.
- [x] Edited the existing `src/UiSelect.tsx` opening calculation to account for the restored 12px menu frame and clear the prior inline `max-height` on close. The existing `is-dropup` state, measured available-space direction, focus, keyboard/escape and option selection behavior otherwise remain untouched.
- [x] Closed/open/close **isolated Chromium dropdown fixture** verified at 1440, 1280, 1024, 768, 390 and 320px: dropdowns below the fold opened **up**, near the top opened **down**, no vertical clipping, no document horizontal overflow, and ancestor scrollHeight stayed stable after close. This tests the original component behavior pattern, not a signed-in live app.
- [x] **Reused and moved** the single existing Diagnosis **V1 scope screen** section to the end of the right column, after cephalometric findings. The previous 4-section left / 2-section right imbalance is now 3 / 3, which reduces the visibly unused right-hand area. Scope selection and clinician gating logic untouched. Single-column mobile reading order remains logical.
- [x] Reduced existing shell header height (desktop 58→54px, ribbon 48→46px; mobile header 52→50px); compacted outer form padding, card/gap/header spacing, settings/patients chrome, 3D viewer toolbars and stage/scan margins. Kept existing widths, mobile breakpoints, anatomy canvas rendering, and contextual controls; no CSS added at file bottom.
- [x] Changed only `bracketmotion-site/src/styles.css`, `src/UiSelect.tsx`, and the existing Diagnosis section location in `src/App.tsx`. Commits: `ba1eed629bd1b41e25e045f89be0d659b66efc62` (dropdown and density), `61680c5b3988f8dee73925311e5fb896cb262895` (column rebalance).
- [x] Final Vercel **READY** preview: https://bracketmotion-preview-bkrszgtk0-amarsaaliomer-6121.vercel.app/app for commit `61680c5b3988f8dee73925311e5fb896cb262895`. Build logs: 6/6 V1 representative families, 7 record groups, 34 scope exclusions, clinical gates and PWA invariants PASS; TypeScript/Vite build in 4.36s; no deployment errors.
- [ ] Full **live** app visual/browser QA at all six sizes is not independently verified while the preview remains behind Vercel authentication. The isolated dropdown fixture is not an app-level substitute.
- [ ] Founder to review at the bottom of Diagnosis, open the V1 scope dropdown near the page bottom, and inspect case/3D workspace density.

## Engineering and review rules
Edit existing source blocks and remove the original obsolete rule instead of appending overrides. No `!important`, inline CSS/JS, unrelated design system, new CSS file, duplicate hidden UI, or silent merge to `main`. Small reviewed gates; guarded build and real browser QA before claiming completion. Use existing DentAIstudy/UIORI controls as reference, not blindly imported CSS.

## Handoff
**Tasks 13–15 approved. Task 16 implemented and Vercel READY, awaiting founder visual approval.** Preview: https://bracketmotion-preview-bkrszgtk0-amarsaaliomer-6121.vercel.app/app . New work edits only the existing CSS, shared select component, and Diagnosis column ordering. This removes the closed-popup scroll height and moves V1 scope to the previously under-used right column. Six-width isolated Chromium opening-direction tests passed. Await founder visual review before Task 17 cephalometric feasibility, landmark model licensing and correction workflow. Keep the DentAIstudy Supabase project unchanged; account deletion remains gated, images stay tab-local, and `main` must not be touched.
