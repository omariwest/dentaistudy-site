# BracketMotion — Master Project Plan v42

> **Status:** Founder-approved photo-first visual orthodontic treatment-planning identity; rebuilding in small approval gates
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site`; DentAIstudy `main` protected
> **Product charter:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous tracker / existing working prototype:** [v41](BracketMotion-Master-Project-Plan-v41.md)
> **Legacy technical/clinical scope:** [v35](BracketMotion-Master-Project-Plan-v35.md); retained for historical reference, not silently deleted
> **Clinical tester:** founder, orthodontic resident
> **Current gate:** Task 1 implemented and passed browser/build checks; founder preview approval pending

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
| **Task 1** | Unified responsive five-phase navigation shell, real internal clinical gates retained | **Implemented; founder approval pending** |
| **Task 2** | Case Presentation screen: demographics/history and five-photo + facial/radiographic intake, image review/correction, user-friendly record progress; no fake upload persistence | Pending |
| **Task 3** | Diagnosis UI: editable structured AI-generated draft, approval and revision; correct use of existing Gemini backend without fabricated imaging findings | Pending |
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
- [ ] Founder visually approves Task 1 before Task 2.

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

Task 4 of prior correction round is founder-approved. **Task 1 implemented and browser/build-verified; founder visual approval pending.** Next Task 2 is Case Presentation and five-photo intake. All later AI/ceph/photo matching features remain unimplemented until their respective gates pass.
