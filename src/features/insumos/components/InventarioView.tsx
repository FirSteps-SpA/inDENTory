import { useState } from 'react'
import {
  useInventoryStore,
  searchInsumosPorTexto,
  searchInsumosPorCategoria,
  searchInsumosPorEstado,
  categoriasDisponibles,
} from '../../../stores/inventoryStore'
import { useAlertasStore } from '../../../stores/alertasStore'
import { computeInsumosStockBajo } from '../../alertas/lib/stockBajo'
import { computeAlertasCaducidad } from '../../alertas/lib/caducidad'
import { computeEstadoInsumo, type Estado } from '../lib/estado'
import { ResumenAlertasBanner } from './ResumenAlertasBanner'
import { InsumoFiltros } from './InsumoFiltros'
import { InsumoCard } from './InsumoCard'
import { InsumoDetalle } from './InsumoDetalle'
import { Card } from '../../../components/ui/Card'
import { TouchButton } from '../../../components/ui/TouchButton'

/**
 * Pantalla principal por defecto (spec 006 FR-002): resumen de alertas +
 * búsqueda/filtros/listado de insumos + detalle de solo lectura. Dueña del
 * estado de filtros/selección (research.md) — el detalle (User Story 3) se
 * renderiza condicionalmente sin desmontar este árbol, para que
 * texto/categoria/estado sobrevivan a abrir y cerrar el detalle (FR-011).
 */
export function InventarioView() {
  const insumos = useInventoryStore((s) => s.insumos)
  const lotes = useInventoryStore((s) => s.lotes)
  const movimientos = useInventoryStore((s) => s.movimientos)
  const nivelesAvisoDias = useAlertasStore((s) => s.nivelesAvisoDias)

  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [estado, setEstado] = useState<Estado[]>([])
  const [insumoSeleccionadoId, setInsumoSeleccionadoId] = useState<
    string | null
  >(null)

  const totalCaducidad = computeAlertasCaducidad(
    insumos,
    lotes,
    movimientos,
    nivelesAvisoDias,
  ).length
  const totalStockBajo = computeInsumosStockBajo(
    insumos,
    lotes,
    movimientos,
  ).length

  const estadosInsumo = computeEstadoInsumo(
    insumos,
    lotes,
    movimientos,
    nivelesAvisoDias,
  )
  const idsTexto = new Set(
    searchInsumosPorTexto(insumos, texto).map((insumo) => insumo.id),
  )
  const idsCategoria = new Set(
    searchInsumosPorCategoria(insumos, categoria).map((insumo) => insumo.id),
  )
  const resultados = searchInsumosPorEstado(estadosInsumo, estado).filter(
    (e) => idsTexto.has(e.insumo.id) && idsCategoria.has(e.insumo.id),
  )

  const hayFiltrosActivos = texto.trim() !== '' || categoria !== '' || estado.length > 0

  function limpiarFiltros() {
    setTexto('')
    setCategoria('')
    setEstado([])
  }

  return (
    <div className="flex w-full flex-col gap-4 text-left">
      <ResumenAlertasBanner
        totalCaducidad={totalCaducidad}
        totalStockBajo={totalStockBajo}
        onFiltrarCaducidad={() => setEstado(['caducado', 'proximo-a-caducar'])}
        onFiltrarStockBajo={() => setEstado(['bajo-stock'])}
      />

      <InsumoFiltros
        texto={texto}
        onTextoChange={setTexto}
        categorias={categoriasDisponibles(insumos)}
        categoria={categoria}
        onCategoriaChange={setCategoria}
        estado={estado}
        onEstadoChange={setEstado}
        onSelectDesdeEscaneo={(insumo) => setInsumoSeleccionadoId(insumo.id)}
      />

      <ul className="flex flex-col gap-2">
        {resultados.map((estadoInsumo) => (
          <li key={estadoInsumo.insumo.id}>
            <InsumoCard
              estadoInsumo={estadoInsumo}
              onOpen={setInsumoSeleccionadoId}
            />
          </li>
        ))}
      </ul>

      {resultados.length === 0 && insumos.length === 0 && (
        <Card className="flex flex-col gap-2 px-3.5 py-3">
          <p className="text-sm text-text-muted">
            Aún no hay insumos en el inventario.
          </p>
        </Card>
      )}

      {resultados.length === 0 && insumos.length > 0 && (
        <Card className="flex flex-col gap-2 px-3.5 py-3">
          <p className="text-sm text-text-muted">
            Ningún insumo coincide con la búsqueda o los filtros.
          </p>
          {hayFiltrosActivos && (
            <TouchButton type="button" variant="secondary" onClick={limpiarFiltros}>
              Limpiar filtros
            </TouchButton>
          )}
        </Card>
      )}

      {insumoSeleccionadoId &&
        (() => {
          const insumoSeleccionado = insumos.find(
            (insumo) => insumo.id === insumoSeleccionadoId,
          )
          if (!insumoSeleccionado) return null
          return (
            <InsumoDetalle
              insumo={insumoSeleccionado}
              lotes={lotes.filter((lote) => lote.insumoId === insumoSeleccionadoId)}
              movimientos={movimientos}
              onClose={() => setInsumoSeleccionadoId(null)}
            />
          )
        })()}
    </div>
  )
}
