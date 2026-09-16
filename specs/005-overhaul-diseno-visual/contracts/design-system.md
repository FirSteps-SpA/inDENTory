# Contract: Design Tokens & Shared UI Components

This is the contract future visual changes must keep in sync — the same "future changes must
keep this in sync" convention as features 002-004's Supabase schema contracts, applied here to
the design system this feature introduces.

## Design tokens (`src/styles/index.css`, Tailwind v4 `@theme`)

```css
@theme {
  /* Neutral */
  --color-bg: #F5F8FA;
  --color-surface: #FFFFFF;
  --color-border: #E2E8F0;
  --color-text: #0F172A;
  --color-text-muted: #64748B;
  --color-text-faint: #94A3B8;

  /* Primary (brand) */
  --color-primary: #0E5C73;
  --color-primary-dark: #0A4757;
  --color-primary-soft: #E6F4F3;

  /* Alert semantics (spec 004's states — one color pairing per state, never text-only).
     Every *-text token is verified ≥4.5:1 (WCAG AA, normal text) against its paired *-bg —
     see research.md's "Verifying alert color contrast (WCAG AA)" for the computed ratios. */
  --color-success-dot: #22A559;
  --color-success-text: #15803D;  /* 7.1:1 on success-bg */
  --color-success-bg: #E7F6EC;
  --color-warning-30-text: #92400E; /* caducidad: nivel 30 días — 6.5:1 on warning-30-bg */
  --color-warning-30-bg: #FFF4E0;
  --color-urgent-7-text: #9A3412;   /* caducidad: nivel 7 días — 6.2:1 on urgent-7-bg */
  --color-urgent-7-bg: #FFE8D2;
  --color-urgent-1-text: #991B1B;   /* caducidad: nivel 1 día — 6.8:1 on urgent-1-bg */
  --color-urgent-1-bg: #FEE2E2;
  --color-danger: #C4291D;       /* caducado / stock bajo — 5.7:1 on danger-bg, dark enough to
                                     also work as solid-fill + white text if ever needed */
  --color-danger-dot: #E5484D;
  --color-danger-bg: #FDEAEA;

  --font-sans: "Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
}
```

`--color-*` tokens generate the matching `bg-*`/`text-*`/`border-*` utilities automatically
(Tailwind v4). `--font-sans` overrides the default sans stack app-wide — no component needs to
opt in individually.

**Font import** (same file, above the `@theme` block): `@import '@fontsource/manrope/400.css';`
plus the `500`/`700`/`800` weight files actually used — never the full unsubset package.

## Shared components (`src/components/ui/`, `src/app/`)

| Component | Props | Notes |
|---|---|---|
| `Card` | `children`, `className?`, `as?` (polymorphic — defaults to `div`, can render `button`/`form`/etc.) | Base rounded (14px), bordered, `bg-surface` container. Every card-shaped element in the redesign (insumo rows, alert rows, form sections) renders through this, not a one-off `div`. |
| `Badge` | `variant: 'success' \| 'warning-30' \| 'urgent-7' \| 'urgent-1' \| 'danger' \| 'neutral'`, `children` | One place mapping each spec-004 alert state to its color pairing (FR-005). Every variant renders its light `-bg` with its matching dark `-text` color — never a solid fill with white text (only `danger`'s `#C4291D` is dark enough for that to also pass WCAG AA, but for consistency every variant uses the same light-bg/dark-text pattern). Adding a 7th state later means editing this component, not hunting every call site. |
| `IconField` | `label`, `icon` (an icon from `src/components/icons/`), `htmlFor`, `hint?`, `error?`, `children` (the `<input>`/`<select>`) | Label + icon + input wrapper; the wrapping element enforces `min-height: 48px` (FR-003) so no call site can accidentally ship a sub-48px field. |
| `TouchButton` | `variant?: 'primary' \| 'secondary' \| 'ghost'` (default `'primary'`), plus standard `<button>` props | `min-height: 48px; min-width: 48px` built in (FR-003/SC-002) — replaces the current pattern of remembering to add the `touch-target` class per button. |
| `AppHeader` (`src/app/AppHeader.tsx`) | none required — reads `useAuthStore` for the user's name/role-derived initials and `useAppStore().isBackendConnected` for the connection dot | Renders the logo mark, "Gabinete" pill, a binary sync/connection indicator (connected vs. not — reusing the *existing* `appStore.isBackendConnected` flag from feature 001; **not** a pending-operations counter, which spec Clarifications explicitly excludes), and an avatar-initials chip. Identical on every authenticated screen (FR-004). |
| `BottomNav` (`src/app/BottomNav.tsx`) | `active: 'registro' \| 'consumo' \| 'alertas'`, `onChange: (v) => void` | Purely presentational — `App.tsx` keeps owning the `vista` state exactly as it does today; this component only renders the 3 tabs and calls back on tap. |

## Icon set (`src/components/icons/index.tsx`)

One named export per icon, each a stroke-based (`stroke-width: 1.75`) inline SVG accepting a
`size?: number` (default `20`) and `className?` prop, `currentColor` for `stroke` so the caller
controls color via Tailwind's `text-*` utilities:

`Tooth`, `Search`, `Scan`, `Calendar`, `Hash`, `Truck`, `Bell`, `Package`, `PackageMinus`, `Check`,
`AlertTriangle`, `ChevronDown`, `Plus`, `Minus`, `Mail`, `Lock`.

No icon library dependency (research.md) — this is the complete set; a future feature needing a
new icon adds one function here, following the same stroke-width/viewBox convention.

## Copy contract

Every restyled component keeps its exact existing label text, button text, placeholder, and
error/success message string — cross-referenced against the current source, not the mockup
canvas, wherever the two disagree (research.md's "Reconciling the mockup's illustrative copy"
decision). The authoritative copy for each screen is whatever is already in:

- `src/features/auth/LoginForm.tsx` ("Correo", "Contraseña", "Ingresar"/"Ingresando…")
- `src/features/insumos/components/RegistroForm.tsx` / `SearchPicker.tsx` / `ScanButton.tsx`
- `src/features/insumos/components/ConsumoForm.tsx`
- `src/features/alertas/components/AlertasView.tsx`
