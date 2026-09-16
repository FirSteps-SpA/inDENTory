import type { SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseStatus } from '../supabase'
import {
  db,
  type ConfiguracionAlertas,
  type Insumo,
  type Lote,
  type Movimiento,
} from '../db'
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

async function pushInsumos(client: SupabaseClient): Promise<void> {
  const insumos = await db.insumos.toArray()
  if (insumos.length === 0) return
  await client.from('insumos').upsert(insumos.map(toInsumoRow))
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
 */
export async function runSyncBatch(): Promise<void> {
  const { client, error } = getSupabaseStatus()
  if (error) return

  const loteIdsTocados = new Set<string>()

  await pushInsumos(client)
  await pushLotes(client)
  await pushConfiguracionAlertas(client)
  for (const loteId of await pushMovimientos(client)) {
    loteIdsTocados.add(loteId)
  }

  await pullInsumos(client)
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
