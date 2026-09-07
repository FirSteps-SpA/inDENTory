import { useState, type FormEvent } from 'react'
import { db, type Insumo, type Lote } from '../../../lib/db'
import { crearMovimiento } from '../lib/movements'
import { validateQuantity } from '../lib/quantity'
import { ScanButton } from './ScanButton'
import { SearchPicker } from './SearchPicker'

/**
 * User Story 1 (P1, MVP): busca (o crea) un insumo y registra un lote nuevo
 * con proveedor, cantidad y fecha de caducidad (FR-001/FR-002/FR-002a). La
 * cámara nunca se activa en este flujo — la búsqueda manual vía SearchPicker
 * es siempre el punto de entrada (Constitution V).
 */
export function RegistroForm() {
  const [insumo, setInsumo] = useState<Insumo | null>(null)
  const [numeroLote, setNumeroLote] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [fechaCaducidad, setFechaCaducidad] = useState('')
  const [cantidad, setCantidad] = useState('')
  const [codigoFabricante, setCodigoFabricante] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [mensajeExito, setMensajeExito] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  function reiniciar() {
    setInsumo(null)
    setNumeroLote('')
    setProveedor('')
    setFechaCaducidad('')
    setCantidad('')
    setCodigoFabricante('')
    setError(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!insumo) return

    setError(null)
    setMensajeExito(null)

    const cantidadNumerica = Number(cantidad)
    const validacion = validateQuantity(cantidadNumerica, insumo.unidadMedida)
    if (!validacion.valid) {
      setError(validacion.error ?? 'Cantidad inválida.')
      return
    }

    setIsPending(true)
    try {
      const lote: Lote = {
        id: crypto.randomUUID(),
        insumoId: insumo.id,
        numeroLote,
        proveedor,
        fechaCaducidad: insumo.caduca ? fechaCaducidad : null,
        codigoFabricante: codigoFabricante.trim() || null,
        estado: 'activo',
        creadoEn: new Date().toISOString(),
      }
      await db.lotes.add(lote)
      await crearMovimiento({
        tipo: 'ingreso',
        loteId: lote.id,
        cantidad: cantidadNumerica,
      })
      setMensajeExito(`Lote de "${insumo.nombre}" registrado.`)
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
        <SearchPicker
          onSelect={(selected) => {
            setMensajeExito(null)
            setInsumo(selected)
          }}
        />
        <ScanButton
          onSelect={(selected) => {
            setMensajeExito(null)
            setInsumo(selected)
          }}
        />
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

      <label className="flex flex-col gap-1 text-sm">
        Número de lote
        <input
          type="text"
          required
          value={numeroLote}
          onChange={(event) => setNumeroLote(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Proveedor
        <input
          type="text"
          required
          value={proveedor}
          onChange={(event) => setProveedor(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>

      {insumo.caduca && (
        <label className="flex flex-col gap-1 text-sm">
          Fecha de caducidad
          <input
            type="date"
            required
            value={fechaCaducidad}
            onChange={(event) => setFechaCaducidad(event.target.value)}
            className="touch-target rounded border border-gray-300 px-3"
          />
        </label>
      )}

      <label className="flex flex-col gap-1 text-sm">
        Cantidad ({insumo.unidadMedida})
        <input
          type="number"
          step="any"
          required
          value={cantidad}
          onChange={(event) => setCantidad(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        Código de fabricante (opcional)
        <input
          type="text"
          value={codigoFabricante}
          onChange={(event) => setCodigoFabricante(event.target.value)}
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
        disabled={isPending}
        className="touch-target rounded bg-slate-900 px-4 text-white disabled:opacity-50"
      >
        {isPending ? 'Guardando…' : 'Guardar lote'}
      </button>
    </form>
  )
}
