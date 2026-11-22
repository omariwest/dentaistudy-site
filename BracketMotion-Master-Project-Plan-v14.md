# BracketMotion — Master Project Plan v14

> **Status:** Active build  
> **Version:** v14.0  
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

### Users
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
- Third molars outside the active V1 treatment model.

### First four case families
1. Class I crowding — non-extraction.
2. Class I spacing.
3. Symmetric first-premolar extraction cases.
4. Selected Class II Division 1 fixed-appliance cases.

BracketMotion may return:

> **This case is outside BracketMotion V1 scope.**

- [x] User approved Gate 1.

---

## Gate 2 — Required records and inputs — APPROVED

### Core rule

BracketMotion does not diagnose a comprehensive fixed-appliance case from a 3D scan alone.

V1 uses:
1. patient history/interview,
2. clinician examination,
3. diagnostic records.

**Clinician-confirmed structured findings are the V1 clinical source of truth.**

### Planning-ready case requires

- Case label, age, adolescent/adult, growth status when relevant.
- Chief complaint/treatment goal.
- Relevant medical/dental history.
- Periodontal/pathology/restorative status.
- Missing/impacted/unsuitable teeth.
- Facial/profile/vertical/asymmetry findings.
- Molar/canine relationships.
- Overjet/overbite.
- Dental midlines.
- Crossbite/scissor bite.
- Crowding/spacing.
- Curve of Spee.
- Clinically important rotations/displacements.
- Upper arch scan.
- Lower arch scan.
- Correct bite relationship.
- Minimum facial photographs.
- Minimum intraoral photographs.
- Panoramic radiograph.
- Lateral cephalometric radiograph.
- Compact clinician-entered cephalometric summary.

### Scan formats
- STL
- PLY

### Cephalometric summary
Mandatory categories:
- skeletal AP pattern,
- vertical skeletal pattern,
- maxillary incisor inclination,
- mandibular incisor inclination,
- important cephalometric concern.

Numeric measurements are optional.

### Later scan-derived calculations
- tooth widths,
- Bolton ratios,
- arch perimeter,
- crowding/spacing,
- tooth coordinates/rotations,
- arch form,
- overjet/overbite,
- midlines,
- contacts/collisions.

Auto-calculated measurements remain clinician-reviewable/editable.

### Missing-data behavior
- **Draft case:** incomplete data may be saved.
- **Planning-ready case:** all mandatory data present.
- AI clinical planning is blocked until planning-ready.

- [x] User approved Gate 2.

---

## Gate 3 — Treatment-plan and stage outputs

### Core sequence

BracketMotion follows a structured clinical sequence:

```text
Planning-ready case
        ↓
Problem list + positive attributes
        ↓
Treatment goals
        ↓
Primary strategy + alternative strategy
        ↓
Clinician selects / edits / approves
        ↓
3D target setup
        ↓
Clinician reviews / approves setup
        ↓
Stage + mechanics plan
        ↓
3D movement visualization
```

There are **two explicit approval gates**:

1. **Clinical Plan Approval**
2. **3D Setup Approval**

AI cannot bypass either approval.

---

### A. Structured problem list

BracketMotion produces a concise problem list from clinician-confirmed data.

Each problem contains:

- category,
- description,
- quantitative value when available,
- severity: mild / moderate / severe when appropriate,
- right / left / bilateral when relevant,
- source finding(s),
- priority,
- status: treat / monitor / blocker.

Problem categories:

1. Pathology / treatment-readiness blockers.
2. Facial / soft tissue.
3. Skeletal AP / vertical pattern.
4. Dental alignment and symmetry.
5. Transverse relationships.
6. Anteroposterior dental relationships.
7. Vertical dental relationships.
8. Space / tooth-size relationships.
9. Periodontal / restorative considerations.

BracketMotion also lists **positive attributes to preserve**, for example:

- acceptable facial proportions,
- good smile arc,
- favorable incisor display,
- acceptable arch form,
- healthy periodontal status,
- acceptable transverse relationship.

Pathology or unresolved treatment-readiness blockers remain above malocclusion problems in priority.

---

### B. Treatment goals

Every major problem selected for treatment receives a matching goal.

Goal fields:

- linked problem ID,
- desired clinical change,
- preserve / improve / correct,
- target value or qualitative endpoint when appropriate,
- priority,
- clinician-editable note.

Examples of goal types:

- relieve mandibular crowding,
- close maxillary spacing,
- reduce overjet,
- correct deep overbite,
- achieve Class I canine relationship,
- correct dental midline,
- maintain acceptable profile/incisor support,
- preserve posterior anchorage,
- close extraction spaces.

Goals describe **where treatment is going**, not the appliance mechanics yet.

---

### C. Primary treatment strategy

BracketMotion generates one recommended strategy.

Required fields:

- strategy name,
- short rationale,
- extraction decision,
- teeth planned for extraction if applicable,
- target molar relationship,
- target canine relationship,
- overjet goal,
- overbite goal,
- midline goal,
- incisor-position objective,
- crowding/spacing strategy,
- AP correction strategy,
- vertical-control strategy,
- anchorage requirement,
- expected use of interarch elastics,
- major mechanics concept,
- expected compromises,
- important risks/limitations,
- assumptions,
- why this strategy is preferred.

The recommendation must link back to the problem list and goals.

---

### D. Alternative treatment strategy

BracketMotion generates **one clinically credible alternative**, not a list of random options.

It uses the same structured fields as the primary strategy.

It must also state:

- what changes compared with the primary plan,
- main advantage,
- main disadvantage/compromise,
- why it is not the preferred option for this case.

If no meaningful V1 alternative exists, BracketMotion may say:

> **No appropriate alternative strategy within BracketMotion V1 scope.**

Do not invent an alternative merely to fill the UI.

---

### E. Clinician Plan Approval

Before any setup/staging:

The clinician can:

- choose Primary,
- choose Alternative,
- edit the selected strategy,
- change goals,
- modify anchorage/mechanics intent,
- reject both and enter a clinician-defined strategy.

The selected plan becomes:

> **Approved Clinical Plan**

AI output before this point is a proposal only.

---

### F. Anchorage output

For an approved plan, BracketMotion creates a structured anchorage definition.

Fields:

- arch: upper / lower,
- anchorage demand:
  - minimum anterior retraction,
  - moderate,
  - maximum anterior retraction,
  - custom clinician description,
- active unit,
- anchorage unit,
- desired space-closure distribution,
- reinforcement method,
- reciprocal movement expected,
- undesirable movement to control,
- clinician notes.

V1 may visualize anchorage tendency.

V1 does **not** claim to predict exact anchorage loss biologically.

---

### G. 3D target setup

The approved clinical plan is translated into a proposed final geometric setup.

Important rule:

> **The AI does not write tooth X/Y/Z coordinates.**

The deterministic TypeScript geometry/setup engine uses:

- segmented teeth,
- scan-derived measurements,
- clinician-confirmed goals,
- predefined geometric rules,
- collision/contact checks,
- clinician edits.

The proposed setup defines:

- final tooth position,
- final tooth rotation,
- arch relationship,
- planned contacts,
- planned overjet/overbite,
- planned midlines,
- remaining/extraction spaces.

The clinician can manually adjust teeth before approval.

The result becomes:

> **Approved 3D Setup**

No movement stages are generated until the setup is approved.

---

### H. Dynamic treatment-stage plan

Stages are **case-dependent**.

BracketMotion does not force every case through the same seven stages.

Available V1 stage families:

1. **Initial / Bonding**
2. **Alignment**
3. **Leveling**
4. **Space preparation / management**
5. **Canine retraction** — when selected
6. **Anterior retraction / extraction-space closure** — when selected
7. **AP / Class correction** — when selected
8. **Remaining space closure / consolidation**
9. **Finishing / detailing**
10. **Planned Final**

A simple non-extraction Class I case may use only:

> Initial → Alignment → Leveling → Finishing → Planned Final

An extraction case may use more stages.

---

### I. Every stage has a structured stage card

Each stage contains:

- stage ID,
- stage name,
- objective,
- involved arch(es),
- teeth or segments involved,
- proposed archwire family/size,
- active mechanic(s),
- active unit,
- anchorage unit,
- movement intent,
- expected movement tendency,
- expected reciprocal/side-effect tendency,
- control strategy,
- clinical checkpoint,
- exit criteria,
- warning(s),
- clinician notes.

The doctor may edit, reorder, add or remove stages.

---

### J. Mechanics objects

A stage may contain one or more mechanics objects.

V1 mechanics types:

- archwire alignment/leveling,
- power chain,
- closed-coil spring,
- interarch elastic,
- basic closing loop,
- passive stabilization/anchorage.

Each mechanics object contains:

- mechanic type,
- source attachment/tooth/segment,
- target attachment/tooth/segment,
- force-direction representation,
- intended movement,
- anchorage relationship,
- expected side effect,
- control/countermeasure,
- active stage range.

Exact gram-force values are **not AI-generated requirements** in V1.

If a force magnitude is displayed later, it must come from:
- a clinician-entered value, or
- a separately validated deterministic rule.

---

### K. Data passed to the 3D engine

The 3D engine receives **approved structured data only**.

#### Case geometry
- tooth IDs,
- tooth meshes,
- initial transforms,
- approved final transforms,
- arch/bite relationship.

#### Stage geometry
For every tooth at every stage:
- target translation X/Y/Z,
- target rotation X/Y/Z,
- stage start transform,
- stage target transform.

#### Appliance state
- bracket present/absent,
- bracket transform,
- archwire definition,
- chain/coil/elastic/loop endpoints,
- visibility/active state.

#### Mechanics state
- active unit,
- anchorage unit,
- force-direction vector/visual arrow,
- movement-tendency label,
- reciprocal-effect label,
- control strategy.

#### Metadata
- stage name/order,
- clinician approval status,
- warnings,
- checkpoints.

---

### L. Hard separation of responsibilities

```text
AI
= reasoning + structured treatment proposal

Clinician
= selects / edits / approves clinical plan

Deterministic setup engine
= proposed tooth geometry

Clinician
= reviews / edits / approves 3D setup

Mechanics engine
= stages + movement tendencies + side effects

Three.js
= displays the approved geometry and mechanics
```

AI never directly moves a tooth.

Three.js never decides orthodontic treatment.

---

### M. Gate 3 status

- [x] Define problem-list output.
- [x] Define treatment-goal output.
- [x] Define primary plan.
- [x] Define alternative plan.
- [x] Define clinician plan approval.
- [x] Define anchorage output.
- [x] Define 3D setup approval.
- [x] Define dynamic treatment stages.
- [x] Define mechanics objects.
- [x] Define exact data passed to the 3D engine.
- [ ] User approves Gate 3.

---

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

**Clinical V1 Scope — Gate 3: Treatment-plan and stage outputs.**

Draft complete. Stop for user approval before Gate 4.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
