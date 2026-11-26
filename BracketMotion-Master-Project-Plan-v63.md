# BracketMotion — Master Project Plan v63
> **Status:** Working on UI refinements with the existing DentAIstudy Supabase backend retained by founder decision on 26 November 2026.
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site` only; `main` untouched.
> **Product identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md).
> **Previous master tracker:** [v62](BracketMotion-Master-Project-Plan-v62.md); all v7–v62 remain historical records.
> **Current gate:** Task 17C second-round public model research completed: **CephViT** (NIH/NLM researchers, 2026 paper, 29 landmarks, published Aariz test set) is the new trial candidate under OpenMDW 1.1. This is a **research selection only**; its encrypted PyTorch checkpoint has NOT been executed or converted to ONNX, and accuracy on Ojimba remains unknown. Previous CEPHA29 INT8 remains rejected. No clinical integration or backend changes.

## Product direction (unchanged)
Photo-first, clinician-controlled visual fixed-appliance planning; five intraoral photos; editable AI draft diagnosis and up to three editable treatment suggestions; approximate clinician-reviewed 3D crown/gingiva representation; illustrative mechanics, not biological prediction. No domain purchase, paid service, uncontrolled patient-photo upload or removal of the working STL/PLY engine until photo matching is proven.

## Approved implementation queue

| Task | Scope | Current status |
| --- | --- | --- |
| 1–9 | Existing photo-first workflow, 3D mechanics prototype, responsive improvements and Patients workspace | **Founder approved** — details in v52 |
| 10 | Settings, clinician profile, private circular avatar, subtle focus work | **Implemented** in deployed preview; founder final visual approval / authenticated behavior pending |
| 11 | Separate Supabase backend, owner-scoped cases/buckets and AI function | **Deferred by founder** — stay on the existing DentAIstudy backend for now; migration source prepared but not activated |
| 12 | BracketMotion-specific auth, professional danger-zone account deletion modeled on DentAIstudy; real authenticated profile and patient persistence QA | **Pending** — independent deletion must not affect a shared DentAIstudy account; do not claim signed-in tests passed |
| 13 | Focus/border/button refinements; subtle single-focus outline, selectively darker 1px borders and compact text-fitting buttons, including public pages | **Approved by founder 26 Nov 2026** |
| 14 | Header/wordmark: `bracket` light and **motion** bold across app, public site, legal pages, footer; Patients/Settings right; circular clinician portrait/name | **Approved by founder 26 Nov 2026** |
| 15 | Five compact icon-plus-label clinical workflow steps on existing horizontal ribbon; contextual tools stay in side panel; avoid duplicating LightForce | **Approved by founder 26 Nov 2026** |
| 16 | Reduce surrounding chrome/padding, remove Diagnosis trailing blank scroll, rebalance section columns; responsive dropdown QA and clinical regression | **Approved by founder 26 Nov 2026** |
| 16B | Center ribbon, rename Clinical Records, restyle sign-in popup, dark Settings save, single Patients heading, light numeric arrows | **Superseded visual defects corrected in Task 16C; founder review pending** |
| 16C | Put mm/% before far-right steppers, compact login/signup vertically to avoid standard-height popup scrolling, use existing transparent black standalone icon without circular badge | **Founder approved; frontend refinements completed** |
| 17 | Clinician-editable cephalometric landmarks and deterministic measurements from legally reusable code **and weights** | **17C second-round research done: CephViT selected for feasibility test; no new model run or deployed; 17B INT8 rejected** |
| 18 | Five-photo approximate 3D reconstruction, corrections, measured feasibility and integrated clinician alpha | Pending / heaviest and last |

## Task 11 — historical migration preparation; deferred at founder request
- Existing DentAIstudy Supabase project: `hlvkbqpesiqjxbastxux`. BracketMotion case table contained **zero** rows on 25 Nov 2026. Keep this shared backend fully operational now; no auth, data, storage or AI migration.
- Source-only SQL: [independent Supabase bootstrap](bracketmotion-site/supabase/migrations/20261125_bracketmotion_independent_backend.sql). **Not applied** to either project; requires a newly created project.
- Source-only Edge Function: [bracketmotion-clinical-reasoning](bracketmotion-site/supabase/functions/bracketmotion-clinical-reasoning/index.ts), copied from currently active v3. It expects its own `GEMINI_API_KEY` secret and verified user auth; do not claim it was deployed to the new backend.
- Future client cutover is limited to the BracketMotion-specific Supabase URL/publishable key in `bracketmotion-site/src/supabase.ts`, the **new** project's redirect settings and signed-in verification. Remove DentAIstudy-specific signup/account labels and metadata **at the source** during cutover. Do not swap before backend exists.
- Auth user IDs do not need to be migrated because there are no BracketMotion users. This is a new product signup, not a DentAIstudy account migration.
- Profile/scan storage remains private; the **five intraoral photographs stay browser-local** during Task 11. No photos to Gemini.
- Founder confirmed there is another project in a separate organization, accounting for the two-Free-project quota. **Do not pursue new project creation now.** No authorization bypass, payment or changes to either live project.
- **Task 11 completion requires:** new project healthy, SQL applied and inspected, Edge Function deployed with secret, auth URL/email flow configured, separate client preview deployed, signed-in patient row and avatar read/write/delete tested without accessing another account, and DentAIstudy unaffected.

## Task 13 — first small subgate (focus-only)

- [x] Reworked existing focus states for clinical record inputs, shared dropdowns, unit fields, diagnosis/plan text areas, plan option inputs, patient search, auth dialog and 3D target values.
- [x] Removed the duplicate `.plan-textarea:focus-visible` outline and overlapping clinical input outline selectors at their source.
- [x] Used restrained 1px low-opacity shadow and subtle visible border-color on focus; no changes to control width, height, margins, padding, breakpoints, layouts or fonts.
- [x] Exact CSS-only commit: `7b1744666ca90530519eeaf7ad976962aa5070c9`; Vercel preview: https://bracketmotion-preview-3tjqrcjy0-amarsaaliomer-6121.vercel.app/app
- [x] Production deployment **READY**. Build logs: V1 guard (6 profiles, 7 records, 34 exclusions) PASS; TypeScript and Vite PASS. Existing large-chunk warning remains nonblocking.
- [ ] Human/browser visual inspection of focused fields on actual devices not independently completed; do not claim screenshot validation.
- [ ] Remaining Task 13 darker neutral 1px actionable borders and tighter/thinner button fit, including public pages, deliberately not mixed into this focus gate.

## Task 13 — border/button subgate, 26 November 2026

- [x] Edited the original `bracketmotion-site/src/styles.css` only, without new files, copied styling systems, appended overrides, `!important`, HTML inline styles or React/JavaScript changes.
- [x] Selectively strengthened existing **1px** neutral borders on patient/diagnosis records, input/select/textarea fields, panels, clinical cards, settings, dialog and primary/secondary actions; preserved intentional purple selected states and colored warnings.
- [x] Reduced common public/clinical action heights and padding: public CTA 48→42px (compact 40→34), quiet app buttons 34→30, primary app buttons 38→34; removed enforced large minimum widths on clinical page/approval actions. Full-width account/inspector actions remain appropriate.
- [x] Updated **existing narrow-screen rules** for label-fitting clinical and public action buttons. No new breakpoint, fixed container width, geometry change, AI change or database change.
- [x] Removed public install-button upward movement on hover; stable hover state remains.
- [x] CSS-only implementation commit: `1b6d2b3d83e7c07d51fe18eb128d3f22fdf3266d`.
- [x] Vercel preview: https://bracketmotion-preview-8igi3y0f7-amarsaaliomer-6121.vercel.app/app — **READY**, correct commit SHA. Build logs confirmed 6/6 V1 profiles, 7 required record groups, 34 exclusions, clinical approval/PWA invariants; TypeScript and Vite production build passed.
- [ ] Independent browser screenshot and interactive QA at 1440, 1280, 1024, 768, 390 and 320px has **not been executed in this gate**; do not assert no overflow from build alone. Founder preview review still pending.
- **Next after approval:** Task 14 split light `bracket` / bold `motion` wordmark and app header account/Patients/Settings alignment; keep design inside current components.

## Task 14 — header, branding and clinician account, 26 November 2026

- [x] Edited the **existing** `bracketmotion-site/src/App.tsx` and `src/styles.css` only. No new components, dependencies, CSS files, cloned styles, backend changes or overrides.
- [x] All three shared wordmark occurrences changed to lowercase light `bracket` + bold **motion**, via the existing wordmark styling: landing/header, footer (including legal pages through the shared layout), clinical app header.
- [x] Moved existing Patients and Settings controls to the right-side topbar actions without changing their handlers, active states or navigation conditions; no Help link.
- [x] Restyled existing account control as subtle capsule with circular 28px saved-avatar/initial and existing clinician name, ellipsis for long names. Signed-out state says Sign in; mobile shows avatar-only, retaining accessible button label.
- [x] Under existing 1180px breakpoint, hide long case title to protect action space; at existing 640px breakpoint, show avatar only and retain compact Patients/Settings buttons. No new breakpoint or fixed-page width.
- [x] Source commit: `30482e1da0b7124bfd0347fa657c57c0c6e6ecfb`; Vercel **READY** preview: https://bracketmotion-preview-fl4zksa14-amarsaaliomer-6121.vercel.app/app
- [x] Production build logs: 6/6 V1 family profile regression, 7 required record groups, 34 exclusions, clinician gates, PWA invariants, TypeScript and Vite completed without errors.
- [x] Isolated **header-only** Chromium layout fixture using matching revised markup/CSS measured browser viewport and bounding boxes at 1440, 1280, 1180, 1024, 768, 640, 390 and 320px with a deliberately long name: no fixture overflow or clipped action row; profile name hidden under 640px.
- [ ] **Live** interactive browser QA at all widths not completed. Preview requires Vercel SSO; do not conflate fixture or build validation with a live authenticated browser test. Avatar save and name persistence also remain signed-in QA work from Task 12.
- [ ] Founder to inspect live preview and approve Task 14 before starting Task 15 workflow ribbon.

## Task 15 — five-step icon-and-label workflow ribbon, 26 November 2026

- [x] Edited existing `bracketmotion-site/src/App.tsx` `clinicalFlow` and existing ribbon render block; added five lightweight outlined SVG icon paths in existing flow data, drawn through the same small reusable SVG in the existing item markup. No icon library, dependencies, new components or external artwork.
- [x] Removed obsolete step-number markup and its original `.app-flow-item__index` CSS; used original `.app-flow-nav`, `.app-flow-item`, `.app-flow-item__copy` and the existing 640px media block for all changes. No appended CSS overrides, `!important` or inline styling.
- [x] Kept the exact five workflow labels and current implementation semantics: Case Presentation → Diagnosis → Treatment Plans → 3D Setup (existing scan workspace, **not yet photo-to-3D**) → Mechanics. Did not claim unbuilt five-photo matching is live.
- [x] Kept `openSection` handlers, `aria-current`, title/tooltips, all clinician approval gates, existing 48px desktop / 42px mobile ribbon grid rows and contextual 3D toolbars/inspector untouched.
- [x] Selected state is subdued lavender, regular actions stay neutral. Five controls use small icon above label inside the fixed ribbon; narrow screens keep its original independent horizontal scrolling rather than forcing page-level overflow.
- [x] Exact frontend commit `28a984819b4e19b129793db11ae98baced975d11`; **READY** preview: https://bracketmotion-preview-ev9i34zmz-amarsaaliomer-6121.vercel.app/app
- [x] Vercel production build PASS: 6/6 representative V1 family profiles, 7 Gate 2 record groups, 34 Gate 4 exclusions, clinician gates/PWA invariants, TypeScript and Vite. No build errors.
- [x] Isolated **Chromium ribbon fixture** tested at 1440, 1280, 1180, 1024, 768, 640, 390 and 320 px. No document horizontal overflow or vertically clipped ribbon items; all five actions reachable with horizontal nav scroll at 390/320. This is not a whole-app browser regression test.
- [ ] Full authenticated live-app browser inspection blocked by Vercel Deployment Protection; do not claim live responsive screenshots or auth testing were performed. Leave protection in place.
- [ ] Founder visual approval of Task 15. **Next task after approval: Task 16** stage density and comprehensive responsive/clinical-gate checks.

## Task 16 — compact workspace and Diagnosis empty-scroll fix, 26 November 2026

- [x] Root cause of the reported Diagnosis bottom blank region traced to the shared `.ui-select-menu`. A closed dropdown previously used `visibility:hidden` but still occupied an **absolutely positioned 230px scrollable box**, extending its ancestor scrollable area. An isolated Chromium reproduction showed roughly **191px of phantom extra scroll** in a representative case.
- [x] Edited the original hidden/open menu rules in `src/styles.css`: closed menus now have zero box height, maximum height, padding, border and shadow. The **same menu** regains its original padding, border, 230px maximum and shadow while open. Did **not** hide a broken container, change placement to fixed, or introduce CSS overrides.
- [x] Edited the existing `src/UiSelect.tsx` opening calculation to account for the restored 12px menu frame and clear the prior inline `max-height` on close. The existing `is-dropup` state, measured available-space direction, focus, keyboard/escape and option selection behavior otherwise remain untouched.
- [x] Closed/open/close **isolated Chromium dropdown fixture** verified at 1440, 1280, 1024, 768, 390 and 320px: dropdowns below the fold opened **up**, near the top opened **down**, no vertical clipping, no document horizontal overflow, and ancestor scrollHeight stayed stable after close. This tests the original component behavior pattern, not a signed-in live app.
- [x] **Reused and moved** the single existing Diagnosis **V1 scope screen** section to the end of the right column, after cephalometric findings. The previous 4-section left / 2-section right imbalance is now 3 / 3, which reduces the visibly unused right-hand area. Scope selection and clinician gating logic untouched. Single-column mobile reading order remains logical.
- [x] Reduced existing shell header height (desktop 58→54px, ribbon 48→46px; mobile header 52→50px); compacted outer form padding, card/gap/header spacing, settings/patients chrome, 3D viewer toolbars and stage/scan margins. Kept existing widths, mobile breakpoints, anatomy canvas rendering, and contextual controls; no CSS added at file bottom.
- [x] Changed only `bracketmotion-site/src/styles.css`, `src/UiSelect.tsx`, and the existing Diagnosis section location in `src/App.tsx`. Commits: `ba1eed629bd1b41e25e045f89be0d659b66efc62` (dropdown and density), `61680c5b3988f8dee73925311e5fb896cb262895` (column rebalance).
- [x] Final Vercel **READY** preview: https://bracketmotion-preview-bkrszgtk0-amarsaaliomer-6121.vercel.app/app for commit `61680c5b3988f8dee73925311e5fb896cb262895`. Build logs: 6/6 V1 representative families, 7 record groups, 34 scope exclusions, clinical gates and PWA invariants PASS; TypeScript/Vite build in 4.36s; no deployment errors.
- [ ] Full **live** app visual/browser QA at all six sizes is not independently verified while the preview remains behind Vercel authentication. The isolated dropdown fixture is not an app-level substitute.
- [ ] Founder to review at the bottom of Diagnosis, open the V1 scope dropdown near the page bottom, and inspect case/3D workspace density.

## Task 16B — interface polish before cephalometry, 26 November 2026

- [x] On the original `.app-flow-nav`, `justify-content: safe center` centers the five actions when they fit, and falls back to start alignment when wider than the available scrollable ribbon so the leftmost action stays reachable on phones. Same routing and clinician approval gates.
- [x] Renamed the visual first-phase title to **Clinical Records**, without changing the `Case` internal label, stored state or clinical flow behavior.
- [x] Removed `/ My patients` and its now-obsolete style directly from existing sources, leaving `Patients` as the single heading.
- [x] Made the Settings **Save Changes** primary button black inside its existing footer style; other purple clinical action semantics unchanged.
- [x] Rebuilt the **existing** React auth-dialog markup and its original, co-located stylesheet section to follow the DentAIstudy login/signup visual language: centered BracketMotion app icon, large title, subtitle, Google G in circular button, email divider, native email/password fields, password visibility, forgot-password affordance, black primary action, policy links and switch action. Preserved BracketMotion blur backdrop and popup (no new auth pages, no new CSS file, no inline CSS).
- [x] Copied DentAIstudy's actual `assets/img/google-icon.svg` into BracketMotion's own `public/icons/google-icon.svg`, used existing `/icons/icon-180.png` for the auth logo. GitHub V1 asset check prohibits a visible `bracketmotion-icon.svg` import into the React app, so the existing PWA icon is used **without weakening the guard**.
- [x] Added Google sign-in via the existing Supabase project's `signInWithOAuth({ provider:"google", options:{redirectTo:"/app" on current origin} })`. Password reset uses DentAIstudy's existing `settings.html` recovery destination while accounts remain shared. Password eye toggle and registration terms use the existing BracketMotion routes.
- [x] Added one reusable `NumberInput.tsx` with thin, opposing chevron SVG stepper buttons using the browser's real `HTMLInputElement.stepUp()/stepDown()` and React `onChange`. Replaced native spinner controls in records/findings and 3D target transformation positions/angles. Kept number inputs, min/step settings, typed and keyboard entry. Relevant CSS lives beside the original number-field rules in `styles.css`; no appended override blocks or `!important`.
- [x] Source commit `05234abf2d22c09f16f401d13cbeeed3422b3902`; release-check correction commit `6c15da80cf9d1e5f99194a769f3d820c087f1db5`.
- [x] Final Vercel preview **READY**: https://bracketmotion-preview-avm2ynvuv-amarsaaliomer-6121.vercel.app/app (exact UI commit `6c15da80cf9d1e5f99194a769f3d820c087f1db5`). Clinical validation PASS: 6/6 family profiles, 7 records, 34 exclusions, clinician approval gates and PWA invariants. TypeScript/Vite production build finished successfully, no errors. Initial attempt failed the preexisting no-visible-favicon-SVG assertion; corrected by using the existing 180px PWA app icon and retested without modifying the validator.
- [ ] **Not claimed:** live authenticated Google callback success, password-reset email delivery, full 320–1440px interactive browser sign-in, or live clinician avatar/patient persistence tests. The app preview is protected by Vercel SSO and a user-authenticated session is needed. The Supabase redirect URL allowlist may require confirmation if Google returns to the wrong origin; don't change shared production auth settings blindly.
- [ ] Founder to review the center alignment, sign-in/sign-up modal, settings Save Changes, Patients heading and numeric steppers. After approval, proceed to Task 17 cephalometric feasibility, keeping independent account deletion gated until independent auth.

## Task 16C — UI corrections requested by founder, 26 November 2026

- [x] Fixed the unit/stepper ordering in existing `src/styles.css`: `.field-with-unit` is the positioned anchor, the existing `NumberInput` uses the unit field as its positioning context, and `mm` or `%` is physically between the numeric value and two far-right arrow buttons. Numeric input state, steps, min/max, keyboard and handlers are **unchanged**. No new numeric component or CSS appended at the end.
- [x] Retained the compact **vertical** authentication popup and its blur backdrop, but edited existing auth CSS directly: 64px circular logo replaced with a 49×42px standalone black transparent SVG; 30px header top padding→17px, Google button 54→43px, form gap 12→8px, input height 42→37px, bottom padding 26→17px; smaller overall form spacing and narrower mobile padding. Controls remain readable. No separate sign-in page.
- [x] The existing `public/icons/bracketmotion-icon.svg` already contains transparent black artwork; used as the background of the **auth dialog only** and removed the black circular badge and white-inverted image. Original file not altered and the release validator's no-icon-in-wordmark guard remains intact.
- [x] Isolated Chromium CSS popup layout fixture tested signup at widths/heights 1440×900, 1209×802 (100%, 125%, 150% zoom approximations), 390×844, 320×640 and 320×568: **no internal popup scrollbar and no horizontal overflow** in these test conditions. This is not a full live-app screenshot.
- [x] Isolated Chromium numeric-unit layout fixture verified unit label is visually before the right-edge steppers with no horizontal page overflow; numeric control still uses native number input.
- [x] Source-only commit `d67ad10e4cff7309f67ae7e00a84dee5a8612a31` changes **only** `bracketmotion-site/src/App.tsx` and `src/styles.css` in-place; no Supabase, authentication logic, patient storage, CSS breakpoints, domain or `main` changes.
- [x] Vercel **READY** preview https://bracketmotion-preview-r6vo6tvhn-amarsaaliomer-6121.vercel.app/app is built from the exact UI commit `d67ad10e4cff7309f67ae7e00a84dee5a8612a31`. Release guard passed 6/6 V1 family profiles, 7 records, 34 exclusions, clinical gates and PWA invariants; Vite/TypeScript production build passed in 4.91s; deployment logs show no errors.
- [ ] Founder actual modal and number-field visual review; separate live Google OAuth callback/password reset and real signed-in persistence tests remain unverified.

## Task 17A — cephalometry model and license feasibility, 26 November 2026

**Decision: select one provisional trial candidate; do not integrate or ship it as a diagnostic AI yet.** The existing `photos.ceph` tab-local lateral-cephalogram upload is the entry. Existing Diagnosis cephalometric-summary fields remain clinician-entered until real inference is demonstrated.

### Lead candidate — CEPHA29 HRNet-W32 ONNX

- Weights/model card: https://huggingface.co/MuhammadNabeelSh/cephalometry-landmarks
- Provided artifacts: `landmarks-cepha29.int8.onnx` **29.7 MB** (static-QDQ INT8), `landmarks-cepha29.onnx` **114 MB** (FP32); input **1×3×768×768**, output **1×29×192×192 heatmaps**. Channel ordering must match the card **exactly**. No downloaded file or checksum verified locally yet.
- License/provenance: model card lists **CC BY 4.0**, training implementation https://github.com/Cestovatels/CephaloHRNet is **MIT**, listed ImageNet backbone `hrnet_w32.ms_in1k` **Apache-2.0**. The underlying Aariz dataset license was independently checked at its **source metadata** https://api.figshare.com/v2/articles/27986417 — **CC BY 4.0**, DOI https://doi.org/10.6084/m9.figshare.27986417.v1.
- Claims (author-reported validation, **not independently reproduced**): mean radial error **1.24 mm**; successful detection within 2 mm **83.1%**, 3 mm **93.7%**, 4 mm **97.2%** on **150 validation images**.
- Model card also says **"Research and education only. Not a medical device; not for diagnosis or treatment."** Its intended-use wording warrants explicit clarification before offering it as a clinical/commercial diagnostic service, notwithstanding CC BY 4.0 metadata. No declaration of full medical-device/clinical clearance.
- Potential architecture: on-demand, lazy-loaded **ONNX Runtime Web/WASM** (https://onnxruntime.ai/docs/tutorials/web/) working **locally in the browser**; avoid new Supabase function, GPU server or radiograph upload. Test operator support, memory, initial load, speed and mobile/desktop behavior *before* adding dependency or 29.7 MB binary to the release. No inference benchmark yet.

### Compared and excluded for this first trial

- **CephTrace v4:** https://github.com/sidwiz/cephtrace-research — published pipeline and self-reported 1.04 mm MRE, but ONNX weights **CC BY-NC-SA 4.0**, ~277 MB, and explicit patent notice. **Do not use these weights in a future commercial service without separate permission.**
- **CephaloHRNet standalone:** MIT source with train/evaluate/predict support, but the repository is mainly a *training framework*; assuming pretrained cephalometric checkpoints are automatically usable/commercially cleared would be an error. No reason to train a new model while the compact licensed candidate can be feasibility-tested.
- Avoid unconstrained Gemini landmark coordinate generation and guessed radiographic findings.

### Next implementation subgates (sequential, no unnecessary infrastructure)

1. **17B — Runtime proof:** acquire/verify the INT8 artifact and provenance; load a permitted nonpatient test radiograph, run inference **in the browser**, compare output heatmaps/29 named coordinates with reference landmarks, correctly map all letterbox/resize transforms back to original image. Record timing/memory on representative machines and actual output errors; reject/defer if inaccurate, slow, or incompatible. Use original published sample data under its terms and attribution.
2. **17C — Interactive measurement layer:** reuse `photos.ceph` **without uploading twice**; add editable landmark overlay on the original lateral film, with clear automatic/manual provenance. First calculations **SNA, SNB, ANB and FMA** from corrected points using deterministic angle geometry (Po–Or Frankfort plane; Go–Me mandibular plane); do not invent uncalibrated linear-mm measurements. Changes recalculate immediately; missing landmarks show missing values, not zeros.
3. **17D — Clinical integration and checks:** clinician reviews, edits and explicitly approves landmarks/measurements; only approved structured results feed the existing Diagnosis draft. Photo/radiograph replacement invalidates prior tracing approval. Test incorrect orientation, unreadable scans, inferred missing points, wide/mobile viewports and clinical status gating. Keep both radiograph and unsaved landmark work browser-local in this development phase.

**Task 17A completion is documentary research only.** No new package, ONNX artifact, X-ray data transfer, UI change, Supabase modification, clinical feature claim or Vercel deployment in this gate. Current build from latest frontend fix remains unchanged.

## Task 17B — actual ONNX model test and rejection decision, 26 November 2026

**Verdict: DO NOT integrate the 29.7 MB INT8 model; DO NOT mark automated cephalometry completed.** The full-precision model is more plausible but must be validated on reference landmark annotations before any clinical-facing integration.

### What was actually executed
- Downloaded both the official Hugging Face ONNX binaries into a temporary test environment; **not uploaded to or committed into BracketMotion**. INT8: **29,745,715 bytes** SHA256 `f7f1db9cc2de37c0fa94dab431d7d3446d1d8ffc62fa92e6610c2380af83080d`. FP32: **114 MB** SHA256 `cacd38201ada69fa7d3ea2566cb63b315302f35e3c66fb483a6eed32c88f14c5`.
- Used **onnxruntime-web 1.31.1**, WebAssembly CPU execution provider, 2 vCPU / 4 GB RAM cloud sandbox. Both artifacts successfully loaded and produced exactly **29×192×192** float heatmaps for **1×3×768×768** float32 inputs. This was ONNX Runtime Web **under Node.js WASM**; not interactive browser UI and not a true mobile-device test.
- Preprocessing duplicated the CephaloHRNet published inference path: resize the original RGB radiograph to **768×768** (bilinear, stretch), RGB pixels normalized `(pixel/255 - [0.485,0.456,0.406])/[0.229,0.224,0.225]`, CHW tensor. For each of 29 channels, choose maximum heatmap position and map the coordinate back to original image width/height.
- Public test image 1: `alexcorvi/cephalometric/sample.png`, **1398×1702**, not an Aariz annotated test-set case. Public test image 2: `thomaspenny/Lateral-Cephalogram-App/Example  lat ceph image.png`, **1154×978**. No patient data transferred outside the local user-provided files; specifically **Ojimba was not uploaded to the cloud test sandbox or processed by this model**.

| Public image | Quantized INT8 | FP32 full precision | Finding |
| --- | --- | --- | --- |
| Image 1 | SNA **74.67°**, SNB **78.97°**, ANB **−4.30°** | SNA **81.37°**, SNB **79.89°**, ANB **+1.48°** | Same source produces a **5.78° ANB difference**, enough to alter skeletal classification |
| Image 2 | SNA **74.77°**, SNB **73.72°** | SNA **78.83°**, SNB **77.40°** | Several angles differ by 3–4° |
| Image 2 Orbitale | `Or` at **y=823**, peak **0.071**, well beneath expected orbit | `Or` at **y=390**, peak **0.425** | **433 px** vertical disagreement; the INT8 finding is anatomically implausible |
| Approximate FMA from predicted FH and mandibular plane, image 2 | **20.56°** | **29.56°** | **9.0°** difference; do not use either for clinical interpretation without correction |

- Sample inference timings (after input preprocessing, not including network download): **INT8 ~4.6–5.0 s**, **FP32 ~7.7–7.8 s** on the 2-vCPU test environment; load ~0.7–1.1 s. FP32 requires a **114 MB download** plus browser memory and compute; production mobile responsiveness/load not verified.
- **Interpretation:** performance claims reported on the model card (1.24 mm mean error, 83.1% within 2 mm) were **not replicated**: these public images do not carry verified 29-point ground truth. The tests prove the smaller release has unsafe internal divergences, not that the larger release is clinically accurate. Numeric heatmap peaks are **not calibrated confidence probabilities**.
- **License:** author lists CC BY 4.0 weights, but also labels intended use **research and education only / not for diagnosis or treatment**. Attribution and a two-word results note **“Verify landmarks.”** cannot establish clinical suitability or provide legal immunity. Do not assume this research model is an independently validated clinical product.

### Decision and direct handoff
**No feature code, additional services, AI calls, Gemini prompt, backend, patient upload path or release dependency was changed for Task 17B.** Do not integrate INT8 or label cephalometry done. If pursuing FP32, the single acceptance gate is a **browser-local** test using Ojimba's original cephalogram with independent orthodontist-annotated coordinate reference, and a review of which discrepancies are landmark error versus the user's different cephalometric analyses. The current screenshots contain manually interpreted summary tables, **not a full machine-readable 29-landmark ground truth**, and SNA differs between reference tables. After actual accuracy/clinical-purpose validation, either ship the **complete** clinician-correctable, clinician-approved, deterministic-angle workflow once or omit automatic tracing; no misleading intermediate release.

Files and provenance: https://huggingface.co/MuhammadNabeelSh/cephalometry-landmarks ; https://github.com/Cestovatels/CephaloHRNet ; public sample sources above. No external patient dataset copied into GitHub. The sandbox test session was stopped after use.

## Task 17C — second-round model search and candidate selection, 26 November 2026

**Selected for the next isolated feasibility test: NIH/NLM CephViT (do not integrate yet).**

- Model and code: https://huggingface.co/nlm-dir/CephViT ; original paper https://arxiv.org/abs/2608.16535 (ODIN 2026 MICCAI satellite event). Authors Benjamin Hou, Konstantinia Almpani, Janice S. Lee, Zhiyong Lu; NLM/NIDCR US NIH research groups.
- **29 landmark heatmaps** on the Aariz public dataset; published held-out test results **1.28 ± 1.42 mm MRE**, **82.1% SDR@2 mm**, **92.0% SDR@3 mm**. Source: original paper Results §3.1, not arbitrary model-card marketing figures. **Reported results are not reproduced locally by BracketMotion**, and the prior model's 1.24 mm figure is not a valid direct superiority comparison without identical benchmark protocol.
- Hugging Face repository distributes Python/PyTorch/Gradio inference code, landmark heatmap decoding (DARK), and an **encrypted pretrained `best.pt.enc` checkpoint**. Its model card **publishes the decryption key**. Source explicitly exposes `args["num_landmarks"]`, and app includes a temporary hard-coded list of 29 labels; do **not** trust label order blindly—verify checkpoint metadata and map to full documented anatomy.
- Model card declares **OpenMDW 1.1**. Official FAQ https://openmdw.ai/faq/ identifies it as a permissive model-materials license with commercial use and modification rights without field-of-use restrictions, conditional on retaining its license and copyright/origin notices when redistributing. Third-party data/dependency provenance and model release must still be respected; this is not clinical-device authorization.
- The **original 29.7 MB CEPHA29 INT8** is still REJECTED from Task 17B; the 114 MB CEPHA29 FP32 works technically but remains unvalidated.
- Alternatives screened: cwlachap/HRNet https://huggingface.co/cwlachap/hrnet-cephalometric-landmark-detection has MIT weights but **347 MB** PyTorch checkpoint and weaker independent research evidence; CEPHMark-Net https://github.com/manwaarkhd/CEPHMark-Net has Apache-2.0 research implementation but an immediately reproducible and downloadable full pretrained clinical checkpoint remains unverified; CeLDA+ https://github.com/ShanghaiTech-IMPACT/CeLDA_plus publishes strong age-robust research code but the benchmark data is restricted to research and repository examples assume training checkpoints, not a ready-to-run permissive pretrained release. Don't train a new model.
- **Next test (17D):** independently confirm checkpoint download/decryption + 29-name order, run author's unmodified reference inference on approved nonpatient cephalograms; compare with source annotations where available. If credible, export to ONNX **without quantizing yet**, run exactly the same inputs and compare heatmaps/coordinates/angles across PyTorch and browser WASM; record weight size and cold-load/inference timing at realistic memory/CPU. Test Ojimba only with local permission and proper clinical reference before making claims.
- **Implementation boundary:** keep the original upload local (`photos.ceph`), no automatic results from Gemini, no external patient-image API and no new paid/cloud service. After a real accuracy gate, integrate complete clinician-editable landmark/tracing + deterministic SNA/SNB/ANB/FMA and explicit acceptance. Note under results: **“Verify landmarks.”** No unfinished norms selector.
- **Status:** Documentary second-round research only. No CephViT binary downloaded or executed, no ONNX export, no Ojimba validation, no app code, Supabase or preview modification. Do not mark Task 17 finished.

## Engineering and review rules
Edit existing source blocks and remove the original obsolete rule instead of appending overrides. No `!important`, inline CSS/JS, unrelated design system, new CSS file, duplicate hidden UI, or silent merge to `main`. Small reviewed gates; guarded build and real browser QA before claiming completion. Use existing DentAIstudy/UIORI controls as reference, not blindly imported CSS.

## Handoff
Task 17C second-round model research selects **CephViT** as the next test candidate on evidence and OpenMDW 1.1 model license. Actual checkpoint behavior, runtime speed, ONNX export and patient-specific accuracy are **not yet tested**; don't confuse published figures with independently verified BracketMotion output. Previous CEPHA29 INT8 rejected, FP32 not validated. Next: 17D reference PyTorch inference → FP32 ONNX parity → local-browser assessment, then one complete clinician-editable cephalo feature only after quality acceptance. Preserve current DentAIstudy Supabase, frontend, `main`, and browser-local radiograph handling; Task 18 five-photo 3D last.
