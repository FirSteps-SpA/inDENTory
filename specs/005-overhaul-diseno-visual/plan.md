# Implementation Plan: Overhaul de Diseño Visual

**Branch**: `005-overhaul-diseno-visual` | **Date**: 2026-09-09 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-overhaul-diseno-visual/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Restyle the four existing screens (Login, Registrar, Consumir, Alertas) to the visual direction
already approved by the user in a mockup canvas (teal palette, Manrope typography, card/badge/chip
components, a unified header and bottom navigation) — a presentation-only change with zero impact
on any flow, validation, copy, or role restriction already specified in features 002-004 (spec
FR-002). The header and bottom nav, currently inlined per-screen in `App.tsx`, are extracted into
two shared components so the "visually identical across screens" requirement (FR-004) is
structurally guaranteed rather than maintained by convention. A small set of shared presentational
primitives (`Card`, `Badge`, `IconField`, `TouchButton`) absorb the repeated card/badge/input
patterns the mockup established, each baking in the ≥48px touch target (Constitution III, FR-003).
Typography (Manrope) is self-hosted rather than loaded from a live Google Fonts CDN, so it stays
available fully offline (Constitution I) and is precached by the existing PWA service worker.

## Technical Context

**Language/Version**: TypeScript (React 19) on Node.js ≥20 (LTS) — unchanged project scaffold

**Primary Dependencies**: `@fontsource/manrope` (new — self-hosted Manrope webfont files, no
runtime API surface); everything else reuses the existing stack (React, Tailwind CSS v4 via
`@tailwindcss/vite`, Zustand, Dexie, Supabase) — no substitution, one small additive dependency

**Storage**: N/A — no new persisted entity, table, or column. The one new piece of displayed
information this feature is allowed to add (spec Clarifications, FR-002a — "vida útil restante
estimada") is computed at render time from `Lote.fechaCaducidad`, already persisted since feature
002; nothing new is written to Dexie or Supabase.

**Testing**: Vitest + React Testing Library (existing project setup) — every existing test in
`tests/unit/` and `tests/integration/` must keep passing unmodified (spec SC-003), since this
feature must not change any accessible label, button text, error/success copy, or ARIA role those
tests already assert against. No new automated visual-regression tooling is introduced; visual
consistency (SC-001, SC-004) is validated manually per `quickstart.md`.

**Target Platform**: Same installable PWA target as the rest of the project (touch/mobile-first
browsers, gloved use per Principle III)

**Project Type**: Single frontend web project — no backend change; Supabase remains untouched by
this feature

**Performance Goals**: No measurable regression in initial load size from icons (hand-drawn inline
SVG, not an icon-library dependency) or the self-hosted font subset (only the weights actually used
— 400/500/700/800 — are bundled)

**Constraints**: Every restyled interactive element MUST keep the existing ≥48px touch target
(spec FR-003); no existing label, button text, error/success message, or ARIA role may change
(spec FR-002, FR-007, SC-003) — where the approved mockup's illustrative copy differs from an
already-shipped string (e.g. the mockup's "Iniciar sesión"/"Correo electrónico" vs. the shipped
"Ingresar"/"Correo"), the shipped string wins verbatim; typography must render correctly with the
device fully offline (Constitution I), ruling out a live Google Fonts `<link>`

**Scale/Scope**: 6 existing components restyled in place (`LoginForm`, `RegistroForm`,
`SearchPicker`, `ScanButton`, `ConsumoForm`, `AlertasView`), 2 new shared shell components
(`AppHeader`, `BottomNav`) factored out of `App.tsx`'s current inline markup, 4 new shared UI
primitives (`Card`, `Badge`, `IconField`, `TouchButton`), one new inline icon set (~15 icons),
one design-token extension to `src/styles/index.css`, and a PWA identity update (favicon, manifest
icons, theme color) — no new screens, stores, or backend schema

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Offline-First por Diseño | PASS | Manrope is self-hosted via `@fontsource/manrope` (bundled, precached by the existing service worker) instead of a live Google Fonts CDN link — typography renders identically with the device offline, same as every other asset today. |
| II. Estado Reactivo Local con Zustand | N/A (not touched) | This feature only restyles presentation components; it reads the same Zustand stores (`inventoryStore`, `alertasStore`, `authStore`) exactly as before, with no new state. |
| III. Interfaz Táctil para Entornos Clínicos | PASS | This IS the principle's direct beneficiary: the new `TouchButton`/`IconField` primitives bake the ≥48x48px minimum into one place instead of relying on every call site remembering the `touch-target` class (FR-003, SC-002). |
| IV. Trazabilidad y Alertas de Inventario | PASS | FR-005 requires the alert urgency states from spec 004 stay visually distinguishable; no alert calculation or data changes — only how the already-computed result is displayed. |
| V. Búsqueda Manual Ágil como Flujo Primario | PASS | `SearchPicker`/`ScanButton` keep manual search as the immediate default and scanning as an explicit, secondary action — restyled only, behavior and activation order unchanged (FR-002). |
| VI. Control Multi-Usuario | PASS | FR-006 explicitly forbids changing which controls are visible per role; `AlertasView`'s admin-only sections keep the exact same `usuario.rol === 'administrador'` gate, just restyled. |
| Pila Tecnológica Obligatoria | PASS (one documented addition) | `@fontsource/manrope` is additive, not a substitution of any mandated technology — it exists solely to keep the already-approved typography choice available offline (Principle I), a stronger fit than the alternative (a live CDN font link). No icon library, CSS framework, or state library is added. |

Result: **PASS** — no violations to justify in Complexity Tracking.

**Post-Phase 1 re-check**: research.md's font/icon/component decisions and data-model.md's
"no new entities" confirmation don't change any row above. Result: **PASS**.

## Project Structure

### Documentation (this feature)

```text
specs/005-overhaul-diseno-visual/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
inDENTory/
├── index.html                              # <link>/meta additions: theme-color, self-hosted font stylesheet import point
├── vite.config.ts                          # VitePWA manifest: theme_color/background_color/icons updated to new palette
├── public/
│   ├── favicon.svg                         # Replaced: new mark, new primary teal
│   └── icons/icon-192.png, icon-512.png    # Replaced: same mark at PWA install-icon sizes
├── src/
│   ├── styles/
│   │   └── index.css                       # Extended: Tailwind v4 `@theme` block (color tokens, font-family), plus the self-hosted font's CSS import
│   ├── lib/
│   │   └── dateMath.ts                     # New: shared UTC-safe day-difference helper, extracted from features/alertas/lib/caducidad.ts (data-model.md)
│   ├── components/
│   │   ├── icons/
│   │   │   └── index.tsx                   # New: hand-drawn inline SVG icon set (stroke-based, matches the approved mockup's style)
│   │   └── ui/
│   │       ├── Card.tsx                    # New: shared rounded-card container
│   │       ├── Badge.tsx                   # New: shared status pill (variant: success/warning-30/urgent-7/urgent-1/danger/neutral)
│   │       ├── IconField.tsx               # New: label + icon + input wrapper, ≥48px built in
│   │       └── TouchButton.tsx             # New: shared button (variant: primary/secondary/ghost), ≥48px built in
│   ├── app/
│   │   ├── App.tsx                         # Restyled: delegates header/nav to the two new components below
│   │   ├── AppHeader.tsx                   # New: logo, "Gabinete" pill, sync indicator, avatar — reused by every authenticated screen (FR-004)
│   │   └── BottomNav.tsx                   # New: the 3-tab Registrar/Consumir/Alertas navigation (FR-004)
│   └── features/
│       ├── auth/
│       │   └── LoginForm.tsx               # Restyled only — same fields, labels, copy, behavior (FR-002/FR-007)
│       ├── insumos/components/
│       │   ├── RegistroForm.tsx            # Restyled only
│       │   ├── SearchPicker.tsx            # Restyled only
│       │   ├── ScanButton.tsx              # Restyled only
│       │   └── ConsumoForm.tsx             # Restyled only
│       └── alertas/components/
│           └── AlertasView.tsx             # Restyled only
└── tests/                                   # Unchanged — every existing assertion must still pass (SC-003)
```

**Structure Decision**: Extends the existing single-frontend structure — no new top-level
directories beyond two small, purely presentational additions: `src/components/icons/` and
`src/components/ui/` (this project's first shared UI-primitive layer; every prior feature inlined
Tailwind classes per file, which this redesign's own requirements — FR-004's "visually identical"
header/nav, FR-003/SC-002's ≥48px everywhere — make worth factoring out). `AppHeader.tsx` and
`BottomNav.tsx` live in `src/app/` alongside `App.tsx`, since they're app-shell chrome, not a
feature. No `src/features/*/lib/` module changes: every business-logic file from specs 002-004 is
untouched, consistent with this feature being presentation-only.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No violations — table intentionally omitted.
