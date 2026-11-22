# BracketMotion — Master Project Plan v12

> **Status:** Active build  
> **Version:** v12.0  
> **Product:** BracketMotion  
> **Tagline:** *Plan the mechanics. See the movement.*

## Locked product

BracketMotion is a **free-first installable PWA for conventional fixed-appliance orthodontics** for everyday orthodontists worldwide.

Core: patient-specific planned 3D movement + mechanics-aware simulation + controlled AI with clinician approval.

## Public site

Production later:
- `bracketmotion.com` — public landing/legal site
- `app.bracketmotion.com` — clinical application

Public pages:
- `/`
- `/privacy`
- `/terms`
- `/clinical-disclaimer`

Footer contact: `support@bracketmotion.com`.

### Public-site status

- [x] Foundation.
- [x] Header + hero.
- [x] Landing-page workflow + final CTA + footer.
- [x] Complete Privacy Policy.
- [x] Complete Terms of Use.
- [x] Complete Clinical Disclaimer.
- [x] Responsive/legal routing QA.
- [x] User approved completed public site.

Preview:
- https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/

## Visual system

External:
1. Notion — restraint / whitespace / clarity
2. Stripe — hierarchy / selective accent / product presentation

Internal:
1. UIORI — primary
2. DentAIstudy — secondary

Palette:
- `#111827`
- `#FFFFFF`
- `#F8FAFC`
- `#52525B`
- `#71717A`
- `#E4E4E7`
- `#6D4CF5`
- `#5936D8`

Typography: Inter.

## Legal / clinical rules

- Clinician remains responsible for diagnosis and treatment decisions.
- 3D movement is planned visualization, not guaranteed biological prediction.
- AI is clinician-reviewed decision support, not an autonomous treatment planner.
- Users must have lawful authority to upload patient data.
- User-uploaded case data remains the user's content.
- No unsupported regulatory-clearance claim.
- Generic appliance visuals do not imply manufacturer affiliation.
- Copyrighted textbooks are references, not redistributed production knowledge bases.

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

## Development

Temporary:
- repo: `omariwest/dentaistudy-site`
- branch: `bracketmotion`
- frontend: `/bracketmotion-site`
- `main` untouched

Preview: Vercel.

---

# Clinical V1 scope — 4 review gates

## Gate 1 — Supported users and case families

### Intended V1 user

- Orthodontist.
- Dentist providing conventional fixed-appliance treatment within their competence.
- Orthodontic resident/trainee under appropriate supervision.

### Appliance system

V1 is built around:

- conventional labial fixed appliances,
- generic preadjusted edgewise brackets,
- one initial working convention: **0.022-inch slot**,
- conventional NiTi and stainless-steel archwire sequences,
- elastics,
- elastomeric chain,
- closed-coil springs,
- basic loop mechanics.

V1 does **not** require a proprietary bracket manufacturer or custom-wire ecosystem.

### Dentition

V1 supports:

- permanent dentition,
- adolescent or adult cases,
- routine erupted permanent teeth suitable for conventional fixed-appliance planning.

Third molars are outside the active treatment model in V1.

### First supported case families

V1 will focus on four clinically recognizable families:

1. **Class I crowding — non-extraction**
   - alignment,
   - leveling,
   - arch coordination,
   - limited space creation/management,
   - finishing.

2. **Class I spacing**
   - alignment/leveling as needed,
   - space closure with fixed-appliance mechanics,
   - finishing.

3. **First-premolar extraction cases**
   - symmetric extraction planning,
   - alignment/leveling,
   - canine retraction when selected,
   - anterior retraction,
   - space closure,
   - anchorage consideration,
   - finishing.

4. **Selected Class II Division 1 cases treated with conventional fixed appliances**
   - alignment/leveling,
   - sagittal correction using conventional interarch elastics where appropriate,
   - extraction or non-extraction strategy when supported by the case,
   - finishing.

### Gate 1 boundary

V1 is **not** claiming to support every case that fits one of these labels.

The software must be allowed to say:

> “This case is outside BracketMotion V1 scope.”

Complexity exclusions are finalized in Gate 4.

### Gate 1 status

- [x] Draft supported user definition.
- [x] Draft appliance convention.
- [x] Draft dentition boundary.
- [x] Draft first four case families.
- [ ] User approves Gate 1.

---

## Gate 2 — Required clinical records / inputs

- [ ] Define mandatory records.
- [ ] Define optional records.
- [ ] Define manual inputs.
- [ ] Define values calculated from models later.
- [ ] Define missing-data behavior.
- [ ] User approves Gate 2.

## Gate 3 — Treatment-plan / stage outputs

- [ ] Define problem-list output.
- [ ] Define primary plan.
- [ ] Define alternative plan.
- [ ] Define anchorage/mechanics output.
- [ ] Define treatment-stage structure.
- [ ] Define what the 3D engine receives.
- [ ] User approves Gate 3.

## Gate 4 — Explicit exclusions + V1 success criteria

- [ ] Define excluded case types.
- [ ] Define excluded mechanics.
- [ ] Define excluded biological claims.
- [ ] Define what constitutes a successful V1.
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

**Clinical V1 Scope — Gate 1: Supported users and case families.**

Stop after Gate 1 and wait for user approval.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
