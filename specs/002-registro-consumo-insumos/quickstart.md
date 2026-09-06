# Quickstart Validation: Registro y Consumo de Insumos

Purpose: a runnable script to prove this feature works end-to-end, mapped to the spec's user
stories, edge cases, and clarifications. Validation guide only — implementation lives in
`tasks.md` and the implementation phase.

## Prerequisites

- Local dev environment set up per `001-project-setup-local-dev`'s README (clone, install, run).
- A Supabase user id to attribute movements to (research.md's authenticated-identity dependency) —
  for this quickstart, create a test user in the Supabase dev project's dashboard and use its
  `id`, since no sign-in UI exists yet.

## Scenario 1 — Registrar un lote nuevo (User Story 1, FR-001/002/003, SC-001)

1. Abrir el formulario de registro. Confirmar que la cámara no se activa (no hay prompt de
   permiso de cámara al abrir).
2. Buscar un insumo por texto. Si no existe, crear uno nuevo sin salir del formulario (FR-003).
3. Completar número de lote, fecha de caducidad, y cantidad. Confirmar.

**Expected outcome**: el lote queda guardado localmente de inmediato (visible sin recargar), en
menos de 30 segundos de interacción real, y sin haber tocado ningún control de escaneo.

## Scenario 2 — Consumo con FEFO automático (User Story 2, FR-006, Acceptance Scenario 2)

1. Con un insumo que tiene 2+ lotes de distinta fecha de caducidad, abrir el formulario de
   consumo y buscar ese insumo.
2. Confirmar una cantidad de consumo sin elegir lote manualmente.

**Expected outcome**: el lote con la fecha de caducidad más próxima es el que se descuenta.

## Scenario 3 — Rechazo de sobreconsumo (FR-007, SC-003)

1. Intentar consumir una cantidad mayor a la disponible en el lote seleccionado.

**Expected outcome**: la operación se rechaza con un mensaje explícito; el stock del lote no
cambia.

## Scenario 4 — Validación de cantidad decimal por unidad (FR-016)

1. Registrar/consumir un insumo cuya unidad de medida sea `mL` con una cantidad decimal (p. ej.
   `2.5`). Debe aceptarse.
2. Registrar/consumir un insumo cuya unidad sea `pieza` con una cantidad decimal (p. ej. `2.5`).
   Debe rechazarse con un mensaje claro.

## Scenario 5 — Escaneo opcional con fallback (User Story 3, FR-008/009/010/011)

1. Abrir el formulario de registro o consumo. Confirmar que la cámara no está activa.
2. Pulsar "Escanear". Apuntar a un código de barras/DataMatrix conocido.

   **Expected outcome**: el insumo/lote correspondiente queda seleccionado, igual que por
   búsqueda manual.
3. Repetir, pero apuntar a un código no reconocido (o denegar el permiso de cámara).

   **Expected outcome**: mensaje explícito; el formulario permite continuar por búsqueda manual
   sin reiniciarse.

## Scenario 6 — Corrección vía ajuste, nunca edición (FR-015)

1. Intentar editar o eliminar un movimiento ya guardado desde la interfaz.

   **Expected outcome**: no existe ninguna acción de editar/eliminar expuesta; la única forma de
   corregir es crear un nuevo movimiento de tipo `ajuste` referenciando el original.

## Scenario 7 — Sobregiro por sincronización concurrente (FR-014, spec Edge Cases)

1. Simular dos consumos offline del mismo lote (dos sesiones/dispositivos) cuyo total combinado
   supera el stock disponible.
2. Sincronizar ambos.

**Expected outcome**: ambos movimientos de consumo quedan guardados (ninguno se pierde ni se
revierte); el lote queda con `estado: 'revision'` y su stock derivado puede quedar negativo.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-001, FR-002, FR-003, SC-001 |
| 2 | User Story 2, FR-006 |
| 3 | FR-007, SC-003 |
| 4 | FR-016 |
| 5 | User Story 3, FR-008, FR-009, FR-010, FR-011 |
| 6 | FR-015 |
| 7 | FR-014, Edge Cases, Clarifications Q1 |
