# BracketMotion — Master Project Plan v30

> **Status:** Active build planning  
> **Version:** v30.0  
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
- [x] User approves Task 7.

### Task 8 — Stage + mechanics engine
- [x] Case-dependent deterministic stage generation from approved target + enabled mechanics.
- [x] Alignment/leveling stage appears when target tooth movement exists.
- [x] Space-closure stage appears only when chain/coil/loop mechanics are enabled.
- [x] Interarch stage appears only when elastics are enabled.
- [x] Finishing/settling stage closes the sequence.
- [x] Active units identified from current segmented teeth/mechanic endpoints.
- [x] Anchorage units and reinforcement needs shown explicitly.
- [x] Intended movement tendencies shown per stage.
- [x] Reciprocal/side-effect tendencies shown per stage.
- [x] Stage-specific warnings.
- [x] Stage-specific control strategies.
- [x] Initial → approved Target geometric interpolation.
- [x] Automatic play/pause stage timeline.
- [x] Stage-specific appliance/mechanics layer playback.
- [x] Preserve patient scan/setup state when switching Setup ↔ Demo ↔ Stages.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [x] User approves Task 8.

## Intelligence / persistence

### Task 9 — Gemini clinical reasoning
- [x] Dedicated BracketMotion server-side Gemini Edge Function.
- [x] DentAIstudy ai-generate remains untouched.
- [x] Gemini API key remains server-side only.
- [x] Authenticated-user requirement enforced in the Edge Function.
- [x] Planning-ready gate enforced for plan review.
- [x] Clinical Plan Approval + 3D Setup Approval enforced for stage review.
- [x] Controlled JSON-schema output.
- [x] Source-grounded orthodontic mechanics reasoning using controlled Proffit 2025 source IDs.
- [x] Unsupported claims routed to missing-information output instead of invention.
- [x] Server filters citations to the allowed source catalog.
- [x] No direct geometry/tooth-transform control.
- [x] AI cannot approve the clinical plan or 3D setup.
- [x] Clinical AI Review surface added to Plan.
- [x] Gemini mechanics-review status added inside Stages.
- [x] Live patient-data action remains locked until Task 10 supplies authenticated BracketMotion sessions.
- [x] Edge Function deployed ACTIVE.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop visual QA pass.
- [x] Narrow responsive visual QA pass.
- [x] User approves Task 9.

### Task 10 — Supabase + saved cases
- [x] Reuse the existing DentAIstudy Supabase identity instead of creating a second account system.
- [x] Email/password sign-in and signup inside BracketMotion.
- [x] Session restore, refresh and sign-out.
- [x] Owner-scoped bracketmotion_cases table.
- [x] Row Level Security enabled with select/insert/update/delete owner policies.
- [x] Private bracketmotion-cases Storage bucket.
- [x] Storage paths scoped to authenticated user + owned case.
- [x] Structured case records, clinician findings and scope state persistence.
- [x] Clinical plan + Clinical Plan Approval persistence.
- [x] STL/PLY model upload into private Storage.
- [x] Scan file references persisted in the case state.
- [x] Segmentation persistence.
- [x] Upper/lower jaw transform persistence.
- [x] Per-tooth target transform persistence.
- [x] Appliance/mechanics configuration persistence.
- [x] 3D Setup Approval persistence.
- [x] Derived stage sequence persistence.
- [x] Saved-case list and reopen flow.
- [x] Private case creation.
- [x] Debounced autosave.
- [x] Save-state feedback: Local preview / Saving / Saved / Save failed.
- [x] Reopening a case downloads private scan models and rebuilds the 3D state.
- [x] Setup ↔ Stages remounts preserve the latest in-memory 3D state.
- [x] Task 9 plan-review endpoint connected to authenticated sessions.
- [x] Task 9 mechanics-review endpoint connected to authenticated Stages.
- [x] Failed AI calls cannot change approvals or geometry.
- [x] Supabase schema/policy verification passes.
- [x] Production TypeScript + Vite build passes.
- [x] Desktop saved-case/auth layout QA pass.
- [x] Narrow 390px auth layout QA pass.
- [x] User approves Task 10.

## Product completion

### Task 11 — PWA + end-to-end integration
- [x] Web App Manifest linked through the shared SPA shell.
- [x] Stable app ID and start URL set to /app.
- [x] Standalone PWA display mode and application theme metadata.
- [x] 192×192 and 512×512 PNG install icons.
- [x] Maskable SVG icon and 180×180 Apple touch icon.
- [x] Service worker registration.
- [x] Service worker precaches the built /app HTML and hashed JS/CSS on first install.
- [x] Navigation uses network-first behavior with cached app-shell fallback.
- [x] Static Vite assets, manifest and icons are cached without caching Supabase patient data.
- [x] Service-worker response is configured no-cache/no-store so updates stay fresh.
- [x] Windows Chromium native install prompt wiring via beforeinstallprompt.
- [x] macOS Chromium native prompt when supported.
- [x] macOS Safari Add to Dock fallback instructions.
- [x] Existing header, hero and final CTA install buttons are connected to the same PWA install flow.
- [x] Installed/standalone mode changes install controls to Open BracketMotion.
- [x] Offline state is surfaced in the clinical application.
- [x] Saved-case load/create actions give explicit reconnect states when offline.
- [x] Autosave waits while offline and resumes when connectivity returns.
- [x] Plan and Stages AI review give explicit offline/reconnect states.
- [x] Existing case/auth/3D/AI loading, empty and error surfaces remain connected end to end.
- [x] Save/offline status uses live status semantics.
- [x] Install dialog has modal semantics, labelled controls, Escape close and focus-visible treatment.
- [x] New install/offline overlays pass isolated 1440px, 390px and 320px overflow checks.
- [x] Production TypeScript + Vite build passes.
- [x] Deployed /app, manifest, service worker and raster icon endpoints return successfully.
- [x] Service worker is served with Service-Worker-Allowed: /.
- [x] User approves Task 11.

### Task 12 — Validation + release candidate
- [x] Representative internal engineering profiles across all six V1 families.
- [x] Automatic release guard covers all seven Gate 2 record groups.
- [x] Automatic release guard covers all 34 frozen Gate 4 case/mechanics exclusions represented in the scope screen.
- [x] Automatic release guard covers Clinical Plan Approval, 3D Setup Approval, geometry checks and PWA release invariants.
- [x] Bug-fix round 1 — completed from internal validation findings.
- [x] Scope screen expanded from five exclusions to the complete frozen Gate 4 set.
- [x] Symmetric first-premolar extraction added as a persisted treatment/setup state rather than a segmentation deletion.
- [x] Planned extraction state preserves Initial, omits extracted premolars from Target/final analysis and derives an explicit extraction stage.
- [x] Production build runs `npm run validate:v1 && tsc -b && vite build`.
- [x] Guarded production build passes and deploys READY.
- [x] Closed-alpha protocol prepared for all six V1 families plus boundary/approval/save-reopen checks.
- [ ] Closed alpha with real clinician use.
- [ ] Bug/UX round 2 based on alpha findings.
- [ ] Small orthodontist beta.
- [ ] Clinical-rule/bug round 3 based on beta findings.
- [ ] Release candidate.
- [ ] User approves free V1 launch.

---

# Outcome-first simplicity — LOCKED

BracketMotion follows the same strategic principle that made simpler creative tools valuable beside professional suites:

> **Do not win by exposing more tools. Win by helping the everyday user reach the clinical outcome with less friction.**

For BracketMotion this means:
- the patient-specific clinical workspace is the product, not a control dashboard,
- the 3D treatment surface gets visual priority,
- required safety gates stay visible,
- duplicate instructions, decorative controls and redundant status copy are removed,
- complexity is revealed only when the current clinical step needs it,
- no feature is added merely to imitate SureSmile, LightForce or 3Shape.

The goal is not a weaker professional suite. It is a focused conventional-orthodontic workflow that ordinary clinicians can understand quickly.

---

# Founder pre-alpha correction round — 5 approval tasks

These findings came from direct founder/clinician use before the formal closed-alpha run. They do **not** mark closed alpha complete.

## Correction Task 1 — Workspace density + clutter — COMPLETE
- [x] Narrow the persistent left workflow sidebar.
- [x] Narrow the right inspector.
- [x] Give the center clinical workspace materially more width.
- [x] Remove the duplicate planning-status card from the left sidebar.
- [x] Remove the non-functional inspector ellipsis control.
- [x] Replace visible 01 / 02 / 03 numbering with 1 / 2 / 3.
- [x] Remove generic Open arrows from case cards.
- [x] Remove redundant helper copy from Case, Findings and Plan section headers.
- [x] Remove manual textarea resize handles.
- [x] Preserve required readiness, scope and approval messages.
- [x] V1 release guard passes.
- [x] TypeScript/Vite production build passes.
- [x] Preview deployment returns READY.

## Correction Task 2 — Shared controls + auth craftsmanship
- [ ] Reuse the existing DentAIstudy/UIORI-quality dropdown/select interaction instead of native-looking generic selects.
- [ ] Reuse the established close/icon treatment in the authentication dialog.
- [ ] Reduce heavy purple focus/shadow treatment across forms and dialogs.
- [ ] Keep controls subtle, consistent and responsive without new parallel design systems.
- [ ] Desktop + narrow QA.

## Correction Task 3 — 3D interaction + loading + performance
- [ ] Make rotate/orbit the safe default after STL/PLY upload; segmentation paint must require an explicit brush mode.
- [ ] Increase the patient-scan/model working area further where the scan workflow itself is consuming space.
- [ ] Replace generic loading text with a restrained visual loading state.
- [ ] Clarify patient scans versus demo anatomy so the demo cannot be mistaken for the primary patient workflow.
- [ ] Review whether demo bones add clinical value; remove them from the primary workflow if they do not.
- [ ] Profile the current lag and apply only justified rendering/performance fixes.
- [ ] Desktop + narrow QA.

## Correction Task 4 — PWA install behavior
- [ ] Reproduce the Windows install/download behavior reported in founder testing.
- [ ] Ensure the Windows/macOS actions trigger the intended PWA install path rather than downloading/opening the landing HTML unexpectedly.
- [ ] Keep browser fallback instructions only where the browser does not expose a native install prompt.
- [ ] Verify installed/standalone behavior.

## Correction Task 5 — BracketMotion mark/favicon + final visual pass
- [ ] Create a simple, ownable BracketMotion mark suitable at favicon size.
- [ ] Avoid literal tooth/brace clip-art and avoid copying competitor marks.
- [ ] Use one compact geometric idea tied to bracket + movement / B + motion.
- [ ] Replace current temporary install/favicon assets consistently.
- [ ] Final cross-screen visual QA of the correction round.

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

**Founder pre-alpha Correction Task 1 is complete. Correction Task 2 is next.**

Task 1 simplified the shell without touching clinical logic, 3D mechanics, AI, persistence or the frozen V1 scope.

Completed:
- smaller left/right chrome,
- larger central working area,
- redundant copy/status removal,
- dead inspector control removal,
- simple 1 / 2 / 3 numbering,
- no generic case-card arrows,
- fixed-size plan text areas,
- guarded production build + preview deployment pass.

Formal closed alpha remains pending. The five correction tasks are completed and approved one at a time before the clinician alpha run resumes.

## Rule

1. Keep the master file concise.
2. Update it in GitHub at every approved gate.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
