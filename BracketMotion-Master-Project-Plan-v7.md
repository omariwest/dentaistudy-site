# BracketMotion — Master Project Plan v7

> **Status:** Active build planning  
> **Version:** v7.0  
> **Product:** BracketMotion  
> **Tagline:** *Plan the mechanics. See the movement.*

## Product

BracketMotion is a **free-first installable PWA for conventional fixed-appliance orthodontics**.

**Core promise:** Upload a case, compare treatment strategies, choose a plan, and visualize the mechanics stage by stage on the patient's own 3D dentition.

Locked: worldwide, scanner-agnostic, brand-neutral, mechanics-aware rather than exact biological prediction, controlled AI with clinician approval.

## Platform

### Public site

**Preferred domain:** `bracketmotion.com`

V1 pages only:
- `/` — landing page
- `/privacy`
- `/terms`
- `/clinical-disclaimer`

Contact appears in the footer; no separate contact page for V1. Preferred future address: `support@bracketmotion.com`.

### Clinical app

**Preferred:** `app.bracketmotion.com`

Contains authentication, cases, 3D viewer, diagnosis, treatment options, stages, mechanics, AI and saved work.

### Install model

- PWA only for V1.
- No `.exe` / `.dmg`.
- Windows/macOS buttons guide the browser/PWA install flow.

## Public-site visual system — LOCKED

### Outside references

1. **Notion** — restraint, whitespace, black/white clarity, typography discipline.
2. **Stripe** — bold hierarchy, large typography, selective accent color, polished product presentation.

**LightForce is only a hero-composition reference:** a large product-first first viewport.

### Internal reusable sources

- **UIORI** — primary design-system source.
- **DentAIstudy** — secondary source for proven responsive/public components.

Do not invent a new component if one of these already solves the problem well.

### Palette

- Ink: `#111827`
- White: `#FFFFFF`
- Background: `#F8FAFC`
- Muted: `#52525B`
- Subtle: `#71717A`
- Border: `#E4E4E7`
- Accent purple: `#6D4CF5`
- Accent hover: `#5936D8`

Purple is an **accent only**: CTA, selected states, small highlights, focus rings, subtle product glow.

### Typography / responsiveness

- Inter.
- Large bold tight hero headings.
- Quiet body copy.
- Desktop nav above `1024px`.
- Compact tablet/mobile nav at `1024px` and below.
- ~44px minimum touch targets.

## Landing page structure — LOCKED

### Header

Minimal: BracketMotion wordmark + `Open app` + `Install`. Mobile/tablet uses the proven compact menu pattern.

### Hero

```text
BracketMotion

Plan the mechanics.
See the movement.

Short one-line explanation.

[Open BracketMotion] [Install]

        LARGE PRODUCT DEMO
```

V1 marketing demo = lightweight high-quality product video/loop, not a second heavy live 3D app.

### Supporting strip

**Case → Plan → Mechanics → Movement**

### Final CTA + footer

One final Open/Install action.

Footer only: Privacy · Terms · Clinical Disclaimer · support email · copyright.

No blog, pricing, FAQ, careers, resources or giant sitemap for V1.

## CSS / JS reuse rule — LOCKED

### CSS

Reuse/adapt UIORI + DentAIstudy for:
- tokens
- typography
- containers
- buttons
- header/mobile navigation
- spacing
- cards/surfaces
- breakpoints
- focus/accessibility states

BracketMotion gets its own component/namespaced CSS.

### JavaScript

Do **not** copy old page-specific vanilla JS directly. BracketMotion is React.

Rebuild the same proven behavior as React components/state. Reuse the design logic, not obsolete page wiring.

## Technology

Use: React, TypeScript, Vite, CSS, Three.js, React Three Fiber, PWA manifest/service worker, GitHub, Vercel, Supabase, OpenAI API.

Do not use for V1: Figma, Blender, C++, native desktop rendering stack, required VS Code workflow, AI-controlled biomechanics.

## 3D / AI summary

- TypeScript mechanics engine decides stages, target transforms and mechanics rules.
- Three.js renders the result.
- OpenAI proposes structured clinical strategies; clinician approval is required.
- Prototype model: openly licensed OrganUI Teeth / BodyParts3D-derived model.
- Real cases later upload STL/PLY.

## Reference rules

### Public UI

Stripe + Notion + UIORI + DentAIstudy only unless a specific problem requires another reference.

### Clinical app/workflow

SureSmile, LightForce/LightPlan, 3Shape Ortho, OnyxCeph, Maestro 3D, OrganUI/Three.js docs.

### Clinical mechanics

Contemporary Orthodontics / Proffit + selected validated literature.

## Development

Temporary repo: `omariwest/dentaistudy-site`  
Branch: `bracketmotion`  
`main` untouched.  
Preview: Vercel.

# Live task tracker

## Phase 0 — Direction

- [x] Conventional fixed-appliance planning.
- [x] Everyday orthodontists globally.
- [x] Free-first V1.
- [x] Brand-neutral.
- [x] Mechanics-aware planned movement.
- [x] Controlled source-based AI.

## Phase 1 — Identity / architecture

- [x] Select BracketMotion.
- [x] Prefer `bracketmotion.com`; purchase deferred.
- [ ] Formal trademark clearance before launch.
- [x] Choose PWA.
- [x] Lock technical stack.
- [x] Deterministic TypeScript mechanics engine.
- [x] AI remains in V1; OpenAI API.
- [x] Choose open prototype model.

## Phase 2 — Public-site identity / shell

- [x] Stripe + Notion external references locked.
- [x] UIORI + DentAIstudy internal style sources locked.
- [x] Palette locked.
- [x] Inter + typography direction locked.
- [x] 1024px responsive-nav transition locked.
- [x] Minimal public page list locked.
- [x] Product-first hero locked.
- [x] CSS reuse / React behavior policy locked.
- [ ] Build landing page on `bracketmotion` branch.
- [ ] Build privacy page.
- [ ] Build terms page.
- [ ] Build clinical disclaimer page.
- [ ] Publish Vercel preview.
- [ ] Inspect/refine together.

## Phase 3 — Freeze clinical V1 scope

- [ ] Exact must-have clinical features.
- [ ] Explicit not-now clinical features.
- [ ] First supported case types.
- [ ] Success criteria for free V1.

## Phase 4 — Clinical reference map

- [ ] SureSmile.
- [ ] LightForce.
- [ ] 3Shape.
- [ ] OnyxCeph.
- [ ] Maestro 3D.
- [ ] OrganUI / Three.js.
- [ ] Copy / improve / avoid sheet.

## Phase 5 — App shell

- [ ] Top toolbar.
- [ ] Left case/stage panel.
- [ ] Center 3D viewport.
- [ ] Right mechanics panel.
- [ ] Bottom treatment timeline.

## Phase 6 — 3D proof of concept

- [ ] React + TypeScript + Vite.
- [ ] Three.js / React Three Fiber.
- [ ] PWA foundation.
- [ ] Segmented demo mouth.
- [ ] Rotate / zoom / pan.
- [ ] Select one tooth.
- [ ] Move / rotate one tooth.
- [ ] Animate initial → target.

## Phase 7 — Appliance visualization

- [ ] Bracket.
- [ ] Archwire.
- [ ] Power chain.
- [ ] Coil spring.
- [ ] Elastics.
- [ ] Closing loop.

## Phase 8 — Treatment stages / mechanics

- [ ] Stage engine.
- [ ] Playback.
- [ ] Simplified mechanics rules.
- [ ] Tipping/translation tendencies.
- [ ] Reciprocal anchorage.
- [ ] Mechanics warnings.

## Phase 9 — Clinical records + AI

- [ ] Patient/case form.
- [ ] Problem list.
- [ ] Cephalometric/Bolton/occlusion inputs.
- [ ] Approved-source knowledge base.
- [ ] OpenAI integration.
- [ ] Primary + alternative strategy.
- [ ] Clinician approval.
- [ ] Approved plan → 3D stages.

## Phase 10 — Backend

- [ ] Configure Supabase.
- [ ] Authentication.
- [ ] Case/model storage.
- [ ] Plan/stage storage.
- [ ] Autosave.

## Phase 11 — Safety / validation

- [ ] Regulatory review.
- [ ] Source/licensing review.
- [ ] Standard case testing.
- [ ] Small orthodontist beta group.

## Phase 12 — Launch

- [ ] Production repository.
- [ ] Re-check/purchase domain.
- [ ] Production deployment.
- [ ] PWA install flows.
- [ ] Closed beta.
- [ ] Free public V1.

## Current task

**NEXT: Build the BracketMotion public landing page and legal-page shell on the `bracketmotion` branch, publish a Vercel preview, then inspect/refine together.**

After that: **freeze clinical V1 scope → clinical reference map → app shell → 3D proof of concept.**

## Rule

1. Open this file each session.
2. Work from the current task.
3. Mark only completed work `[x]`.
4. Keep this file concise.
5. Detailed research stays outside this file.
