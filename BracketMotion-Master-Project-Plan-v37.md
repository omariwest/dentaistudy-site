# BracketMotion — Master Project Plan v37

> **Status:** Focused pre-alpha correction round  
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site`  
> **Application:** `bracketmotion-site/`  
> **Current approval gate:** Correction Task 2 implemented and deployed; founder visual approval before Task 3  
> **Product direction:** [BracketMotion — Product Identity & Direction](BracketMotion-Product-Identity.md)  
> **Previous full tracker / frozen clinical specification:** [Master Project Plan v35](BracketMotion-Master-Project-Plan-v35.md)

## How this tracker is used

This file records **tasks, approvals, evidence, and the next action**. It is not the product manifesto or a design essay. Product vision, market position, visual direction, architecture boundaries, and founder principles now live in `BracketMotion-Product-Identity.md`.

The frozen detailed clinical V1 scope, exclusions, two approval gates, and technical implementation history remain preserved in **v35** (and prior v7–v34). The new structure does **not** silently loosen that scope.

Keep this tracker short. Do not overwrite earlier tracker versions; make one new numbered version at each approved gate.

## Verified baseline — through v35

| Workstream | Status | Evidence |
| --- | --- | --- |
| Public landing, legal site, preview | Complete / approved | v12 onward; separate Vercel preview |
| Clinical V1 scope | Frozen, approved | Gate 1–4 in v15–v16 and v35 |
| App Tasks 1–3: workspace, records, treatment plan | Approved | v17–v20 |
| App Tasks 4–6: 3D demo, import/segmentation, target setup | Approved | v20–v22 |
| App Tasks 7–8: appliances, deterministic stages | Approved | v23–v24 |
| App Tasks 9–10: Gemini clinical review, Supabase persistence | Approved | v25–v26 |
| App Task 11: PWA and integration | Approved | v27 |
| Task 12: engineering guard and bug-fix round 1 | Complete | v28 + validation report |
| Alpha protocol | Prepared, not run | `BracketMotion-Closed-Alpha-Protocol-v1.md` |
| Five founder pre-alpha corrections | Approved | v30–v34 |
| Post-approval text-only wordmark/install correction | Complete | v35 |

**Formal closed alpha is NOT complete.** It is paused only while the founder-requested interface correction round below is executed; Task 12 remains the next clinical release gate.

## New founder-requested correction round — 5 small approval tasks

### Correction Task 1 — Product charter, tracker split, actual backend audit

- [x] Reconfirm orthodontic-resident founder is the first clinician alpha tester.
- [x] Create a durable product identity document explaining audience, purpose, Canva-inspired outcome-first positioning, clinical V1 boundary, visual direction, reuse-first rules, and career/business aspirations.
- [x] Reorganize the master document into a concise **task-only** tracker, preserving v35 as the complete clinical/technical implementation archive.
- [x] Establish SureSmile-inspired neutral canvas / compact control hierarchy; keep BracketMotion purple as a restrained accent.
- [x] Correct earlier vague Gemini wording from v35: BracketMotion has a live, **separate** `bracketmotion-clinical-reasoning` Edge Function; DentAIstudy `ai-generate` is not reused.
- [x] Verify live Supabase project, function, own-case RLS policies, and private storage owner/case policies.
- [x] Confirm shared DentAIstudy authentication/Supabase and server-side Gemini secret, with BracketMotion-specific database objects.
- [x] Confirm domain remains unpurchased, app remains in `bracketmotion` branch and separate Vercel preview; protect DentAIstudy `main`.
- [x] Document a backend gate-integrity detail honestly: function POST authenticates the user, but its clinical readiness/approval flags presently come from the client payload. Do not claim they are persisted-case-verified.
- [x] No clinical application code, Supabase configuration, or DentAIstudy production code changed by this task.
- [x] Founder approves Task 1.

### Correction Task 2 — 3D anatomy and patient/demo presentation

- [x] Inspect the upstream OrganUI model manifest: original meshes include **upper-gum** and **lower-gum**, plus three separate jawbone meshes.
- [x] Find exact bug in `src/ClinicalViewer.tsx`: all nontooth meshes were hidden, including genuine gingiva.
- [x] Keep original upper/lower gingival meshes visible and original jawbones hidden; no substitute or synthetic anatomy generated.
- [x] Keep only actual teeth selectable; gum meshes do not intercept tooth picking or transforms.
- [x] Preserve existing patient STL/PLY import, residual full scan surface, and segmentation/target flows; no clinical geometry or persistence changes.
- [x] Preserve existing clear labeling of **Demo reference / Reference model · not patient data** and patient scans as primary.
- [x] No additional WebGL meshes, loaders, CSS rules, or responsive breakpoints.
- [x] Run `npm run validate:v1 && tsc -b && vite build` via Vercel; all pass. Dedicated preview deployment READY for commit `babfef657bd70499114f36286ec75fee0825304e`.
- [ ] Founder visually confirms restored upper/lower gingiva in the demo and approves Task 2.

### Correction Task 3 — Clinical workspace shell as professional software

- [ ] Inspect the current shell in context: sidebar whitespace, unnecessary dividers, page-like cards, inspector, timeline, and available 3D canvas.
- [ ] Simplify/rebalance **existing** React components and **existing** CSS rules, rather than rebuilding the app or appending overrides.
- [ ] Preserve the dominant 3D model, clinical navigation, approvals, and essential actions.
- [ ] Reduce persistent panel chrome and dead space; adopt restrained white/gray surfaces, dark text and selective purple action emphasis.
- [ ] Reuse established DentAIstudy/UIORI interaction patterns where applicable without importing whole unrelated CSS files.
- [ ] Guarded build and desktop/1024px/390px/320px layout checks.
- [ ] Founder approves Task 3.

### Correction Task 4 — Simplify clinical screen content and controls

- [ ] Reduce redundant status copy and multi-section form clutter in Case, Findings, Plan, Setup and Stages.
- [ ] Present the next necessary clinical action clearly; reveal other controls in relevant context.
- [ ] Keep all seven required record groups, scope screening, plan/setup approval gates and six supported V1 families intact.
- [ ] Keep important measurements, errors and mechanics warnings readable; do not use CSS hiding as a substitute for editing source markup.
- [ ] Reuse common buttons, selects, SVGs, dialogs, and spacing standards wherever possible.
- [ ] Verify tab order, dialogs, editable state and responsive flow without overflow.
- [ ] Founder approves Task 4.

### Correction Task 5 — Full integration / visual and regression verification

- [ ] Verify interactions across the complete case → plan → setup → stages path, retaining all existing persisted data.
- [ ] Test patient/demo mode, import/segmentation, save/reopen, controls, and the updated workspace.
- [ ] Confirm no unwanted CSS overrides, `!important`, inline CSS/JS blocks, horizontal overflow or unusable narrow UI were introduced.
- [ ] Run `npm run validate:v1 && tsc -b && vite build` and confirm preview deployment is READY.
- [ ] For real patient data / clinical beta, independently verify Gemini approval-gate integrity against owned case state and confirm provider/privacy processing terms. Do not widen clinical scope or claim this is already complete.
- [ ] Founder approves Task 5; resume formal Task 12 closed alpha.

## Task 12 — Formal clinician closed alpha (resume after these five approvals)

The first clinical tester is the founder, an orthodontic resident. The full procedure remains in [Closed Alpha Protocol v1](BracketMotion-Closed-Alpha-Protocol-v1.md).

- [ ] Clinician runs all six supported V1 families.
- [ ] Clinician checks the four unsupported-case boundaries.
- [ ] Clinician checks both approval gates and their invalidation behavior.
- [ ] Clinician checks save/reopen including symmetric premolar extraction.
- [ ] Triage P0/P1/P2/P3, resolve all P0/P1 before exit.
- [ ] Closed-alpha approval.
- [ ] Alpha-driven bug/UX round 2.
- [ ] Small orthodontist beta.
- [ ] Beta-driven clinical-rule/bug round 3.
- [ ] Release candidate.
- [ ] Founder approves free V1 launch.

## Task 1 verification — 25 November 2026

- Connected Supabase project: **DentAIstudy**, active/healthy. `bracketmotion_cases` has RLS enabled. Four owner-scoped data policies and four owner/case-scoped storage object policies confirmed.
- Edge functions: `ai-generate` is DentAIstudy's function; `bracketmotion-clinical-reasoning` is independently active. BracketMotion calls only its named function from `src/supabase.ts`.
- Edge Function obtains `GEMINI_API_KEY` on the server, verifies user authentication in its request handler, restricts mechanics source IDs and sends no geometry-write commands. Flags for plan readiness and setup approval currently arrive from the caller.
- Preview is the separate `bracketmotion-preview` Vercel project; existing branch deployments were READY at audit time.
- Implementation impact: **documentation only**; no application/build changes, so no new 3D/browser visual claim is made.

## Current handoff

**Task 1 approved. Task 2 implemented, built and deployed; founder visual acceptance is pending.** Next after approval: **Task 3 — clinical workspace shell and sidebar/panel hierarchy**. Then screen controls (Task 4), final integrated regression QA (Task 5), and resume formal Task 12 closed alpha.

### Task 2 evidence (25 November 2026)

- Original demo source: `organui/teeth-3d/public/models/manifest.json` confirms native maxillary and mandibular gingiva meshes. They are illustrative source anatomy, not patient scans. The source notes they model gingival bands, not the complete oral mucosa.
- Source fix: `bracketmotion-site/src/ClinicalViewer.tsx`, commit `babfef657bd70499114f36286ec75fee0825304e`. Preserve gums; hide maxillae/mandible; keep gums nonselectable; tooth highlight/selection/movement unchanged.
- Current patient scan workflow already renders original STL/PLY surface and retains nonsegmented mesh as a reference; **this task does not fabricate gums from an arbitrary scan or change clinical surface segmentation**.
- Guarded Vercel production build: **PASS** (6/6 case profiles, seven Gate 2 records, 34 Gate 4 exclusions; TypeScript + Vite successful).
- Preview: `https://bracketmotion-preview-don780u9h-amarsaaliomer-6121.vercel.app/` — Vercel **READY**.
- Runtime visual appearance has **not** been independently screenshot-reviewed; founder review is still required. No layout/CSS files were modified.


Do not silently begin Task 12 until this correction round is approved. No new clinical functionality or unnecessary redesign framework is authorized by these UI tasks.
