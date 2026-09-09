import { useState } from 'react'
import { useAuthStore } from '../../../stores/authStore'
import { useInventoryStore } from '../../../stores/inventoryStore'
import { useAlertasStore } from '../../../stores/alertasStore'
import { computeInsumosStockBajo } from '../lib/stockBajo'
import { computeAlertasCaducidad } from '../lib/caducidad'
import { lotesEnRevision, marcarLoteResuelto } from '../lib/revision'
import { actualizarStockMinimo, actualizarNivelesAviso } from '../lib/configuracion'

/**
 * Dedicated alerts screen (FR-013): consolidates stock-bajo, caducidad, and
 * revisión-manual alerts in one place. Visible to every authenticated user;
 * only an administrador sees the threshold-configuration controls
 * (Clarifications Q2, research.md's client-side role-gating decision).
 */
export function AlertasView() {
  const usuario = useAuthStore((s) => s.usuario)
  const esAdministrador = usuario?.rol === 'administrador'

  const insumos = useInventoryStore((s) => s.insumos)
  const lotes = useInventoryStore((s) => s.lotes)
  const movimientos = useInventoryStore((s) => s.movimientos)
  const nivelesAvisoDias = useAlertasStore((s) => s.nivelesAvisoDias)

  const [errorConfig, setErrorConfig] = useState<string | null>(null)
  const [errorNiveles, setErrorNiveles] = useState<string | null>(null)
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

  async function handleStockMinimoChange(insumoId: string, valor: string) {
    setErrorConfig(null)
    const numero = valor.trim() === '' ? null : Number(valor)
    try {
      await actualizarStockMinimo(insumoId, numero)
    } catch (err) {
      setErrorConfig(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  async function handleNivelesAvisoChange(valor: string) {
    setErrorNiveles(null)
    const dias = valor
      .split(',')
      .map((parte) => Number(parte.trim()))
      .filter((n) => !Number.isNaN(n))
    try {
      await actualizarNivelesAviso(dias)
    } catch (err) {
      setErrorNiveles(err instanceof Error ? err.message : 'No se pudo guardar.')
    }
  }

  return (
    <div className="flex w-full flex-col gap-6 text-left">
      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Stock bajo</h2>
        {alertasStockBajo.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ningún insumo está por debajo de su stock mínimo.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasStockBajo.map(({ insumo, stockActual }) => (
              <li
                key={insumo.id}
                className="rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm"
              >
                <span className="font-medium">{insumo.nombre}</span> —{' '}
                {stockActual} {insumo.unidadMedida} disponibles (mínimo{' '}
                {insumo.stockMinimo} {insumo.unidadMedida})
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Próximos a caducar</h2>
        {alertasCaducidad.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ningún lote está próximo a caducar ni caducado.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasCaducidad.map(({ lote, insumo, diasRestantes, nivel }) => (
              <li
                key={lote.id}
                className={
                  nivel === 'caducado'
                    ? 'rounded border border-red-500 bg-red-50 px-3 py-2 text-sm'
                    : 'rounded border border-amber-400 bg-amber-50 px-3 py-2 text-sm'
                }
              >
                <span className="font-medium">{insumo.nombre}</span> — lote{' '}
                {lote.numeroLote}, vence {lote.fechaCaducidad} (
                {nivel === 'caducado'
                  ? `caducado hace ${Math.abs(diasRestantes)} día(s)`
                  : `nivel ${nivel} días`}
                )
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Lotes en revisión</h2>
        {errorRevision && (
          <p role="alert" className="text-sm text-red-600">
            {errorRevision}
          </p>
        )}
        {alertasRevision.length === 0 ? (
          <p className="text-sm text-gray-600">
            Ningún lote está marcado para revisión manual.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {alertasRevision.map(({ lote, insumo, stockDerivado }) => (
              <li
                key={lote.id}
                className="flex items-center justify-between gap-2 rounded border border-red-500 bg-red-50 px-3 py-2 text-sm"
              >
                <span>
                  <span className="font-medium">{insumo.nombre}</span> — lote{' '}
                  {lote.numeroLote}: stock {stockDerivado} {insumo.unidadMedida}
                </span>
                {esAdministrador && (
                  <button
                    type="button"
                    onClick={() => void handleMarcarResuelto(lote.id)}
                    className="touch-target rounded border border-gray-300 px-3"
                  >
                    Marcar como resuelto
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {esAdministrador && (
        <>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              Configurar stock mínimo por insumo
            </h2>
            {errorConfig && (
              <p role="alert" className="text-sm text-red-600">
                {errorConfig}
              </p>
            )}
            <ul className="flex flex-col gap-2">
              {insumos.map((insumo) => (
                <li
                  key={insumo.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span>{insumo.nombre}</span>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    placeholder="Sin mínimo"
                    defaultValue={insumo.stockMinimo ?? ''}
                    onBlur={(event) =>
                      void handleStockMinimoChange(insumo.id, event.target.value)
                    }
                    aria-label={`Stock mínimo de ${insumo.nombre}`}
                    className="touch-target w-32 rounded border border-gray-300 px-3"
                  />
                </li>
              ))}
            </ul>
          </section>

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">
              Configurar niveles de aviso de caducidad
            </h2>
            {errorNiveles && (
              <p role="alert" className="text-sm text-red-600">
                {errorNiveles}
              </p>
            )}
            <label className="flex flex-col gap-1 text-sm">
              Días antes de caducar (separados por coma)
              <input
                type="text"
                defaultValue={nivelesAvisoDias.join(', ')}
                onBlur={(event) =>
                  void handleNivelesAvisoChange(event.target.value)
                }
                aria-label="Niveles de aviso de caducidad, en días"
                className="touch-target rounded border border-gray-300 px-3"
              />
            </label>
          </section>
        </>
      )}
    </div>
  )
}
