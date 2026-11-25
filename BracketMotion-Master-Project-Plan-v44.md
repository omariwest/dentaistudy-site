# BracketMotion — Master Project Plan v44

> **Status:** Founder-approved photo-first visual orthodontic treatment-planning identity; rebuilding in small approval gates
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site`; DentAIstudy `main` protected
> **Product charter:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous tracker:** [v43](BracketMotion-Master-Project-Plan-v43.md) (older versions retained)
> **Legacy technical/clinical scope:** [v35](BracketMotion-Master-Project-Plan-v35.md); retained for historical reference, not silently deleted
> **Clinical tester:** founder, orthodontic resident
> **Current gate:** Task 3 AI-assisted Diagnosis implemented and QA passed; founder visual approval pending

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
| **Task 3** | Editable AI-assisted diagnosis draft, clinician approval, strict navigation/invalidations, dedicated existing Gemini mode | **Implemented; founder approval pending** |
| **Task 4** | Three editable AI treatment suggestions and clinician choice/approval, visual summary and suitable illustration placeholders generated from real data (not false predicted outcomes) | Pending |
| **Task 5** | 3D workspace controls UI: strap-up and bracket selection, independent archwire prescription/material/size, O-ties/auxiliary controls, reuse current appliance code | Pending |
| **Task 6** | Illustrative mechanics, adjustments and comparison timeline; no fixed biologic treatment periods or fabricated certainty | Pending |
| **Task 7** | Investigate/integrate legal-and-operationally reusable cephalometric landmark model (code **and weights**), clinician-correctable landmarks and deterministic cephalometric calculations | Pending — heavy |
| **Task 8** | Five-photo → approximate reusable 3D crown/gingiva fitting, clinical correction, performance proof, integrated demo/model replacement and full authenticated regression/clinician alpha | Pending — heaviest / last |

Task 8 may require **subgates** for research and performance feasibility before rollout. No pretending a generated tooth arch is an exact digital impression. Don't remove current STL/PLY pipeline before a photo-first replacement actually works and has passed tests. Later delete obsolete code at source, never hide with CSS.

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

## Task 3 — AI-assisted Diagnosis (implemented, founder review pending)

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
- [ ] Founder visually approves Task 3.
- [ ] Live **signed-in** Gemini response and saved-case reopen against an authenticated test user were **not independently exercised** in this unauthenticated browser QA. Do not claim them validated; verify before patient-data use or clinical alpha.

**Boundary:** This does not perform automated cephalometric tracing (Task 7), three proposed AI treatment options (Task 4), or photo-matched 3D reconstruction (Task 8).

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

Task 1 and Task 2 founder-approved. **Task 3 implemented, browser/build verified and preview deployed; awaiting founder visual approval.** After approval, Task 4 is three editable clinician-reviewed AI treatment suggestions. Persistent photo storage, signed-in backend testing, automated cephalometric tracing, and photo-to-3D remain explicit later verification gates.
