import { useState } from 'react'
import { Package, PackageMinus, ChevronRight } from '../../../components/icons'
import { Card } from '../../../components/ui/Card'
import { TouchButton } from '../../../components/ui/TouchButton'
import { RegistroForm } from '../../insumos/components/RegistroForm'
import { ConsumoForm } from '../../insumos/components/ConsumoForm'

type Accion = 'registrar' | 'consumir' | null

/**
 * Puente temporal (spec 006 research.md): aloja `RegistroForm`/`ConsumoForm`
 * (specs 002/005, sin modificar) mientras las specs 007-009 reemplazan estos
 * flujos con acciones rápidas, alta de material y recepción de compras.
 */
export function MasView() {
  const [accion, setAccion] = useState<Accion>(null)

  if (accion === 'registrar') {
    return (
      <div className="flex flex-col gap-3">
        <TouchButton type="button" variant="ghost" onClick={() => setAccion(null)}>
          Volver
        </TouchButton>
        <RegistroForm />
      </div>
    )
  }

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
        onClick={() => setAccion('registrar')}
        className="touch-target flex w-full items-center gap-3 px-3.5 text-left"
      >
        <Package size={20} className="text-primary" />
        <span className="flex-1 text-sm font-bold text-text">Registrar insumo</span>
        <ChevronRight size={18} className="text-text-faint" />
      </Card>
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
