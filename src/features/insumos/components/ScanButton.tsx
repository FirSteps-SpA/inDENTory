import { useRef, useState } from 'react'
import { useBarcodeScanner } from '../../../lib/scanner/useBarcodeScanner'
import type { Insumo, Lote } from '../../../lib/db'
import {
  findInsumoPorCodigo,
  findLotePorCodigo,
  useInventoryStore,
} from '../../../stores/inventoryStore'

interface ScanButtonProps {
  /** Selecciona igual que la búsqueda manual — `lote` solo si el código escaneado era de lote. */
  onSelect: (insumo: Insumo, lote?: Lote) => void
}

/**
 * Canal alternativo de selección, siempre bajo acción explícita del usuario
 * (FR-008/FR-009, Constitution V) — la cámara nunca se activa al montar este
 * componente, solo dentro de `iniciarEscaneo`. Un código no reconocido o una
 * cámara no disponible muestra un mensaje explícito y deja continuar por
 * búsqueda manual sin reiniciar el formulario (FR-011).
 */
export function ScanButton({ onSelect }: ScanButtonProps) {
  const insumos = useInventoryStore((s) => s.insumos)
  const lotes = useInventoryStore((s) => s.lotes)
  const { scan, stop } = useBarcodeScanner()
  const videoRef = useRef<HTMLVideoElement>(null)
  const [activo, setActivo] = useState(false)
  const [mensaje, setMensaje] = useState<string | null>(null)

  async function iniciarEscaneo() {
    setMensaje(null)
    setActivo(true)
    const video = videoRef.current
    if (!video) {
      setActivo(false)
      return
    }

    const resultado = await scan(video)
    setActivo(false)

    if (resultado.status === 'unavailable') {
      setMensaje(resultado.message)
      return
    }
    if (resultado.status === 'no-match') {
      setMensaje('Código no reconocido. Puedes continuar por búsqueda manual.')
      return
    }

    const insumoPorCodigo = findInsumoPorCodigo(insumos, resultado.codigo)
    if (insumoPorCodigo) {
      onSelect(insumoPorCodigo)
      return
    }

    const lotePorCodigo = findLotePorCodigo(lotes, resultado.codigo)
    const insumoDelLote = lotePorCodigo
      ? insumos.find((insumo) => insumo.id === lotePorCodigo.insumoId)
      : undefined
    if (lotePorCodigo && insumoDelLote) {
      onSelect(insumoDelLote, lotePorCodigo)
      return
    }

    setMensaje('Código no reconocido. Puedes continuar por búsqueda manual.')
  }

  function cancelar() {
    stop()
    setActivo(false)
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => void iniciarEscaneo()}
        disabled={activo}
        className="touch-target rounded border border-gray-300 px-4 disabled:opacity-50"
      >
        {activo ? 'Escaneando…' : 'Escanear'}
      </button>

      {activo && (
        <div className="flex flex-col gap-2">
          <video ref={videoRef} muted playsInline className="w-full rounded" />
          <button
            type="button"
            onClick={cancelar}
            className="touch-target rounded border border-gray-300 px-4"
          >
            Cancelar
          </button>
        </div>
      )}

      {mensaje && (
        <p role="status" className="text-sm text-gray-600">
          {mensaje}
        </p>
      )}
    </div>
  )
}
