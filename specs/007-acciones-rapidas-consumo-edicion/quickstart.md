# Quickstart Validation: Acciones Rápidas — Consumo Directo y Edición/Eliminación

Purpose: guía ejecutable para validar esta feature de punta a punta, mapeada a las user stories
y criterios de éxito de la spec. Solo validación — la implementación vive en `tasks.md`.

## Prerequisites

- Entorno local de las specs 001-006 funcionando (`npm run dev`; ver skill `run-indentory`).
- Esquema de Supabase actualizado con [contracts/supabase-schema.md](./contracts/supabase-schema.md)
  (solo necesario para los Scenarios 7 y 8).
- Dos cuentas: una con rol `administrador` y otra `personal`.
- Datos de ejemplo:
  - **A**: insumo con dos lotes vigentes de distinta fecha (p. ej. 5 y 3 unidades).
  - **B**: insumo con un lote caducado (2 u.) y uno vigente (4 u.).
  - **C**: insumo con stock solo en un lote caducado.
  - **D**: insumo con stock 0.
  - **E**: insumo "no caduca" con stock, y un segundo insumo con el nombre "Anestesia X".
- Pruebas automáticas: `npm test` (unitarias + integración de esta spec incluidas).

## Scenario 1 — Consumir 1 (User Story 1, FR-001..FR-006, SC-001/SC-002)

1. Como `personal`, en Inventario toca "Consumir 1" en **A**.
2. Toca "Consumir 1" en **B**.
3. Observa las tarjetas **C** y **D**.

**Expected outcome**: (1) el stock de A baja en 1 al instante, se descuenta del lote que vence
antes, el dispositivo vibra (si lo soporta) y aparece el aviso "Consumido 1 … de A" con
"Deshacer". (2) En B se descuenta del lote **vigente**, nunca del caducado (SC-004). (3) C muestra
el botón deshabilitado con "Solo stock caducado"; D con "Sin stock". El detalle del lote muestra
el movimiento atribuido al usuario.

## Scenario 2 — Deshacer (User Story 2, FR-008/FR-009, SC-003)

1. Toca "Consumir 1" en **A** tres veces seguidas.
2. En el aviso más reciente toca "Deshacer"; toca "Deshacer" una segunda vez rápidamente.
3. Cambia a la pestaña Alertas y vuelve antes de 8 s; deshace otro aviso.
4. Espera más de 8 s sin tocar el aviso restante.

**Expected outcome**: se ven hasta 3 avisos apilados; cada "Deshacer" restaura exactamente 1
unidad (el doble toque no restaura 2); el aviso sobrevive al cambio de pestaña; el último aviso
desaparece a los 8 s y ese consumo queda definitivo. El historial del lote muestra cada consumo y
su `ajuste` de reversión.

## Scenario 3 — Menú por rol y "Consumir otra cantidad" (FR-010..FR-012)

1. Como `personal`, toca "⋮" en **B**; luego mantén presionada la tarjeta ~0,5 s.
2. Elige "Consumir otra cantidad", selecciona manualmente el lote caducado y consume 1.
3. Cierra sesión e inicia como `administrador`; abre el menú de **B**.

**Expected outcome**: (1) ambos gestos abren el mismo menú, que solo ofrece "Ver detalle" y
"Consumir otra cantidad"; un scroll sobre la tarjeta no lo abre. (2) El flujo completo permite
consumir del lote caducado de forma explícita. (3) Como administrador aparecen además "Editar" y
"Eliminar".

## Scenario 4 — Editar (User Story 3, FR-013..FR-017, SC-005)

1. Como administrador, "Editar" en **A**: sube el stock mínimo por encima del stock actual y
   guarda.
2. Abre "Editar" en **E**, cambia el nombre a "anestesia x " y guarda; luego deja el nombre vacío.
3. Cambia la unidad de medida y observa el aviso; toca "Cancelar".

**Expected outcome**: (1) A pasa a "Bajo Stock" y el resumen superior se actualiza (< 30 s en
total, SC-005). (2) Ambos guardados se rechazan con el error junto al campo, sin perder lo
escrito. (3) Aparece el aviso de no conversión; al cancelar no cambia nada y los filtros activos
del listado se conservan.

## Scenario 5 — Dar de baja (User Story 4, FR-018..FR-020, SC-006)

1. Como administrador, "Eliminar" en **A** (con stock) y lee la confirmación; toca "Cancelar".
2. Repite y confirma.
3. Busca A en Inventario, revisa Alertas, y abre "Más → Registrar/Consumir insumo" y busca A.

**Expected outcome**: la confirmación advierte las unidades restantes; cancelar no cambia nada.
Tras confirmar, A no aparece en el listado, búsqueda, resumen, Alertas ni en los buscadores de
los formularios; sus movimientos siguen en Dexie (`movimientos` con su `loteId`) y no se generó
ningún ajuste de stock por la baja.

## Scenario 6 — Sin conexión (FR-021)

1. Activa el modo avión (o DevTools → Offline).
2. Repite un "Consumir 1" + "Deshacer", una edición y una baja.

**Expected outcome**: todo se aplica al instante sin errores; al volver la red, el ciclo de sync
sube `movimientos` y `cambios_insumo` pendientes.

## Scenario 7 — Ediciones concurrentes (FR-021a, Clarification Q3)

1. En dos dispositivos/perfiles de navegador con el mismo administrador, pon uno offline.
2. Offline: cambia el **nombre** de E. Online: cambia el **stock mínimo** de E; y en ambos cambia
   la **categoría** de E a valores distintos (el offline primero, el online después).
3. Reconecta el dispositivo offline y espera un ciclo de sync (≤ 30 s) en ambos.

**Expected outcome**: ambos dispositivos muestran el nombre nuevo (del offline), el stock mínimo
nuevo (del online) y la categoría del cambio más reciente. `cambios_insumo` conserva también el
cambio de categoría perdedor con su autor y fecha. Si en lugar de editar, el online da de baja E,
E queda dado de baja en ambos aunque el offline lo haya editado.

## Scenario 8 — Cambio rechazado por pérdida de rol (FR-021b)

1. Como administrador, con el dispositivo offline, cambia el nombre de E.
2. En Supabase, cambia el `rol` de ese usuario a `personal` en `perfiles`.
3. Reconecta el dispositivo y espera un ciclo de sync.

**Expected outcome**: aparece el aviso "Tu cambio en «E» no se guardó: ya no tienes permisos de
administrador."; E vuelve a mostrar el nombre que tiene en los demás dispositivos; el cambio
sigue en Dexie (`cambiosInsumo`) con `rechazadoEn` y no se vuelve a subir; el menú de E ya no
ofrece "Editar" ni "Eliminar".

## Constitution checks para el PR

- Ningún control nuevo < 48x48px (inspeccionar botón "Consumir 1", "⋮", opciones del menú,
  "Deshacer", campos y botones del formulario/diálogo).
- La cámara no se activa sola al abrir "Editar" ni "Consumir otra cantidad".
- Toda escritura ocurre primero en Dexie; con Supabase caído no aparece ningún error en la UI.
