# Phase 0 Research: Gestión de Lista de Compras (Reabastecimiento)

## R1: `ItemCompra` nunca se borra físicamente

**Decision**: `ItemCompra.estado` es una máquina de tres estados —
`'pendiente' | 'comprado' | 'eliminado'` — y ni "marcar como comprado" ni "eliminar" (FR-018,
FR-019) borran la fila de Dexie ni de Supabase. La UI solo lista `estado === 'pendiente'`.

**Rationale**: el proyecto no tiene, en ninguna spec anterior, un patrón de borrado físico
sincronizado entre dispositivos (que exigiría tombstones para que un `delete` en un dispositivo se
propague a otro sin resucitar la fila en el próximo `pull`). Todas las entidades existentes que
"desaparecen" lo hacen por un campo de estado: `Insumo.dadoDeBajaEn` (spec 007),
`Categoria.rechazadoEn` (spec 008), `Lote.estado`. Seguir ese mismo idioma evita inventar
mecanismo nuevo de sincronización solo para esta spec.

**Alternatives considered**: borrado físico con tabla de tombstones — descartado, complejidad
nueva sin precedente y sin necesidad real (los ítems de compra son, como mucho, decenas).

## R2: Sincronización de `itemsCompra` sigue el patrón de `lotes`, no el de `categorias`

**Decision**: `pushItemsCompra` sube **todas** las filas locales cada ciclo (`upsert` sin filtrar
por una bandera `sincronizado`), igual que `pushLotes`/`pushConfiguracionAlertas`. No hay
`sincronizado` ni `rechazadoEn` en `ItemCompra`.

**Rationale**: el patrón de `categorias`/`cambios_insumo` (bandera `sincronizado`, reintento fila
por fila, `rechazadoEn`) existe específicamente para manejar rechazos de RLS por rol
(`esRechazoDePermisos`) — porque crear una categoría o editar un insumo está restringido a
administradores. Escribir en `ItemCompra` (crear, vincular, marcar comprado, eliminar) está
abierto a **todo** el personal autenticado (spec Clarifications), así que no existe ningún
rechazo posible que rastrear. Añadir esa maquinaria sería complejidad sin contrapartida. `lotes`
ya resuelve el mismo caso (tabla pequeña, sin RLS restrictiva, subida completa cada ciclo) y es el
precedente correcto.

**Alternatives considered**: replicar el patrón de `categorias` con `sincronizado`/`rechazadoEn` —
descartado, sobre-ingeniería para una tabla sin reglas de permiso que rechazar.

## R3: La recepción de un ítem reemplaza a `RegistroForm`, no lo extiende

**Decision**: `recibirEnInsumo` (nuevo, en `features/compras/lib/recepcion.ts`) crea `Lote` +
`Movimiento` de ingreso con la misma forma que ya usa `RegistroForm.handleSubmit` (spec 002) y
`darDeAltaMaterial` (spec 008) — cantidad validada con `validateQuantity`, lote con
`estado: 'activo'`, `crearMovimiento({ tipo: 'ingreso', ... })` dentro de la misma transacción
Dexie. `RegistroForm.tsx` se borra: su única responsabilidad (buscar un insumo existente y
registrarle un lote) queda cubierta por "Compras" (FR-011), que además permite advertir sobre un
lote ya caducado (spec 008 FR-017), algo que `RegistroForm` nunca tuvo.

**Rationale**: spec 008's Assumptions ya declaraba esto como deuda pendiente ("el flujo
'Registrar insumo' de 'Más' se mantiene... hasta que la spec 009 lo reemplace"). Extraer un
helper compartido entre `alta.ts` y `recepcion.ts` se consideró y se descartó: la porción
duplicada es pequeña (~15 líneas: construir el objeto `Lote` + una llamada a `crearMovimiento`) y
el propio código base ya tolera esa duplicación entre `RegistroForm` y `alta.ts` hoy. Forzar una
abstracción sobre código de la spec 008 ya probado introduce más riesgo de regresión que el que
ahorra.

**Alternatives considered**: extraer `crearLoteConIngreso` compartido en `insumos/lib/` —
descartado por riesgo/beneficio (ver arriba); mantener `RegistroForm` como alternativa redundante
— descartado, contradice FR-011 y deja dos caminos para la misma operación.

## R4: Un único lote por recepción (Clarification, ya resuelto)

**Decision**: `RecibirItemForm` captura un solo lote por invocación; un pedido con varios lotes
del mismo material se recibe repitiendo la acción, o usando un segundo ítem manual vinculado al
mismo insumo si el ítem sugerido ya dejó de calificar (spec Edge Cases).

**Rationale**: ya decidido en la sesión de `/speckit-clarify` (spec.md Clarifications), alineado
con la restricción de un solo lote inicial de `darDeAltaMaterial` (spec 008 FR-018).

## R5: "Sugeridos" no introduce cálculos de alerta nuevos

**Decision**: `computeItemsSugeridos(insumos, lotes, movimientos)` compone directamente
`computeInsumosStockBajo` y `computeAlertasCaducidad(...).filter(a => a.nivel === 'caducado')`
(ambos de `features/alertas/lib/`, spec 004), uniendo por `insumo.id`. No reimplementa umbrales ni
ventanas de aviso.

**Rationale**: FR-004/FR-005 exigen literalmente las mismas condiciones que ya calcula Alertas —
divergir aquí sería una segunda fuente de verdad para "qué insumo está bajo o caducado". Como
`useInventoryStore.insumos` ya filtra los dados de baja (comentario de `inventoryStore.ts`:
"insumos holds only activos"), FR-008 (excluir bajas) se cumple gratis, sin filtro adicional.

**Alternatives considered**: extender `computeEstadoInsumo` (spec 006) con un flag "sugerido para
compra" — descartado: ese cálculo colapsa caducado/próximo-a-caducar/bajo-stock en un solo
`Estado` con prioridad, mientras que "Sugeridos" necesita los dos booleanos independientes para
mostrar ambos badges a la vez (FR-006), y "próximo a caducar" (sin caducar aún) no debe entrar
aquí (spec Assumptions) aunque si cuente en `computeEstadoInsumo`.

## R6: Un ítem manual sin vincular reutiliza `AltaMaterialView` tal cual

**Decision**: FR-012's "crear el material en el catálogo… para continuar con el flujo de
recepción" se resuelve abriendo `AltaMaterialView` (spec 008, sin modificar) con
`nombreInicial: item.nombre`. Como esa vista ya captura stock inicial + primer lote en el mismo
paso (spec 008 US2), no se necesita un segundo flujo de recepción: al crear el material con stock,
ya quedó recibido. El único trabajo de esta spec es, en `onCreated`, marcar el ítem manual
`estado: 'comprado'`.

**Rationale**: evita duplicar el formulario de alta (categoría, unidad, stock mínimo, etc.) dentro
de "Compras". `AltaMaterialView` ya es reutilizable vía props (`nombreInicial`, `onCreated`,
`onCancel`, `onAbrirExistente`) — el mismo patrón que ya usa `SearchPicker`.

**Alternatives considered**: un mini-formulario de alta propio de Compras — descartado,
duplicaría FR-005..FR-018 de la spec 008 sin necesidad.

## R7: `itemsCompra` vive en `inventoryStore`, no en una tienda nueva

**Decision**: se agrega `itemsCompra: ItemCompra[]` y su `liveQuery` a `useInventoryStore`
existente, siguiendo la decisión ya documentada ahí ("extend, don't duplicate") aplicada a
`categorias` (spec 008) y `movimientos` (spec 004).

**Rationale**: mismo criterio que esas dos specs: "Compras" necesita `insumos`/`lotes`/
`movimientos` para "Sugeridos" y para la recepción, así que vive naturalmente junto al resto del
catálogo reactivo en un solo store.

## R8: Vínculo de un ítem manual a un material dado de baja se resuelve en memoria

**Decision**: `insumoVinculado(item, insumosActivos)` devuelve el `Insumo` solo si sigue activo;
si se dio de baja, devuelve `null` sin tocar `ItemCompra.insumoId` (FR-017). Ningún código de
`darDeBajaInsumo` (spec 007) cambia.

**Rationale**: mismo idioma que `InventarioView` ya usa para paneles abiertos sobre un insumo que
deja de estar activo ("Derived, not an effect", comentario existente) — evita una escritura en
cascada nueva y mantiene `darDeBajaInsumo` sin tocar.
