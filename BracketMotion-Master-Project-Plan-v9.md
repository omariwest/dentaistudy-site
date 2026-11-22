# BracketMotion — Master Project Plan v9

> **Status:** Active build  
> **Version:** v9.0  
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

Footer contact later: `support@bracketmotion.com`.

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
- [x] React + TypeScript + Vite app.
- [x] Locked design tokens.
- [x] Responsive base.
- [x] Wordmark/header shell.
- [x] Rough hero skeleton.
- [x] Exactly Windows + macOS install choices.
- [x] No browser-open CTA.
- [x] Empty demo placeholder.
- [x] Vercel preview.
- [x] User approved Task 1.

### Task 2 — Header + hero refinement
- [x] Finalize header proportions/responsive behavior.
- [x] Finalize hero typography/copy/spacing.
- [x] Finalize Windows/macOS button styling.
- [x] Add platform icons.
- [x] Keep demo box completely empty.
- [x] Publish Task 2 preview.
- [ ] User approves Task 2.

### Task 3 — Complete landing page
- [ ] Add Case → Plan → Mechanics → Movement strip.
- [ ] Add final install CTA.
- [ ] Add minimal footer.
- [ ] Responsive/accessibility pass.
- [ ] Publish preview.
- [ ] User approves Task 3.

### Task 4 — Legal shell + public-site finish
- [ ] Privacy page shell.
- [ ] Terms page shell.
- [ ] Clinical disclaimer page shell.
- [ ] Cross-page header/footer consistency.
- [ ] Final public-site QA.
- [ ] Publish preview.
- [ ] User approves public-site shell.

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

**Task 2 — Header + hero refinement.**

Implementation and preview are complete. Wait for user approval before Task 3.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.


### Task 2 preview

- Vercel: https://bracketmotion-preview-git-bracketmotion-amarsaaliomer-6121.vercel.app
- Verified deployment: `dpl_4XKrWsgGJcfe2LEgAdR8H3fYNVr1`
