import { useState } from 'react'
import { PackageMinus, ChevronRight } from '../../../components/icons'
import { Card } from '../../../components/ui/Card'
import { TouchButton } from '../../../components/ui/TouchButton'
import { ConsumoForm } from '../../insumos/components/ConsumoForm'

type Accion = 'consumir' | null

/**
 * Puente temporal (spec 006 research.md): aloja `ConsumoForm` (spec 005, sin
 * modificar) mientras futuras specs reemplazan ese flujo con acciones
 * rápidas. "Registrar insumo" se retiró en la spec 009: "Compras" es ahora
 * el único punto de entrada para ingresar stock a un material existente.
 */
export function MasView() {
  const [accion, setAccion] = useState<Accion>(null)

  if (accion === 'consumir') {
    return (
      <div className="flex flex-col gap-3">
        <TouchButton type="button" variant="ghost" onClick={() => setAccion(null)}>
          Volver
        </TouchButton>
        <ConsumoForm />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <Card
        as="button"
        type="button"
        onClick={() => setAccion('consumir')}
        className="touch-target flex w-full items-center gap-3 px-3.5 text-left"
      >
        <PackageMinus size={20} className="text-primary" />
        <span className="flex-1 text-sm font-bold text-text">Consumir insumo</span>
        <ChevronRight size={18} className="text-text-faint" />
      </Card>
    </div>
  )
}
