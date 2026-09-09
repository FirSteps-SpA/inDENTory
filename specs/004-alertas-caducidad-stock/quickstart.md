# Quickstart Validation: Alertas de Caducidad y Stock Mínimo

Purpose: a runnable script to prove this feature works end-to-end, mapped to the spec's user
stories, edge cases, and clarifications. Validation guide only — implementation lives in
`tasks.md` and the implementation phase.

## Prerequisites

- Local dev environment set up per `001-project-setup-local-dev`'s README, with features
  002 (`registro-consumo-insumos`) and 003 (`login-personal-clinico`) already applied — this
  feature reads their `insumos`/`lotes`/`movimientos` data and `usuarioActual.rol`.
- Run this feature's schema additions in the Supabase dev project's SQL Editor
  (`contracts/supabase-schema.md`): `alter table insumos add column stock_minimo numeric;` and
  the new `configuracion_alertas` table + its RLS policies.
- Two test accounts already provisioned per feature 003's onboarding: one `administrador`, one
  `personal`.
- At least one insumo with two or more lotes at different `fechaCaducidad` values, so caducidad
  tiers are distinguishable.

## Scenario 1 — Alerta de stock bajo (User Story 1, FR-001/002/003/004, SC-001)

1. Inicia sesión como `administrador`. Abre la pantalla de Alertas (nueva pestaña "Alertas" en el
   shell de la app, FR-013).
2. En el panel de configuración, asigna un stock mínimo a un insumo existente, mayor a su stock
   actual (visible en la propia pantalla).
3. Sin recargar, confirma que ese insumo aparece de inmediato en la lista de stock bajo.
4. Inicia sesión como `personal` en otro dispositivo/sesión y confirma que también ve esa misma
   alerta, pero sin ningún control para editar el stock mínimo.

**Expected outcome**: la alerta aparece para ambos roles en menos de 5 segundos desde que se abre
la pantalla (SC-001); solo `administrador` puede editar el umbral.

## Scenario 2 — Insumo sin stock mínimo configurado (FR-004)

1. Con un insumo que nunca tuvo stock mínimo asignado (`stockMinimo: null`), lleva su stock a
   cero mediante consumos.

**Expected outcome**: ese insumo nunca aparece en la lista de stock bajo, sin importar cuánto
baje su stock.

## Scenario 3 — Niveles de aviso de caducidad (User Story 2, FR-005/006/007, Clarifications)

1. Como `administrador`, confirma que los niveles de aviso muestran por defecto `30, 7, 1` días
   si nunca se ajustaron.
2. Registra (o usa) lotes con `fechaCaducidad` a aproximadamente 25, 5, y 0 días desde hoy, y otro
   ya vencido — los cuatro con stock disponible.
3. Abre la pantalla de Alertas.

**Expected outcome**: el lote a ~25 días aparece en el nivel `30`; el de ~5 días en el nivel `7`;
el de hoy (0 días) en el nivel `1`; el vencido aparece marcado como `caducado`, visualmente más
urgente que cualquier nivel (research.md's urgency-tier algorithm).

## Scenario 4 — Insumo que no caduca / lote agotado (FR-006, FR-008)

1. Confirma que ningún lote de un insumo marcado `caduca: false` (feature 002, FR-002b) aparece
   en la lista de caducidad, sin importar si tiene `fechaCaducidad`.
2. Agota por completo un lote con `fechaCaducidad` próxima (consumo total de su stock).

**Expected outcome**: ese lote agotado desaparece de la lista de caducidad, a pesar de su fecha.

## Scenario 5 — Lotes en revisión (User Story 3, FR-009/010, spec 002 FR-014)

1. Provoca el sobregiro descrito en `specs/002-registro-consumo-insumos/quickstart.md`'s
   Scenario 7 (dos consumos concurrentes sin conexión que superan el stock disponible).
2. Como `personal`, abre Alertas y confirma que el lote aparece listado con su stock
   negativo/sobregirado, sin ninguna acción para resolverlo.
3. Como `administrador`, registra el movimiento de ajuste correctivo (feature 002, FR-015) y
   luego marca el lote como resuelto.

**Expected outcome**: el lote desaparece de la lista de revisión y vuelve a `estado: 'activo'`
solo tras la acción del administrador; `personal` nunca tuvo el control para hacerlo.

## Scenario 6 — Todo sin conexión (Edge Cases, SC-005)

1. Desconecta la red del dispositivo.
2. Repite los Escenarios 1 y 3 (configurar un umbral, ver los niveles de caducidad) enteramente
   sin conexión.

**Expected outcome**: ambas alertas se calculan y muestran igual que con conexión, sin mensajes
de error ni de espera por red.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-001, FR-002, FR-003, FR-004, SC-001, Clarifications Q2 |
| 2 | FR-004 |
| 3 | User Story 2, FR-005, FR-006, FR-007, Clarifications Q1 |
| 4 | FR-006, FR-008 |
| 5 | User Story 3, FR-009, FR-010 |
| 6 | Edge Cases, SC-005 |
