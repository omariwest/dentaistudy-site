# BracketMotion — Product Identity & Direction

> **Document role:** The stable source of truth for who we are, whom we serve, what we build, and how we want it to feel.  
> **Status:** Photo-first visual-treatment product direction approved by founder on 25 November 2026; implementation and reconstruction feasibility remain unfinished. Existing STL/PLY prototype remains in place until replacement gates pass.  
> **Product:** BracketMotion  
> **Positioning:** *Five intraoral photos → clinician-reviewed 3D illustration → clear fixed-appliance treatment options and mechanics.*  
> **Task execution:** The highest-numbered `BracketMotion-Master-Project-Plan-v*.md` file on the `bracketmotion` branch; earlier versions remain as history.  
> **Current built implementation and original scope:** [v35](BracketMotion-Master-Project-Plan-v35.md); unchanged until the photo-first pivot passes its decision gate. **Current planning/decision tracker:** highest-numbered master-plan file, beginning with v41.

## Why BracketMotion exists

BracketMotion is an orthodontist-founded software project, not a generic technology demonstration.

The founder is an orthodontic resident interested in digital orthodontics and a longer-term career at the intersection of clinical expertise, digital product development, and orthodontic technology. Earlier work with ImageJ and clinical measurement led to exploring practical digital orthodontic workflows.

The goal is to create a genuine, useful product that demonstrates clinical insight and product execution. Financial revenue is **not a prerequisite for V1 success**. Real clinical users, a respected portfolio, research output, collaboration, sponsorship, employment opportunities, strategic partnerships, and eventual commercial interest are all valuable possible outcomes. None is guaranteed merely by building the software.

We build for real-world usefulness first. The founder's new insight is that routine five-view intraoral photos can be the clinical starting point, without a scanner purchase, CAD/CAM manufacturing system, heavy STL/PLY import, or a long manual setup. That entry-friction reduction is the key product hypothesis, **not yet a validated market demand claim**.

## Who we serve — and whom we do not chase

**Primary audience (proposed):** orthodontists, supervised orthodontic residents, and qualified dental professionals who already take five standardized intraoral photographs but do not want scanning-dependent setup, proprietary CAD/CAM software, or a long 3D modelling session just to communicate and explore conventional fixed-appliance treatment options. Small independent and resource-constrained practices are a hypothesis to validate with clinicians, not a proven market share claim.

**Not our intended competitors:** manufacturing-based LightForce, enterprise SureSmile, 3Shape or aligner production systems. We admire LightForce's visual clarity first, SureSmile's second; their UI and clinical manufacturing features are not our deliverable.

## Approved product identity — not yet fully implemented

**A browser-based, free-first, photo-first visual orthodontic treatment-planning and communication tool, with AI-assisted diagnosis supporting—not defining—the product.** It transforms five ordinary **intraoral** photographs into a **clinician-verified approximation of visible dental arrangement**, built using reusable dental crown and gingiva assets. The goal is a recognizable, interactive representation, **not an exact patient-specific scan**.

**Photo input:** frontal, maxillary occlusal, mandibular occlusal, right buccal and left buccal. Ask for adequate retractors, visibility and photo quality; request retakes where the image is inadequate. Do not infer unseen roots, bone, periodontal support or hidden tooth surfaces.

**Approved workflow:**

`Case Presentation (records + five photos) → AI-assisted Diagnosis → three editable Treatment Suggestions → Five-Photo 3D Match → Mechanics Workspace (Strap-Up → Archwire → O-Ties/Auxiliaries → illustrative Adjustments and scenario comparison)`

The first model can use generic tooth-type crown anatomy across patients. Only visible differences are fitted, such as spacing/crowding, arch form, rotations, missing teeth and apparent occlusal relationships. A clinician must have a fast way to correct a bad fit; automation must never silently invent or mislabel the patient. Selectable/movable individual teeth and gingival coverage remain important. No bare exposed roots or detached anatomy.

**On-screen experience approved from founder references:** Five major phases, with the last phase revealing Strap-Up, Archwire, O-Ties/Auxiliaries and Adjustments only when relevant. At first launch, collect demographics, clinical history, five intraoral photos and available panoramic/lateral cephalograms in Case Presentation. Never require the same photo upload twice. The 3D matching step reuses the five photographs collected earlier. Keep photos available as a collapsible reference rail once a model exists.

**AI-assisted diagnosis:** Generate an editable draft from supplied records and clinician-entered findings, and where permitted radiographic/cephalometric results. The orthodontist can change any AI-filled field before explicit approval. Do not infer or fabricate unseen measurements. The draft is not a final diagnosis until a clinician approves it. Keep concise **Draft / Approved** states in the workflow; full explanatory terms and consent belong on the legal and onboarding surfaces, not as repeated modal warnings.

**Three proposed treatment options:** The AI may suggest up to three **editable alternatives** based on the patient's supplied information and documented conventional orthodontic principles, with expected goals, proposed mechanics, risks and missing information. The clinician can adjust the options and approve/select one. Do not invent a duration, growth status, extraction indication or technique applicability from absent inputs. The planning options shown in design mockups are illustrations, not vetted recommendations. Proffit serves as a controlled clinical reference, **not as a claim that the model has been trained on or perfectly reproduces the textbook**.

**Mechanical interactions:** After the five-photo match and clinician correction, provide compact contextual bracket options (e.g., prescription as a bracket attribute, if available and supported), allow individual/group bracket placement, then archwire choice (material, size and arch form). Next allow O-ties, power chain, coil spring or loops as clinically appropriate. Show intended movement tendencies and alternative *illustrations* through a compact play/scrub timeline, not exact clinical force, timing or biological prediction.

**Automated cephalometry as a supporting feature:** Investigate permissively usable specialized landmark-detection code **and model weights**; calculate traced angles/measurements deterministically from confirmable landmarks. Users must be able to edit landmarks and AI interpretations before approval. This should not be delegated to unconstrained conversational Gemini alone. It is a later technical gate after simpler screen work.

**Progressive interaction (the Canva analogy):** A doctor should see a plausible arch without manually placing 28 teeth. After confirming the fit, show only the next relevant controls: bracket group and position, wire selection (for example 0.016 NiTi, 0.016×0.022 NiTi, or an appropriate clinician-chosen stainless-steel wire), then staged illustrative mechanics such as a power chain or coil spring. Make each option easy to apply, edit and compare. These are **clinician selections**, not autogenerated treatment prescriptions.

**Reality boundary:** Photo-based 3D estimates cannot provide the exact occlusal/gingival geometry, hidden roots, craniofacial anatomy or biologic response. Do not call the generated mesh a digital impression, a scan, a precise patient clone or an exact treatment prediction. Display a direct label such as **Photo-guided approximation · clinician review required** and show assumptions when illustrating mechanics. No printing, indirect-bonding tray manufacture, appliance prescription, torque/force accuracy or unsupported treatment timing claims. Keep clinical interpretation with the orthodontist.

**Scope evolution, accepted in principle; implementation and clinical claim boundaries still to be frozen after feasibility:** The earlier six-family, seven-record, scan-import and numerical mechanics contract in v35 remains the **legacy implementation**. The proposed photo-first MVP begins with common permanent-dentition fixed-appliance **visual demonstrations**, prioritizing recognizable alignment and simple spacing/space-closure scenarios. Do not delete clinical safety checks blindly or broaden to complex skeletal cases, impacted teeth, surgery, TADs or exact root/bone simulations. A separate founder decision must freeze the new MVP clinical claims and supported examples before implementation.

**STL/PLY decision:** Remove STL/PLY as a **mandatory first-user action**, not the working production code prematurely. Once photo-first modelling is proven useful, replace the scan-dependent user workflow cleanly in its original components; remove obsolete source instead of hiding old forms with CSS. An optional scan importer can be reassessed later but is **not** part of the proposed photo-first default.

## The Canva principle, translated to orthodontics

The aspiration is **outcome-focused professional simplicity**, not a stripped-down toy.

Canva is our product-thinking analogy: most customers want to finish an actual job, not master a complex collection of tools. For BracketMotion, the job is **turning familiar patient photos into a recognizable, clinician-reviewed 3D illustration of how alternative fixed-appliance steps could be presented**. Clarity and speed matter more than duplicating a manufacturing-grade scanner workflow.

Apply this without copying Canva or automating away clinical judgment:

- **Start from five photos and a suggested approximate arrangement**, not a blank CAD scene or a mandatory STL upload.
- **Progressive disclosure:** show the controls relevant to the current clinical step; keep advanced adjustments available when genuinely needed.
- **One short workspace:** photos, visible tooth-fit confirmation, brackets, wire selection, illustrative mechanics, and optional scenario comparison belong together.
- **No visual clutter:** avoid redundant helper paragraphs, repeated headings, decorative badges, useless cards, action duplication, and empty chrome.
- **No fake clinical shortcuts:** visibly uncertain geometry requires clinician verification; any plan-relevant decision, warnings and appropriate approvals must remain explicit.

A simpler interface is a competitive strength only if clinicians can still distinguish photographed observations from inferred geometry and illustrated mechanics.

## Visual identity and interface standard

**Aim:** calm, precise, clinical software — a focused instrument rather than a multipurpose website.

**Reference priority:** **LightForce / LightPlan first**, **SureSmile / DS Core second**. Borrow the professional 3D-first hierarchy, compact toolbar, contextual inspector, restrained white/gray surfaces, enamel/gingiva materials and minimal decoration—not their protected branding, copied screen layouts, clinical claims or manufacturing features. 3Shape, OnyxCeph and Maestro 3D remain secondary category references.

- **Color:** white and subtle neutral gray dominate; nearly black text communicates hierarchy. Keep BracketMotion purple as a restrained brand/action/selected-state accent, not a background color on every box or a thick outline around every field.
- **Scene priority:** the patient model is the hero. The available viewport must be spacious; reducing sidebars is not sufficient if the remaining panels are still padded, segmented, or repetitive.
- **Panels:** compact workflow navigation, contextual inspector, stage timeline. Avoid excessive ruled dividers, separate page-like sections, and unrelated status boxes. Remove redundancy at the source rather than hiding it with CSS.
- **Visually credible but honest anatomy:** polished enamel and gingival/cast surfaces; no root tips protruding, no fake gingival anatomy passed off as observed patient tissue. The photo-fitted reference model is illustrative, never a replacement for intraoral scanning.
- **Source honesty:** distinguish generic reference mesh, photo-fitted illustrative model and any genuine imported scan. Explain that unseen or obscured features were inferred and may be incorrect.
- **Typography and controls:** restrained, professional, and consistent. The approved monochrome BracketMotion favicon/app icon remains for icons; **visible wordmarks are text-only**.

We want fewer controls and fewer claims, not less clinical transparency. Screen defaults should fit the new illustration role rather than preserve manufacturing-grade measurements just because the old engine had them.

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
- **Supabase (current implementation):** temporarily shares DentAIstudy authentication and Supabase infrastructure while keeping case records owner-scoped. The proposed photos must not be ingested or stored as real patient data before consent, appropriate healthcare data handling, retention controls and actual upload security are assessed.
- **Gemini (current implementation):** BracketMotion's dedicated `bracketmotion-clinical-reasoning` Edge Function uses a shared server-side key. Gemini should not be assumed capable of dependable tooth geometry reconstruction; the five-photo fitting method requires separate feasibility work. No patient photos sent to third-party AI by default.

**Backend verification note (2026-11-25):** Authenticated POST is enforced inside the dedicated function; the two clinical gate booleans are currently checked from the request payload, **not independently reloaded from a saved case**. Do not describe this as server-verified persisted approval state. Before any real clinical photo processing or patient-facing beta, verify appropriate privacy, consent, storage, clinical claims and gate integrity; begin with authorized synthetic/de-identified five-photo test sets.

## Clinical references and intellectual property

- *Contemporary Orthodontics*, 7th ed. (Proffit / Fields / Larson / Sarver): primary conventional biomechanics and clinical reference.
- Sandra Khong Tai, *Clear Aligner Technique*, 2nd ed.: understand aligner workflows and digital concepts; **not** an instruction to turn BracketMotion V1 into aligner software.
- Sam Altman, *How to Start a Startup* materials: founder principles, narrow starting audience, user feedback, distribution, execution. This is business inspiration, not a clinical source.

External technical leads: Chen et al. (2023) five-photo parametric reconstruction, MIT-licensed SJTUzhou source code; TeethDreamer (MICCAI 2024) for research only. Licenses for pretrained models, datasets, tooth shape assets and photos must be verified **separately** from source-code licenses. The BodyParts3D geometry is CC BY-SA, despite the clone repository's MIT **code** license. Two paid Sketchfab models supplied by the founder are appearance references only, not licensed application assets.

Use controlled paraphrased clinical knowledge, proper attribution and independent implementation. Do not copy textbook assets, competitor code, proprietary branding, layouts, clinical claims or models without suitable rights.

## Build-to-opportunity approach

A successful first release is a coherent, trusted clinical workflow that real orthodontists can use, discuss, and recommend. A small number of satisfied clinicians using one useful tool matters more than a large feature list or impressive simulated 3D footage.

**Approved implementation order (independent gates, with founder review):** workflow and intake UI → photo intake → editable AI diagnosis and treatment suggestions → contextual bracket/wire/O-tie controls → illustrative mechanics scenarios → evaluate automated cephalometric landmark options → five-photo reconstruction feasibility and implementation → complete regression/clinician alpha → small beta and validated release. The five-photo match remains the largest technical uncertainty and must earn its patient-matched wording through evidence. Monetization remains optional, not the development driver.

The previously approved clinical interface and V1 engine remain deployed as the existing prototype while each approved replacement gate is implemented and tested. No underlying code, source model, database, patient uploads or marketing claims are changed by this document.

---

**Document discipline:** Update this file only when product identity, positioning, clinical boundary, or engineering standards change. Task status and implementation history belong in the current master tracker.
