import { useState, type FormEvent } from 'react'
import { db, type Insumo } from '../../../lib/db'
import {
  categoriasDisponibles,
  insumosRecientes,
  searchInsumosPorCategoria,
  searchInsumosPorTexto,
  useInventoryStore,
} from '../../../stores/inventoryStore'
import { permiteDecimales } from '../lib/quantity'

const UNIDADES_MEDIDA = ['pieza', 'caja', 'mL', 'g'] as const

interface SearchPickerProps {
  /** Búsqueda manual ágil como flujo primario (Constitution V) — nunca requiere la cámara. */
  onSelect: (insumo: Insumo) => void
}

/**
 * Búsqueda por texto, categoría, y selección rápida (FR-001/FR-004/FR-010),
 * con un flujo de "crear insumo nuevo" inline cuando la búsqueda no
 * encuentra coincidencias (FR-003, FR-002a). Todos los objetivos táctiles
 * cumplen ≥48x48px (Constitution III).
 */
export function SearchPicker({ onSelect }: SearchPickerProps) {
  const insumos = useInventoryStore((s) => s.insumos)
  const [texto, setTexto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [mostrarCrearInsumo, setMostrarCrearInsumo] = useState(false)

  const categorias = categoriasDisponibles(insumos)
  const resultados = categoria
    ? searchInsumosPorCategoria(insumos, categoria)
    : texto.trim()
      ? searchInsumosPorTexto(insumos, texto)
      : insumosRecientes(insumos)

  const sinCoincidencias = texto.trim() !== '' && resultados.length === 0

  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        Buscar insumo
        <input
          type="text"
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value)
            setMostrarCrearInsumo(false)
          }}
          placeholder="Nombre del insumo"
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>

      {categorias.length > 0 && (
        <label className="flex flex-col gap-1 text-sm">
          Categoría
          <select
            value={categoria}
            onChange={(event) => setCategoria(event.target.value)}
            className="touch-target rounded border border-gray-300 px-3"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}

      {!categoria && !texto.trim() && resultados.length > 0 && (
        <p className="text-xs text-gray-500">Selección rápida</p>
      )}

      <ul className="flex flex-col gap-2">
        {resultados.map((insumo) => (
          <li key={insumo.id}>
            <button
              type="button"
              onClick={() => onSelect(insumo)}
              className="touch-target w-full rounded border border-gray-300 px-3 text-left"
            >
              {insumo.nombre}{' '}
              <span className="text-xs text-gray-500">
                ({insumo.categoria})
              </span>
            </button>
          </li>
        ))}
      </ul>

      {sinCoincidencias && !mostrarCrearInsumo && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-gray-600">
            No se encontraron insumos para &quot;{texto}&quot;.
          </p>
          <button
            type="button"
            onClick={() => setMostrarCrearInsumo(true)}
            className="touch-target rounded border border-gray-300 px-4"
          >
            Crear insumo nuevo
          </button>
        </div>
      )}

      {mostrarCrearInsumo && (
        <CrearInsumoForm
          nombreInicial={texto}
          onCreated={(insumo) => {
            setMostrarCrearInsumo(false)
            onSelect(insumo)
          }}
          onCancel={() => setMostrarCrearInsumo(false)}
        />
      )}
    </div>
  )
}

interface CrearInsumoFormProps {
  nombreInicial: string
  onCreated: (insumo: Insumo) => void
  onCancel: () => void
}

function CrearInsumoForm({
  nombreInicial,
  onCreated,
  onCancel,
}: CrearInsumoFormProps) {
  const [nombre, setNombre] = useState(nombreInicial)
  const [categoria, setCategoria] = useState('')
  const [unidadMedida, setUnidadMedida] = useState<
    (typeof UNIDADES_MEDIDA)[number]
  >(UNIDADES_MEDIDA[0])
  const [noCaduca, setNoCaduca] = useState(false)
  const [codigoFabricante, setCodigoFabricante] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const insumo: Insumo = {
      id: crypto.randomUUID(),
      nombre: nombre.trim(),
      categoria: categoria.trim(),
      unidadMedida,
      permiteDecimales: permiteDecimales(unidadMedida),
      caduca: !noCaduca,
      codigoFabricante: codigoFabricante.trim() || null,
      creadoEn: new Date().toISOString(),
      stockMinimo: null,
    }
    await db.insumos.add(insumo)
    onCreated(insumo)
  }

  return (
    <form
      onSubmit={(event) => void handleSubmit(event)}
      className="flex flex-col gap-3 rounded border border-gray-300 p-3"
    >
      <label className="flex flex-col gap-1 text-sm">
        Nombre
        <input
          type="text"
          required
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Categoría
        <input
          type="text"
          required
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
          className="touch-target rounded border border-gray-300 px-3"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        Unidad de medida
        <select
          value={unidadMedida}
          onChange={(event) =>
            setUnidadMedida(
              event.target.value as (typeof UNIDADES_MEDIDA)[number],
            )
          }
          className="touch-target rounded border border-gray-300 px-3"
        >
          {UNIDADES_MEDIDA.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="touch-target flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={noCaduca}
          onChange={(event) => setNoCaduca(event.target.checked)}
        />
        Este insumo no caduca (p. ej. instrumental reutilizable)
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
      <div className="flex gap-2">
        <button
          type="submit"
          className="touch-target flex-1 rounded bg-slate-900 px-4 text-white"
        >
          Guardar insumo
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="touch-target flex-1 rounded border border-gray-300 px-4"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
