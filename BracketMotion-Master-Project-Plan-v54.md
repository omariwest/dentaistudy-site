# BracketMotion — Master Project Plan v54
> **Status:** Founder approved independent-backend migration and compact UI refinement sequence.
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site` only; `main` untouched.
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md).
> **Previous master tracker:** [v53](BracketMotion-Master-Project-Plan-v53.md); earlier v7–v52 retained as history.
> **Current blocker:** Supabase declined to provision a third Free project because the owner has reached the two-active-project limit. Quoted project price $0/month, but **no new project exists**. No live backend/frontend switch has occurred.

## Product direction (unchanged)
Photo-first, clinician-controlled visual fixed-appliance planning; five intraoral photos; editable AI draft diagnosis and up to three editable treatment suggestions; approximate clinician-reviewed 3D crown/gingiva representation; illustrative mechanics, not biological prediction. No domain purchase, paid service, uncontrolled patient-photo upload or removal of the working STL/PLY engine until photo matching is proven.

## Approved implementation queue

| Task | Scope | Current status |
| --- | --- | --- |
| 1–9 | Existing photo-first workflow, 3D mechanics prototype, responsive improvements and Patients workspace | **Founder approved** — details in v52 |
| 10 | Settings, clinician profile, private circular avatar, subtle focus work | **Implemented** in deployed preview; founder final visual approval / authenticated behavior pending |
| 11 | Separate Supabase BracketMotion backend; owner-scoped cases and private buckets; AI function; switch BracketMotion client only | **BLOCKED by account quota** — source migration prepared; not deployed |
| 12 | BracketMotion-only auth and verified profile/avatar/password, professional danger-zone account deletion confirmation modeled on DentAIstudy, test real case save/reopen | Pending after Task 11 |
| 13 | Focus/border/button refinements in existing styles; subtler single focus, selectively darker 1px borders, tighter/thinner buttons site-wide | **Focus subgate implemented and production-built; border/button work pending** |
| 14 | Header/wordmark: `bracket` light and **motion** bold across app, public site, legal pages, footer; Patients/Settings right; real circular clinician portrait/name | Pending |
| 15 | Five compact icon-plus-label clinical workflow steps on existing horizontal ribbon; contextual tools stay in side panel; avoid duplicating LightForce | Pending |
| 16 | Reduce surrounding chrome/padding to enlarge central working canvas, comprehensive 1440/1280/1024/768/390/320px and clinical-gate regression | Pending |
| 17 | Clinician-editable cephalometric landmarks and deterministic measurements from legally reusable code **and weights** | Pending / heavy |
| 18 | Five-photo approximate 3D reconstruction, corrections, measured feasibility and integrated clinician alpha | Pending / heaviest and last |

## Task 11 — provisioning facts and migration boundary
- Existing DentAIstudy Supabase project: `hlvkbqpesiqjxbastxux`. BracketMotion case table contains **zero** rows on 25 Nov 2026.
- Source-only SQL: [independent Supabase bootstrap](bracketmotion-site/supabase/migrations/20261125_bracketmotion_independent_backend.sql). **Not applied** to either project; requires a newly created project.
- Source-only Edge Function: [bracketmotion-clinical-reasoning](bracketmotion-site/supabase/functions/bracketmotion-clinical-reasoning/index.ts), copied from currently active v3. It expects its own `GEMINI_API_KEY` secret and verified user auth; do not claim it was deployed to the new backend.
- Future client cutover is limited to the BracketMotion-specific Supabase URL/publishable key in `bracketmotion-site/src/supabase.ts`, the **new** project's redirect settings and signed-in verification. Remove DentAIstudy-specific signup/account labels and metadata **at the source** during cutover. Do not swap before backend exists.
- Auth user IDs do not need to be migrated because there are no BracketMotion users. This is a new product signup, not a DentAIstudy account migration.
- Profile/scan storage remains private; the **five intraoral photographs stay browser-local** during Task 11. No photos to Gemini.
- No authorization, RLS, API secret or paid plan bypass. Never pause/delete existing live projects to free quota without founder's express decision.
- **Task 11 completion requires:** new project healthy, SQL applied and inspected, Edge Function deployed with secret, auth URL/email flow configured, separate client preview deployed, signed-in patient row and avatar read/write/delete tested without accessing another account, and DentAIstudy unaffected.

## Task 13 — first small subgate (focus-only)

- [x] Reworked existing focus states for clinical record inputs, shared dropdowns, unit fields, diagnosis/plan text areas, plan option inputs, patient search, auth dialog and 3D target values.
- [x] Removed the duplicate `.plan-textarea:focus-visible` outline and overlapping clinical input outline selectors at their source.
- [x] Used restrained 1px low-opacity shadow and subtle visible border-color on focus; no changes to control width, height, margins, padding, breakpoints, layouts or fonts.
- [x] Exact CSS-only commit: `7b1744666ca90530519eeaf7ad976962aa5070c9`; Vercel preview: https://bracketmotion-preview-3tjqrcjy0-amarsaaliomer-6121.vercel.app/app
- [x] Production deployment **READY**. Build logs: V1 guard (6 profiles, 7 records, 34 exclusions) PASS; TypeScript and Vite PASS. Existing large-chunk warning remains nonblocking.
- [ ] Human/browser visual inspection of focused fields on actual devices not independently completed; do not claim screenshot validation.
- [ ] Remaining Task 13 darker neutral 1px actionable borders and tighter/thinner button fit, including public pages, deliberately not mixed into this focus gate.

## Engineering and review rules
Edit existing source blocks and remove the original obsolete rule instead of appending overrides. No `!important`, inline CSS/JS, unrelated design system, new CSS file, duplicate hidden UI, or silent merge to `main`. Small reviewed gates; guarded build and real browser QA before claiming completion. Use existing DentAIstudy/UIORI controls as reference, not blindly imported CSS.

## Handoff
Task 13 focus subgate deployed and build-verified; await visual inspection before combining with border/button pass. Task 11 provisioning attempted, but Supabase enforced the account's **two Free active projects** limit. Migration SQL and the original BracketMotion reasoning function are staged as source files; **nothing has been applied to a new Supabase backend and no production cutover has happened**. Owner needs an available Free project slot or an expressly approved paid plan before completing Task 11. Until then, existing preview remains connected to DentAIstudy as before. Task 12 is not independently verified.
