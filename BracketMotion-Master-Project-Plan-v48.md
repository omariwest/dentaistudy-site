# BracketMotion — Master Project Plan v48

> **Status:** Founder-approved photo-first visual orthodontic treatment-planning identity; rebuilding in small approval gates
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site`; DentAIstudy `main` protected
> **Product charter:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous tracker:** [v47](BracketMotion-Master-Project-Plan-v47.md) (older versions retained)
> **Legacy technical/clinical scope:** [v35](BracketMotion-Master-Project-Plan-v35.md); retained for historical reference, not silently deleted
> **Clinical tester:** founder, orthodontic resident
> **Current gate:** Founder approved Task 6. New UI refinement phase inserted before cephalometrics and photo-to-3D; Task 7 in progress.

## Locked direction

**Primary promise:** a fast, photo-first, clinician-controlled **visual treatment-planning tool** for conventional fixed appliances. Editable AI diagnosis supports it, rather than being the main product.

**Conceptual phases:** Case Presentation → Diagnosis → Treatment Suggestions → 5-Photo Match → Mechanics Workspace (Strap-Up → Archwire → O-Ties/Auxiliaries → illustrative Adjustments and Plan Comparison).

- Five intraoral images are taken in **Case Presentation** and reused at matching. Never ask twice.
- AI can propose an **editable** diagnosis and **three editable suggested treatment options**. The orthodontist corrects and approves the diagnosis/selected plan before moving on.
- Available panoramic and cephalometric films can support diagnosis. Automated cephalometric landmarks and deterministic measurements require a specialized validated/inspectable model, not ungrounded Gemini guesses; landmarks and interpretation editable.
- Bracket prescription is independent of wire material/size; ligatures are separate from wires; simulation stages denote **illustrative planned actions**, not biologic prediction.
- Longer clinician-responsibility/legal terms belong in Terms/Privacy and onboarding consent. Keep brief **Draft**, **Approved**, **Photo-guided model** statuses in workspace, not repeated legal paragraphs.
- Continuing on existing DentAIstudy Supabase during development; no domain purchase, new paid service, or merge to main.

## Implementation gates — easy UI first, heavyweight algorithms last

| Gate | Work | Status |
| --- | --- | --- |
| **Task 1** | Unified responsive five-phase navigation shell, real internal clinical gates retained | **Founder approved** |
| **Task 2** | Case Presentation: patient/history fields and five-photo local intake | **Founder approved** |
| **Task 3** | Editable AI-assisted diagnosis draft, clinician approval, strict navigation/invalidations, dedicated existing Gemini mode | **Founder approved** |
| **Task 4** | Three editable AI treatment strategies, clinician selection/approval, textual mechanics and clinical checks; no invented visual predictions | **Founder approved** |
| **Task 5** | Compact Strap-Up, Archwire and O-Ties & Aux controls, tooth-wise bonding, existing 3D viewer, stable tooth-ref rendering | **Founder approved** |
| **Task 6** | Editable Setup A/B mechanics overlays, FDI endpoints, separate illustrative sequences and A/B comparisons on same approved 3D geometry | **Founder approved** |
| **Task 7** | Compact intrinsic-width workflow ribbon and stable upward/downward dropdown behavior | **In progress** |
| **Task 8** | Split Case Presentation and Diagnosis into balanced responsive clinical columns, without removing any form fields/gates | Pending — UI |
| **Task 9** | Patients dashboard: search, status, last-active sorting, real saved patient rows, local photo thumbnails only where available, no fabricated records | Pending — UI |
| **Task 10** | Account Settings/profile photo, clinician profile metadata, verified password reset and actual account deletion behavior | Pending — account UI |
| **Task 11** | Existing DentAIstudy authentication troubleshooting and verified founder-only test access; authenticated case/photo persistence validation, no email-only bypass | Pending — QA/security |
| **Task 12** | Investigate/integrate legally reusable cephalometric landmark model (code **and weights**), clinician-editable landmarks and deterministic measurements | Pending — heavy |
| **Task 13** | Five-photo → approximate 3D crown/gingiva model, corrections, performance proof and integrated clinician alpha; scanner replacement only after verified | Pending — heaviest / last |

Task 13 may require **subgates** for research and performance feasibility before rollout. No pretending a generated tooth arch is an exact digital impression. Don't remove current STL/PLY pipeline before a photo-first replacement actually works and has passed tests. Later delete obsolete code at source, never hide with CSS.

## Task 1 — scope / engineering rules

- [x] Use **one** five-phase horizontal stepper across all devices, replacing the old desktop sidebar + separate mobile bar at their source.
- [x] Map internal Case → **Case Presentation**, Findings → **Diagnosis**, Plan → **Treatment Plans**, Setup → **3D Setup** (truthful while STL importer still operates), Stages → **Mechanics**. Existing guard conditions, save, and clinician approval remain unchanged.
- [x] Purple selected state, neutral other phases, compact horizontally scrollable narrow-screen stepper. No new stylesheet, inline CSS, appended overrides, `!important`, or duplicate hidden navigation.
- [x] Fix original responsive **1024px** breakpoint reserving a 136px sidebar (removed real source). Fix vertical stepper scrollbar in original CSS.
- [x] Correct initially introduced offline grid-row regression after recognizing offline banner is **position: fixed**; remove needless offline row overrides rather than masking them.
- [x] Headless Chromium regression at **1440, 1024, 390, and 320 px**: five buttons, zero window horizontal overflow, zero JS exceptions, correct page widths; plan approval still unlocks 3D Setup; Mechanics remains subject to setup approval.
- [x] Offline banner testing at 320 and 1024: normal content height remains (606/594px in 700px viewport); no overflow.
- [x] Run `npm run build` (six V1 cases, seven required records, 34 exclusions, TypeScript and Vite all PASS).
- [x] Exact tested source commit: `b4e102658dd7d0534c33940c79eefa19d627b015`. Vercel preview: `https://bracketmotion-preview-a63yrnfmb-amarsaaliomer-6121.vercel.app/app`.
- [x] Founder approved Task 1 on 25 November 2026.

## Task 2 — Case Presentation and photo intake (implemented)

- [x] Extend the existing Case page to show patient/case label, age, optional sex, growth/patient stage and editable chief complaint / medical / dental / notes fields. Existing structured case details continue saving in the owner-scoped case JSON.
- [x] Add five intraoral upload tiles (frontal, upper/lower occlusal, right/left buccal), three additional facial tiles and panoramic/lateral cephalogram tiles. Real JPG/PNG/WebP file selection, previews, replacement and removal; 12 MB max each.
- [x] **No fake "Matched" or "Uploaded" state.** Case photo status counts actual browser-held images and radiographs; incomplete or removed images make planning readiness incomplete. The former one-click photo/X-ray checklist cannot mark these images present.
- [x] Keep selected `File` objects and `blob:` previews in React parent state while switching to Diagnosis / Treatment Plans; revoke object URLs on replacement, removal and case switches/unmount. Ignore stale asynchronous decoding that finishes after a case switch or newer selection.
- [x] Reject invalid MIME/size and unreadable images; avoid silently replacing an existing valid picture with an invalid one. Replacing/removing any clinical image invalidates previous plan/setup approvals, as does editing structured patient details.
- [x] **Explicit temporary storage boundary:** photos and X-rays stay in this browser tab and are **not persisted** to Supabase or sent to Gemini. Saved case records can retain nonimage fields, but do not claim photo persistence. New photo-to-model and authenticated image-storage work must be implemented and validated before clinical beta.
- [x] Reuse current case forms and palette; add small photo tile selectors beside existing clinical form styles rather than new CSS framework or copied screens. No `!important`, no inline style/script, no hidden legacy image buttons.
- [x] Chromium browser tests at **1440, 1024, 390, 320px**: five-file selection, 7 images including pano/ceph, plan readiness, navigation retaining in-tab images, removal invalidating approval, invalid-file rejection, and **zero page-level horizontal overflow / JavaScript errors**.
- [x] Verify re-selecting the same view changes its preview and navigating Cases → Demo Case clears prior-case images.
- [x] V1 release guard (six representative clinical families, seven original record groups, 34 exclusions), TypeScript and production Vite build pass.
- [x] Source application commit: `ee173715e741ba55ae24a84234f16e9230645c92`. Preview: https://bracketmotion-preview-f59gh6b0z-amarsaaliomer-6121.vercel.app/app
- [x] Founder approved Task 2 on 25 November 2026.

**Unresolved by design in this gate:** The old scanner-based 3D Setup and previous approval records remain in the prototype; saved-case legacy approval flags require reconciliation when persistent photo storage and photo-first model fitting are implemented. No claims of automatic photo matching, radiograph interpretation, landmark tracing, Gemini-generated diagnosis or treatment options yet.

## Task 3 — AI-assisted Diagnosis (founder approved)

- [x] Reuse the existing Findings clinical form to present an editable diagnostic summary, clinical interpretation and information-to-confirm field. All existing periodontal, facial, occlusal, cephalometric-summary and V1 scope inputs remain editable.
- [x] Add **Generate AI draft** for signed-in clinicians and **Approve diagnosis** as a separate explicit action. Generation never approves the draft; a clinician can also author and approve the diagnosis without Gemini.
- [x] Extend the **existing** `bracketmotion-clinical-reasoning` Supabase Edge Function to version **2** with `diagnosis_draft` mode. Keep existing `plan_review` / `stage_review` semantics. Only clinician-entered structured history and findings are sent; browser-local photos and radiographs, case label, plan, geometry and mechanics are not included in this mode.
- [x] AI prompt restricts itself to supplied evidence, avoids inventing radiograph interpretations/cephalometric measurements, and lists missing data rather than fabricating a final diagnosis. The source is existing structured clinical input and curated review notes—not direct interpretation of the photos.
- [x] Make **new-case findings blank/unassessed** and patient stage **Not specified**, rather than inheriting healthy/Class I/adult demo assumptions. Retain populated observations in the **explicit demo case** only.
- [x] Gate navigation into **Treatment Plans**, 3D Setup and Mechanics on clinician diagnosis approval. Editing patient details, clinical findings, scope, photo records or diagnosis revokes approval and plan/setup approvals. Asynchronous AI results cannot overwrite subsequent manual changes or a different opened case.
- [x] Persist diagnosis draft and clinician approval flag in the **existing owner-scoped case `records` JSON**, without a table migration. Because source photos from Task 2 are still browser-local and disappear on reload, **restore a saved draft for review but require renewed clinical approval after reopen**; never silently treat missing images as verified records.
- [x] Reuse existing form/approval components and styles; no new CSS file, `!important`, inline CSS/JS, duplicated visual controls, or alterations to the existing 3D model.
- [x] Existing V1 release checks, TypeScript and Vite production build pass. Chromium regression at **1440, 1024, 390 and 320 px**: editable fields, incomplete-case approval blocked, manual approval unlocking plan, edit revoking approval, redirect to Diagnosis, zero horizontal page overflow and zero browser exceptions.
- [x] Live Edge Function is **ACTIVE v2**. Direct unauthenticated POST with `diagnosis_draft` returns **HTTP 401 `AUTH_REQUIRED`**; existing explicit user-auth check retained.
- [x] Exact frontend application commit: `757c88611b5a347041f99b39ce86d0ec99078d82`. Preview: https://bracketmotion-preview-e9sg7cmms-amarsaaliomer-6121.vercel.app/app
- [x] Founder approved Task 3 on 25 November 2026.
- [ ] Live **signed-in** Gemini response and saved-case reopen against an authenticated test user were **not independently exercised** in this unauthenticated browser QA. Do not claim them validated; verify before patient-data use or clinical alpha.

**Boundary:** Automated cephalometric tracing (Task 7) and photo-matched 3D reconstruction (Task 8) are still unimplemented. Three treatment suggestions are in Task 4.

## Task 4 — Three editable treatment options (founder approved)

- [x] Replace the existing primary/alternative Plan page with **three compact editable Plan A/B/C cards**: approach, clinical aims, proposed mechanics and clinical considerations. Clinician can fill plans manually or explicitly request Gemini suggestions after approving diagnosis.
- [x] Preserve existing `problemList` and `goals` fields and **selected strategy mapping to `primaryStrategy` / `alternativeStrategy`** for compatibility with saved cases and the existing 3D mechanics implementation. No duplicate planner or database schema change.
- [x] Add explicit Plan A/B/C **Select** and **Approve selected plan** actions. Approval requires a selected card with all four fields plus problem list/goals; selecting or editing revokes existing plan and setup approval. Blank alternatives are never silently approved.
- [x] Existing Supabase Edge Function `bracketmotion-clinical-reasoning` updated to **ACTIVE v3** with `treatment_suggestions` mode alongside existing diagnosis, plan-review and stage-review modes. Uses constrained structured JSON, curated mechanics source notes and limited sanitization. Returns **up to three** distinct suggestions, with unfilled slots instead of invented options if evidence is insufficient.
- [x] Only clinician-entered case history, entered findings and clinician-approved diagnosis go to Gemini for this mode. Local image files, case label, existing plan, 3D geometry and stage mechanics are excluded. Generated suggestions remain editable and cannot self-approve.
- [x] Cancel stale AI responses on subsequent clinical edits, photo changes, case switches, option selection or manual editing. Revoke plan choice when upstream diagnosis/records change. Saved cases restore **draft options only**, with diagnosis, plan and setup approvals requiring renewed clinician confirmation while photo evidence remains browser-local.
- [x] Reuse the original `TreatmentPlanView`, approval panel, textarea, button and card styles. Adjust original responsive card grid for three options, and **remove a stale single-column breakpoint** which unnecessarily stacked three plans at 1024px; no appended CSS overrides, `!important`, hidden previous planner, inline styles or added visual framework.
- [x] Existing V1 guard, TypeScript and Vite production build pass. Browser tests at **1440, 1024, 390, 320px**: 3 cards rendered, diagnosis gate, unfilled plan blocked, Plan B selection and approval unlocks Setup, later option edit revokes approval, empty Plan C blocked, diagnosis change relocks Treatment Plans, **zero page horizontal overflow and zero browser JS exceptions, with three cards across at 1024/1440px and single-column 320/390px**.
- [x] Live function health endpoint returned **200**, unauthenticated `treatment_suggestions` request returned **401 `AUTH_REQUIRED`**. Legacy mode dispatch remains in function.
- [x] Tested application source commit `78f472292da06b44ce4031816677db3f6c6c0f9b`. Preview: https://bracketmotion-preview-mr4j99gxc-amarsaaliomer-6121.vercel.app/app
- [x] Founder approved Task 4 on 25 November 2026.
- [ ] **Signed-in Gemini suggestion output** remains untested without an authenticated test session. Also test authenticated save/reopen and controlled third-party patient-data processing before closed alpha.

**Boundary:** Task 4 displays documented proposed mechanics as editable text; visual mechanics, timeline and non-predictive scenario comparison belong to Task 6. Photo-matched model fitting is Task 8. Do not imply that selecting a plan automatically adjusts tooth positions in the current 3D viewer.

## Task 5 — Appliance controls UI (founder approved)

- [x] Work inside the existing `ScanWorkflow.tsx` appliance view and retain the existing 3D scene, simulation objects, current case structure and existing CSS. Do not create a parallel UI system or new database.
- [x] Replace old flat six-button toolbar with **1. Strap-Up → 2. Archwire → 3. O-Ties & Aux** compact step tabs; retain existing Segmentation and Target setup access until the photo-first model exists.
- [x] Strap-Up: **Roth / MBT selector** independent of wire material/size, 0.022 slot label, 32-tooth FDI diagram, disable unsegmented teeth, toggle brackets on individual available teeth, **Bond all** and **Remove all** and 3D bracket visibility toggle.
- [x] Archwire: independently record **NiTi / stainless steel / TMA** and sizes `.014`, `.016`, `.016×.022`, `.017×.025`, `.019×.025`. Wire color changes in existing 3D scene by material; nominal cross-section is **not** geometrically exact.
- [x] O-Ties: **None / Clear / Silver / Purple** and visual ligature rings on generic brackets; move the existing power-chain, coil-spring, interarch-elastic and closing-loop layer switches and endpoint editors here. Retain stage playback props.
- [x] Store optional `appliancePreferences` alongside existing `applianceLayers` and `mechanicEndpoints` under **`ScanPersistenceState.version=1`**. Missing optional preferences in older saved cases default safely to a generic full-arch configuration; no schema migration.
- [x] Remove unused legacy appliance summary CSS at its source and replace with compact right-panel selectors in original CSS block. No inline styles, extra CSS framework, bottom overrides or `!important`.
- [x] When **Appliances** is active, remove scan-upload cards and summary heading from the **rendered DOM**, retaining them in Segmentation / Target Setup. Preserve large 3D viewport, navigation and small-screen alignment.
- [x] Fix existing `TargetTooth` registration callback (stable `useCallback` ref) discovered in fixture QA; prevents a React maximum-update-depth crash once segmented teeth are rendered.
- [x] Run local-only **synthetic scan/segment fixture** through real appliance components (not committed): Bond all → Remove all → single tooth → full arch; MBT; SS wire and rectangular size; purple O-tie; power chain endpoints. **1440, 1024, 390 and 320 px all pass** with zero browser exceptions and zero page/workspace/panel horizontal overflow.
- [x] Remove test fixture completely from source tree. Run unchanged production `npm run build` including V1 release guard, TypeScript and Vite; regress Task 4 diagnosis, plan selection, approval and revoked gates on all four widths.
- [x] Tested production application source commit: `9f84a883ea9f9c1bb3e19beda442d10f5266b303`. Preview: https://bracketmotion-preview-l5mu0l2cz-amarsaaliomer-6121.vercel.app/app
- [x] Founder approved Task 5 on 25 November 2026.
- [ ] Authenticated **persist/reopen** of the new appliance preferences, actual clinical STL uploads and a real patient-matched 3D preview have **not** been fully validated. The existing scanner/segmentation engine is still the temporary prerequisite until Task 8.

**Boundary:** Roth/MBT currently record a chosen prescription but **do not modify simulated torque or actual bracket pad/slot design**; O-Ties and wire material have generic visual representations. No assertion of physical placement accuracy, wire deformation, delivered forces or biologic treatment prediction.

## Task 6 — Mechanics adjustments, comparison and illustrative timeline (founder approved)

- [x] Extend the **existing `StageWorkspace` and `ScanWorkflow`**, keeping the same approved setup geometry and stage engine. No separate simulation engine, new CSS, extra database tables, new service, design framework, inline styles or `!important`.
- [x] Add clinician-controlled **Power chain / Closed coil / Elastics / Closing loop** toggles within the Mechanics side panel, including editable, available bonded **FDI endpoints** using the existing `UiSelect`.
- [x] Allow doctor to **Compare mechanics** by copying their current **Setup A** appliance layer/endpoint settings into **Setup B**, then editing B independently. A/B switching changes overlay and stage sequence; removing B restores A without overwriting A.
- [x] In the Mechanics side panel, show the actually enabled auxiliaries for **both setups**. Compare their stage lists, active teeth, anchorage and intended movement / reaction considerations without claiming one produces superior results.
- [x] Reuse the existing `deriveStages` and bottom timeline, with selectable steps and play/pause. Stage progress only interpolates the *previously approved geometric target*; no months, quantified forces, biologic rates or AI-generated tooth motion. Avoid false completion numbers in the 3D badge.
- [x] Existing no-movement case now displays **Appliance review**, not "Finishing + settling," and identifies that no tooth movement was entered. Stage-specific notes remain as editable-independent clinical reference text.
- [x] Persist optional `mechanicsComparison` (active A/B and B settings) under existing `ScanPersistenceState.version=1`; A remains the existing `applianceLayers` and `mechanicEndpoints`. Previous saved cases without comparison remain compatible. This does not constitute authenticated save/reopen proof.
- [x] Stage summaries sent to the existing Gemini mechanics-review mode now follow the **selected A/B setup**, and in-flight stale reviews are discarded when stage state changes. No geometry write, approval bypass or backend schema migration.
- [x] Local-only synthetic scan fixture (not committed) exercised the original approved case navigation into the real Mechanics viewer. Verified A without auxiliaries, B with power chain / closed coil, FDI 13→21 yielding active 13, 12, 11, 21, scenario switching isolation, stage list differences, stage selection, B removal and existing rendered 3D/endpoint controls.
- [x] Browser tests at **1440, 1024, 390 and 320px**: functional comparison, zero JS exceptions, zero page/workspace/panel horizontal overflow. Source-only QA fixture removed. Production V1 validation, TypeScript, Vite build and previous Task 4 clinical-gate regression all passed at four widths.
- [x] Tested production source commit: `f6bff63f2c703698a14b89e49b116bcb130b9b54`; preview: https://bracketmotion-preview-la18s0186-amarsaaliomer-6121.vercel.app/app
- [x] Founder approved Task 6 on 25 November 2026.
- [ ] Authenticated cloud case persist/reopen and stage AI response with a real account remain unverified. Actual scanned patient geometry and patient-photo-based model creation remain Task 13.

**Boundary:** Setup A/B are alternative **mechanics configurations within a single clinician-approved treatment plan**, not automatic competing patient-specific AI treatment outcomes. No accuracy claims for tooth-root position, bracket prescription, wire mechanics, forces, movement rate or final clinical response.

## UI refinement phase — Tasks 7–11 (inserted 25 November 2026)

**Goal:** finish the product surface before expensive computer-vision work. Reference the supplied AI concept images as visual direction only, not evidence of implemented clinical functions.

### Task 7 — Compact step ribbon and dropdown flicker (started)

- Make workflow chips **content-width** rather than stretched evenly across the full header, preserving scroll only on narrow screens.
- Correct the existing `UiSelect` menu's brief downward appearance before upward opening. Edit the original component/menu style, not append an override.
- Confirm keyboard behavior, focus, long-dropdown scrolling, and small-screen overflow. No unrelated layout changes.

### Task 8 — Clinical screen column layout

- Case Presentation: group patient/history with photo uploads in **two columns** at comfortable widths; keep the same data validation, clinic gates and responsive single-column fallback.
- Diagnosis: rational two-column arrangement (assessment and findings) without removing the existing editable AI diagnosis or falsely replacing it with auto-ceph.
- Preserve all current original sections, required records and controls.

### Task 9 — Patients page

- Rename Cases to **Patients** in top navigation. Rework existing case hub into patient table with search, status, last-active sorting, patient identifiers/age, open-case actions and real case summary.
- Source rows from actually saved authenticated cases, not mock names/stage numbers.
- Use local patient frontal/photo thumbnails only when truly available. Uploaded case photographs are still browser-local; **do not falsely display them as stored or synced**.
- Responsive table should have deliberate narrow-screen presentation, not hidden content or horizontal page overflow.

### Task 10 — Settings and clinician identity

- Add real Settings page via the existing header; clinician avatar near account control; reuse existing auth/profile records where possible.
- Profile changes/password update/photo only where persistence and verified account association are real. No decorative but fake Save, Change photo or Delete account buttons.
- Account deletion requires a safe complete implementation with confirmation and case/data cleanup where supported; don't silently ship a fake destructive action.
- Keep settings distinct from a patient case and prevent false patient-data retention claims.

### Task 11 — Account access and end-to-end verification

- Diagnose shared DentAIstudy Supabase login failure without assuming the user's password is known. The specified owner address `amarsaaliomer@gmail.com` is **not** proof of identity; never hardcode email-based authentication, a test backdoor or an auto-sign-in for anyone typing it.
- Provide founder test access using a legitimately **verified session** (supported provider sign-in or passwordless link if available), then test actual case save/reopen and photo persistence. Keep temporary dev credentials out of Git.
- Maintain user-scoped RLS, existing auth, clinical gating and private patient-data boundaries. Decide separate Supabase project migration only after verified design and planned migration.

### Deferred heavyweight work

- **Task 12:** Ceph landmarks / calibrated deterministic calculation, code + model-weights licensing and clinician correction.
- **Task 13 (last):** Photo-guided reusable 3D model fitting, benchmarked visual quality, gingiva, independent clinical corrections and scanner replacement.

## Ceph licensing lead (not yet adopted)

- [CephTrace](https://github.com/sidwiz/cephtrace-research) source is reportedly MIT; pretrained weights are CC BY-NC-SA 4.0. **Do not use these weights in a future commercial software without an explicit suitable grant.**
- Search permissively licensed full pipelines and inspect actual weights, training dataset terms, accuracy and inference requirements, not just the repository license.
- Draw landmarks with editable points. No inferential numbers in the absence of image calibration.

## Boundaries

- No user-patient uploads to Gemini or third-party reconstruction by default.
- Source remains React/TypeScript, Three.js, CSS in styles.css, JS in JS/TS files, no `!important`, no inline blocks, no appended CSS override rules.
- Protect functional current UI while redesign is implemented in small, verified edits.
- Neither legal disclaimers nor AI draft status replaces clinical signoff, appropriate patient-data consent, or evidence for treatment prediction.

## Handoff

Tasks 1–6 founder-approved. **Task 7 begins a compact UI refinement phase** before heavy computer vision. Next: Task 7 ribbon/dropdown; then Tasks 8–11 split layouts, Patients, Settings and verified account QA. Cephalometrics shifts to Task 12, and photo-to-3D remains **Task 13 / LAST**. Never bypass auth by email alone. Signed-in Gemini output, patient-image persistence, and photo-model accuracy remain explicit unverified gates.
