import { useEffect, useState, type FormEvent } from 'react'
import { db, type Insumo, type Lote } from '../../../lib/db'
import { selectFefoLot, type LoteConStock } from '../lib/fefo'
import { crearMovimiento } from '../lib/movements'
import { computeStockLote } from '../lib/stock'
import { validateQuantity } from '../lib/quantity'
import {
  lotesDeInsumo,
  useInventoryStore,
} from '../../../stores/inventoryStore'
import { ScanButton } from './ScanButton'
import { SearchPicker } from './SearchPicker'

/**
 * User Story 2 (P2): busca un insumo y confirma una cantidad de consumo,
 * descontada por defecto del lote más próximo a caducar (FEFO, FR-006), con
 * override manual, rechazando cualquier sobreconsumo sin escribir movimiento
 * (FR-007).
 */
export function ConsumoForm() {
  const lotesCache = useInventoryStore((s) => s.lotes)
  const [insumo, setInsumo] = useState<Insumo | null>(null)
  const [lotesConStock, setLotesConStock] = useState<LoteConStock[]>([])
  // Only set by a user action (manual override in the <select>, or a scan
  // matching a specific lote) — never by an effect — so the FEFO default
  // below stays a plain derived value instead of duplicated state.
  const [loteOverrideId, setLoteOverrideId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (!insumo) return

    let cancelado = false
    async function cargarStock() {
      const lotesDelInsumo = lotesDeInsumo(lotesCache, insumo!.id)
      const conStock = await Promise.all(
        lotesDelInsumo.map(async (lote) => {
          const movimientos = await db.movimientos
            .where('loteId')
            .equals(lote.id)
            .toArray()
          return { lote, stockDisponible: computeStockLote(movimientos) }
        }),
      )
      if (cancelado) return
      setLotesConStock(conStock)
    }
    void cargarStock()
    return () => {
      cancelado = true
    }
  }, [insumo, lotesCache])

  const cantidadNumerica = Number(cantidad) || 0
  const loteSeleccionado = loteOverrideId
    ? (lotesConStock.find((entry) => entry.lote.id === loteOverrideId) ?? null)
    : selectFefoLot(lotesConStock, cantidadNumerica)

  function seleccionarInsumo(selected: Insumo, lote?: Lote) {
    setMensajeExito(null)
    setLotesConStock([])
    setLoteOverrideId(lote?.id ?? null)
    setInsumo(selected)
  }

  function reiniciar() {
    setInsumo(null)
    setLotesConStock([])
    setLoteOverrideId(null)
    setCantidad('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!insumo) return

    setError(null)
    setMensajeExito(null)

    if (!loteSeleccionado) {
      setError('No hay lotes disponibles para este insumo.')
      return
    }

    const validacion = validateQuantity(cantidadNumerica, insumo.unidadMedida)
    if (!validacion.valid) {
      setError(validacion.error ?? 'Cantidad inválida.')
      return
    }

    if (cantidadNumerica > loteSeleccionado.stockDisponible) {
      setError(
        `Stock insuficiente en el lote ${loteSeleccionado.lote.numeroLote}: ` +
          `disponible ${loteSeleccionado.stockDisponible} ${insumo.unidadMedida}.`,
      )
      return
    }

    setIsPending(true)
    try {
      await crearMovimiento({
        tipo: 'consumo',
        loteId: loteSeleccionado.lote.id,
        cantidad: cantidadNumerica,
      })
      setMensajeExito(`Consumo de "${insumo.nombre}" registrado.`)
      reiniciar()
    } finally {
      setIsPending(false)
    }
  }

  if (!insumo) {
    return (
      <div className="flex flex-col gap-3">
        {mensajeExito && (
          <p role="status" className="text-sm text-green-700">
            {mensajeExito}
          </p>
        )}
        <SearchPicker onSelect={seleccionarInsumo} />
        <ScanButton onSelect={seleccionarInsumo} />
      </div>
    )
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-3"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{insumo.nombre}</p>
        <button
          type="button"
          onClick={reiniciar}
          className="touch-target rounded border border-gray-300 px-3 text-sm"
        >
          Cambiar insumo
        </button>
      </div>

      {lotesConStock.length === 0 ? (
        <p className="text-sm text-gray-600">
          No hay lotes disponibles para este insumo.
        </p>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          Lote (por defecto, el más próximo a caducar)
          <select
            value={loteSeleccionado?.lote.id ?? ''}
            onChange={(event) => setLoteOverrideId(event.target.value)}
            className="touch-target rounded border border-gray-300 px-3"
          >
            {lotesConStock.map(({ lote, stockDisponible }) => (
              <option key={lote.id} value={lote.id}>
                {lote.numeroLote} —{' '}
                {lote.fechaCaducidad
                  ? `vence ${lote.fechaCaducidad}`
                  : 'sin fecha de caducidad'}{' '}
                — disponible {stockDisponible} {insumo.unidadMedida}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Cantidad a consumir ({insumo.unidadMedida})
        <input
          type="number"
          step="any"
          required
          value={cantidad}
          onChange={(event) => setCantidad(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || lotesConStock.length === 0}
        className="touch-target rounded bg-slate-900 px-4 text-white disabled:opacity-50"
      >
        {isPending ? 'Guardando…' : 'Confirmar consumo'}
      </button>
    </form>
  )
}
