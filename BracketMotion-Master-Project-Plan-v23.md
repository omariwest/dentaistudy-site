# BracketMotion — Master Project Plan v23

> **Status:** Active build planning  
> **Version:** v23.0  
> **Product:** BracketMotion  
> **Tagline:** *Plan the mechanics. See the movement.*

## Locked product

BracketMotion is a **free-first installable PWA for conventional fixed-appliance orthodontics**.

Core:
- patient-specific planned 3D movement,
- mechanics-aware simulation,
- clinician-controlled AI assistance,
- conventional fixed-appliance focus,
- brand-neutral workflow.

## Market position — LOCKED

BracketMotion is **not trying to beat SureSmile, LightForce or 3Shape at their own businesses**.

Our V1 wedge is:

- **free-first** — no subscription or per-case planning paywall,
- **brand-neutral** — ordinary brackets/wires and standard STL/PLY scans,
- **browser-native / installable PWA** — low IT friction,
- built for **solo, independent and everyday orthodontists worldwide**,
- conventional fixed-appliance planning rather than a proprietary manufacturing ecosystem.

The strategic goal of V1 is broader than direct revenue: a credible product can create users, research output, collaboration, sponsorship, employment or acquisition/partnership attention.

Do not add proprietary manufacturing, scanner lock-in or enterprise complexity merely to resemble large competitors.

## Public site — complete

- [x] Landing page.
- [x] Windows + macOS install funnel only.
- [x] Privacy Policy.
- [x] Terms of Use.
- [x] Clinical Disclaimer.
- [x] User approved completed public site.

Preview:
- https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/

## AI provider — changed

Provider: **Google Gemini API**.

Architecture remains:

```text
Planning-ready case
→ controlled AI reasoning
→ structured clinical proposal
→ clinician approval
→ deterministic TypeScript setup/mechanics engine
→ Three.js visualization
```

Rules:
- Gemini never directly moves teeth.
- Gemini never bypasses clinician approval.
- No Gemini API integration is implemented yet.
- Later integration will be server-side.
- Real patient data must not be sent through a Gemini tier/configuration that permits submitted content to be used for product improvement.
- Production privacy/retention terms must be reviewed again before clinical beta.

OpenAI is no longer part of the V1 architecture.

---

# Clinical V1 scope

## Gate 1 — Supported users and first case families — APPROVED

Users:
- orthodontists,
- dentists treating fixed-appliance cases within competence,
- supervised orthodontic trainees.

Base appliance convention:
- conventional labial fixed appliances,
- generic 0.022-inch preadjusted edgewise brackets,
- NiTi and stainless-steel archwires,
- elastomeric chain,
- closed-coil springs,
- interarch elastics,
- basic loops.

Permanent dentition only.

Initially approved families:
1. Class I crowding — non-extraction.
2. Class I spacing.
3. Symmetric first-premolar extraction cases.
4. Selected Class II Division 1 fixed-appliance cases.

- [x] User approved Gate 1.

## Gate 2 — Required records / inputs — APPROVED

Planning-ready V1 case requires:
- history/chief complaint,
- clinician examination findings,
- upper/lower scans + bite relationship,
- facial/intraoral photographs,
- panoramic radiograph,
- lateral cephalometric radiograph,
- compact clinician-entered cephalometric summary.

Clinical source of truth:
> **Clinician-confirmed structured findings.**

AI does not silently replace clinician findings.

- [x] User approved Gate 2.

## Gate 3 — Treatment-plan / stage outputs — APPROVED

Pipeline:

```text
Problem list
→ goals
→ primary strategy + one credible alternative
→ clinician plan approval
→ proposed final 3D setup
→ clinician setup approval
→ stages + mechanics
→ 3D movement visualization
```

Two approval gates:
1. Clinical Plan Approval.
2. 3D Setup Approval.

AI does not generate tooth coordinates.

- [x] User approved Gate 3.

---

# Gate 4 — Final V1 boundary + success criteria

## A. Final supported V1 case families

V1 launches with **six** supported families:

1. **Class I crowding — non-extraction**
2. **Class I spacing**
3. **Symmetric first-premolar extraction cases**
4. **Selected Class II Division 1 fixed-appliance cases**
5. **Selected deep-bite cases**
6. **Selected anterior open-bite cases**

No additional case family is added before V1 launch.

---

## B. Deep-bite boundary

V1 supports deep bite when it can reasonably be planned with conventional fixed-appliance mechanics.

Supported direction:
- permanent dentition,
- mild-to-moderate deep bite,
- dental/dentoalveolar deep bite,
- manageable Curve of Spee,
- leveling by controlled incisor intrusion and/or posterior extrusion according to the approved treatment goal,
- conventional archwire-based leveling,
- finishing and settling.

V1 may visualize:
- vertical incisor movement tendency,
- posterior extrusion tendency,
- Curve-of-Spee leveling,
- overbite reduction.

V1 excludes:
- severe skeletal deep-bite/short-face cases requiring orthognathic correction,
- growth-modification protocols as the primary treatment,
- cases where the vertical correction depends on mechanics outside the V1 set.

---

## C. Anterior open-bite boundary

V1 supports **selected mild-to-moderate anterior open bite** when conventional fixed-appliance treatment is clinically reasonable.

Supported direction:
- permanent dentition,
- primarily dental/dentoalveolar component,
- conventional fixed appliances,
- vertical elastics,
- controlled anterior extrusion/settling when selected,
- arch coordination and finishing.

V1 may visualize:
- anterior extrusion tendency,
- vertical elastic direction,
- posterior/reciprocal effects,
- planned overbite closure.

V1 excludes:
- severe skeletal long-face open bite,
- open bite requiring orthognathic surgery,
- open bite requiring posterior molar intrusion with TADs,
- active uncontrolled digit-sucking or another unresolved etiologic habit,
- complex unilateral/open-bite asymmetry.

---

## D. Explicitly excluded V1 case types

BracketMotion V1 must return **out of scope** when the case primarily requires:

- mixed dentition or primary dentition treatment,
- Class III correction,
- orthognathic surgery,
- severe skeletal Class II correction,
- major facial asymmetry,
- asymmetric extraction strategies,
- impacted teeth requiring surgical exposure/traction,
- ankylosed teeth,
- complex missing-tooth/prosthetic space management,
- severe periodontal attachment/bone-loss cases,
- craniofacial syndromes or cleft-related treatment,
- significant transverse correction requiring expansion,
- severe anterior/posterior crossbite as the primary problem,
- complex retreatment with major root/periodontal limitations,
- TMD treatment planning,
- cases whose main treatment depends on CBCT/root-bone simulation.

A case can contain a minor secondary finding from this list and still be considered only if the clinician confirms it does not drive the treatment plan.

---

## E. Explicitly excluded V1 mechanics

Not supported in V1:

- TAD/miniscrew-supported mechanics,
- molar intrusion with skeletal anchorage,
- functional appliances,
- headgear,
- palatal expanders / MARPE / surgically assisted expansion,
- orthognathic-surgical mechanics,
- impacted-tooth traction,
- lingual appliances,
- clear-aligner treatment,
- fully customized printed bracket systems,
- robotic/custom wire manufacturing,
- manufacturer-specific prescriptions/workflows.

V1 remains conventional, generic and brand-neutral.

---

## F. V1 biological/predictive claims — forbidden

BracketMotion V1 does **not** claim:

- exact biological tooth response,
- exact root movement,
- exact PDL stress/strain,
- exact bone remodeling,
- exact anchorage loss,
- exact force delivered clinically,
- exact treatment duration,
- guaranteed final occlusion,
- guaranteed profile/soft-tissue response,
- guaranteed stability/relapse,
- guaranteed treatment outcome.

It displays:
> **planned geometry + mechanics-aware tendencies.**

---

## G. Scan-to-movable-teeth requirement

A public V1 cannot require ordinary orthodontists to provide externally pre-segmented teeth.

Therefore:

> **V1 must provide a practical path from ordinary upper/lower STL or PLY scans to individually movable teeth.**

Implementation may be:
- automatic segmentation,
- semi-automatic segmentation with clinician correction,
- another validated clinician-assisted workflow.

The exact segmentation method is decided during the 3D development phase.

Prototype development may still use the open pre-segmented demo model.

---

## H. V1 success criteria

BracketMotion V1 is considered functionally complete only when a clinician can:

1. Install the PWA on Windows or macOS.
2. Create and reopen a case.
3. Enter the Gate 2 clinical dataset.
4. Upload ordinary upper/lower STL or PLY models.
5. Obtain individually movable teeth through the BracketMotion workflow.
6. Review a structured problem list and treatment goals.
7. Receive a primary strategy and one credible alternative when appropriate.
8. Edit and approve the clinical plan.
9. Review/edit and approve the proposed final 3D setup.
10. Generate case-dependent treatment stages.
11. Visualize generic brackets, archwires and the supported active mechanics.
12. Play the planned movement stage by stage.
13. See mechanics-aware tendencies/warnings.
14. Save and reopen all approved work.
15. Receive a clear **out-of-scope** result for unsupported cases.
16. Complete representative test cases from all six V1 families without critical workflow failure.

---

## I. Pre-launch validation sequence

After the core build:

```text
Internal test cases
→ bug-fix round 1
→ closed alpha
→ bug-fix / UX round 2
→ small orthodontist beta
→ bug-fix / clinical-rule round 3
→ release candidate
→ free V1 launch
→ post-launch improvement rounds
```

We expect bugs and workflow problems.

V1 is **not** defined as “perfect software.”

V1 is defined as:
> a stable, clinically understandable product that completes the six supported workflows safely enough for controlled real-user testing.

---

## Gate 4 status

- [x] Add deep bite.
- [x] Add anterior open bite.
- [x] Freeze V1 at six case families.
- [x] Define excluded case types.
- [x] Define excluded mechanics.
- [x] Define prohibited biological claims.
- [x] Define scan-to-segmented-teeth requirement.
- [x] Define V1 success criteria.
- [x] Define post-build testing/bug-fix rounds.
- [x] User approves Gate 4 / freezes clinical V1.

---

# Clinical V1 scope — FROZEN

Gate 4 is approved. The six-family V1 boundary above is now the build contract.

Do not expand the clinical scope during implementation unless a blocker proves that the frozen scope itself is internally inconsistent.

---

# Phase 5 — Clinical / product reference map

Purpose: learn interaction patterns and workflow structure without copying proprietary UI, assets, wording or business-model complexity.

## Reference 1 — SureSmile

Use as reference for:
- patient → treatment-planning workspace separation,
- multiple treatment simulations before committing,
- initial / therapeutic / final model thinking,
- wire-planning concepts.

Do not copy:
- digital-lab ordering,
- robotically bent wire workflow,
- manufacturing/order-management complexity.

## Reference 2 — LightForce / LightPlan

Use as reference for:
- simple scan-upload flow,
- clear Initial / Final / Brackets / Wire / Roots / Gingiva visibility controls,
- web-based 3D treatment-plan review.

Do not copy:
- patient-specific proprietary bracket manufacturing,
- shipping / billing / prescription workflow.

## Reference 3 — 3Shape Ortho

Use as reference for:
- precise bracket/tooth manipulation,
- surface snapping,
- collision detection and antagonist warnings,
- open scan-oriented planning concepts.

Do not copy:
- giant scanner/lab ecosystem,
- indirect-bonding production workflow as a core V1 job.

## Reference 4 — OnyxCeph

Use as reference for:
- scan import → segmentation → virtual setup → wire/bracket visualization,
- modular fixed-appliance workflow,
- treatment-progress comparison concepts.

Do not copy:
- dense all-in-one module architecture,
- desktop/licensing complexity,
- unrelated surgical/appliance modules.

## Reference 5 — Maestro 3D

Use as reference for:
- automatic/manual segmentation concepts,
- tooth axes / FA points,
- real-time collision/contact feedback,
- macro-staging/layers,
- extraction/IPR representation in the setup.

Do not copy:
- aligner-production workflow,
- printable-model/manufacturing breadth.

## Reference 6 — OrganUI Teeth

Use as technical/prototype reference for:
- React + TypeScript + Three.js / React Three Fiber,
- selectable individual tooth meshes,
- camera/view controls,
- a lightweight openly licensed demo model.

Important:
- suitable for the first 3D proof of concept,
- **not** a clinical patient model,
- model licence/attribution must be preserved,
- patient STL/PLY replaces it in the real workflow.

## Positioning signals — not product templates

BCeph and open WebCeph-style projects are useful evidence that clinicians/residents value free, browser-based, low-friction orthodontic tools.

Use that as validation of the **access model**, not as the BracketMotion clinical workflow.

## Reference-map rule

Borrow **principles and interaction patterns**, not proprietary visual identity.

BracketMotion should remain simpler than all major systems:

> Case → Findings → Plan → Approved Setup → Stages → Mechanics → Movement

## Phase 5 status

- [x] SureSmile mapped.
- [x] LightForce / LightPlan mapped.
- [x] 3Shape mapped.
- [x] OnyxCeph mapped.
- [x] Maestro 3D mapped.
- [x] OrganUI Teeth mapped.
- [x] Free/browser-native positioning references identified.
- [x] User approves reference map.

---

# Application build plan — 12 approval tasks

The application is built in small reviewable gates. No large one-shot build.

## UI / workflow

### Task 1 — Clinical workspace shell
- [x] Add dedicated `/app` route.
- [x] Build app-only top bar.
- [x] Build clinical-flow sidebar.
- [x] Build large central 3D workspace surface.
- [x] Build compact layer/view toolbar.
- [x] Build right-side inspector.
- [x] Build bottom treatment timeline.
- [x] Add responsive behavior without page-level horizontal overflow.
- [x] User approves Task 1.

### Task 2 — Case records + findings workflow
- [x] Case creation/opening screen.
- [x] Gate 2 records and structured findings UI.
- [x] Missing-record / planning-ready state.
- [x] Out-of-scope warning surface.
- [x] Desktop render/inspection pass.
- [x] Small-screen render/inspection pass.
- [x] User approves Task 2.

### Task 3 — Treatment plan + approval workflow
- [x] Problem list + goals.
- [x] Primary strategy.
- [x] One credible alternative.
- [x] Plan editing.
- [x] Clinical Plan Approval gate.
- [x] Plan edits revoke prior approval.
- [x] Setup remains locked until plan approval.
- [x] Desktop render/inspection pass.
- [x] Small-screen render/inspection pass.
- [x] User approves Task 3.

## 3D core

### Task 4 — 3D proof of concept
- [x] Add Three.js / React Three Fiber.
- [x] Lazy-load the 3D bundle so the public landing page is not penalized.
- [x] Load openly licensed segmented demo dentition.
- [x] Preserve visible model attribution/licence credit.
- [x] Rotate / zoom / pan.
- [x] Front / right / left / upper / lower view controls.
- [x] Select one tooth.
- [x] Move / rotate one tooth with transform controls.
- [x] Show initial / target transform.
- [x] Animate initial → target.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [x] User approves Task 4.

### Task 5 — Scan import + segmentation workflow
- [x] Local STL / PLY import.
- [x] Triangulated-mesh validation and position-only vertex welding.
- [x] Upper/lower scan handling.
- [x] Optional bite-reference overlay.
- [x] Manual upper/lower jaw alignment with translate + rotate controls.
- [x] Clinician-assisted surface segmentation brush.
- [x] Add / erase boundary correction.
- [x] FDI tooth labeling.
- [x] Convert selected surfaces into independent tooth meshes.
- [x] Reopen and edit an existing tooth segment.
- [x] Prevent duplicate FDI labels and overlapping tooth-face ownership.
- [x] Keep scan processing local in-browser at this phase.
- [x] Preserve Task 4 demo anatomy as a secondary setup mode.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [x] User approves Task 5.

### Task 6 — 3D target setup engine
- [x] Explicit per-tooth target transforms initialized from Initial.
- [x] Persist aligned upper/lower jaw transforms into the target workspace.
- [x] Initial / Target comparison.
- [x] Manual tooth translation + rotation with 3D gizmo.
- [x] Numeric translation/rotation editing.
- [x] Reset one tooth / reset all target transforms.
- [x] Coarse near-contact feedback.
- [x] Gross collision screening with visual tooth warnings.
- [x] Overjet geometry estimate from FDI 11/21/31/41.
- [x] Overbite geometry estimate from FDI 11/21/31/41.
- [x] Dental-midline geometry estimate.
- [x] Scan-unit plausibility guard before approval.
- [x] 3D Setup Approval gate.
- [x] Target/jaw edits revoke prior setup approval.
- [x] Main clinical inspector reflects setup approval.
- [x] Stages remain locked until setup approval.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [x] User approves Task 6.

## Appliances / movement

### Task 7 — Fixed-appliance visualization
- [x] Generic brand-neutral brackets.
- [x] Bracket orientation follows approved tooth/jaw transforms.
- [x] Upper/lower archwire visualization.
- [x] Power-chain visualization with clinician-selected endpoints.
- [x] Closed-coil spring visualization with clinician-selected endpoints.
- [x] Interarch elastic visualization with upper/lower endpoints.
- [x] Basic closing-loop visualization.
- [x] Appliance layer is locked until 3D setup approval.
- [x] Generic 0.022 visual model remains manufacturer-neutral.
- [x] No force magnitude / biological-response claim is added.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [ ] User approves Task 7.

### Task 8 — Stage + mechanics engine
- [ ] Case-dependent stages.
- [ ] Active/anchorage units.
- [ ] Movement tendencies.
- [ ] Reciprocal/side-effect tendencies.
- [ ] Warnings/control strategies.
- [ ] Timeline playback.
- [ ] User approves Task 8.

## Intelligence / persistence

### Task 9 — Gemini clinical reasoning
- [ ] Server-side Gemini integration.
- [ ] Controlled structured output.
- [ ] Source-grounded clinical reasoning.
- [ ] No direct geometry control.
- [ ] Approval-gate enforcement.
- [ ] User approves Task 9.

### Task 10 — Supabase + saved cases
- [ ] Authentication.
- [ ] Case/database schema.
- [ ] Model/record storage.
- [ ] Approved plan/setup/stage persistence.
- [ ] Save/reopen/autosave.
- [ ] User approves Task 10.

## Product completion

### Task 11 — PWA + end-to-end integration
- [ ] PWA manifest/service worker.
- [ ] Windows/macOS install flow.
- [ ] Connect all application surfaces.
- [ ] Error/empty/loading states.
- [ ] Responsive/accessibility pass.
- [ ] User approves Task 11.

### Task 12 — Validation + release candidate
- [ ] Representative internal cases across all six V1 families.
- [ ] Bug-fix round 1.
- [ ] Closed alpha.
- [ ] Bug/UX round 2.
- [ ] Small orthodontist beta.
- [ ] Clinical-rule/bug round 3.
- [ ] Release candidate.
- [ ] User approves free V1 launch.

---

# V1 platform boundary — ORIGINAL PLAN, NOW EXPLICITLY DOCUMENTED

This section does **not** change the product direction. BracketMotion was already defined from the beginning as a browser-native, installable PWA with Windows/macOS install actions. The mobile question simply exposed that this boundary had not been written explicitly enough in the tracker.

Official V1 clinical target:
- Windows desktop/laptop,
- macOS desktop/laptop,
- current Chrome or Edge,
- browser use without installation,
- optional installable PWA through the existing Windows/macOS install actions.

Mobile-phone rule:
- the interface must remain responsive and must not break or overflow,
- phone access may support light viewing/entry where practical,
- **full clinical 3D treatment planning on phones is not an official V1 support target**.

Reason:
- the 3D planning surface, tooth manipulation, records review and mechanics workflow are desktop-class tasks,
- avoiding a separate phone-first clinical UX keeps V1 focused,
- tablet/phone expansion can be evaluated after the desktop V1 is stable.

---

# Application UI rule — LOCKED

Learn from the real product surfaces of LightForce, SureSmile, 3Shape, OnyxCeph and Maestro 3D.

Shared category pattern we intentionally adopt:
- large 3D workspace as the dominant surface,
- compact tool/layer controls,
- persistent clinical workflow navigation,
- contextual inspector,
- visible treatment-stage timeline.

Do not literally copy proprietary branding, icons, assets or screen layouts.

BracketMotion must feel like it belongs in the same professional software category while remaining simpler and faster.

---

## Current task

**Application Task 7 — Fixed-appliance visualization.**

Implementation is complete on the `bracketmotion` branch.

Task 7 adds a third Setup phase after Segmentation and Target Setup:
- generic brackets are placed on the approved patient target and follow tooth/jaw transforms,
- upper/lower archwires follow the segmented arches,
- power chain can be visualized between clinician-selected same-arch endpoints,
- a generic closed-coil spring can be visualized between selected same-arch endpoints,
- interarch elastics use selected upper/lower endpoints,
- a basic closing loop can be visualized between selected same-arch endpoints,
- each appliance/mechanic layer can be shown or hidden independently,
- the Appliances phase stays locked until 3D Setup Approval.

Important boundary:
- this is **generic, brand-neutral fixed-appliance geometry**,
- bracket prescription, exact force magnitude and biological tooth response are not inferred,
- mechanics effects/tendencies belong to Task 8.

Final Task 7 production build is READY. Desktop and narrow responsive visual QA passes are complete with no page-level horizontal overflow.

Wait for user approval before Task 8.

## Rule

1. Keep the master file concise.
2. Update it in GitHub at every approved gate.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
