# BracketMotion — Master Project Plan v16

> **Status:** Active build planning  
> **Version:** v16.0  
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
- [ ] User approves reference map.

---

# What remains

1. Clinical app UI shell.
2. 3D proof of concept.
3. Scan/segmentation workflow.
4. Tooth setup engine.
5. Appliance visualization.
6. Stage engine.
7. Mechanics engine.
8. Clinical-record workflow.
9. Gemini integration.
10. Supabase auth/database/storage.
11. PWA completion.
12. Internal QA.
13. Alpha/beta bug-fix rounds.
14. Release candidate.
15. Free V1 launch.

## Current task

**Phase 5 — Clinical / product reference map.**

Draft complete. Wait for user approval before building the clinical app UI shell.

## Rule

1. Keep the master file concise.
2. Update it in GitHub at every approved gate.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
