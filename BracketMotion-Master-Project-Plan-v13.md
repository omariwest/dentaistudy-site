# BracketMotion — Master Project Plan v13

> **Status:** Active build  
> **Version:** v13.0  
> **Product:** BracketMotion  
> **Tagline:** *Plan the mechanics. See the movement.*

## Locked product

BracketMotion is a **free-first installable PWA for conventional fixed-appliance orthodontics** for everyday orthodontists worldwide.

Core: patient-specific planned 3D movement + mechanics-aware simulation + controlled AI with clinician approval.

## Public site — complete

- [x] Landing page.
- [x] Windows + macOS install funnel only.
- [x] Privacy Policy.
- [x] Terms of Use.
- [x] Clinical Disclaimer.
- [x] Responsive/legal routing QA.
- [x] User approved completed public site.

Preview:
- https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/

## Locked technology

- React
- TypeScript
- Vite
- CSS
- Three.js / React Three Fiber
- PWA
- GitHub
- Vercel
- Supabase
- OpenAI API

No Figma, Blender, C++, native desktop app, or AI-controlled biomechanics in V1.

---

# Clinical V1 scope

## Gate 1 — Supported users and case families — APPROVED

### Intended users

- Orthodontist.
- Dentist providing conventional fixed-appliance treatment within competence.
- Orthodontic resident/trainee under appropriate supervision.

### Appliance convention

- Conventional labial fixed appliances.
- Generic preadjusted edgewise brackets.
- Initial V1 convention: **0.022-inch slot**.
- NiTi and stainless-steel archwires.
- Elastics.
- Elastomeric chain.
- Closed-coil springs.
- Basic loop mechanics.

### Dentition

- Permanent dentition.
- Adolescent or adult.
- Routine erupted permanent teeth suitable for fixed-appliance planning.
- Third molars outside the active V1 treatment model.

### First four case families

1. Class I crowding — non-extraction.
2. Class I spacing.
3. Symmetric first-premolar extraction cases.
4. Selected Class II Division 1 fixed-appliance cases.

BracketMotion must be allowed to return:

> **This case is outside BracketMotion V1 scope.**

- [x] User approved Gate 1.

---

## Gate 2 — Required records and inputs

### Principle

BracketMotion does **not** diagnose a comprehensive fixed-appliance case from a 3D scan alone.

The V1 diagnostic dataset follows three sources:

1. patient history/interview,
2. clinician examination,
3. diagnostic records.

V1 is **manual-first for clinical diagnosis**. Images and radiographs support the clinician's findings; AI does not autonomously diagnose them.

### A. Mandatory case identity / history

Required before treatment-plan generation:

- Case ID / patient label.
- Age at records.
- Adolescent or adult.
- Growth status for adolescents:
  - prepubertal,
  - pubertal,
  - postpubertal,
  - uncertain.
- Chief complaint / treatment goal.
- Relevant medical-history flags.
- Relevant dental history.
- Previous orthodontic treatment: yes/no + short note.
- Allergies/material considerations if relevant.
- Clinician notes for unusual findings.

Avoid unnecessary identifiers in V1.

### B. Mandatory clinical examination fields

#### Oral / periodontal

- Oral hygiene: acceptable / concern.
- Gingival-periodontal status: healthy / concern.
- Active caries or untreated dental pathology: yes/no.
- Restorations/prosthetic considerations: none / present + note.
- Missing permanent teeth.
- Impacted/unerupted teeth.
- Teeth not suitable for routine orthodontic movement: none / present + note.

If unresolved active pathology or significant periodontal concern is present, BracketMotion must stop treatment-plan generation and request clinical resolution/review.

#### Facial / soft tissue

Clinician enters:

- profile: convex / straight / concave,
- lip competence: competent / incompetent,
- facial vertical pattern: low / average / high,
- smile/incisor display concern: none / present + note,
- facial asymmetry: none / present.

Marked facial asymmetry becomes an out-of-scope warning pending Gate 4 rules.

#### Occlusion

Required structured findings:

- molar relationship right / left,
- canine relationship right / left,
- overjet in mm,
- overbite in mm or %,
- upper dental midline relative to face,
- lower dental midline relative to face,
- upper-to-lower dental midline discrepancy,
- anterior/posterior crossbite: none / present + location,
- scissor bite: none / present + location,
- maxillary crowding or spacing in mm,
- mandibular crowding or spacing in mm,
- Curve of Spee: flat / mild / moderate / deep,
- clinically important tooth rotations/displacements: none / present + note.

### C. Mandatory 3D records

For BracketMotion's patient-specific 3D workflow:

- upper arch scan,
- lower arch scan,
- correct interarch/bite relationship.

Initial supported model formats:
- STL,
- PLY.

The app may save an incomplete case without scans, but the 3D planning workflow cannot start until valid upper/lower models and an occlusal relationship are available.

### D. Mandatory photographs

Minimum facial set:

- frontal at rest,
- frontal smile,
- profile at rest.

Minimum intraoral set:

- frontal occlusion,
- right buccal,
- left buccal,
- maxillary occlusal,
- mandibular occlusal.

Photos are records supporting the clinical examination; V1 AI does not independently diagnose facial or intraoral photographs.

### E. Mandatory radiographs

For V1 comprehensive fixed-appliance plan generation:

- panoramic radiograph,
- lateral cephalometric radiograph.

The clinician remains responsible for interpreting pathology, roots, eruption, periodontal findings and other radiographic information.

V1 does **not** perform autonomous radiographic diagnosis.

### F. Mandatory cephalometric summary

V1 does not require one proprietary cephalometric analysis.

The clinician enters a compact standardized summary:

- skeletal AP pattern: Class I / Class II / Class III,
- vertical skeletal pattern: low / average / high,
- maxillary incisor inclination: retroclined / normal / proclined,
- mandibular incisor inclination: retroclined / normal / proclined,
- important cephalometric concern: none / note.

Optional numeric values may be entered:

- SNA,
- SNB,
- ANB,
- Wits,
- FMA or SN-MP,
- U1-NA,
- L1-NB,
- IMPA,
- other clinician-selected measurements.

The categorical summary is mandatory; exact numeric analysis values are optional in V1.

### G. Optional supporting records

Optional when clinically useful:

- additional facial photographs,
- additional intraoral photographs,
- cephalometric tracing/report,
- periapical radiographs,
- prior treatment records,
- prior intraoral scans,
- restorative/periodontal notes.

Do not upload records that are unnecessary for the case.

CBCT/root-bone integration is not a V1 computational input; final exclusion status is confirmed in Gate 4.

### H. Geometry BracketMotion may calculate later from scans

The 3D engine may later calculate or prefill:

- tooth mesiodistal widths,
- Bolton ratios,
- arch perimeter,
- crowding/spacing,
- tooth coordinates,
- rotations,
- arch form,
- overjet/overbite,
- dental midlines,
- interarch contacts/collisions.

Any automatically calculated clinical measurement must remain clinician-reviewable and editable.

### I. Source-of-truth rule

For V1:

> **Clinician-confirmed structured findings are the clinical source of truth.**

AI may organize and reason from those findings.

AI may not silently replace them with an inference from a photo, radiograph or model.

### J. Missing-data behavior

BracketMotion has two states:

**Draft case**
- may be saved with incomplete records,
- records can be uploaded gradually,
- 3D model may be inspected when scans are present.

**Planning-ready case**
- all mandatory history/examination fields complete,
- upper/lower scans + bite relationship present,
- required photos present,
- panoramic radiograph present,
- lateral cephalometric radiograph present,
- cephalometric summary complete.

Only a planning-ready case can generate:
- AI treatment strategy,
- alternative strategy,
- proposed mechanics/stages.

If a critical item is missing, show exactly what is missing instead of generating a partial clinical plan.

### Gate 2 status

- [x] Define mandatory records.
- [x] Define optional records.
- [x] Define manual clinical inputs.
- [x] Define measurements calculated later from models.
- [x] Define missing-data behavior.
- [ ] User approves Gate 2.

---

## Gate 3 — Treatment-plan / stage outputs

- [ ] Define problem-list output.
- [ ] Define primary plan.
- [ ] Define alternative plan.
- [ ] Define anchorage/mechanics output.
- [ ] Define treatment-stage structure.
- [ ] Define exact data passed to the 3D engine.
- [ ] User approves Gate 3.

## Gate 4 — Explicit exclusions + V1 success criteria

- [ ] Decide whether to add any additional case families.
- [ ] Define excluded case types.
- [ ] Define excluded mechanics.
- [ ] Define excluded biological claims.
- [ ] Define successful V1.
- [ ] Freeze clinical V1 scope.
- [ ] User approves Gate 4.

---

# After clinical scope

1. Map clinical references: SureSmile / LightForce / 3Shape / OnyxCeph / Maestro / OrganUI.
2. Build clinical app shell.
3. Build first 3D proof of concept.
4. Add appliances/stages/mechanics.
5. Add clinical records + controlled AI.
6. Add Supabase backend.
7. Validate → beta → free V1.

## Current task

**Clinical V1 Scope — Gate 2: Required records and inputs.**

Implementation/draft is complete. Stop for user approval before Gate 3.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
