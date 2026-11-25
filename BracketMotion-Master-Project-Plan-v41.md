# BracketMotion — Master Project Plan v41

> **Status:** Founder approved Task 4; **photo-first product pivot discussion open**. Task 5 old demo-model replacement **paused/superseded for decision**, not completed
> **Branch:** `bracketmotion` in `omariwest/dentaistudy-site`; **DentAIstudy main protected**
> **New candidate identity:** [BracketMotion Product Identity](BracketMotion-Product-Identity.md) — proposed, not yet frozen
> **Completed prior QA and original Task 5:** [Master Plan v40](BracketMotion-Master-Project-Plan-v40.md)
> **Legacy V1 clinical contract:** [v35](BracketMotion-Master-Project-Plan-v35.md); not silently changed or deleted
> **No app, CSS, backend, model, database, or preview deployment modifications in this decision round.**

## Status and change request — 25 November 2026

| Item | Status |
| --- | --- |
| Original Tasks 1–3 — product identity, workspace shell, control simplification | Founder approved |
| Task 4 — responsive and integration QA | **Founder approved** |
| Old Task 5 — replace OrganUI with nicer static dental demo | **Not executed; no longer a sufficient outcome** |
| New idea — five-photo patient-guided model and illustrative mechanics | **Candidate pivot; decision and feasibility pending** |
| Task 12 — Formal clinician closed alpha | **Not started**; original plan must be reconciled after pivot proof |

### New product hypothesis

**Photo-first, scanner-optional-entry** conventional fixed-appliance visualization for ordinary clinics and residents: five intraoral photos → recognizable approximate 3D arrangement → easy clinician confirmation → click-to-apply brackets → pick wire → show illustrative mechanics → compare clinician-defined plan options.

Inputs: frontal, upper/lower occlusal, right/left buccal. Use standard reusable crown/gingiva assets and photo-fitting to show observed/clinician-confirmed tooth presence, spacing, crowding, rotations and visible bite relationships. Do **not** present model as a true digital impression, precise patient anatomy, measured root/bone movement or biologic treatment prediction.

**Actual user outcome to test:** A resident or orthodontist can load five photos and create a believable, editable 3D teaching/planning illustration **without manually placing 28 teeth**. No new paid service, domain, scanner or patient-photo upload to an unreviewed third-party service.

**Choice pending:** Whether and when to remove existing STL/PLY workflows. The photo-first path would replace mandatory user input, but deleting working geometry code before photo-fitting proof would be unnecessary risk. If pivot is approved and demonstrated, replace the original workflow in place and delete obsolete code — do not hide it via CSS.

## Research and asset rights — verified leads

| Lead | What it contributes | Current decision |
| --- | --- | --- |
| [SJTUzhou/3D-Teeth-Reconstruction-from-Five-Intra-oral-Images](https://github.com/SJTUzhou/3D-Teeth-Reconstruction-from-Five-Intra-oral-Images) | MIT-licensed source; five-photo parametric fitting, per-tooth statistical shape models, boundary segmenter and example outputs | **Best starting research baseline**, not plug-and-play. README says boundary model is inaccurate; pinned old TensorFlow/NumPy/Ray/Open3D stack; CPU optimisation is not an instant web feature. Check training-data/pretrained-model provenance separately |
| [Chen et al., 2023](https://pubmed.ncbi.nlm.nih.gov/37204961/) | Peer-reviewed parametric 3D teeth reconstruction from five intraoral photos | Supports *feasibility of an approximation*, not exact reconstruction in all patients |
| [TeethDreamer, MICCAI 2024](https://papers.miccai.org/miccai-2024/763-Paper1038.html) | Alternative 5-photo generative reconstruction | Research reference only; published review notes guesses of hidden anatomy, and author discussion cites roughly 10–20 minutes per reconstruction for that experimental pipeline |
| [Teeth3DS directory](https://github.com/openmedlab/Awesome-Medical-Dataset/blob/main/resources/Teeth3DS.md) | Segmentation/landmark research on **3D intraoral scans**, not a five-photo reconstruction API | Dataset permissions and commercial restrictions not cleared; **not** an automatic free model library |
| [BodyParts3D clone](https://github.com/Kevin-Mattheus-Moerman/BodyParts3D) | Anatomical reference, same family as current educational demo | Repo software MIT, **model geometry CC BY-SA 2.1 Japan**. Inappropriate look as final dental cast; shares alike on derivatives |
| [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy) | Blender-editable anatomy source | CC BY-SA 4.0; references other models with separate licenses, including NC elements; not default production asset |
| [NIH 3D](https://3d.nih.gov/discover?q=teeth+and+gums&sort=relevance) | Free repository to find candidate geometry | **Per-model licensing**; not blanket CC0 or guaranteed commercial rights |
| [Gums Teeth and Tongue — Sketchfab](https://sketchfab.com/3d-models/gums-teeth-and-tongue-0540edd5362847bfbf28f984bcc3a037) | Desired natural crowns/gingiva/material reference | **Paid Standard asset**, Sketchfab API reports not free-downloadable; no use without appropriate rights |
| [Teeth 3D Print Model — Sketchfab](https://sketchfab.com/3d-models/teeth-3d-print-model-dcca1cb3f5b6466695a90547c3074bfb) | Desired bracket/wire polish reference | **Paid Standard asset**, not free-downloadable; license/permission needed before using actual mesh |
  
If founder contacts the artists, require a clear written grant covering **free use, modification, embedding and delivery to browser users, redistribution as compiled 3D assets, commercial SaaS use, attribution, and perpetual permitted use**, from the actual rights holder. A general reply saying “you can use it” may not cover all these uses.

## Candidate small implementation gates — do not start until founder approves pivot scope

1. **A — Architecture/feasibility proof:** choose two or more **licensed, locally packaged, independently movable crown+gingiva archetypes**. Fit approximate tooth arrangement on five test photo sets using no PHI; compare simple parametric-template alignment with the SJTU research baseline, then show practical success/failure rather than promised speed.
2. **B — Fast photo input and clinician verification:** drag/drop five image slots, basic quality checks, initial per-tooth arch placement; clinician confirms missing teeth, rotations, spacing/crowding, arch form and visible occlusion. Reject/show unknown rather than invent unseen structures. Measure correction burden.
3. **C — Professional 3D model and appliance controls:** polished cast-style tissue and crowns; tooth groups individually selectable; context-specific bracket choices and manual repositioning; NiTi/SS wire choices appear only after bracket review; no CAD/CAM precision claim.
4. **D — Mechanics and scenario comparison:** clinician selects power chain/coil spring/elastics or other in-scope mechanics to compare **illustrative planned tendencies**, not automatically predicted clinical results, forces or exact treatment timing.
5. **E — Integrated clinician QA:** test on multiple legitimately sourced photo sets, check fit/teeth count/selection, approval, saved-case privacy, 320–1440px responsiveness, no horizontal overflow, no dead styles, no costed external dependency; redefine and conduct actual photo-first closed alpha.

**First feasibility pass is the pivotal decision.** If automatic fitting is too slow or inaccurate, ship a fast assisted-fit tool only if clinician correction remains effortless; otherwise do not claim a one-click reconstruction product.

## Technical and clinical guardrails

- Retain React/Vite/Three.js/PWA and existing UI strengths where appropriate; rework old scanner-dependent features **at source** only after go/no-go.
- No new style layers, `!important`, hidden obsolete components, inline blocks or third-party required 3D API.
- Photo inference may estimate **visible** dental setup; it cannot recover root position, bone, exact interproximal/occlusal geometry or biologic motion. Simple geometry and collision constraints remain important internally; avoid fake clinical precision in displayed millimetres/timelines.
- Clinical stages are not automatically real-world outcomes. Keep orthodontist approval and clear presentation of assumptions. Review intended-use and medical-software/privacy implications before handling real patient information or marketing this as clinical decision support.
- Use authorized synthetic or de-identified test photos initially. No patient images sent to Gemini or external services by default; clarify lawful clinical processing, consent and retention before real usage.
- Formal clinician alpha remains **pending**; founder is first orthodontic clinician tester once photo-first prototype passes feasibility.

## Handoff

**Task 4 approved. No automatic implementation of old Task 5.** The next step is a founder decision on this candidate identity and the **small feasibility proof**; only then freeze the replacement MVP scope and start writing production code. The reference 3D model quality is part of photo-first architecture rather than a detached cosmetic replacement.
