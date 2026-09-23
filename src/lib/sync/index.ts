import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseStatus } from '../supabase'
import {
  db,
  type CambioInsumo,
  type ConfiguracionAlertas,
  type Insumo,
  type Lote,
  type Movimiento,
} from '../db'
import { fetchPerfilPropio } from '../supabase/perfiles'
import {
  filaParaSubir,
  reproyectarInsumos,
} from '../../features/insumos/lib/proyeccion'
import { useAuthStore } from '../../stores/authStore'
import { useAvisosStore } from '../../stores/avisosStore'
import { reconcileOverdraft } from './reconcileOverdraft'

interface InsumoRow {
  id: string
  nombre: string
  categoria: string
  unidad_medida: string
  permite_decimales: boolean
  caduca: boolean
  codigo_fabricante: string | null
  creado_en: string
  stock_minimo: number | null
  dado_de_baja_en?: string | null
  dado_de_baja_por?: string | null
}

interface ConfiguracionAlertasRow {
  id: 'global'
  niveles_aviso_dias: number[]
}

interface LoteRow {
  id: string
  insumo_id: string
  numero_lote: string
  proveedor: string
  fecha_caducidad: string | null
  codigo_fabricante: string | null
  estado: 'activo' | 'revision'
  creado_en: string
}

interface CambioInsumoRow {
  id: string
  insumo_id: string
  campo: CambioInsumo['campo']
  valor_anterior: CambioInsumo['valorAnterior']
  valor_nuevo: CambioInsumo['valorNuevo']
  usuario_id: string
  creado_en: string
}

interface MovimientoRow {
  id: string
  tipo: Movimiento['tipo']
  lote_id: string
  cantidad: number
  usuario_id: string
  movimiento_origen_id: string | null
  creado_en: string
}

function toInsumoRow(insumo: Insumo): InsumoRow {
  return {
    id: insumo.id,
    nombre: insumo.nombre,
    categoria: insumo.categoria,
    unidad_medida: insumo.unidadMedida,
    permite_decimales: insumo.permiteDecimales,
    caduca: insumo.caduca,
    codigo_fabricante: insumo.codigoFabricante,
    creado_en: insumo.creadoEn,
    stock_minimo: insumo.stockMinimo,
    dado_de_baja_en: insumo.dadoDeBajaEn,
    dado_de_baja_por: insumo.dadoDeBajaPor,
  }
}

function fromInsumoRow(row: InsumoRow): Insumo {
  return {
    id: row.id,
    nombre: row.nombre,
    categoria: row.categoria,
    unidadMedida: row.unidad_medida,
    permiteDecimales: row.permite_decimales,
    caduca: row.caduca,
    codigoFabricante: row.codigo_fabricante,
    creadoEn: row.creado_en,
    stockMinimo: row.stock_minimo,
    dadoDeBajaEn: row.dado_de_baja_en ?? null,
    dadoDeBajaPor: row.dado_de_baja_por ?? null,
  }
}

function toConfiguracionAlertasRow(
  config: ConfiguracionAlertas,
): ConfiguracionAlertasRow {
  return {
    id: config.id,
    niveles_aviso_dias: config.nivelesAvisoDias,
  }
}

function fromConfiguracionAlertasRow(
  row: ConfiguracionAlertasRow,
): ConfiguracionAlertas {
  return {
    id: row.id,
    nivelesAvisoDias: row.niveles_aviso_dias,
  }
}

function toLoteRow(lote: Lote): LoteRow {
  return {
    id: lote.id,
    insumo_id: lote.insumoId,
    numero_lote: lote.numeroLote,
    proveedor: lote.proveedor,
    fecha_caducidad: lote.fechaCaducidad,
    codigo_fabricante: lote.codigoFabricante,
    estado: lote.estado,
    creado_en: lote.creadoEn,
  }
}

function fromLoteRow(row: LoteRow): Lote {
  return {
    id: row.id,
    insumoId: row.insumo_id,
    numeroLote: row.numero_lote,
    proveedor: row.proveedor,
    fechaCaducidad: row.fecha_caducidad,
    codigoFabricante: row.codigo_fabricante,
    estado: row.estado,
    creadoEn: row.creado_en,
  }
}

function toCambioInsumoRow(cambio: CambioInsumo): CambioInsumoRow {
  return {
    id: cambio.id,
    insumo_id: cambio.insumoId,
    campo: cambio.campo,
    valor_anterior: cambio.valorAnterior,
    valor_nuevo: cambio.valorNuevo,
    usuario_id: cambio.usuarioId,
    creado_en: cambio.creadoEn,
  }
}

function fromCambioInsumoRow(row: CambioInsumoRow): CambioInsumo {
  return {
    id: row.id,
    insumoId: row.insumo_id,
    campo: row.campo,
    valorAnterior: row.valor_anterior,
    valorNuevo: row.valor_nuevo,
    usuarioId: row.usuario_id,
    creadoEn: row.creado_en,
    sincronizado: true,
    rechazadoEn: null,
  }
}

function toMovimientoRow(movimiento: Movimiento): MovimientoRow {
  return {
    id: movimiento.id,
    tipo: movimiento.tipo,
    lote_id: movimiento.loteId,
    cantidad: movimiento.cantidad,
    usuario_id: movimiento.usuarioId,
    movimiento_origen_id: movimiento.movimientoOrigenId,
    creado_en: movimiento.creadoEn,
  }
}

function fromMovimientoRow(row: MovimientoRow): Movimiento {
  return {
    id: row.id,
    tipo: row.tipo,
    loteId: row.lote_id,
    cantidad: row.cantidad,
    usuarioId: row.usuario_id,
    movimientoOrigenId: row.movimiento_origen_id,
    creadoEn: row.creado_en,
    sincronizado: true,
  }
}

/**
 * Pushes every local insumo row with its not-yet-synced cambios undone
 * (`filaParaSubir`, feature 007): the remote row never runs ahead of
 * `cambios_insumo`, so a cambio the server later rejects (FR-021b) can't
 * leak to other devices through the RLS-less `insumos` table.
 */
async function pushInsumos(client: SupabaseClient): Promise<void> {
  const insumos = await db.insumos.toArray()
  if (insumos.length === 0) return
  const cambios = await db.cambiosInsumo.toArray()
  await client
    .from('insumos')
    .upsert(
      insumos.map((insumo) => toInsumoRow(filaParaSubir(insumo, cambios))),
    )
}

function esRechazoDePermisos(
  error: { code?: string; message?: string } | null,
): boolean {
  if (!error) return false
  return (
    error.code === '42501' || /row-level security/i.test(error.message ?? '')
  )
}

/**
 * Pushes pending `cambiosInsumo` (feature 007, contracts/supabase-schema.md
 * step 2), marking rows synced only when the upsert succeeds. A batch failing
 * on RLS is retried row by row so a rejected cambio can't block valid ones;
 * each row rejected for lack of permissions is marked `rechazadoEn` (kept for
 * audit, never re-pushed). Any other error leaves everything pending for the
 * next cycle. Returns the cambios newly rejected in this cycle.
 */
async function pushCambiosInsumo(
  client: SupabaseClient,
): Promise<CambioInsumo[]> {
  const pendientes = (await db.cambiosInsumo.toArray()).filter(
    (cambio) => !cambio.sincronizado && cambio.rechazadoEn === null,
  )
  if (pendientes.length === 0) return []

  const { error } = await client
    .from('cambios_insumo')
    .upsert(pendientes.map(toCambioInsumoRow))
  if (!error) {
    await db.cambiosInsumo.bulkUpdate(
      pendientes.map((cambio) => ({
        key: cambio.id,
        changes: { sincronizado: true },
      })),
    )
    return []
  }
  if (!esRechazoDePermisos(error)) return []

  const rechazados: CambioInsumo[] = []
  for (const cambio of pendientes) {
    const { error: errorFila } = await client
      .from('cambios_insumo')
      .upsert(toCambioInsumoRow(cambio))
    if (!errorFila) {
      await db.cambiosInsumo.update(cambio.id, { sincronizado: true })
    } else if (esRechazoDePermisos(errorFila)) {
      await db.cambiosInsumo.update(cambio.id, {
        rechazadoEn: new Date().toISOString(),
      })
      rechazados.push(cambio)
    }
  }
  return rechazados
}

async function pullCambiosInsumo(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.from('cambios_insumo').select('*')
  if (error || !data) return
  await db.cambiosInsumo.bulkPut(
    (data as CambioInsumoRow[]).map(fromCambioInsumoRow),
  )
}

/**
 * After a permissions rejection (FR-021b): tell the user once per affected
 * insumo and refresh their cached role, so "Editar"/"Eliminar" disappear.
 */
async function notificarRechazos(
  client: SupabaseClient,
  rechazados: CambioInsumo[],
): Promise<void> {
  const insumoIds = [...new Set(rechazados.map((cambio) => cambio.insumoId))]
  for (const insumoId of insumoIds) {
    const insumo = await db.insumos.get(insumoId)
    useAvisosStore.getState().agregar({
      tipo: 'cambio-rechazado',
      movimientoId: null,
      loteId: null,
      insumoNombre: insumo?.nombre ?? 'un insumo',
      unidadMedida: null,
    })
  }

  const usuario = useAuthStore.getState().usuario
  if (!usuario) return
  const perfil = await fetchPerfilPropio(client, usuario.id)
  if (perfil) await useAuthStore.getState().actualizarRol(perfil.rol)
}

async function pushLotes(client: SupabaseClient): Promise<void> {
  const lotes = await db.lotes.toArray()
  if (lotes.length === 0) return
  await client.from('lotes').upsert(lotes.map(toLoteRow))
}

/** Pushes unsynced movimientos and returns the loteIds of any `consumo` rows just pushed. */
async function pushMovimientos(client: SupabaseClient): Promise<string[]> {
  const todos = await db.movimientos.toArray()
  const pendientes = todos.filter((movimiento) => !movimiento.sincronizado)
  if (pendientes.length === 0) return []

  await client.from('movimientos').upsert(pendientes.map(toMovimientoRow))
  await db.movimientos.bulkUpdate(
    pendientes.map((movimiento) => ({
      key: movimiento.id,
      changes: { sincronizado: true },
    })),
  )

  return pendientes
    .filter((movimiento) => movimiento.tipo === 'consumo')
    .map((movimiento) => movimiento.loteId)
}

/** Pushes the local global config row, if one has ever been saved (feature 004, FR-005). */
async function pushConfiguracionAlertas(client: SupabaseClient): Promise<void> {
  const config = await db.configuracionAlertas.get('global')
  if (!config) return
  await client
    .from('configuracion_alertas')
    .upsert(toConfiguracionAlertasRow(config))
}

async function pullInsumos(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.from('insumos').select('*')
  if (error || !data) return
  await db.insumos.bulkPut((data as InsumoRow[]).map(fromInsumoRow))
}

async function pullLotes(client: SupabaseClient): Promise<void> {
  const { data, error } = await client.from('lotes').select('*')
  if (error || !data) return
  await db.lotes.bulkPut((data as LoteRow[]).map(fromLoteRow))
}

/** Pulls the remote global config row, if one has ever been saved (feature 004, FR-005). */
async function pullConfiguracionAlertas(client: SupabaseClient): Promise<void> {
  const { data, error } = await client
    .from('configuracion_alertas')
    .select('*')
    .eq('id', 'global')
    .maybeSingle()
  if (error || !data) return
  await db.configuracionAlertas.put(
    fromConfiguracionAlertasRow(data as ConfiguracionAlertasRow),
  )
}

/** Pulls remote movimientos and returns the loteIds of any `consumo` rows pulled. */
async function pullMovimientos(client: SupabaseClient): Promise<string[]> {
  const { data, error } = await client.from('movimientos').select('*')
  if (error || !data) return []
  const rows = data as MovimientoRow[]
  await db.movimientos.bulkPut(rows.map(fromMovimientoRow))
  return rows.filter((row) => row.tipo === 'consumo').map((row) => row.lote_id)
}

/**
 * One push+pull sync cycle (contracts/supabase-schema.md's sync contract):
 * push unsynced local movimientos and the current insumos/lotes (idempotent
 * upserts), pull remote changes by id, then reconcile every lot touched by a
 * `consumo` movement in this batch (FR-012, FR-014). Never throws — a
 * missing/unreachable backend simply skips the cycle (Constitution I).
 *
 * Feature 007 order for the catalog (specs/007 contracts/supabase-schema.md):
 * insumos first (so `cambios_insumo.insumo_id`'s FK is satisfied) → cambios
 * → pull cambios → pull insumos → one reprojection from the ledger, which
 * resolves concurrent edits per field on every device identically.
 */
export async function runSyncBatch(): Promise<void> {
  const { client, error } = getSupabaseStatus()
  if (error) return

  const loteIdsTocados = new Set<string>()

  await pushInsumos(client)
  const rechazados = await pushCambiosInsumo(client)
  await pullCambiosInsumo(client)
  await pullInsumos(client)
  await reproyectarInsumos()
  if (rechazados.length > 0) await notificarRechazos(client, rechazados)

  await pushLotes(client)
  await pushConfiguracionAlertas(client)
  for (const loteId of await pushMovimientos(client)) {
    loteIdsTocados.add(loteId)
  }

  await pullLotes(client)
  await pullConfiguracionAlertas(client)
  for (const loteId of await pullMovimientos(client)) {
    loteIdsTocados.add(loteId)
  }

  for (const loteId of loteIdsTocados) {
    await reconcileOverdraft(loteId)
  }
}

/**
 * Starts the background sync loop (Constitution I: incremental, resilient,
 * never blocking the UI). Returns a stop function to clear the interval.
 */
export function startBackgroundSync(intervalMs = 30_000): () => void {
  const tick = () => {
    void runSyncBatch().catch((err: unknown) => {
      console.error('[inDENTory] Error de sincronización:', err)
    })
  }
  tick()
  const id = setInterval(tick, intervalMs)
  return () => clearInterval(id)
}
