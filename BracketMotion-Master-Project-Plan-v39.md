# BracketMotion — Master Project Plan v39

> **Status:** Founder-directed pre-alpha UI correction; formal clinical closed alpha not yet started
> **Current gate:** Task 3 (clinical screen and control simplification) implemented and deployed; founder visual approval pending
> **Branch:** `bracketmotion` — `omariwest/dentaistudy-site`
> **App:** `bracketmotion-site/` — separate Vercel preview; no public domain purchased
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous master:** [v38](BracketMotion-Master-Project-Plan-v38.md) (all earlier versions retained)

## Revised correction order — founder approved 25 November 2026

**Reason for change:** Original OrganUI demo anatomy is an educational anatomical model, not a satisfactory final clinical cast. The restored gingiva exposes root tips; this is a model-quality limitation, not a cosmetic CSS defect. The founder asked to finish the UI work first and move the complete reference-model replacement to the **last correction task**.

- **Task 1 — Product identity / architecture audit:** approved.
- **Task 2 — Simplify clinical workspace shell and panel hierarchy:** approved by founder.
- **Task 3 — Simplify clinical screen contents and contextual controls:** implemented, production build passed, founder visual approval pending.
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
- [x] Founder approved the clinical shell. Dedicated cross-viewport browser QA remains scheduled in Task 4.

### Protected

- No changes to Supabase, Gemini, clinical V1 case families, persisted case schema, tooth transforms, segmented scan geometry, the model source or clinical approval semantics.
- **Do not consider the demo model visually approved.** Its temporary gingiva fix from v37 remains only until final model work in Task 5.

## Task 3 — Clinical screen and control simplification (implemented)

- [x] Case, Findings and Treatment Plan now use direct screen headings and flat, compact form sections; remove decorative section numbers and repeated plan-status labels without deleting any clinical fields.
- [x] Keep all seven mandatory record groups, 34 scope exclusions, cephalometric/occlusal measurements, and clinician-controlled Clinical Plan Approval.
- [x] Compress the clinical Gemini review from a three-card explanation to one concise disclosure and the real actionable review row; preserve advisory-only boundary and signed-in workflow.
- [x] Correct the inaccurate claim that the backend independently checks persisted approval state. The server authenticates the user and evaluates supplied approval flags; do not imply it reloads case approvals.
- [x] Remove five inactive demo toolbar layers and the staged timeline that showed nonfunctional future stages. Keep initial/target/movement preview in the existing ClinicalViewer controls and the five real camera views in the demo toolbar.
- [x] Remove the now-empty Stages toolbar rather than hiding it through CSS; keep working patient/setup mode switching.
- [x] Simplify Scan/Segmentation, Target, Appliance and Stage headers, remove duplicate stage summaries, retain stage warnings, anchorage, reciprocal effects, control strategy and the geometric-not-biological disclaimer.
- [x] Edit existing `App.tsx`, `ScanWorkflow.tsx`, `styles.css` only. Delete obsolete CSS for dead demo, AI, status and badge components. No `!important`, inline styles, new style framework, Supabase/Gemini API changes or geometry edits.
- [x] After restoring the real visible `Clinical Plan Approval` label (required by the release guard), **V1 validation passes**, **TypeScript passes**, and **Vite production build passes**.
- [x] Final application commit: `456a8e1b5d179d6dd21f2a1121c430b4f3e6f942`. Separate Vercel preview **READY**: https://bracketmotion-preview-5lgk0q04f-amarsaaliomer-6121.vercel.app/app
- [ ] Founder visually approves Task 3. Detailed desktop/1024px/390px/320px interactive visual QA remains Task 4, not yet independently executed.

**Boundary:** No change to clinical case families, saving, real patient scans, tooth positioning, wire/bracket mechanics, or backend functions. The existing anatomical demo remains temporary until Task 5.

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

**Task handoff:** Task 2 approved; **Task 3 implemented and preview deployed, awaiting founder visual approval**. Next Task 4 is full screen/responsive integration QA. Free independent reference model remains last, Task 5; then resume clinician closed alpha.
