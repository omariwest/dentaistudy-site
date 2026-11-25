# BracketMotion — Master Project Plan v56
> **Status:** Working on UI refinements with the existing DentAIstudy Supabase backend retained by founder decision on 26 November 2026.
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site` only; `main` untouched.
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md).
> **Previous master tracker:** [v55](BracketMotion-Master-Project-Plan-v55.md); all v7–v55 remain historical records.
> **Current gate:** Task 13 approved by founder. Task 14 split-weight wordmarks, right-hand navigation and clinician profile chip implemented and preview deployed; founder visual approval pending. Independent backend deferred; shared DentAIstudy backend stays unchanged.

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
| 14 | Header/wordmark: `bracket` light and **motion** bold across app, public site, legal pages, footer; Patients/Settings right; circular clinician portrait/name | **Implemented, deployed and build-verified; founder visual review pending** |
| 15 | Five compact icon-plus-label clinical workflow steps on existing horizontal ribbon; contextual tools stay in side panel; avoid duplicating LightForce | Pending |
| 16 | Reduce surrounding chrome/padding to enlarge central working canvas, comprehensive 1440/1280/1024/768/390/320px and clinical-gate regression | Pending |
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

## Engineering and review rules
Edit existing source blocks and remove the original obsolete rule instead of appending overrides. No `!important`, inline CSS/JS, unrelated design system, new CSS file, duplicate hidden UI, or silent merge to `main`. Small reviewed gates; guarded build and real browser QA before claiming completion. Use existing DentAIstudy/UIORI controls as reference, not blindly imported CSS.

## Handoff
**Task 13 is founder-approved. Task 14 is deployed and verified by production build, awaiting founder visual approval.** Preview: https://bracketmotion-preview-fl4zksa14-amarsaaliomer-6121.vercel.app/app ; exact frontend commit `30482e1da0b7124bfd0347fa657c57c0c6e6ecfb`. A local isolated Chromium header fixture passed all 8 listed widths; full app SSO-protected live screenshots and signed-in account testing remain unverified and should not be claimed. **Next after approval: Task 15** compact five-step clinical workflow ribbon, without turning it into a busy CAD toolbar. Keep existing DentAIstudy Supabase, do not alter Google login/storage/clinical AI or delete-account behavior, do not merge `main`, do not buy a domain or create services.
