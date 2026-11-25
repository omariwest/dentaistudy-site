# BracketMotion — Master Project Plan v40

> **Current gate:** Task 4 implemented, QA passed, awaiting founder approval
> **Branch:** `omariwest/dentaistudy-site` → `bracketmotion`; `main` untouched
> **Current preview:** https://bracketmotion-preview-9dvr8sp65-amarsaaliomer-6121.vercel.app/app
> **Production domain:** Not purchased; BracketMotion remains pre-launch
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md)
> **Previous tracker:** [v39](BracketMotion-Master-Project-Plan-v39.md)
> **Frozen clinical V1 specification:** [v35](BracketMotion-Master-Project-Plan-v35.md)

## Current correction sequence

| Gate | Status |
| --- | --- |
| Task 1 — Product identity, architecture and tracker split | Founder approved |
| Task 2 — Clinical workspace layout and panel hierarchy | Founder approved |
| Task 3 — Clinical content and control simplification | Founder approved |
| **Task 4 — UI integration, responsiveness and keyboard QA** | **Implemented; founder review pending** |
| **Task 5 — Replace temporary demo dental model + final regression** | **Next; model deliberately last** |
| Task 12 — Formal clinician closed alpha | Not started; follows Task 5 |

No change to six clinical case families, approval/invalidation semantics, stored case schema, Gemini/Supabase backend, STL/PLY patient data handling, 3D anatomy or fixed-appliance mechanics.

## Task 4 — Verified browser findings and fixes (25 November 2026)

### Fixed at the original source

- [x] **1024px camera-controls regression:** the demo camera-view group was hidden by an old `@media (max-width: 1024px)` declaration. Removed that actual hiding rule. The existing `.app-viewer-toolbar` now scrolls horizontally where necessary, so Front / Right / Left / Upper / Lower remain operable without page-wide overflow.
- [x] **Account-dialog Escape behavior:** pressing Escape did not close the sign-in modal. Corrected in the existing `AuthDialog` React effect; no additional components or styles.
- [x] **Keyboard focus behind modal:** opening Sign in left focus on the background account button, and Tab entered the underlying workflow. The existing dialog now focuses its close button when opened and contains forward/reverse Tab navigation; Escape closes it.
- [x] No appended CSS override, `!important`, inline styling, artificial hide rule, new layout framework, or auth/backend changes.

### Real Chromium tests (local copy of `bracketmotion`, no production auth required)

- [x] Browser-rendered QA at **320, 390, 641, 768, 1024, 1180 and 1440 px**, including 568px-high narrow screens.
- [x] **Zero page-level horizontal overflow** and **zero uncaught page exceptions** at all seven widths in the tested flows.
- [x] Case, Findings, blocked Plan, and clinically approved Plan navigation; required panoramic + cephalometric records can unlock planning.
- [x] Clinical Plan Approval unlocks Setup; unapproved Setup prevents entering Stages.
- [x] Editing the approved plan revokes its approval and redirects subsequent Setup access back to Plan (tested at 320px and 1440px).
- [x] Real Setup patient-surface and demo-reference modes render with correct grid placement. Large demo canvas remains visible, with viewer controls and clinical-reference labeling.
- [x] Five canonical demo camera-view buttons render at every width; narrow toolbar scroll remains local to its toolbar.
- [x] Shared `UiSelect` opens from Findings; sign-in dialog fits within 320/390px viewports.
- [x] Dialog auto-focus, Shift+Tab/Tab cycling, Escape-to-close tested at 320px and 1440px; Escape-to-close rechecked successfully at all seven widths.
- [x] Desktop and 390px Chromium GUI screenshots visually inspected; no clipped viewport/panels or obvious layout instability in inspected Case, demo, or sign-in screens.
- [x] Local `npm run build` passed: V1 release guard, TypeScript, and Vite.
- [x] Vercel preview build **READY**, exact application commit `8eb08aa17f7b6c5e68cfdb8a0026af8bf9323b96`; six representative families, seven record groups, 34 exclusions, gate invariants passed.
- [ ] **Founder visually approves Task 4.**

### Explicitly not claimed as tested

This was a **UI integration and responsive QA pass**, not formal clinical alpha. We did **not** log into a real or test Supabase account; authenticated save/reopen and file-storage persistence were **not** exercised. We also did **not** manually segment and approve a representative patient STL/PLY arch in the browser, so the full real-patient Setup → Stages journey remains for **Task 5 final regression and Task 12 clinician closed alpha**. Those are not silently marked complete.

Existing logged-in Gemini gate-integrity caveat remains as documented in v36: the Edge Function validates a user but currently takes plan-approval readiness flags from the caller; do not describe them as independently reloaded persisted state. Validate this boundary before real clinical data/beta.

## Task 5 — Final demo model (next)

- [ ] Find and verify a **fully free, commercially reusable** cast-style orthodontic model source (prefer CC0; verify attribution/derivative obligations where applicable), or build/refine a compliant derivative using free tools.
- [ ] Correct visible gingival coverage and end exposed root tips; target natural enamel/gingiva geometry and understated LightForce-inspired material appearance.
- [ ] Preserve **separate, selectable, movable teeth** and the working initial/target demo interactions. Do not modify real patient scans or fabricate patient-specific anatomy.
- [ ] Package model assets locally (no paid API/subscription or reliance on third-party remote hosting).
- [ ] Full final regression: clinical cases, navigation, approval gates, real representative de-identified scan workflow, persistence where a test user is available, browser responsiveness, licensing, build, Vercel preview.
- [ ] Founder approves Task 5 and resumes **Task 12 — Formal clinician closed alpha**.

**Next handoff:** Task 4 awaits founder approval. Task 5 is the last correction task. No changes were made to DentAIstudy `main`, Supabase tables/functions, or the temporary OrganUI model in this task.
