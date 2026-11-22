# BracketMotion — Master Project Plan v8

> **Status:** Active build  
> **Version:** v8.0  
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

The public landing page presents **exactly two install choices**:
- Windows
- macOS

**No “Open in browser” CTA.**

The PWA may technically run in a browser, but the public marketing funnel pushes installation so BracketMotion remains visible on the clinician's computer.

### Demo rule

During UI construction the hero demo area stays an **empty placeholder box**.

After the product is working, replace it with a short polished explanatory/product video. Do not spend time producing the demo before the product exists.

## Visual system

External public-site references:
1. Notion — restraint / whitespace / clarity
2. Stripe — hierarchy / selective accent / product presentation

Internal reusable sources:
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

## CSS / React rule

Reuse proven UIORI/DentAIstudy tokens, spacing, buttons, breakpoints, focus states and responsive principles.

Do not directly copy old vanilla page JS. Reimplement behavior with React components/state.

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
- BracketMotion frontend isolated in: `/bracketmotion-site`
- `main` remains untouched

Preview/deployment: Vercel.

## Public-site build — 4 review gates

### Task 1 — Foundation + visual skeleton
- [x] Create isolated React + TypeScript + Vite app.
- [x] Add locked BracketMotion design tokens.
- [x] Add responsive base.
- [x] Add basic wordmark/header shell.
- [x] Add rough hero skeleton.
- [x] Add exactly Windows + macOS install buttons.
- [x] Remove browser-open CTA completely.
- [x] Add empty demo placeholder.
- [ ] Publish Task 1 Vercel preview.
- [ ] User approves Task 1.

### Task 2 — Header + hero refinement
- [ ] Finalize header proportions/responsive behavior.
- [ ] Finalize hero typography/copy/spacing.
- [ ] Finalize Windows/macOS button styling.
- [ ] Keep demo box intentionally empty.
- [ ] Publish preview.
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
2. Map clinical references: SureSmile / LightForce / 3Shape / OnyxCeph / Maestro / OrganUI.
3. Build clinical app shell.
4. Build first 3D proof of concept.
5. Add appliances/stages/mechanics.
6. Add clinical records + controlled AI.
7. Add Supabase backend.
8. Validate → beta → free V1.

## Current task

**Task 1 — Foundation + visual skeleton.**

Stop after Task 1 and wait for user approval.

## Rule

1. Keep this file concise.
2. Update it in GitHub every approved step.
3. Mark only work that truly exists.
4. Detailed research stays outside this file.
