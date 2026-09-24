import { useState } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { useAlertasStore } from '../../../stores/alertasStore'
import { computeInsumosStockBajo } from '../lib/stockBajo'
import { computeAlertasCaducidad } from '../lib/caducidad'
import { lotesEnRevision, marcarLoteResuelto } from '../lib/revision'
import { AlertTriangle } from '../../../components/icons'
import { Badge, type BadgeVariant } from '../../../components/ui/Badge'
import { Card } from '../../../components/ui/Card'
import { TouchButton } from '../../../components/ui/TouchButton'

function badgeVariantParaNivel(nivel: number | 'caducado'): BadgeVariant {
  if (nivel === 'caducado') return 'danger'
  if (nivel === 30) return 'warning-30'
  if (nivel === 7) return 'urgent-7'
  return 'urgent-1'
}

/**
 * Dedicated alerts screen (FR-013): consolidates stock-bajo, caducidad, and
 * revisión-manual alerts in one place. Visible to every authenticated user.
 * The stock-mínimo/niveles-de-aviso configuration controls that used to live
 * here moved to "Ajustes" ▸ Configuración de Alertas (spec 010 FR-006/007/
 * 008) — this view is now dedicated exclusively to displaying alerts.
 */
export function AlertasView() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdministrador = usuario?.rol === 'administrador'

  const insumos = useInventoryStore((s) => s.insumos)
  const lotes = useInventoryStore((s) => s.lotes)
  const movimientos = useInventoryStore((s) => s.movimientos)
  const nivelesAvisoDias = useAlertasStore((s) => s.nivelesAvisoDias)

  const [errorRevision, setErrorRevision] = useState<string | null>(null)

  const alertasStockBajo = computeInsumosStockBajo(insumos, lotes, movimientos)
  const alertasCaducidad = computeAlertasCaducidad(
    insumos,
    lotes,
    movimientos,
    nivelesAvisoDias,
  )
  const alertasRevision = lotesEnRevision(insumos, lotes, movimientos)

  async function handleMarcarResuelto(loteId: string) {
    setErrorRevision(null)
    try {
      await marcarLoteResuelto(loteId)
    } catch (err) {
      setErrorRevision(
        err instanceof Error ? err.message : 'No se pudo marcar como resuelto.',
      )
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <section className="flex flex-col gap-2">
        <h2 className="text-base font-extrabold text-text">Stock bajo</h2>
        {alertasStockBajo.length === 0 ? (
          <Card className="px-3.5 py-2.5">
            <p className="text-sm text-text-muted">
              Ningún insumo está por debajo de su stock mínimo.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasStockBajo.map(({ insumo, stockActual }) => (
              <li key={insumo.id}>
                <Card className="flex items-center justify-between gap-2 bg-danger-bg px-3.5 py-2.5">
                  <span className="text-sm text-text">
                    <span className="font-bold">{insumo.nombre}</span> —{' '}
                    {stockActual} {insumo.unidadMedida} disponibles (mínimo{' '}
                    {insumo.stockMinimo} {insumo.unidadMedida})
                  </span>
                  <Badge variant="danger">Bajo mínimo</Badge>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-extrabold text-text">Próximos a caducar</h2>
        {alertasCaducidad.length === 0 ? (
          <Card className="px-3.5 py-2.5">
            <p className="text-sm text-text-muted">
              Ningún lote está próximo a caducar ni caducado.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasCaducidad.map(({ lote, insumo, diasRestantes, nivel }) => (
              <li key={lote.id}>
                <Card className="flex items-center justify-between gap-2 bg-danger-bg px-3.5 py-2.5">
                  <span className="text-sm text-text">
                    <span className="font-bold">{insumo.nombre}</span> — lote{' '}
                    {lote.numeroLote}, vence {lote.fechaCaducidad} (
                    {nivel === 'caducado'
                      ? `caducado hace ${Math.abs(diasRestantes)} día(s)`
                      : `nivel ${nivel} días`}
                    )
                  </span>
                  <Badge variant={badgeVariantParaNivel(nivel)}>
                    {nivel === 'caducado' ? 'Caducado' : `${nivel} días`}
                  </Badge>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-base font-extrabold text-text">Lotes en revisión</h2>
        {errorRevision && (
          <Card className="bg-danger-bg px-3.5 py-2.5">
            <p role="alert" className="text-sm text-danger">
              {errorRevision}
            </p>
          </Card>
        )}
        {alertasRevision.length === 0 ? (
          <Card className="px-3.5 py-2.5">
            <p className="text-sm text-text-muted">
              Ningún lote está marcado para revisión manual.
            </p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasRevision.map(({ lote, insumo, stockDerivado }) => (
              <li key={lote.id}>
                <Card className="flex items-center justify-between gap-2 bg-danger-bg px-3.5 py-2.5">
                  <span className="flex items-start gap-2 text-sm text-text">
                    <AlertTriangle size={16} className="mt-0.5 shrink-0 text-danger" />
                    <span>
                      <span className="font-bold">{insumo.nombre}</span> — lote{' '}
                      {lote.numeroLote}: stock {stockDerivado} {insumo.unidadMedida}
                    </span>
                  </span>
                  {esAdministrador && (
                    <TouchButton
                      type="button"
                      variant="ghost"
                      onClick={() => void handleMarcarResuelto(lote.id)}
                      className="text-sm"
                    >
                      Marcar como resuelto
                    </TouchButton>
                  )}
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
