import { ShoppingCart } from '../../../components/icons'
import { Card } from '../../../components/ui/Card'

/**
 * Destino navegable mínimo (spec 006 FR-015): la gestión completa de
 * reabastecimiento llega en la spec 009 del roadmap.
 */
export function ComprasPlaceholder() {
  return (
    <Card className="flex flex-col items-center gap-2 px-4 py-8 text-center">
      <ShoppingCart size={28} className="text-primary" />
      <h2 className="text-base font-extrabold text-text">Compras</h2>
      <p className="text-sm text-text-muted">
        La gestión de lista de compras y reabastecimiento estará disponible
        próximamente.
      </p>
    </Card>
  )
}
