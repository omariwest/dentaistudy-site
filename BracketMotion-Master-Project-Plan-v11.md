# BracketMotion — Master Project Plan v11

> **Status:** Active build  
> **Version:** v11.0  
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

### Conversion rule

The landing page presents **exactly two install choices**:
- Windows
- macOS

**No “Open in browser” CTA.**

### Demo rule

Until the product is working, the hero demo area stays **empty**.

Later it becomes a short polished explanatory/product video.

## Visual system

External references:
1. Notion — restraint / whitespace / clarity
2. Stripe — hierarchy / selective accent / product presentation

Internal sources:
1. UIORI — primary
2. DentAIstudy — secondary

Palette:
- `#111827` ink
- `#FFFFFF` white
- `#F8FAFC` background
- `#52525B` muted
- `#71717A` subtle
- `#E4E4E7` border
- `#6D4CF5` accent
- `#5936D8` accent hover

Typography: Inter.

Responsive rule: desktop above 1024px; compact tablet/mobile behavior at 1024px and below; ~44px minimum touch targets.

## Legal / clinical rules

- Clinician remains responsible for diagnosis and treatment decisions.
- 3D movement is planned visualization, not guaranteed biological prediction.
- AI is clinician-reviewed decision support, not an autonomous treatment planner.
- Users must have lawful authority to upload patient data.
- User-uploaded case data remains the user's content; BracketMotion receives only the processing rights needed to provide the service.
- Vercel, Supabase and OpenAI API are identified as intended service providers.
- BracketMotion does not sell patient/account data.
- Clinical rules may be informed by established orthodontic literature including *Contemporary Orthodontics* and peer-reviewed sources.
- Reference to books, authors, companies or products does not imply affiliation, sponsorship or endorsement.
- Copyrighted textbooks are not redistributed as the public AI knowledge base.
- Generic appliance visuals do not imply manufacturer affiliation.
- No unsupported regulatory-clearance claim.

## Locked technology

- React
- TypeScript
- Vite
- CSS
- Three.js / React Three Fiber later
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

## Public-site build — 4 review gates

### Task 1 — Foundation + visual skeleton
- [x] Build foundation.
- [x] Publish preview.
- [x] User approved.

### Task 2 — Header + hero refinement
- [x] Refine header/hero.
- [x] Finalize install controls.
- [x] Publish preview.
- [x] User approved.

### Task 3 — Complete landing page
- [x] Case → Plan → Mechanics → Movement strip.
- [x] Final install CTA.
- [x] Minimal footer.
- [x] Responsive/accessibility pass.
- [x] Publish preview.
- [x] User approved.

### Task 4 — Complete legal pages + public-site finish
- [x] Complete Privacy Policy.
- [x] Complete Terms of Use.
- [x] Complete Clinical Disclaimer.
- [x] Add real direct URL routing for legal pages.
- [x] Keep shared header/footer consistent.
- [x] Add legal-page responsive styling.
- [x] Deploy and verify route configuration/build.
- [ ] User approves completed public site.

## After public site

1. Freeze exact clinical V1 scope.
2. Map clinical references.
3. Build clinical app shell.
4. Build first 3D proof of concept.
5. Add appliances/stages/mechanics.
6. Add clinical records + controlled AI.
7. Add Supabase backend.
8. Validate → beta → free V1.

## Current task

**Task 4 — Complete legal pages + public-site finish.**

Implementation and deployment are complete. Wait for user approval before closing the public-site phase.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.


### Task 4 preview

- Landing: https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/
- Privacy: https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/privacy
- Terms: https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/terms
- Clinical Disclaimer: https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app/clinical-disclaimer
- Verified Vercel deployment: `dpl_9AvsKWLJUWCPq9Uon3qS3cvUFK9J`
