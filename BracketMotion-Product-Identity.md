# BracketMotion — Product Identity & Direction

> **Document role:** The stable source of truth for who we are, whom we serve, what we build, and how we want it to feel.  
> **Status:** Approved direction; ongoing implementation.  
> **Product:** BracketMotion  
> **Tagline:** *Plan the mechanics. See the movement.*  
> **Task execution:** The highest-numbered `BracketMotion-Master-Project-Plan-v*.md` file on the `bracketmotion` branch; earlier versions remain as history.  
> **Frozen detailed V1 clinical contract:** [Master Project Plan v35](BracketMotion-Master-Project-Plan-v35.md), Clinical V1 scope / Gate 4.

## Why BracketMotion exists

BracketMotion is an orthodontist-founded software project, not a generic technology demonstration.

The founder is an orthodontic resident interested in digital orthodontics and a longer-term career at the intersection of clinical expertise, digital product development, and orthodontic technology. Earlier work with ImageJ and clinical measurement led to exploring practical digital orthodontic workflows.

The goal is to create a genuine, useful product that demonstrates clinical insight and product execution. Financial revenue is **not a prerequisite for V1 success**. Real clinical users, a respected portfolio, research output, collaboration, sponsorship, employment opportunities, strategic partnerships, and eventual commercial interest are all valuable possible outcomes. None is guaranteed merely by building the software.

We build for real-world usefulness first. If a feature does not help a clinician reach the intended outcome, it needs a strong reason to exist.

## Who we serve — and whom we do not chase

**Primary users:** independent, solo, small-practice, and everyday orthodontists worldwide who use conventional labial fixed appliances; qualified dentists within their competence and supervised orthodontic residents can also be appropriate users within the frozen clinical scope.

They should not need proprietary brackets, scanner ecosystems, custom manufactured wires, a laboratory contract, or expensive planning licenses to examine a patient-specific digital setup and discuss mechanics.

**Not our V1 target:** enterprise manufacturing workflows, high-volume aligner production centers, proprietary scanner ecosystems, laboratory/order-management customers, or customers whose main requirement is certified biological outcome prediction.

We do not need to displace SureSmile, LightForce, or 3Shape in their core markets. Their strength is useful reference material, not our feature backlog.

## What BracketMotion is

A **free-first, browser-native, installable PWA** for conventional fixed-appliance orthodontic planning.

**Core promise:** Bring an ordinary clinical case and STL/PLY scans; review findings and strategies; approve a patient-specific 3D target; see a stage-by-stage, mechanics-aware representation of the chosen plan.

**Working flow:**

`Case → Findings → Clinical Plan Approval → 3D Setup Approval → Stages → Mechanics → Planned Movement`

The user remains the clinical decision-maker. BracketMotion organizes the work, reveals relevant choices, provides useful 3D geometry and mechanical context, and protects the required approval gates. It must not disguise a visualization as a validated prediction of what a patient's teeth will biologically do.

### Frozen V1 support

Permanent dentition and conventional 0.022-inch labial fixed appliances. Six case families only:

1. Class I non-extraction crowding
2. Class I spacing
3. Symmetric first-premolar extraction
4. Selected Class II Division 1 cases
5. Selected mild-to-moderate dental deep-bite cases
6. Selected mild-to-moderate primarily dental anterior open-bite cases

Basic generic brackets, NiTi/stainless-steel archwires, power chain, closed-coil springs, interarch elastics, and basic loops are visualized as appropriate to the plan.

**Outside V1:** clear aligners; Class III, surgery-led, severe skeletal/asymmetric/craniofacial cases; impacted-tooth traction; TAD/miniscrew-supported mechanics; significant expansion; root-bone/CBCT prediction; manufacturer-specific appliance/manufacturing pipelines. The complete case and mechanics exclusions remain frozen in v35 and are not relaxed by this identity document.

**Never claim:** exact clinical force, timing, periodontal response, root motion, bone remodeling, anchorage loss, stability, or guaranteed treatment outcome. Show **planned geometry and mechanics-aware tendencies**, label uncertainty, and keep explicit clinician approval.

## The Canva principle, translated to orthodontics

The aspiration is **outcome-focused professional simplicity**, not a stripped-down toy.

Canva is our product-thinking analogy: most customers want to finish an actual job, not master a complex collection of tools. For BracketMotion, the job is **reviewing a clinical case, making a defensible plan, and understanding the intended mechanics on the patient's 3D anatomy**.

Apply this without copying Canva or automating away clinical judgment:

- **Start from the case and desired outcome**, not a blank CAD scene with dozens of tools.
- **Progressive disclosure:** show the controls relevant to the current clinical step; keep advanced adjustments available when genuinely needed.
- **Short path through one workspace:** records, plan, scans, setup, mechanics, and stages must feel connected.
- **No visual clutter:** avoid redundant helper paragraphs, repeated headings, decorative badges, useless cards, action duplication, and empty chrome.
- **No fake clinical shortcuts:** clinical records, scope exclusions, appropriate confirmation, and both approval gates remain explicit.

A simpler interface is a competitive strength only if clinicians can still tell what has been measured, assumed, planned, and approved.

## Visual identity and interface standard

**Aim:** calm, precise, clinical software — a focused instrument rather than a multipurpose website.

**Reference priority:** **LightForce / LightPlan first**, **SureSmile / DS Core second**. Borrow the professional 3D-first hierarchy, compact toolbar, contextual inspector, restrained white/gray surfaces, enamel/gingiva materials and minimal decoration—not their protected branding, copied screen layouts, clinical claims or manufacturing features. 3Shape, OnyxCeph and Maestro 3D remain secondary category references.

- **Color:** white and subtle neutral gray dominate; nearly black text communicates hierarchy. Keep BracketMotion purple as a restrained brand/action/selected-state accent, not a background color on every box or a thick outline around every field.
- **Scene priority:** the patient model is the hero. The available viewport must be spacious; reducing sidebars is not sufficient if the remaining panels are still padded, segmented, or repetitive.
- **Panels:** compact workflow navigation, contextual inspector, stage timeline. Avoid excessive ruled dividers, separate page-like sections, and unrelated status boxes. Remove redundancy at the source rather than hiding it with CSS.
- **Real anatomy:** preserve or clearly represent gingival tissue where source data permits; do not mistake exposed tooth roots or an isolated bare dentition for a complete patient scan. Hide irrelevant demo bone anatomy, **not** gingiva/mucosa. Any recreated gum surface must not be presented as patient-accurate anatomy.
- **Demo honesty:** visibly distinguish nonpatient demo teeth from real patient scans. Clinical claims and approvals may never derive from the demo as if it were a patient.
- **Typography and controls:** restrained, professional, and consistent. The approved monochrome BracketMotion favicon/app icon remains for icons; **visible wordmarks are text-only**.

We want less *visual noise*, **not** fewer clinically essential measurements.

## Reuse-first engineering and craftsmanship

We already have polished interfaces and shared interaction patterns in DentAIstudy and UIORI. **Inspect and reuse those established patterns before designing an equivalent control** — e.g., dropdowns, dialogs, SVG treatments, buttons, tables, cards, spacing, and responsive behavior. The shared `UiSelect` was already adapted from prior UIORI/DentAIstudy-quality patterns.

Reuse is a product/implementation decision; do **not** blindly import DentAIstudy page CSS into the independent React app or duplicate conflicting style blocks just to make two interfaces look similar.

**Source rules:**

- Edit or replace the existing responsible component/rule in place; delete obsolete implementation when replaced.
- No appended CSS overrides, no `!important`, no hiding broken markup with CSS, no duplicate styling systems.
- Keep CSS in dedicated CSS files, application logic in JS/TS/TSX, and HTML markup in its appropriate templates/components. No inline CSS/JS blocks.
- Preserve existing visual polish and all responsive breakpoints; no clipped dialogs, page-level horizontal overflow, off-screen tables, or large accidental blank gutters.
- Small reviewable tasks, guarded builds, visual checks, and explicit user approval before the next gate.
- Challenge unnecessary features and prefer the smallest clean correction.

## Platform, ownership, and development boundary

- **Development repository:** `omariwest/dentaistudy-site`; isolated branch **`bracketmotion`**. Do not merge into `main` without explicit approval.
- **App source:** `bracketmotion-site/` — React/TypeScript, Vite, Three.js / React Three Fiber, existing shared UI patterns.
- **Deployment:** separate `bracketmotion-preview` Vercel project. **No BracketMotion domain has been purchased or assigned yet.** This is deliberate pre-launch development, not a missing feature.
- **Official V1 clinical desktop target:** Windows and macOS in current Chrome/Edge; browser use or optional installed PWA. Phone UI must not break or overflow, but full mobile 3D planning is not a V1 requirement.
- **Supabase:** temporarily and deliberately share the existing DentAIstudy Supabase project and authentication infrastructure, while isolating BracketMotion records in its owner-scoped `bracketmotion_cases` table and private `bracketmotion-cases` storage bucket. This is **not** permission to mix dental case data with DentAIstudy study data.
- **Gemini:** `bracketmotion-clinical-reasoning` is a separately deployed Edge Function using the shared server-side `GEMINI_API_KEY`. **It does not invoke DentAIstudy's `ai-generate` function.** Gemini offers structured clinical review only; it cannot write geometry or approve plans.

**Backend verification note (2026-11-25):** Authenticated POST is enforced inside the dedicated function; the two clinical gate booleans are currently checked from the request payload, **not independently reloaded from a saved case**. Do not describe this as server-verified persisted approval state. Before real clinical data or clinical beta, verify the necessary privacy and gate-integrity safeguards; use synthetic/de-identified cases during pre-alpha.

## Clinical references and intellectual property

- *Contemporary Orthodontics*, 7th ed. (Proffit / Fields / Larson / Sarver): primary conventional biomechanics and clinical reference.
- Sandra Khong Tai, *Clear Aligner Technique*, 2nd ed.: understand aligner workflows and digital concepts; **not** an instruction to turn BracketMotion V1 into aligner software.
- Sam Altman, *How to Start a Startup* materials: founder principles, narrow starting audience, user feedback, distribution, execution. This is business inspiration, not a clinical source.

Use controlled paraphrased clinical knowledge, proper attribution and independent implementation. Do not copy textbook assets, competitor code, proprietary branding, layouts, or clinical claims.

## Build-to-opportunity approach

A successful first release is a coherent, trusted clinical workflow that real orthodontists can use, discuss, and recommend. A small number of satisfied clinicians using one useful tool matters more than a large feature list or impressive simulated 3D footage.

After the interface correction round: founder/clinician closed alpha → fix observed issues → small orthodontist beta → fix clinical/UX findings → validated free V1 release. Then measure repeat use and collect evidence of real professional value before deciding what to monetize or expand.

---

**Document discipline:** Update this file only when product identity, positioning, clinical boundary, or engineering standards change. Task status and implementation history belong in the current master tracker.
