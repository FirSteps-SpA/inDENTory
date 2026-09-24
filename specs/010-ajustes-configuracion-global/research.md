# Research: Separación de Ajustes y Configuración Global

## R1. Cerrar RLS en `insumos`/`lotes`/`movimientos` sin romper el resync de fila completa

**Decision**: `insumos` y `lotes` activan RLS con políticas de INSERT/SELECT/UPDATE **abiertas**
(`using (true) with check (true)`) — nunca se restringe la escritura por rol a nivel de política —
y en su lugar un **trigger `BEFORE UPDATE`** revierte silenciosamente los campos protegidos al
valor que ya tenían (`OLD.*`) cuando quien escribe no es administrador. `movimientos` sí lleva una
política de INSERT real (`usuario_id = auth.uid()`) porque nunca se reenvía una fila ya
sincronizada (`pushMovimientos` solo sube `!sincronizado`, a diferencia de `pushInsumos`/
`pushLotes`, que reenvían la tabla completa cada ciclo).

- `insumos`: el trigger `proteger_catalogo_insumo()` revierte `nombre`, `categoria`,
  `unidad_medida`, `stock_minimo`, `codigo_fabricante`, `caduca`, `dado_de_baja_en` y
  `dado_de_baja_por` a `OLD.*` si `auth.uid()` no es administrador.
- `lotes`: el trigger `proteger_resolucion_lote()` revierte `estado` a `OLD.estado` únicamente en
  la transición `'revision' → 'activo'` cuando quien escribe no es administrador (la única
  transición gestionada por un humano, spec 004's "marcar como resuelto"); toda otra escritura de
  `lotes` quedó fijada en su creación (spec 002) y no necesita protección.

**Rationale**: `pushInsumos`/`pushLotes` reenvían **todas** las filas locales cada ciclo (no solo
las modificadas), porque hoy no hay bandera `sincronizado` a nivel de fila para esas tablas. Una
política `UPDATE` restringida a administrador rechazaría de un dispositivo no-administrador el
`upsert` completo (una sola sentencia `INSERT ... ON CONFLICT DO UPDATE`; si el `WITH CHECK` falla
para una sola fila en conflicto, la sentencia entera falla), rompiendo la sincronización rutinaria
de cualquier usuario sin rol administrador — justo lo que prohíbe FR-012. Un trigger que sólo
corrige los campos protegidos cuando de verdad cambiaron logra el mismo efecto observable que
`reproyectarInsumos` ya produce hoy en el cliente (una escritura no autorizada nunca "pega"), pero
de forma inmediata y autoritativa en el servidor, sin tocar la forma de subir filas. Es la misma
filosofía que ya usa el proyecto: el ledger (`cambios_insumo`, con su propio INSERT admin-only) es
la fuente de verdad; el trigger simplemente hace cumplir esa fuente de verdad también cuando
alguien escribe `insumos` por fuera de la app.

**Alternatives considered**:
- *Política `UPDATE` admin-only lisa y llana*: rechazada — rompe el resync de fila completa de
  cualquier no-administrador (FR-012), como se explicó arriba.
- *Reescribir `pushInsumos`/`pushLotes` para subir solo filas realmente modificadas* (agregar una
  bandera `sincronizado` a `Insumo`/`Lote`, como ya tiene `Movimiento`/`CambioInsumo`): resolvería
  el problema de raíz, pero exige distinguir "modifiqué esta fila localmente" de "la reproyecté sin
  cambiarla tras recibir un cambio ajeno" (`reproyectarEnTransaccion` corre sobre insumos que
  ningún cambio local tocó) en cada reproyección — superficie mucho mayor para un beneficio que el
  trigger ya cubre. Se descarta por costo/riesgo frente al beneficio.
- *Replicar `proyectarInsumo` completo en SQL (una función que recalcula la fila desde
  `cambios_insumo` en cada `UPDATE`)*: más "correcto" en el sentido de una única fuente de verdad
  real, pero exige portar toda la lógica de plegado del ledger a `plpgsql` y mantenerla en paralelo
  al TypeScript. El trigger de "revertir si no es admin" logra el mismo resultado observable con
  mucho menos código nuevo.
- *Función auxiliar `es_administrador(uid)`*: se define una sola vez (`select exists (... perfiles
  ...)`) y se reutiliza en los triggers nuevos y en la política de `categorias` (R3); reduce
  duplicación frente a repetir el `exists (select ...)` inline que ya usan `configuracion_alertas`/
  `cambios_insumo`/`categorias`.

## R2. Generalizar el ledger de "baja" para soportar "restaurar"

**Decision**: en `proyectarInsumo` (`src/features/insumos/lib/proyeccion.ts`), reemplazar la regla
actual "la **primera** `CambioInsumo` vigente con `campo: 'baja'` manda" por "la **última** (mayor
`(creadoEn, id)`) manda, igual que cualquier otro campo (spec 007 FR-021a)": si su `valorNuevo` es
`true`, el insumo queda dado de baja con el `creadoEn`/`usuarioId` de *ese* cambio; si es `null`
(restaurado), `dadoDeBajaEn`/`dadoDeBajaPor` vuelven a `null`. `restaurarInsumo(insumoId)` (nueva
función en `catalogo.ts`, hermana de `darDeBajaInsumo`) agrega un `CambioInsumo` con
`campo: 'baja'`, `valorAnterior: true`, `valorNuevo: null`. El mismo ajuste se aplica en
`filaParaSubir` (usa `.at(-1)` en vez de `[0]` sobre los `baja` sincronizados, y respeta su
`valorNuevo`).

**Rationale**: hoy "cualquier baja vigente gana, siempre, sin importar el orden" es una
simplificación válida porque solo existía un tipo de evento de baja (`valorNuevo` siempre `true`):
tomar el primero era solo una regla de desempate determinista entre dos bajas redundantes. Al
introducir `restaurar` como un segundo evento con el significado opuesto, esa regla ya no puede
ser "el primero manda" (dejaría a un insumo restaurado "recayendo" en baja si hay un cambio de
baja anterior con menor `creadoEn`, que es justo el caso que la User Story 6 necesita resolver:
baja → restaurar). Adoptar "el más reciente manda" iguala `'baja'` al resto de los campos
editables (mismo mecanismo, sin caso especial nuevo) y resuelve determinísticamente el conflicto
de dos administradores dando de baja/restaurando el mismo insumo casi al mismo tiempo sin
conexión (edge case de la spec).

**Alternatives considered**:
- *Un campo booleano `activo` separado en vez de reutilizar `'baja'`*: innecesario — el ledger ya
  modela exactamente esta transición; agregar un segundo mecanismo paralelo duplicaría la
  responsabilidad de `dadoDeBajaEn`/`dadoDeBajaPor`.
- *Dejar `deshacerCambios` (usado para deshacer un `CambioInsumo` rechazado o aún no
  sincronizado) reconstruyendo el estado exacto de baja anterior a partir de `valorAnterior`*: se
  descarta por complejidad — igual que hoy, deshacer un `'baja'` (sea baja o restaurar) rechazado o
  pendiente deja el insumo **activo** como valor seguro por defecto, en vez de intentar reconstruir
  una baja anterior indeterminada a partir de un valor booleano. Es la misma simplificación que ya
  tenía el código antes de esta spec, ahora aplicada simétricamente a ambos tipos de evento — no es
  una regresión, es preservar el mismo nivel de rigor.

## R3. Renombrar/fusionar categorías: algoritmo y cascada sobre insumos

**Decision**: nueva función `renombrarCategoria(categoriaId, nuevoNombre)` en
`src/features/ajustes/lib/categoriasAdmin.ts`, dentro de una transacción Dexie sobre `categorias`,
`insumos` y `cambiosInsumo`:

1. Exige administrador (`exigirAdministrador`, reutilizado de `catalogo.ts`) y valida `nuevoNombre`
   con las mismas reglas que crear una categoría (spec 008 R2: trim, ≤40 caracteres, no vacío,
   `claveCategoria` ≠ clave de "Sin categoría").
2. Calcula `claveAnterior = claveCategoria(categoria.nombre)` y
   `claveNueva = claveCategoria(nuevoNombre)`.
3. Si `claveNueva` coincide con **otra** entrada activa del catálogo (`catalogoCategorias`,
   excluyendo la fila que se está renombrando) — precargada u otra categoría creada — es una
   **fusión**: la fila renombrada queda `desactivadoEn = now` (se oculta, igual que un `desactivar`
   normal) y el nombre resultante es el de la entrada existente. Si no coincide con ninguna, es un
   **renombrado simple**: se actualiza `categoria.nombre = nuevoNombre` (sigue activa).
4. Para **todo** `Insumo` (activo o dado de baja — se consulta `db.insumos` directamente, no el
   `inventoryStore`, que excluye los dados de baja) cuya `claveCategoria(insumo.categoria)` sea
   igual a `claveAnterior`, se agrega un `CambioInsumo` (`campo: 'categoria'`,
   `valorAnterior: insumo.categoria`, `valorNuevo: nombreResultante`) y se reproyecta
   (`reproyectarEnTransaccion`) — mismo mecanismo que una edición manual de categoría por insumo
   (spec 007), solo que aplicado en bloque a todos los insumos afectados en una sola operación.

`desactivarCategoria`/`reactivarCategoria` (también nuevas, mismo archivo) solo alternan
`desactivadoEn` — no tocan insumos, igual que ya especifica FR-017 (los insumos conservan su
categoría actual).

**Rationale**: `Insumo.categoria` sigue siendo texto libre (spec 008 R1, decisión ya tomada y
reafirmada en Assumptions de esta spec: introducir una FK exigiría migrar Dexie y Supabase,
reescribir filtros/búsqueda/alertas/edición/proyección). Con texto libre, "renombrar" solo tiene
sentido si además actualiza a los insumos que ya usaban el nombre anterior — de lo contrario el
catálogo mostraría un nombre nuevo mientras los insumos existentes quedan con el viejo, lo que el
roadmap describe como "renombrar" pero en realidad sería "duplicar". Reutilizar el mecanismo de
`CambioInsumo`/`reproyectarEnTransaccion` que ya usa `editarInsumo` (spec 007) evita inventar un
segundo camino de escritura para el mismo campo (`Insumo.categoria`), y hereda gratis su
sincronización, su resolución de conflictos por campo (spec 007 FR-021a) y su corrección
automática si el servidor rechazara algún `CambioInsumo` individual por falta de permisos.

**Alternatives considered**:
- *FK `categoriaId` en `Insumo`*: ya evaluada y descartada en la spec 008 research.md R1
  precisamente "por costo"; esta spec no reabre esa decisión.
- *Renombrar sin cascada (solo cambia el catálogo, los insumos existentes quedan con el nombre
  viejo como si fuera texto libre)*: técnicamente más simple, pero contradice lo que un
  administrador espera de "renombrar" y dejaría dos entradas visualmente distintas para el mismo
  grupo de materiales (el nuevo nombre en el selector, el viejo en las tarjetas ya creadas) — un
  resultado confuso, no una corrección.
- *Fusión explícita como acción separada de "renombrar"*: se descarta la distinción — desde la
  perspectiva del administrador, escribir un nombre que ya existe **es** la acción de fusionar; no
  hace falta un flujo aparte (menos superficie de UI, y coincide con "renombrar, fusionar" del
  roadmap tratados como una sola operación con dos resultados posibles).

## R4. Dónde vive cada estado nuevo (Constitution II: extender, no duplicar)

**Decision**:
- `insumosDadosDeBaja: Insumo[]` se agrega a `inventoryStore` (`src/stores/inventoryStore.ts`),
  derivado de la **misma** suscripción `liveQuery(() => db.insumos.toArray())` que ya alimenta
  `insumos` (el filtro `!dadoDeBajaEn` se invierte en el mismo `.next`), en vez de una segunda
  suscripción o un store nuevo.
- Preferencias de notificaciones (`preferenciaStockBajo`/`preferenciaCaducidad`) se agregan a
  `useAlertasStore` (`src/stores/alertasStore.ts`), con su propia suscripción `liveQuery` a la
  nueva tabla local `preferenciasNotificaciones` — mismo store que ya posee `nivelesAvisoDias`
  porque ambas cosas son "cómo se calculan/muestran las alertas", aunque una sincroniza (global) y
  la otra no (local al dispositivo).
- El nombre de la clínica vive en un store nuevo y pequeño, `src/stores/clinicaStore.ts`
  (`useClinicaStore`), con el mismo patrón `liveQuery` que `alertasStore` sobre la nueva tabla
  `configuracionClinica`. No se agrega a `appStore` (que es específicamente estado de conexión/
  shell, sin `liveQuery`) ni a `alertasStore` (dominio distinto: identidad de la clínica, no
  alertas).

**Rationale**: sigue la decisión ya documentada en 008/009 ("extender, no duplicar"): un dato que
ya vive en un store existente y pertenece al mismo dominio se agrega ahí; un dominio nuevo
(identidad de la clínica) se lleva a un store propio y minúsculo en vez de forzarlo dentro de uno
que no lo describe.

## R5. Control de interruptor (switch) sin librería nueva

**Decision**: nuevo componente `src/components/ui/Switch.tsx` — un `<button role="switch"
aria-checked>` de ≥48×48px de área táctil (aunque su marca visual sea más chica), estilado con
Tailwind siguiendo el mismo lenguaje visual que `Badge`/`TouchButton` (colores `primary`/`border`
existentes). Sin dependencias nuevas.

**Rationale**: no existe hoy ningún control de tipo interruptor en `src/components/ui/`; el patrón
más cercano (`aria-pressed` de los tabs de `BottomNav`) no comunica visualmente un estado on/off
binario tan bien como un switch. Es puro Tailwind + accesibilidad nativa (`role="switch"`), cero
costo de dependencias, reutilizable si una spec futura necesita otro toggle.

## R6. Badge de alertas pendientes en `BottomNav`

**Decision**: `BottomNavProps` gana un `alertasBadge?: number` opcional, renderizado como una
burbuja pequeña sobre el ícono `Bell` cuando es `> 0`. `App.tsx` lo calcula con una función pura
nueva, `contarAlertasPendientes(insumos, lotes, movimientos, nivelesAvisoDias, preferencias)` en
`src/features/alertas/lib/resumen.ts`, que sencillamente sanciona `computeInsumosStockBajo`/
`computeAlertasCaducidad` (spec 004, sin cambios) según qué preferencias estén activas y suma
sus longitudes (sin duplicar un insumo que aparece en ambos conjuntos, mismo criterio de unión ya
usado por `computeItemsSugeridos` en la spec 009).

**Rationale**: `BottomNav` ya es puramente presentacional (recibe `active`/`onChange`); agregar un
prop numérico opcional preserva eso sin acoplarlo a los stores. El cálculo del conteo reutiliza
exactamente las funciones de alerta existentes — ninguna regla de umbral nueva — solo cambia qué
subconjunto se cuenta según las preferencias del dispositivo (FR-025/026).

## R7. Ubicación del código nuevo: feature `ajustes/`

**Decision**: nuevo directorio `src/features/ajustes/` (vista y lib propios), que **importa**
—nunca duplica— utilidades de `insumos/lib/catalogo.ts`, `insumos/lib/categorias.ts` y
`alertas/lib/configuracion.ts`. `MasView.tsx` se elimina (su única razón de existir, el puente
"Consumir insumo", ya es redundante — spec 007) y `App.tsx` monta `AjustesView` en su lugar en la
pestaña "mas".

**Rationale**: sigue el patrón por-feature ya establecido (`compras/`, `alertas/`, `insumos/`,
`auth/`); "Ajustes" agrupa suficientes secciones propias (perfil, clínica, categorías, insumos de
baja, notificaciones) como para justificar su propio directorio, en vez de esparcir componentes de
administración dentro de `insumos/` o `alertas/`.
