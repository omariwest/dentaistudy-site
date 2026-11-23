# BracketMotion — Closed Alpha Protocol v1

> Purpose: clinician validation of the BracketMotion V1 workflow before beta
> Build baseline: Master Project Plan v28 or later on branch `bracketmotion`
> Product boundary: six frozen V1 case families only
> Data rule: use synthetic/de-identified records for alpha unless proper clinical authorization exists

## Alpha objective

Closed alpha answers one question:

> Can a clinician complete the intended BracketMotion V1 workflow safely and coherently across all six supported case families without scope leakage, data loss, broken approvals, or clinically misleading mechanics presentation?

This is not a validation of biological tooth movement, treatment outcome, root movement, force magnitude, treatment duration, or stability.

## Test environment

Run the alpha on the current Vercel preview in a current desktop Chrome or Edge browser.

Complete one PWA install test on Windows or macOS, but the six clinical-flow tests may be run in the browser.

For every case:
1. Create/open the case.
2. Complete all Gate 2 record groups.
3. Confirm the V1 scope screen.
4. Review structured findings.
5. Complete and approve the clinical plan.
6. Import ordinary upper/lower STL or PLY scans.
7. Create/review movable tooth segments.
8. Build the proposed target setup.
9. Review collision/contact, overjet, overbite and midline surfaces.
10. Approve the 3D setup.
11. Configure only supported generic fixed-appliance mechanics.
12. Review stage derivation and playback.
13. Run Gemini review where available.
14. Save, leave the case, reopen it and confirm the approved state is preserved.

## Six required alpha scenarios

| ID | V1 family | Alpha scenario | Required observation |
| --- | --- | --- | --- |
| A1 | Class I crowding — non-extraction | Permanent dentition; Class I; mild/moderate crowding; no extraction | Target movement is possible; Alignment + leveling is available; no extraction state is required |
| A2 | Class I spacing | Permanent dentition; Class I spacing | Space-closing target can be built; power chain and/or closed coil can be visualized; Space closure stage appears when selected |
| A3 | Symmetric first-premolar extraction | Symmetric first-premolar extraction plan | Only 14↔24 or 44↔34 can be marked as a pair; teeth remain in Initial; disappear from Target after extraction stage; state survives save/reopen |
| A4 | Selected Class II Division 1 | Selected dental Class II Division 1 within V1 boundary | Class II findings are accepted; interarch elastics can be configured; Interarch correction stage describes reciprocal effects |
| A5 | Selected deep bite | Mild/moderate dental/dentoalveolar deep bite with manageable Curve of Spee | Vertical target movement is possible; overbite surface updates; leveling stage remains mechanics-aware without biological prediction claims |
| A6 | Selected anterior open bite | Mild/moderate primarily dental anterior open bite | Vertical target movement and supported elastic vector can be represented; reciprocal vertical effects are surfaced; no TAD/surgical mechanics are offered |

## Mandatory boundary challenge

In addition to the six supported scenarios, run at least these four deliberate out-of-scope checks:

| Challenge | Expected result |
| --- | --- |
| Class III correction | Case may remain as a record; treatment-plan generation is blocked as out of V1 scope |
| TAD/miniscrew-supported mechanics | Planning is blocked as out of V1 scope |
| Clear-aligner treatment | Planning is blocked as out of V1 scope |
| Severe skeletal open bite requiring surgery or posterior TAD intrusion | Planning is blocked as out of V1 scope |

If any unsupported primary treatment need can proceed as an in-scope plan, record it as a release-blocking issue.

## Approval-gate checks

For at least one supported case verify all of the following:

- incomplete Gate 2 records keep planning locked,
- editing the clinical plan after approval revokes Clinical Plan Approval,
- 3D setup cannot be approved before required geometry conditions are met,
- changing target tooth geometry after setup approval revokes 3D Setup Approval,
- changing the planned extraction pair after setup approval revokes 3D Setup Approval,
- Stages stays blocked until 3D Setup Approval,
- Gemini cannot change tooth transforms or clinician approvals.

## Save/reopen checks

For at least two supported cases, including A3 extraction:

- save the case,
- leave the case,
- reopen it,
- confirm records/findings are preserved,
- confirm plan approval state is preserved,
- confirm target transforms are preserved,
- confirm planned extraction state is preserved where applicable,
- confirm setup approval state is preserved,
- confirm mechanics/stages are restored coherently.

Any loss or cross-case mixing of patient/case data is a release blocker.

## Responsive check

The clinical app is desktop/laptop V1, but the public site and application shell must not look broken on mobile discovery.

Check approximately:
- 1440 px desktop,
- 1024 px laptop/tablet width,
- 390 px phone,
- 320 px narrow phone.

Pass condition:
- no page-level horizontal overflow,
- no unreachable essential navigation,
- no overlapping modal/dialog,
- no clipped account/install controls that prevent use.

Full 3D treatment planning on a phone is not a V1 support requirement.

## Issue severity

| Severity | Meaning | Examples |
| --- | --- | --- |
| P0 — Safety / data integrity | Do not continue toward beta | wrong patient/case data, unsupported case allowed through scope gate, approval bypass, AI changes geometry/approval |
| P1 — Workflow blocker | Core V1 task cannot be completed | scan cannot load, segmentation cannot be completed, setup cannot save/reopen, stage flow dead end |
| P2 — Clinical/UX defect | Workflow works but is confusing or misleading | wrong wording, unclear stage state, awkward mechanic control, important feedback hidden |
| P3 — Cosmetic | No effect on clinical meaning or task completion | spacing, minor alignment, non-blocking visual inconsistency |

## Alpha issue log

Use one row per observed problem.

| ID | Case | Severity | Screen / step | What happened | Expected | Reproducible? | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | No alpha findings recorded yet | — | — | Pending clinician run |

## Closed-alpha exit criteria

Closed alpha is complete only when:

- all six supported family scenarios have been run by a clinician,
- the four boundary challenges block correctly,
- approval-gate checks pass,
- save/reopen checks pass,
- there are zero open P0 issues,
- there are zero open P1 issues,
- any accepted P2/P3 issues are explicitly recorded,
- the alpha tester confirms the workflow is understandable enough to proceed to a small orthodontist beta.

After alpha, BracketMotion enters Task 12 bug/UX round 2. Do not mark beta or release-candidate milestones complete from this protocol alone.
