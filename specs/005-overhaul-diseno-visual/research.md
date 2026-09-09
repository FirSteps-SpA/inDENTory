# Phase 0 Research: Overhaul de Diseño Visual

No open `NEEDS CLARIFICATION` markers remain (the spec's own clarification session already
resolved the one real scope ambiguity — FR-002a's boundary on new derived content). The decisions
below cover the remaining implementation-shape questions needed before Phase 1 design.

## Where design tokens live

- **Decision**: A Tailwind v4 `@theme` block added to `src/styles/index.css` (color tokens, font
  family), sitting alongside the project's existing `@utility touch-target` declaration in that
  same file.
- **Rationale**: Tailwind v4 (already in use via `@tailwindcss/vite`) generates utility classes
  directly from `@theme` custom properties — `--color-primary: #0E5C73` yields `bg-primary`/
  `text-primary`/`border-primary` automatically. `tailwind.config.ts` already documents itself as
  existing only because v4 auto-detects content, with tokens meant to live in CSS — this decision
  just fills that documented, currently-empty slot rather than inventing a second place for
  tokens.
- **Alternatives considered**: A separate TS/JSON token file consumed as inline `style` props —
  rejected, it would abandon Tailwind's utility-class ergonomics that every existing component
  already uses, for zero benefit (nothing here needs runtime-computed styles). Re-populating
  `tailwind.config.ts`'s `theme.extend` (the pre-v4 pattern) — rejected, redundant with and
  overridden by v4's CSS-first `@theme`, and inconsistent with that file's own comment.

## Self-hosting the approved typography (Manrope)

- **Decision**: `@fontsource/manrope` (a small npm package that ships the actual Manrope `.woff2`
  files plus a CSS file with `@font-face` declarations), imported once in `src/styles/index.css`,
  for the four weights the design uses (400/500/700/800).
- **Rationale**: Constitution Principle I requires the app to function fully offline at all
  times. A live `<link>` to `fonts.googleapis.com` (the mockup canvas's own approach, constrained
  by that sandbox's CSP) would make the app's *approved* typography a network-dependent asset —
  on a slow or offline connection the page would silently fall back to a system font, which is a
  visual regression, not just a degraded-but-acceptable state, for a design the user just signed
  off on. `@fontsource/manrope`'s files are plain build output the existing `vite-plugin-pwa`
  service-worker precache already covers like any other bundled asset, so the font is available
  offline the same way everything else in this PWA already is.
- **Alternatives considered**: A `<link>` to Google Fonts' CDN — rejected for the offline reason
  above. Manually downloading and committing `.woff2` files with hand-written `@font-face` rules —
  rejected as unnecessary manual maintenance (wrong hinting/subsetting, license-file upkeep) when
  a maintained package does exactly this. Dropping the custom font for a system-font stack —
  rejected, it would silently override a typography choice the user already approved in the
  mockup without being asked.

## Icon system

- **Decision**: A small hand-authored set of inline SVG icon components (~15: tooth mark, search,
  scan, calendar, hash, truck, bell, package, package-minus, check, alert-triangle, chevron-down,
  plus, minus, mail, lock) in `src/components/icons/index.tsx`, stroke-based at a consistent
  1.75px weight — matching the exact style already established in the approved mockup canvas.
- **Rationale**: ~15 fixed icons is well within hand-authoring range, keeps zero new runtime
  dependency (Pila Tecnológica Obligatoria — no substitution without justification), and
  guarantees the icons look exactly like the ones the user already approved rather than the
  closest match from a third-party set's own house style.
- **Alternatives considered**: `lucide-react` or `@heroicons/react` — rejected, adds a dependency
  for a fixed, small icon list this project will rarely extend, and neither ships this project's
  specific stroke weight/style out of the box (would still need per-icon prop tuning, eroding the
  dependency's own benefit).

## Extracting shared shell and UI-primitive components

- **Decision**: Extract `AppHeader` and `BottomNav` out of `App.tsx`'s current inline JSX into
  `src/app/AppHeader.tsx` / `src/app/BottomNav.tsx`, and introduce four small shared presentational
  components in `src/components/ui/`: `Card`, `Badge` (with a `variant` prop covering every alert
  state from spec 004 — success, warning-30, urgent-7, urgent-1, danger, neutral), `IconField`
  (label + icon + input, one place enforcing the ≥48px height), and `TouchButton` (variant:
  primary/secondary/ghost, same ≥48px guarantee).
- **Rationale**: This is the project's first shared UI-primitive layer — every prior feature
  (002-004) inlined Tailwind utility strings per component, which was fine when each screen had
  its own independent look. This feature's own requirements make that pattern actively risky:
  FR-004 requires the header/nav to be "visually identical" across three independently-edited
  screens (Registrar/Consumir/Alertas), which is fragile to keep true by convention across three
  separate files; FR-003/SC-002 requires *every* interactive element to keep its ≥48px minimum,
  which a shared `TouchButton`/`IconField` guarantees structurally instead of per-call-site.
  `Badge`'s variants also directly serve FR-005 (alert states distinguishable by color, not just
  text) by giving every urgency level exactly one place its color/icon pairing is defined.
- **Alternatives considered**: Keep inlining Tailwind strings per file, copy-pasting the
  header/nav markup into `RegistroForm`/`ConsumoForm`/`AlertasView` (matching how the mockup
  canvas itself duplicated that markup per artboard, which was fine there since a mockup canvas
  has no shared runtime) — rejected for the real app, where copy-pasted markup drifting out of
  sync across three files would directly violate FR-004 the first time only one of the three gets
  touched in a future change.

## Reconciling the mockup's illustrative copy with already-shipped text

- **Decision**: Wherever the approved mockup canvas uses different wording than an already-shipped
  label, button, or message (e.g. mockup "Iniciar sesión"/"Correo electrónico" vs. shipped
  "Ingresar"/"Correo"; mockup "Registrar lote en inventario" vs. shipped "Guardar lote"), the
  shipped string is kept verbatim. The mockup governs layout, color, iconography, and component
  shape — never copy where the two disagree.
- **Rationale**: Spec FR-002/FR-007/SC-003 require every existing label, button text, and
  error/success message to stay unchanged, specifically so the existing test suite (which queries
  by exact label/role/text in `tests/unit/auth/*`, `tests/integration/consumo.test.tsx`,
  `tests/integration/registro.test.tsx`) keeps passing without modification. The mockup was built
  before this codebase's exact copy was cross-checked, so treating it as a style reference rather
  than a copy source resolves the conflict without violating either artifact's intent.
- **Alternatives considered**: Adopt the mockup's copy and update the tests to match — rejected,
  directly contradicts spec SC-003 ("100% of existing automated tests keep passing without needing
  changes to their assertion logic").

## Verifying alert color contrast (WCAG AA)

- **Decision**: Every `Badge` variant renders its light `-bg` token with a dark, saturated
  `-text` token, computed to clear 4.5:1 (WCAG AA, normal text) against that background — never
  a solid-fill pill with white text, except `danger` (`#C4291D`), which is dark enough to pass
  either way. Computed ratios: success `#15803D` on `#E7F6EC` → 7.1:1; warning-30 `#92400E` on
  `#FFF4E0` → 6.5:1; urgent-7 `#9A3412` on `#FFE8D2` → 6.2:1; urgent-1 `#991B1B` on new token
  `#FEE2E2` → 6.8:1; danger `#C4291D` on `#FDEAEA` → 5.7:1.
- **Rationale**: The mockup canvas (built for a static preview, not accessibility-audited) used
  solid amber/orange fills with white text for the less-urgent caducidad tiers. Computing their
  actual contrast found real failures: white on `#F5A524` (30-day tier) → 2.04:1, white on
  `#F0862A` (7-day tier) → 2.58:1, white on `#EF4444` (1-day tier) → 3.76:1 — all below the 4.5:1
  normal-text threshold (the two most saturated even fail the 3.0:1 floor for large text/UI
  components). The equally-plausible alternative of reusing the same hue as both the light
  background and its own text (e.g. `#F5A524` text on `#FFF4E0` bg) is worse still — 1.87:1 —
  since a color and its own tint are, by construction, close in luminance. A distinctly *darker*
  text color per hue, verified against its specific background, is the only pairing in this
  palette family that clears AA.
- **Alternatives considered**: Keeping the mockup's solid-fill-plus-white-text pills — rejected,
  confirmed failing by direct calculation above. Reusing one hue for both text and background —
  rejected for the same reason. A single dark neutral (e.g. `--color-text`) for every variant's
  label instead of a per-hue dark shade — rejected, it would lose the "distinguishable by color
  alone" property FR-005 requires (every tier would read the same dark gray, with only the
  background tint differing, which is a weaker signal at a glance than a saturated colored
  label).

## PWA identity update scope

- **Decision**: Replace `public/favicon.svg` and the two manifest icon files
  (`public/icons/icon-192.png`, `icon-512.png`) with a mark using the new primary teal, and update
  `vite.config.ts`'s `VitePWA` manifest `theme_color`/`background_color` to match the new palette
  (`#0E5C73` / `#F5F8FA`).
- **Rationale**: Matches the spec's own Assumption that brand identity extends to how the app is
  perceived outside the page itself (browser tab, home-screen install icon) — the current favicon
  is an unrelated placeholder mark, not a deliberate brand choice worth preserving.
- **Alternatives considered**: Leave the existing favicon/manifest untouched — rejected per the
  spec's Assumption; a redesigned app with an unrelated old icon reads as unfinished.
