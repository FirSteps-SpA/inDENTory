import { db, type CambioInsumo, type Insumo } from '../../../lib/db'
import { permiteDecimales } from './quantity'

/** Orden total y determinista del ledger: `(creadoEn, id)` (research.md R9). */
function compararCambios(a: CambioInsumo, b: CambioInsumo): number {
  if (a.creadoEn !== b.creadoEn) return a.creadoEn < b.creadoEn ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

type FilaEditable = Record<string, unknown>

/**
 * Deshace sobre `fila` los `cambios` dados, campo por campo, devolviendo cada
 * campo al `valorAnterior` del cambio más antiguo de ese campo — el valor que
 * tenía la fila antes de que se aplicaran. Una `'baja'` deshecha deja el
 * insumo activo.
 */
function deshacerCambios(fila: Insumo, cambios: CambioInsumo[]): void {
  const vistos = new Set<string>()
  for (const cambio of [...cambios].sort(compararCambios)) {
    if (vistos.has(cambio.campo)) continue
    vistos.add(cambio.campo)
    if (cambio.campo === 'baja') {
      fila.dadoDeBajaEn = null
      fila.dadoDeBajaPor = null
    } else {
      ;(fila as unknown as FilaEditable)[cambio.campo] = cambio.valorAnterior
    }
  }
}

/**
 * Proyecta la fila `Insumo` desde su ledger de cambios (spec 007 FR-021a,
 * data-model.md): por cada campo gana el cambio con mayor `(creadoEn, id)`;
 * cualquier cambio `'baja'` deja el insumo dado de baja con los datos del
 * **primero** (la baja prevalece sobre ediciones concurrentes). Un cambio
 * rechazado por el servidor (FR-021b) no participa y además se deshace sobre
 * la fila, que pudo haberlo recibido al guardarse localmente. Pura: el mismo
 * conjunto de cambios produce la misma fila en cualquier dispositivo, sin
 * importar el orden en que llegaron.
 */
export function proyectarInsumo(
  insumo: Insumo,
  cambios: CambioInsumo[],
): Insumo {
  const delInsumo = cambios.filter((cambio) => cambio.insumoId === insumo.id)
  const vigentes = delInsumo
    .filter((cambio) => cambio.rechazadoEn === null)
    .sort(compararCambios)

  const proyectado: Insumo = { ...insumo }
  deshacerCambios(
    proyectado,
    delInsumo.filter((cambio) => cambio.rechazadoEn !== null),
  )

  for (const cambio of vigentes) {
    if (cambio.campo === 'baja') continue
    // Ascending order: each later cambio overwrites the previous winner.
    ;(proyectado as unknown as FilaEditable)[cambio.campo] = cambio.valorNuevo
  }

  const primeraBaja = vigentes.find((cambio) => cambio.campo === 'baja')
  if (primeraBaja) {
    proyectado.dadoDeBajaEn = primeraBaja.creadoEn
    proyectado.dadoDeBajaPor = primeraBaja.usuarioId
  }
  proyectado.permiteDecimales = permiteDecimales(proyectado.unidadMedida)
  return proyectado
}

/**
 * Fila a subir a Supabase (contracts/supabase-schema.md, paso 1): la fila
 * local con los cambios aún no sincronizados deshechos. Así la fila remota
 * nunca adelanta un cambio que el servidor todavía no aceptó en
 * `cambios_insumo` (o que rechazó) — cada dispositivo lo aplica desde el
 * ledger al reproyectar, y un cambio rechazado nunca llega a los demás a
 * través de `insumos`, que no tiene RLS.
 */
export function filaParaSubir(insumo: Insumo, cambios: CambioInsumo[]): Insumo {
  const pendientes = cambios.filter(
    (cambio) => cambio.insumoId === insumo.id && !cambio.sincronizado,
  )
  if (pendientes.length === 0) return insumo
  const fila: Insumo = { ...insumo }
  deshacerCambios(fila, pendientes)
  // A synced baja still stands even if a later pending one is undone.
  const bajaSincronizada = cambios
    .filter(
      (cambio) =>
        cambio.insumoId === insumo.id &&
        cambio.sincronizado &&
        cambio.rechazadoEn === null &&
        cambio.campo === 'baja',
    )
    .sort(compararCambios)[0]
  if (bajaSincronizada) {
    fila.dadoDeBajaEn = bajaSincronizada.creadoEn
    fila.dadoDeBajaPor = bajaSincronizada.usuarioId
  }
  fila.permiteDecimales = permiteDecimales(fila.unidadMedida)
  return fila
}

function mismaFila(a: Insumo, b: Insumo): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}

/**
 * Reproyecta filas ya dentro de una transacción `rw` sobre insumos +
 * cambiosInsumo — para quien ya tiene una abierta (catalogo.ts).
 */
export async function reproyectarEnTransaccion(
  insumoIds?: string[],
): Promise<void> {
  const cambios = await db.cambiosInsumo.toArray()
  const ids = insumoIds ?? [
    ...new Set(cambios.map((cambio) => cambio.insumoId)),
  ]

  for (const id of ids) {
    const insumo = await db.insumos.get(id)
    if (!insumo) continue
    const proyectado = proyectarInsumo(
      insumo,
      cambios.filter((cambio) => cambio.insumoId === id),
    )
    if (!mismaFila(insumo, proyectado)) await db.insumos.put(proyectado)
  }
}

/**
 * Aplica la proyección a Dexie para los insumos indicados (o todos los que
 * tengan cambios) — usado por la sincronización tras bajar cambios/filas.
 */
export async function reproyectarInsumos(insumoIds?: string[]): Promise<void> {
  await db.transaction('rw', db.insumos, db.cambiosInsumo, () =>
    reproyectarEnTransaccion(insumoIds),
  )
}
