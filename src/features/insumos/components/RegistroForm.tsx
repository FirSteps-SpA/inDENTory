import { useState, type FormEvent } from 'react'
import { db, type Insumo, type Lote } from '../../../lib/db'
import { crearMovimiento } from '../lib/movements'
import { validateQuantity } from '../lib/quantity'
import { ScanButton } from './ScanButton'
import { SearchPicker } from './SearchPicker'
import { mesesRestantes } from '../../../lib/dateMath'
import { Hash, Calendar, Truck, Plus, Minus } from '../../../components/icons'
import { Card } from '../../../components/ui/Card'
import { IconField } from '../../../components/ui/IconField'
import { TouchButton } from '../../../components/ui/TouchButton'

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

  function ajustarCantidad(delta: number) {
    const actual = Number(cantidad) || 0
    const siguiente = actual + delta
    setCantidad(siguiente > 0 ? String(siguiente) : '')
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
          <Card className="bg-success-bg px-3.5 py-2.5">
            <p role="status" className="text-sm text-success-text">
              {mensajeExito}
            </p>
          </Card>
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

  const vidaUtil = insumo.caduca ? mesesRestantes(fechaCaducidad) : null

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-4"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-text">{insumo.nombre}</p>
        <TouchButton type="button" variant="ghost" onClick={reiniciar} className="text-sm">
          Cambiar insumo
        </TouchButton>
      </div>

      <IconField label="Número de lote" icon={<Hash size={18} />} htmlFor="numero-lote">
        <input
          id="numero-lote"
          type="text"
          required
          value={numeroLote}
          onChange={(event) => setNumeroLote(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>

      <IconField label="Proveedor" icon={<Truck size={18} />} htmlFor="proveedor">
        <input
          id="proveedor"
          type="text"
          required
          value={proveedor}
          onChange={(event) => setProveedor(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>

      {insumo.caduca && (
        <IconField
          label="Fecha de caducidad"
          icon={<Calendar size={18} />}
          htmlFor="fecha-caducidad"
          hint={
            vidaUtil !== null
              ? `Vida útil restante estimada: ${vidaUtil} ${vidaUtil === 1 ? 'mes' : 'meses'}`
              : undefined
          }
        >
          <input
            id="fecha-caducidad"
            type="date"
            required
            value={fechaCaducidad}
            onChange={(event) => setFechaCaducidad(event.target.value)}
            className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
          />
        </IconField>
      )}

      <div className="flex flex-col gap-1.5 text-sm font-bold text-text">
        <label htmlFor="cantidad">Cantidad ({insumo.unidadMedida})</label>
        <div className="flex items-stretch gap-2">
          <TouchButton
            type="button"
            variant="ghost"
            onClick={() => ajustarCantidad(-1)}
            aria-label="Restar uno"
          >
            <Minus size={16} />
          </TouchButton>
          <div className="touch-target flex flex-1 items-center justify-center rounded-xl border border-border bg-surface">
            <input
              id="cantidad"
              type="number"
              step="any"
              required
              value={cantidad}
              onChange={(event) => setCantidad(event.target.value)}
              className="w-full border-none bg-transparent text-center text-[15px] font-extrabold text-text outline-none"
            />
          </div>
          <TouchButton
            type="button"
            variant="ghost"
            onClick={() => ajustarCantidad(1)}
            aria-label="Sumar uno"
          >
            <Plus size={16} />
          </TouchButton>
        </div>
      </div>

      <IconField
        label="Código de fabricante (opcional)"
        htmlFor="codigo-fabricante"
      >
        <input
          id="codigo-fabricante"
          type="text"
          value={codigoFabricante}
          onChange={(event) => setCodigoFabricante(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>

      {error && (
        <Card className="bg-danger-bg px-3.5 py-2.5">
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        </Card>
      )}

      <TouchButton type="submit" disabled={isPending}>
        {isPending ? 'Guardando…' : 'Guardar lote'}
      </TouchButton>
    </form>
  )
}
