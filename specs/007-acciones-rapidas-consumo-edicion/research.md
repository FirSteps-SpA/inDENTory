# Phase 0 Research: Acciones Rápidas — Consumo Directo (Shortcut) y Edición/Eliminación

No quedaron `NEEDS CLARIFICATION` en el Technical Context: las 5 decisiones abiertas de la spec
se resolvieron en `/speckit-clarify` (spec.md → Clarifications). Esta fase documenta las
decisiones de diseño derivadas de leer el código existente (specs 002-006).

---

## R1. Selección de lote para "Consumir 1"

- **Decision**: Nueva función pura `selectLoteConsumoRapido(lotesConStock, hoy)` en
  `src/features/insumos/lib/consumoRapido.ts`. Filtra lotes **vigentes** (`fechaCaducidad === null`
  o `diasEntre(fechaCaducidad, hoy) >= 0`, usando `src/lib/dateMath.ts`) con
  `stockDisponible >= 1`, y delega el orden en el mismo comparador FEFO de `fefo.ts` (lotes sin
  fecha al final). Devuelve un resultado discriminado:
  `{ ok: true, lote } | { ok: false, motivo: 'sin-stock' | 'solo-caducado' }`.
  `'solo-caducado'` = existe stock ≥ 1 pero solo en lotes caducados; si no hay ningún lote con
  stock ≥ 1 (incluye el caso decimal con < 1 unidad por lote), el motivo es `'sin-stock'`.
- **Rationale**: `selectFefoLot` existente no conoce la fecha de hoy y hace *fallback* a lotes
  que no cubren la cantidad — correcto para el formulario completo, incorrecto para el atajo
  (spec FR-002/FR-003, Clarification Q1). Se reutiliza el comparador exportándolo desde
  `fefo.ts` en lugar de duplicarlo. "Caducado" usa exactamente la misma regla que
  `computeAlertasCaducidad` (`diasRestantes < 0`), así la tarjeta y la alerta nunca discrepan.
- **Alternatives considered**: (a) Agregar un parámetro `excluirCaducados` a `selectFefoLot` —
  rechazado: mezcla dos contratos (el fallback del formulario completo no aplica al atajo) y
  arriesga regresiones en `ConsumoForm`. (b) Calcular en el componente — rechazado: no sería
  testeable unitariamente como el resto de `lib/`.

## R2. Deshacer = movimiento compensatorio `ajuste`

- **Decision**: "Deshacer" llama `crearMovimiento({ tipo: 'ajuste', loteId, cantidad: +1,
  movimientoOrigenId: consumo.id })`. Es idempotente: antes de escribir se verifica que no exista
  ya un `ajuste` con ese `movimientoOrigenId` (búsqueda en el snapshot `movimientos` de
  `inventoryStore`); un doble toque no restaura 2 unidades.
- **Rationale**: El ledger ya es de solo-apéndice y `computeStockLote` ya suma los `ajuste`
  (`stock.ts`); `movimientoOrigenId` existe precisamente para vincular correcciones
  (`movements.ts`). Cero cambios de esquema de `Movimiento`, cero cambios de sync. Cumple spec
  FR-008 y Principio IV.
- **Alternatives considered**: (a) Borrar el movimiento de consumo si aún no se sincronizó —
  rechazado: rompe el contrato "no update/delete" de `movements.ts` y deja un comportamiento
  distinto según el estado de red. (b) Nuevo `tipo: 'reversion'` — rechazado: requiere migrar
  Dexie + Supabase + `computeStockLote` sin beneficio; `ajuste` + `movimientoOrigenId` ya
  expresa lo mismo.

## R3. Avisos (toast) con deshacer: store Zustand global

- **Decision**: Nueva store `src/stores/avisosStore.ts` (Zustand) con una cola de avisos
  `{ id, movimientoId, loteId, insumoNombre, estado: 'pendiente' | 'revertido', expiraEn }`.
  `AvisosConsumo` (nuevo, en `src/app/`) se monta una sola vez en `App.tsx`, fuera de las vistas,
  y muestra hasta 3 avisos apilados (el más reciente abajo). Cada aviso expira a los
  **8 000 ms** (Clarification Q2) con su propio temporizador; al superar 3, el más antiguo se
  descarta (su consumo queda definitivo). Tras "Deshacer", el aviso muestra "Consumo revertido"
  ~2 s y se retira.
- **Rationale**: El aviso debe sobrevivir a la navegación entre secciones (spec Edge Cases) → no
  puede vivir en el estado local de `InventarioView`. Principio II exige Zustand como única
  fuente de estado reactivo; no se agrega una librería de toasts. El tope de 3 evita tapar el
  listado con consumos seguidos.
- **Alternatives considered**: (a) Un solo aviso que se reemplaza — rechazado: contradice la
  User Story 2 escenario 3 (cada consumo previo deshacible mientras su aviso sigue visible).
  (b) Librería externa (sonner, react-hot-toast) — rechazado por la Pila Tecnológica Obligatoria
  sin necesidad real.

## R4. Vibración háptica

- **Decision**: `vibrarLeve()` en `src/lib/haptics.ts`: `navigator.vibrate?.(15)` dentro de
  `try/catch`, sin esperar resultado.
- **Rationale**: Safari iOS no implementa la Vibration API; el FR-006 exige no fallar si no hay
  soporte. En tests (jsdom) `navigator.vibrate` no existe → no-op natural, y se puede espiar.
- **Alternatives considered**: Ninguna viable en PWA sin dependencias nativas.

## R5. Estructura de la tarjeta: sin botones anidados

- **Decision**: `InsumoCard` deja de ser un único `<button>`. Pasa a `Card` (`div`) con tres
  zonas táctiles hermanas: (1) área principal `<button>` que abre el detalle (y detecta toque
  largo), (2) `TouchButton` "Consumir 1" (≥48x48px, con texto del motivo cuando está
  deshabilitado: "Sin stock" / "Solo stock caducado"), (3) botón "⋮" (≥48x48px,
  `aria-label="Más opciones de <nombre>"`, `aria-haspopup="dialog"`).
- **Rationale**: HTML no permite `<button>` dentro de `<button>`; además separa claramente el
  gesto de abrir detalle del de consumir, reduciendo toques accidentales (Principio III).
- **Alternatives considered**: Mantener la tarjeta como botón y usar `stopPropagation` en
  elementos internos no-botón — rechazado por accesibilidad (roles anidados inválidos).

## R6. Toque largo

- **Decision**: Hook `useLongPress(onLongPress, { ms: 500, toleranciaPx: 10 })` en
  `src/features/insumos/lib/useLongPress.ts` basado en Pointer Events: se cancela si el puntero se
  mueve > 10 px (scroll) o se levanta antes. Cuando dispara, suprime el `click` siguiente (no abre
  el detalle). Se agrega `onContextMenu` → `preventDefault` + abrir menú (clic derecho / menú
  contextual nativo de Android).
- **Rationale**: FR-010 lo pide como vía *adicional*; el botón "⋮" es siempre la vía primaria,
  así que el toque largo nunca es el único medio (Principio III: sin gestos de precisión como
  única vía). La tolerancia de 10 px evita que un scroll con guantes abra el menú.
- **Alternatives considered**: Librería de gestos — innecesaria para un solo gesto.

## R7. Menú de opciones, diálogos y "Consumir otra cantidad"

- **Decision**: Nuevo componente genérico `src/components/ui/BottomSheet.tsx` (panel inferior
  modal: `role="dialog"`, `aria-modal`, cierre con fondo/Escape, foco inicial en la primera
  opción, cada opción ≥48px de alto). Se usa para: `InsumoAccionesMenu` (opciones filtradas por
  rol), `ConfirmarBajaDialog` y como contenedor de `ConsumoForm` y `EditarInsumoForm`.
  `ConsumoForm` recibe una prop opcional nueva `insumoInicial?: Insumo` (preselecciona el insumo
  y omite el paso de búsqueda) y `onDone?: () => void`; sin la prop se comporta exactamente
  igual que hoy (`MasView` no cambia).
- **Rationale**: Reutiliza el flujo completo de consumo de la spec 002 (FEFO + override manual,
  incluido elegir un lote caducado de forma explícita — Clarification Q1) en vez de crear uno
  nuevo. Un único primitivo de panel inferior mantiene consistentes los 4 overlays nuevos con el
  lenguaje visual de la spec 005.
- **Alternatives considered**: `<dialog>` nativo — posible, pero el soporte de `showModal` en
  jsdom es incompleto y complica las pruebas; se replica su semántica con ARIA.

## R8. Edición: campo "admite decimales"

- **Decision**: `permiteDecimales` **no** es un control independiente en el formulario de
  edición: se recalcula desde la unidad de medida con `permiteDecimales(unidadMedida)`
  (`quantity.ts`), igual que en el alta (spec 002). El formulario muestra el valor derivado como
  texto informativo ("Admite decimales: Sí/No").
- **Rationale**: En el código, `validateQuantity` ya decide por unidad, no por el campo
  persistido; permitir editarlos por separado crearía insumos incoherentes (p. ej. "pieza" con
  decimales). Cubre el FR-013 sin introducir una segunda fuente de verdad.
- **Alternatives considered**: Toggle independiente — rechazado por la incoherencia descrita.

## R9. Ediciones concurrentes: ledger de cambios por campo (LWW por campo)

- **Decision**: Nueva tabla de solo-apéndice `CambioInsumo` (Dexie `cambiosInsumo`, Supabase
  `cambios_insumo`), un registro por **campo modificado** en cada guardado:
  `{ id, insumoId, campo, valorAnterior, valorNuevo, usuarioId, creadoEn, sincronizado }`.
  La fila `Insumo` pasa a ser una **proyección**: `proyectarInsumo(insumo, cambios)` (función
  pura, `src/features/insumos/lib/proyeccion.ts`) toma, por cada campo, el cambio ganador
  = mayor `creadoEn`, desempate por mayor `id` (orden lexicográfico, determinista). La baja se
  registra como `campo: 'baja'` y **prevalece siempre**: si existe algún cambio `baja`, el
  insumo queda dado de baja con los datos del **primer** cambio `baja` (orden `creadoEn, id`),
  sin importar ediciones posteriores de otros campos (que igual se aplican y registran).
  Sync (extensión de `runSyncBatch`, orden definitivo en contracts/supabase-schema.md): push
  insumos (primero, por la FK de `cambios_insumo`) → push de cambios pendientes → pull de todos
  los cambios → pull insumos → `reproyectarInsumos()`. La fila subida o bajada puede traer una
  proyección vieja; la reproyección desde el ledger la corrige. Todos los dispositivos con el
  mismo ledger llegan al mismo resultado.
- **Rationale**: Clarification Q3 exige LWW por campo con los valores sobrescritos registrados.
  El `pushInsumos` actual hace `upsert` de la fila completa en cada ciclo — con dos
  dispositivos, el último en sincronizar pisa la fila entera (LWW por fila, y además puede
  revertir cambios remotos con datos locales viejos). Un ledger de cambios replica el patrón ya
  probado de `movimientos` (solo-apéndice, idempotente por `id`, `sincronizado` local) y hace la
  resolución determinista y auditable (Principio I, Principio IV): el cambio perdedor sigue en
  el ledger con su autor, fecha y valores.
- **Alternatives considered**: (a) Mapa `camposActualizadosEn` dentro de la fila + merge en el
  cliente — rechazado: no conserva el valor sobrescrito ni su autor (no cumple Q3) y el merge
  seguiría compitiendo con el `upsert` de fila completa. (b) Resolver en el servidor con una
  función/trigger de Postgres — rechazado: la resolución debe funcionar y ser visible offline
  (Principio I) y agregaría lógica de backend que hoy no existe en el proyecto.
- **Reloj**: `creadoEn` usa el reloj del dispositivo. Un reloj desfasado puede hacer ganar un
  cambio "más viejo" en tiempo real; se acepta (determinista y auditable, que es lo que exige
  la constitución) y se documenta. No se introduce un reloj lógico/híbrido: a la escala de una
  clínica (pocos administradores, ediciones raras) no se justifica.

## R10. Baja lógica y filtrado centralizado

- **Decision**: `Insumo` gana `dadoDeBajaEn: string | null` y `dadoDeBajaPor: string | null`
  (proyectados desde el cambio `baja`). `inventoryStore` expone `insumos` = **solo activos**
  (filtrado en la `liveQuery`) — todos los consumidores actuales (`InventarioView`,
  `AlertasView`, `SearchPicker` de `RegistroForm`/`ConsumoForm`, cálculos de alertas) excluyen
  automáticamente los dados de baja sin tocarlos (FR-020). Los cálculos de alertas ya ignoran
  lotes cuyo insumo no está en el arreglo (`insumosPorId.get(...)` → `continue`), así que sus
  lotes también desaparecen de Alertas. La unicidad de nombre (FR-014) se valida solo contra
  activos. La baja no escribe movimientos (Clarification Q5).
- **Rationale**: Un único punto de filtrado evita olvidar una vista (SC-006: 100% de vistas).
- **Alternatives considered**: Filtrar en cada vista — rechazado: frágil, fácil de olvidar en
  specs futuras (008/009).
- **Verificado**: `lotesEnRevision`, `computeInsumosStockBajo` y `computeAlertasCaducidad`
  descartan lotes de insumos ausentes del arreglo.
- **Consecuencia del ledger**: toda escritura de un campo editable pasa por `editarInsumo`,
  incluido el stock mínimo de `AlertasView` (spec 004), o la reproyección la desharía.

## R11. Autorización por rol

- **Decision**: Doble control en cliente: (1) UI — `InsumoAccionesMenu` solo muestra "Editar"
  y "Eliminar" si `usuario.rol === 'administrador'`; (2) dominio — `editarInsumo()` y
  `darDeBajaInsumo()` (`src/features/insumos/lib/catalogo.ts`) lanzan
  `Error('Solo un administrador puede …')` si el usuario local no es administrador, sin escribir
  nada. En servidor, la tabla **nueva** `cambios_insumo` recibe RLS: `insert` solo si
  `perfiles.rol = 'administrador'` (mismo patrón que `configuracion_alertas`, spec 004);
  `select` para todo autenticado; sin `update`/`delete`.
- **Rationale**: Cumple FR-012 ("rechazar cualquier intento") en ambos lados sin bloquear el
  flujo offline. Mantiene la convención de la spec 004: tablas nuevas con RLS real; la tabla
  `insumos` sigue sin RLS (deuda conocida de la spec 002, fuera de alcance).
- **Rechazo por permisos (spec FR-021b)**: si un administrador pierde el rol con cambios aún
  sin subir, la RLS de `cambios_insumo` los rechaza. En vez de reintentar para siempre (el
  dispositivo divergiría en silencio del resto, violando el Principio I), el cliente los marca
  `rechazadoEn` (se conservan para auditoría), los excluye de la proyección, avisa al usuario y
  refresca su rol desde `perfiles`. Solo el código de error de RLS (`42501`) tiene este efecto;
  errores de red se siguen reintentando. Alternativas descartadas: reintento indefinido con
  banner (no converge) y dejar el cambio solo local (pérdida silenciosa de consistencia).
- **Alternatives considered**: RLS en `insumos` — rechazado aquí: afectaría el alta y el push
  de fila completa de todos los roles (spec 002/008); se deja anotado para la spec 010.

## R12. Pruebas

- **Decision**: Vitest + React Testing Library (setup existente, `fake-indexeddb` vía
  `tests/setup.ts`). Unitarias para funciones puras nuevas (`consumoRapido`, `proyeccion`,
  validación de edición, idempotencia del deshacer, cola de `avisosStore` con timers falsos).
  Integración para el flujo completo en `InventarioView` (consumir 1 → aviso → deshacer; menú
  por rol; editar; baja + desaparición en Alertas) y para la sincronización con ledger de
  cambios (dos "dispositivos" simulados sobre el mismo ledger remoto mockeado).
