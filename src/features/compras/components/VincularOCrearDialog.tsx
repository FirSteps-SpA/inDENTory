import { useState } from 'react'
import type { ItemCompra } from '../../../lib/db'
import { marcarCompradoSinInventario } from '../lib/itemsManuales'
import { AltaMaterialView } from '../../insumos/components/AltaMaterialView'
import { BottomSheet } from '../../../components/ui/BottomSheet'
import { TouchButton } from '../../../components/ui/TouchButton'

export interface VincularOCrearDialogProps {
  item: ItemCompra
  onDone: () => void
  onCancelar: () => void
}

/**
 * FR-012: un ítem manual sin vincular marcado como recibido ofrece crear el
 * material (reutiliza `AltaMaterialView`, spec 008, sin cambios —
 * research.md R6) o marcarlo comprado sin afectar el inventario.
 */
export function VincularOCrearDialog({ item, onDone, onCancelar }: VincularOCrearDialogProps) {
  const [creandoMaterial, setCreandoMaterial] = useState(false)
  const [isPending, setIsPending] = useState(false)

  async function handleSinInventario() {
    setIsPending(true)
    try {
      await marcarCompradoSinInventario(item.id)
      onDone()
    } finally {
      setIsPending(false)
    }
  }

  async function handleMaterialCreado() {
    await marcarCompradoSinInventario(item.id)
    onDone()
  }

  if (creandoMaterial) {
    return (
      <AltaMaterialView
        nombreInicial={item.nombre}
        onCreated={() => void handleMaterialCreado()}
        onCancel={() => setCreandoMaterial(false)}
        onAbrirExistente={() => void handleMaterialCreado()}
      />
    )
  }

  return (
    <BottomSheet titulo={item.nombre} onClose={onCancelar}>
      <p className="text-sm text-text">
        Este ítem no está vinculado a ningún material del catálogo.
      </p>
      <div className="flex flex-col gap-2">
        <TouchButton type="button" onClick={() => setCreandoMaterial(true)}>
          Crear material
        </TouchButton>
        <TouchButton
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => void handleSinInventario()}
        >
          {isPending ? 'Guardando…' : 'Marcar como comprado sin inventario'}
        </TouchButton>
      </div>
    </BottomSheet>
  )
}
