# BracketMotion — V1 Validation Report v1

> Status: Internal engineering validation complete; human alpha/beta pending
> Branch: bracketmotion
> V1 boundary source: BracketMotion-Master-Project-Plan-v27.md

## 1. Internal representative family profiles

These are synthetic engineering validation profiles used to verify that the frozen V1 workflow has the required records, geometry controls and mechanics surfaces. They are not patient cases and do not validate biological treatment outcomes.

| V1 family | Internal profile | Required implementation surface | Result |
| --- | --- | --- | --- |
| Class I crowding — non-extraction | Permanent dentition, Class I, positive arch-length discrepancy | crowding fields, clinician target transforms, Alignment + leveling stage | PASS |
| Class I spacing | Permanent dentition, Class I, spacing | target transforms, Power chain / Closed coil, Space closure stage | PASS |
| Symmetric first-premolar extraction | Symmetric first-premolar extraction prescription | symmetric 14↔24 / 44↔34 planned-extraction control, Initial-preserved/Target-omitted state, persisted extraction state, extraction stage, space-closure mechanics | PASS |
| Selected Class II Division 1 | Selected Class II molar/canine relationship with proclined maxillary incisors | Class II structured findings, incisor inclination, interarch elastics, Interarch correction stage | PASS |
| Selected deep bite | Mild-to-moderate dental deep bite with manageable Curve of Spee | overbite + Curve of Spee findings, clinician-controlled Y-axis tooth movement, Alignment + leveling stage | PASS |
| Selected anterior open bite | Mild-to-moderate dental anterior open bite | overbite finding, clinician-controlled vertical target movement, vertical/interarch elastic vector and reciprocal-effect stage text | PASS |

## 2. Frozen boundary verification

Automatic pre-build release guard verifies:

- all seven Gate 2 mandatory record groups,
- all six supported V1 family implementation profiles,
- all 34 explicit frozen V1 case/mechanics exclusion entries currently represented in the scope screen,
- Clinical Plan Approval,
- 3D Setup Approval,
- target collision/contact checks,
- overjet, overbite and midline geometry surfaces,
- PWA /app start URL,
- standalone mode,
- 192×192 and 512×512 install icons,
- first-install application-shell caching,
- no Supabase patient-domain caching in the service worker.

The production build now runs:

`npm run validate:v1 && tsc -b && vite build`

A regression in one of these locked requirements fails the build.

## 3. Bug-fix round 1

### Fixed — incomplete V1 scope screen

The previous scope UI exposed only five unsupported categories even though Gate 4 freezes a much larger exclusion boundary.

Correction:
- expanded the scope screen to the full frozen case/mechanics exclusion set,
- grouped unsupported case types separately from unsupported mechanics,
- retained the clinician-controlled scope decision rather than silently inferring severity from limited structured fields.

### Fixed — extraction family had no planned-extraction state

The symmetric first-premolar extraction family was frozen as supported, but deleting a segmentation was the only way to make a tooth disappear and that is a segmentation edit, not a treatment decision.

Correction:
- first-premolar extraction is now a treatment/setup state,
- only symmetric contralateral first-premolar pairs can be selected,
- upper pair is FDI 14 ↔ 24,
- lower pair is FDI 44 ↔ 34,
- extracted teeth remain visible in Initial,
- they are omitted from the planned Target after the extraction stage,
- final collision/contact analysis excludes them,
- downstream appliance geometry excludes them,
- space-mechanics endpoints exclude them,
- extraction state persists with save/reopen,
- an explicit Planned extractions + space preparation stage is derived,
- clinician setup approval is revoked when the extraction prescription changes.

## 4. Build verification

Current guarded Vercel build:
- V1 release validation: PASS
- TypeScript: PASS
- Vite production build: PASS
- Deployment: READY

The existing Three.js large-chunk warning remains non-blocking; the 3D workspace is already dynamically loaded and no manual chunk override was added solely to suppress the warning.

## 5. What is not yet validated

The following Task 12 milestones require real human clinical use and are intentionally not marked complete by engineering checks:

- closed alpha,
- bug/UX round 2 based on alpha feedback,
- small orthodontist beta,
- clinical-rule/bug round 3 based on beta findings,
- final release candidate,
- free V1 launch approval.

Internal synthetic validation verifies product coverage and regression protection. It does not prove clinical usefulness, usability across real scans, segmentation robustness across scanner outputs, or appropriateness of treatment suggestions across real patients.
