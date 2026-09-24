# Contract: UI Components & Domain Functions — Ajustes y Configuración Global

Contratos de comportamiento (no implementación). Todos los controles interactivos nuevos cumplen
`touch-target` (≥48×48px, FR-030), incluido el nuevo `Switch`. Ningún componente de esta spec
activa la cámara.

## `src/components/ui/Switch.tsx` (nuevo)

```ts
export interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/** `<button role="switch" aria-checked>` de ≥48×48px de área táctil (research.md R5). */
export function Switch(props: SwitchProps): JSX.Element
```

## Dominio — `src/features/insumos/lib/proyeccion.ts` (modificado)

```ts
// Antes: la primera CambioInsumo vigente con campo:'baja' siempre gana.
// Ahora: la ÚLTIMA (mayor (creadoEn, id)) gana — igual que cualquier otro campo (research.md R2).
// valorNuevo === true  -> dadoDeBajaEn/dadoDeBajaPor = esa cambio.creadoEn/usuarioId
// valorNuevo === null  -> dadoDeBajaEn/dadoDeBajaPor = null (restaurado)
export function proyectarInsumo(insumo: Insumo, cambios: CambioInsumo[]): Insumo
export function filaParaSubir(insumo: Insumo, cambios: CambioInsumo[]): Insumo
```

Sin cambios de firma — solo cambia qué cambio de `campo: 'baja'` se considera vigente. Todo llamador
existente (`reproyectarEnTransaccion`, `pushInsumos`) sigue funcionando sin modificaciones.

## Dominio — `src/features/insumos/lib/catalogo.ts` (extendido)

```ts
/** Inversa de darDeBajaInsumo (FR-023): CambioInsumo { campo:'baja', valorAnterior: true,
 *  valorNuevo: null } + reproyección, en una transacción. Solo administrador (FR-010). No-op si
 *  el insumo ya está activo. */
export async function restaurarInsumo(insumoId: string): Promise<void>
```

Reutiliza `exigirAdministrador`, `nuevoCambio` y `reproyectarEnTransaccion` ya existentes en el
mismo archivo — mismo patrón exacto que `darDeBajaInsumo`.

## Dominio — `src/features/ajustes/lib/categoriasAdmin.ts` (nuevo)

```ts
/** Crea una categoría desde Ajustes (misma validación/dedup que el alta, spec 008 FR-009/R2),
 *  sin requerir un Insumo en curso. Solo administrador. */
export async function crearCategoriaDesdeAjustes(nombre: string): Promise<void>

export type ResultadoRenombrado = { tipo: 'renombrada' } | { tipo: 'fusionada'; con: string }

/** Renombra o fusiona una categoría creada (FR-015/FR-016, research.md R3): si el nuevo nombre
 *  normalizado no coincide con ninguna otra entrada activa del catálogo, renombra en el lugar; si
 *  coincide, fusiona (la fila se desactiva, el nombre resultante es el de la entrada existente).
 *  En ambos casos, cada Insumo (activo o dado de baja) cuya categoría coincidía por clave con el
 *  nombre anterior recibe un CambioInsumo (campo:'categoria') hacia el nombre resultante, en la
 *  misma transacción. Solo administrador. Rechaza precargadas y "Sin categoría" (FR-019). */
export async function renombrarCategoria(
  categoriaId: string,
  nuevoNombre: string,
): Promise<ResultadoRenombrado>

/** Alterna Categoria.desactivadoEn (FR-017/018). No toca ningún Insumo. Solo administrador.
 *  Rechaza precargadas y "Sin categoría" (FR-019). */
export async function desactivarCategoria(categoriaId: string): Promise<void>
export async function reactivarCategoria(categoriaId: string): Promise<void>
```

## Dominio — `src/features/ajustes/lib/clinica.ts` (nuevo)

```ts
/** Trim; rechaza vacío/solo-espacios (FR-021) devolviendo un mensaje de error en vez de guardar.
 *  Solo administrador. */
export async function guardarNombreClinica(nombre: string): Promise<{ error: string } | void>
```

## Dominio — `src/features/alertas/lib/preferencias.ts` (nuevo)

```ts
export type TipoAlerta = 'stockBajo' | 'caducidad'

/** Alterna una preferencia local (nunca sincronizada, FR-027). Abierto a cualquier usuario
 *  autenticado — es del dispositivo, no de la cuenta. */
export async function actualizarPreferenciaNotificacion(
  tipo: TipoAlerta,
  valor: boolean,
): Promise<void>
```

## Dominio — `src/features/alertas/lib/resumen.ts` (nuevo)

```ts
/** Cuenta alertas pendientes de los tipos habilitados en preferencias (FR-025/026), uniendo
 *  computeInsumosStockBajo/computeAlertasCaducidad (spec 004, sin cambios) sin duplicar un mismo
 *  insumo. 0 si ambas preferencias están desactivadas. */
export function contarAlertasPendientes(
  insumos: Insumo[],
  lotes: Lote[],
  movimientos: Movimiento[],
  nivelesAvisoDias: number[],
  preferencias: { stockBajo: boolean; caducidad: boolean },
): number
```

## `src/app/BottomNav.tsx` (extendido)

```ts
export interface BottomNavProps {
  active: Vista
  onChange: (vista: Vista) => void
  alertasBadge?: number // nuevo: burbuja sobre el ícono Bell cuando es > 0 (FR-026)
}
```

## `src/features/ajustes/components/AjustesView.tsx` (nuevo, reemplaza `MasView.tsx`)

```ts
function AjustesView(): JSX.Element // sin props
```

Secciones en orden (FR-002): `PerfilSection` y `NotificacionesSection` (todo usuario);
`ConfiguracionAlertasSection` (stock mínimo + niveles de aviso, relocalizada de `AlertasView`),
`ClinicaSection`, `CategoriasSection` e `InsumosBajaSection` (solo `esAdministrador`, mismo criterio
que ya usa `AlertasView`). Cada sección admin-only está completamente ausente del árbol para un
no-administrador (FR-003), no solo deshabilitada.

## `src/features/alertas/components/AlertasView.tsx` (reducido)

Se retiran las dos secciones "Configurar stock mínimo por insumo" y "Configurar niveles de aviso de
caducidad" (FR-006/007/008) — su JSX y sus manejadores (`handleStockMinimoChange`,
`handleNivelesAvisoChange`) se mueven tal cual a `ConfiguracionAlertasSection.tsx`, reutilizando sin
cambios `actualizarStockMinimo`/`actualizarNivelesAviso` de `alertas/lib/configuracion.ts`.
`AlertasView` conserva únicamente stock bajo, próximos a caducar y lotes en revisión.

## `src/app/AppHeader.tsx` (modificado)

La etiqueta fija `"Gabinete"` se reemplaza por `nombreClinica ?? 'Gabinete'` (`useClinicaStore`,
FR-020/021) — único cambio en este componente.
