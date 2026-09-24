# Research: Formulario Unificado para Creación de Nuevo Material

Phase 0 del plan. Technical Context no tenía `NEEDS CLARIFICATION` abiertos (la pila está fijada
por la constitución y las 6 clarificaciones de la spec cubren el alcance); cada sección resuelve
una decisión de diseño con impacto en datos, sincronización o UI.

---

## R1. Categoría como entidad sin romper `Insumo.categoria: string`

**Decision**: `Insumo.categoria` sigue siendo el **nombre** de la categoría (string). Se agrega
una tabla `categorias` solo para las categorías **creadas por administradores**. Las cuatro
precargadas y "Sin categoría" son **constantes en código** (`CATEGORIAS_PRECARGADAS`,
`SIN_CATEGORIA` en `src/features/insumos/lib/categorias.ts`), no filas. La lista del selector es
una función pura `catalogoCategorias(categorias, insumos)` que une las tres fuentes:
precargadas → filas no rechazadas → nombres de texto libre presentes en insumos activos,
deduplicadas por `claveCategoria(nombre)`.

**Rationale**:
- FR-010 exige las precargadas con catálogo vacío y sin conexión: una constante no depende de
  un seed, una migración ni de la sincronización, y dos dispositivos nunca "crean" Cirugía dos
  veces.
- Cambiar `Insumo.categoria` a un id obligaría a migrar Dexie y Supabase, reescribir filtros,
  búsqueda, alertas, edición (007) y proyección del ledger (`CambioInsumo.campo = 'categoria'`
  guarda nombres). El string ya funciona como clave natural una vez normalizado.
- Las categorías de texto libre existentes (spec 002) aparecen sin migrar datos (Assumptions).

**Alternatives considered**:
- *FK `categoriaId` en `Insumo`*: modelo más "correcto", pero con migración de datos y cambios en
  cada consumidor. Se descarta por costo; renombrar categorías (spec 010) podrá introducirla.
- *Sembrar las precargadas como filas en Supabase*: sin conexión en el primer uso no existirían,
  lo que incumple FR-010.

## R2. Normalización y nombre canónico

**Decision**: `claveCategoria(n) = n.trim().normalize('NFD').replace(/\p{Diacritic}/gu, '').toLocaleLowerCase('es').replace(/\s+/g, ' ')`.
Nombre visible por clave según precedencia: precargada/"Sin categoría" > fila `Categoria` más
antigua `(creadoEn, id)` > primer texto libre encontrado (orden alfabético). El filtro por
categoría del Inventario (`searchInsumosPorCategoria`) compara **claves**, así "fresas" cae
bajo el chip "Fresas". Los chips (`categoriasEnUso`) muestran solo categorías con ≥1 insumo activo
(igual que hoy), con su nombre canónico. "Sin categoría" va siempre última.

**Rationale**: "sin distinguir mayúsculas, minúsculas ni tildes" (FR-009/FR-012, Edge Cases) se
cumple con un único punto de verdad; la precedencia es total y determinista (la misma lista en
todos los dispositivos).

**Alternatives considered**: reescribir en Dexie los `Insumo.categoria` al nombre canónico. Se
descarta: son escrituras sobre filas que no se editaron, fuera del ledger de la 007, y el filtro
por clave ya da el mismo resultado visible.

## R3. Alta atómica: material + lote + ingreso (+ categoría)

**Decision**: `darDeAltaMaterial(input)` en `src/features/insumos/lib/alta.ts` valida con
`validarAltaMaterial` (pura) y escribe en **una** transacción Dexie `rw` sobre `insumos`,
`categorias`, `lotes`, `movimientos` y `borradores`: categoría nueva (si hay), insumo, lote
inicial, `crearMovimiento({tipo:'ingreso'})` (se ejecuta dentro de la zona de la transacción) y
borrado del borrador. Cualquier excepción aborta todo (FR-016, SC-003). Un guardado en curso
deshabilita el botón (doble toque → un solo material, Edge Cases); además la validación dentro de
la transacción vuelve a comprobar el nombre, así que un segundo intento con el mismo nombre falla
por duplicado en lugar de crear otro.

**Rationale**: Dexie hace atómica la escritura local; la sincronización ya sube insumos → lotes →
movimientos en orden de FK (`runSyncBatch`), así que no hace falta un "alta" remota especial.

**Alternatives considered**: reutilizar `RegistroForm` tras crear el insumo (dos pasos) —
contradice US2. Escribir sin transacción — podría dejar un material sin su lote (viola SC-003).

## R4. Creación de categorías: permisos, sincronización y rechazo

**Decision**:
- Cliente: `+ Crear nueva categoría` solo si `usuario.rol === 'administrador'`; `darDeAltaMaterial`
  lanza si llega una categoría nueva de un no-administrador (guard como `exigirAdministrador` de
  la 007).
- Servidor: tabla `categorias` con RLS de inserción solo-administrador (mismo patrón que
  `cambios_insumo`). Sin `unique` sobre la clave: dos administradores sin conexión pueden crear
  la misma categoría; ambas filas se conservan y R2 las funde en la UI (Edge Cases).
- Sync: `pushCategorias` va **antes** de `pushInsumos`, reutilizando `esRechazoDePermisos` y el
  reintento fila por fila de `pushCambiosInsumo`. Una fila rechazada se marca `rechazadoEn`, no se
  borra, deja de ofrecerse (R1 la excluye), y **en la misma pasada** los insumos locales cuya
  categoría tenga esa clave (y que no esté cubierta por otra fuente válida) pasan a
  `SIN_CATEGORIA` antes de `pushInsumos`, de modo que la fila remota converge. Se emite un aviso
  `categoria-rechazada` por categoría y se refresca el rol (`fetchPerfilPropio`), igual que en la 007.

**Rationale**: reusa el mecanismo probado de FR-021b; ir antes de `pushInsumos` evita que otros
dispositivos reciban el nombre rechazado si el rechazo ocurre en el mismo ciclo.

**Alternatives considered**: registrar el cambio de categoría del insumo como `CambioInsumo` — el
autor ya no es administrador y el servidor lo rechazaría. La escritura directa sobre la fila es
la misma vía que usa hoy el alta de la 002 (`insumos` sin RLS, deuda anotada para la 010).

## R5. Unidades de medida

**Decision**: `UNIDADES_MEDIDA = ['caja', 'frasco', 'pieza', 'cartucho', 'mL', 'g']` en
`catalogo.ts` (se amplía la constante existente; valores guardados en minúscula como los actuales
`pieza`/`caja`), con etiquetas visibles `Caja, Frasco, Pieza, Cartucho, mL, g`.
`permiteDecimales` no cambia (solo `mL`, `g`). Control segmentado en grilla 3×2 de botones
`aria-pressed` ≥48×48px (FR-007 "visibles de un toque"). La edición de la 007 usa la misma
constante, por lo que ofrece también las nuevas.

**Rationale**: las unidades existentes siguen siendo válidas (Assumptions); una grilla evita un
segmentado de 6 celdas ilegible en 360px.

## R6. Borrador persistente

**Decision**: tabla Dexie local `borradores` (clave `'alta-material'`, una fila), nunca
sincronizada. `useBorradorAlta` guarda con *debounce* de 400 ms cada cambio del formulario y lo
restaura al montar, mostrando "Recuperamos tu alta sin terminar". Se borra al guardar (en la
transacción de R3), al cancelar y en `authStore.logout` (junto a `usuarioActual.clear()`). Si hay
borrador y la vista se abre con `nombreInicial` (desde la búsqueda de Registrar), prevalece el
borrador y se muestra el aviso.

**Rationale**: FR-024 pide sobrevivir a cerrar/recargar la app → no alcanza con estado React ni
Zustand en memoria. IndexedDB es el almacenamiento primario (Principio I); `localStorage` sería una
segunda vía de persistencia sin necesidad.

**Alternatives considered**: `zustand/middleware` `persist` sobre IndexedDB — agrega una capa de
estado global para algo que solo usa una vista.

## R7. Presentación y navegación

**Decision**: `AltaMaterialView` es una **vista de pantalla completa** (overlay fijo sobre el
shell, con encabezado "Nuevo Material" + `Cancelar`, contenido desplazable y barra inferior fija
con el botón principal por encima de la navegación). Se monta desde:
1. `InventarioView` (botón `+ Material` junto al buscador) — al guardar: cierra, mantiene filtros
   (el estado vive en `InventarioView`, FR-022) y muestra el aviso `material-creado`.
2. `SearchPicker` ("Crear insumo nuevo") con `nombreInicial` — reemplaza `CrearInsumoForm`
   (FR-004). Al guardar sin stock inicial, `RegistroForm` queda con el insumo seleccionado para
   registrar su lote (comportamiento actual); con stock inicial, `RegistroForm` muestra el mensaje
   de éxito y vuelve a la búsqueda (evita un segundo lote accidental).

**Rationale**: el formulario tiene hasta 11 campos más un botón fijo — no cabe bien en el
`BottomSheet` de la 007; el roadmap pide "pantalla limpia".

## R8. Sugerencias y código de barras

**Decision**:
- `sugerirMateriales(insumos, texto, limite = 5)`: con ≥2 caracteres, insumos activos cuyo nombre
  contiene el texto comparando con la misma normalización de R2 (sin tildes). Tocar una sugerencia
  llama `onAbrirExistente(insumo)`: en Inventario abre `InsumoDetalle` (el borrador se conserva);
  en la búsqueda de Registrar selecciona ese insumo.
- `ScanButton` gana un prop opcional `onCodigo(codigo)`: cuando está presente, entrega el código
  crudo en vez de buscar insumo/lote (sin cambios en el flujo existente). Cámara solo al tocar.
- `findInsumoPorCodigo` (existente) sobre activos, evaluado al escanear y en `onBlur` del campo:
  si coincide, aviso en línea "Este código ya corresponde a «X»" con botón "Abrir «X»". No
  bloquea el guardado (el código de fabricante no es único en el modelo de la 002).

## R9. "Posible duplicado"

**Decision**: derivado, no persistido: `posiblesDuplicados(insumos): Set<id>` agrupa activos por
`claveNombre` (la de `catalogo.ts`) y marca todos salvo el de menor `(creadoEn, id)`.
`InsumoCard` muestra el `Badge` "Posible duplicado" solo si `rol === 'administrador'`.
Desaparece solo cuando se renombra o se da de baja uno de ellos (FR-026), sin código adicional.

**Rationale**: un flag persistido requeriría sincronizarlo y limpiarlo; el cálculo es O(n) sobre
≤300 insumos y converge igual en todos los dispositivos.

## R10. Autoría del alta

**Decision**: `Insumo.creadoPor: string | null` (Dexie v5 con upgrade a `null`; columna
`insumos.creado_por uuid null`). `Categoria.creadoPor` obligatorio. El ingreso inicial ya queda
atribuido por `crearMovimiento`.

**Rationale**: Key Entities pide "quién lo creó"; Principio VI.

## R11. Validación y stock mínimo 0

**Decision**: `validarAltaMaterial` reutiliza `claveNombre` y las reglas de stock mínimo de
`validarEdicionInsumo` (extraídas a helpers compartidos en `catalogo.ts`), `validateQuantity` para
stock inicial > 0, campos de lote obligatorios según FR-014, y devuelve
`advertencias.loteCaducado` cuando `fechaCaducidad < hoy` (fecha local, misma regla que
`diasRestantes < 0` de `computeAlertasCaducidad`). Stock mínimo 0 solo alerta con stock negativo
(`stockActual < stockMinimo`, spec 004), coherente con Edge Cases.
