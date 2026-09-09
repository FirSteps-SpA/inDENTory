# Phase 1 Data Model: Overhaul de Diseño Visual

## No new entities

This feature adds no Dexie table, Supabase table/column, or field to any entity defined in specs
002-004 (`Insumo`, `Lote`, `Movimiento`, `UsuarioActual`, `ConfiguracionAlertas`). It is a
presentation-only change (spec FR-002); every screen keeps reading and writing exactly the data
it already did.

## The one new derived display value (FR-002a)

Spec Clarifications' FR-002a permits showing information computed at render time from data that
already exists, provided nothing new is persisted. This feature introduces exactly one such value:

- **Vida útil restante estimada** — shown under the fecha de caducidad field on the Registrar
  lote form, for insumos where `Insumo.caduca` is `true`. Computed purely from the in-progress
  form's `fechaCaducidad` value (not yet a saved `Lote`) and the current date, expressed in whole
  months (`Math.round(diasRestantes / 30)`), reusing the exact same UTC-safe day-difference logic
  already implemented in `src/features/alertas/lib/caducidad.ts`'s `diasEntre` (feature 004) —
  extracted as a small shared date-math helper rather than duplicated, since two independent
  implementations of the same UTC-vs-local-timezone-sensitive calculation is exactly the class of
  bug feature 004 already had to fix once (its `diasEntre` timezone bug, `America/Santiago`
  UTC-3).
- Nothing about this value is stored: it recomputes on every keystroke in the fecha de caducidad
  field, and disappears if the field is cleared or the insumo doesn't caduca.

## Component contracts (presentation-only, no persisted shape)

The new shared UI primitives introduced by this feature (`Card`, `Badge`, `IconField`,
`TouchButton`, `AppHeader`, `BottomNav`) are documented as prop/variant contracts in
`contracts/design-system.md`, not here — they carry no data model of their own, only display
already-loaded data passed in as props.
