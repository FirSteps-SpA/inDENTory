# Quickstart Validation: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

Purpose: guía ejecutable para validar esta feature de punta a punta, mapeada a las user stories y
criterios de éxito de la spec. Solo validación — la implementación vive en `tasks.md` y en la fase
de implementación.

## Prerequisites

- Entorno local de las specs 001-005 ya funcionando (`npm run dev`), con datos de ejemplo que
  incluyan: al menos un insumo caducado, uno próximo a caducar, uno con stock bajo su mínimo, uno
  en buen estado ("Ok"), y un insumo con varios lotes de distinta fecha de vencimiento.
- Sesión iniciada como cualquier usuario (esta spec no diferencia por rol).

## Scenario 1 — Ver el estado general al entrar (User Story 1, FR-003/FR-004, SC-001)

1. Abre la app con sesión iniciada.
2. Observa el resumen superior de la pantalla "Inventario" (pestaña por defecto).
3. Toca el indicador "Caducados/Próximos".

**Expected outcome**: el resumen muestra los conteos correctos de insumos caducados/próximos a
caducar y con stock bajo sin navegar a otra pantalla (SC-001); al tocar el indicador, el listado
se filtra automáticamente a esos insumos.

## Scenario 2 — Buscar y filtrar desde una sola pantalla (User Story 2, FR-005/FR-008, SC-002/SC-003)

1. Escribe el nombre de un insumo conocido en la barra de búsqueda.
2. Limpia el texto, selecciona una categoría con insumos, y además activa el filtro de estado
   "Bajo Stock".
3. Ajusta los criterios hasta que ninguna combinación tenga resultados.

**Expected outcome**: el listado se actualiza en tiempo real con cada criterio (paso 1); los tres
criterios se combinan correctamente — solo aparecen insumos que cumplen categoría + estado a la
vez (paso 2); aparece el estado vacío con la opción de limpiar filtros cuando no hay coincidencias
(paso 3, FR-012).

## Scenario 3 — Consultar el detalle completo (User Story 3, FR-010/FR-011, SC-005)

1. Toca la tarjeta del insumo que tiene varios lotes.
2. Confirma que se listan todos los lotes con su fecha de vencimiento y el stock total agregado.
3. Cierra el detalle.

**Expected outcome**: el detalle es de solo lectura (sin botones de editar/consumir/eliminar); al
cerrar, el listado conserva exactamente la búsqueda/filtros que estaban activos antes de abrirlo
(FR-011).

## Scenario 4 — Navegar entre las 4 secciones (User Story 4, FR-001/FR-002/FR-015)

1. Desde "Inventario", toca "Compras".
2. Toca "Alertas".
3. Toca "Más".

**Expected outcome**: "Inventario" es la pantalla por defecto al abrir la app; "Compras" muestra un
placeholder reconocible (no un error ni pantalla en blanco); "Alertas" muestra la pantalla ya
existente sin cambios; "Más" muestra las acciones puente "Registrar insumo" / "Consumir insumo",
cada una abriendo el formulario correspondiente sin cambios de comportamiento respecto a antes de
esta spec.

## Scenario 5 — Indicador de estado accesible (spec Clarifications, FR-009)

1. Con datos que cubran los 4 estados (Ok/Bajo Stock/Próximo a caducar/Caducado), inspecciona cada
   tarjeta en escala de grises (o con un simulador de daltonismo del navegador).

**Expected outcome**: cada estado sigue siendo distinguible sin depender del color — el ícono y la
etiqueta de texto ("Caducado", "Bajo Stock", etc.) alcanzan por sí solos.

## Scenario 6 — Funciona sin conexión (Constitution I, FR-013)

1. Con la app ya cargada una vez (assets precacheados), desconecta la red por completo.
2. Repite los Escenarios 1-3.

**Expected outcome**: resumen, búsqueda, filtros y detalle funcionan idénticamente sin conexión;
ninguna pantalla muestra error ni retraso por falta de red.

## Scenario 7 — No hay regresión de comportamiento existente (SC de continuidad)

1. Desde "Más", completa un registro de lote de principio a fin.
2. Desde "Más", completa un consumo de un insumo con varios lotes.
3. Corre la suite de pruebas existente: `npm run test`.

**Expected outcome**: ambos flujos se comportan exactamente igual que antes de esta spec (mismos
campos, validaciones, selección FEFO por defecto); `npm run test` pasa sin haber tocado ninguna
aserción de `tests/integration/registro.test.tsx` ni `tests/integration/consumo.test.tsx`.

## Scenario 8 — Verificación de calidad estándar

1. Corre `npm run lint`, `npm run test`, y `npm run build`.

**Expected outcome**: los tres terminan sin errores.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-003, FR-004, SC-001 |
| 2 | User Story 2, FR-005, FR-007, FR-008, FR-012, SC-002, SC-003 |
| 3 | User Story 3, FR-010, FR-011, SC-005 |
| 4 | User Story 4, FR-001, FR-002, FR-015 |
| 5 | Spec Clarifications (accesibilidad del indicador de estado), FR-009 |
| 6 | Constitution Principle I, FR-013 |
| 7 | Assumptions (sin regresión de RegistroForm/ConsumoForm), research.md's decisión de puente |
| 8 | General quality gate (README's "Verificaciones de calidad") |
