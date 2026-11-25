# BracketMotion — Master Project Plan v38

> **Status:** Founder-directed pre-alpha UI correction; formal clinical closed alpha not yet started
> **Current gate:** Task 2 (clinical workspace shell) implemented and deployed; founder visual approval pending
> **Branch:** `bracketmotion` — `omariwest/dentaistudy-site`
> **App:** `bracketmotion-site/` — separate Vercel preview; no public domain purchased
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous master:** [v37](BracketMotion-Master-Project-Plan-v37.md) (all earlier versions retained)

## Revised correction order — founder approved 25 November 2026

**Reason for change:** Original OrganUI demo anatomy is an educational anatomical model, not a satisfactory final clinical cast. The restored gingiva exposes root tips; this is a model-quality limitation, not a cosmetic CSS defect. The founder asked to finish the UI work first and move the complete reference-model replacement to the **last correction task**.

- **Task 1 — Product identity / architecture audit:** approved.
- **Task 2 — Simplify clinical workspace shell and panel hierarchy:** implementation complete; founder visual acceptance pending.
- **Task 3 — Simplify clinical screen contents and contextual controls:** next after Task 2 approval.
- **Task 4 — Integration, screen responsiveness and final UI refinement:** pending; test across desktop, 1024px, 390px and 320px and resolve any actual regressions without overrides.
- **Task 5 — Replace the demo 3D reference model, last:** pending; select a zero-cost, commercially reusable source, create/refine a cast-style dentition with plausible gingival envelope and independent tooth selections/movements. Then run the **final full V1 regression and preview checks**.

**After Task 5 approval:** resume original **Task 12 — Formal clinician closed alpha** (founder is the orthodontic-resident clinical tester). Do not mark it complete before live clinician testing.

## Task 2 — Clinical workspace shell

### Implemented

- [x] Identify duplication: Setup and Stages already contain contextual segmentation/target/stage editing panels; a permanent outer case-status inspector consumes model space without adding clinical controls.
- [x] Render that outer inspector only for Case, Findings, Plan and case hub. Keep all actual Setup/Stages editing panels, clinical warnings, save flow and approval gates.
- [x] Give Setup/Stages a two-column desktop shell instead of three columns; compact the persistent workflow navigation.
- [x] Remove duplicate case-title heading from left navigation (case label already in top bar), replace repeated page descriptions with button title hints.
- [x] Combine case readiness into the inspector header and delete the now-redundant nested status card.
- [x] Remove decorative viewport grid at its source and simplify the demo-reference label.
- [x] Flatten existing scan, target and appliance workspace outer card borders/radii; preserve their contextual panels and tools.
- [x] Reduce scan workspace framing and vertical waste without altering its clinical logic.
- [x] Correct mobile grid ownership: keep the mobile workflow bar above the Setup/Stages workspace rather than allowing the 3D surface to span and overlap it.
- [x] Preserve scoped responsive breakpoints; the 3D shell falls back to one column when the sidebar is hidden at 640px.
- [x] Edit existing App.tsx and styles.css blocks; remove obsolete CSS and a dead demo modifier, no appended override layer, no `!important`, no inline style/JS blocks.
- [x] Reconfirm LightForce / LightPlan as **first** UI category reference and SureSmile / DS Core as second in Product Identity.
- [x] Vercel preview build passed: six representative case families, seven Gate 2 records, 34 Gate 4 exclusions, clinical approval gates, PWA guards, TypeScript and Vite.
- [x] Preview deployment is READY for final application commit `1a936a9621507d3c8f4b0a7baad0095629b00b65`: https://bracketmotion-preview-ccbyrm4wf-amarsaaliomer-6121.vercel.app/app
- [ ] Founder visually approves clinical shell and checks narrow-screen use. A browser screenshot-based visual audit was **not** independently performed in this task.

### Protected

- No changes to Supabase, Gemini, clinical V1 case families, persisted case schema, tooth transforms, segmented scan geometry, the model source or clinical approval semantics.
- **Do not consider the demo model visually approved.** Its temporary gingiva fix from v37 remains only until final model work in Task 5.

## Task 3 — Clinical screen and control simplification (next)

- [ ] Refine Case, Findings, Plan, Setup and Stages content density within existing components.
- [ ] Remove redundant descriptions, stacked status cards, unnecessary visual dividers and unused labels **at their source**.
- [ ] Keep essential clinical findings, scope exclusions, seven record groups, important measurements, deterministic mechanics warnings, and both clinician approval actions.
- [ ] Reuse existing DentAIstudy/UIORI-style control behavior (already including the shared UiSelect); don't copy competitor UI or create a new design system.
- [ ] Guarded build and founder review before Task 4.

## Task 4 — UI integration / screen QA

- [ ] Verify navigation, scrolling, dialogs, panels, stages, save/reopen, UI keyboard flow and mobile menus.
- [ ] Verify real viewports, especially 320/390/1024 and wide desktop: no window-level horizontal overflow, clipped tables, hidden primary actions or unusable panel widths.
- [ ] Fix observed issues by editing original JSX/CSS blocks, not adding overrides or hiding markup.
- [ ] Build / release guard / preview + founder approval.

## Task 5 — Final model replacement + release regression (last)

- [ ] Replace the illustrative OrganUI anatomical demo with a legally reusable, **free** orthodontic/cast-style asset; assess CC0 / commercially usable CC BY requirements and any derivative obligations.
- [ ] Prioritize natural crowns and a complete-looking gingival boundary. No roots protruding through the visible gum/cast; no jawbone or fake patient anatomy.
- [ ] Ensure individually selectable/movable teeth and maintain existing demo viewer functions; don't modify patient-specific STL/PLY scans to fake a better appearance.
- [ ] Locally package approved optimized model assets; avoid runtime dependence on external model hosting or paid 3D APIs.
- [ ] Perform final complete regression and deployment validation across all clinical flows and responsive breakpoints.
- [ ] Founder approval, then Task 12 formal closed alpha.

## Historical work retained

The full scope freeze, 11 completed application tasks, Gemini and Supabase integration, PWA controls, original correction gates and v37 anatomy investigation remain in v7–v37. The [Closed Alpha Protocol](BracketMotion-Closed-Alpha-Protocol-v1.md) remains the formal clinical test contract.

**Task handoff:** Implemented Task 2 / awaiting founder visual approval. Then proceed to Task 3; model is intentionally last (Task 5).
