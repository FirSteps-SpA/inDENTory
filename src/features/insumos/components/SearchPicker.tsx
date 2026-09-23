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
import { Search } from '../../../components/icons'
import { Card } from '../../../components/ui/Card'
import { IconField } from '../../../components/ui/IconField'
import { TouchButton } from '../../../components/ui/TouchButton'

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
    <div className="flex flex-col gap-4">
      <IconField
        label="Buscar insumo"
        icon={<Search size={18} />}
        htmlFor="buscar-insumo"
      >
        <input
          id="buscar-insumo"
          type="text"
          value={texto}
          onChange={(event) => {
            setTexto(event.target.value)
            setMostrarCrearInsumo(false)
          }}
          placeholder="Nombre del insumo"
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>

      {categorias.length > 0 && (
        <div className="flex gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setCategoria('')}
            aria-pressed={categoria === ''}
            className={`touch-target shrink-0 rounded-full px-4 text-sm font-bold ${
              categoria === '' ? 'bg-primary text-white' : 'border border-border text-text-muted'
            }`}
          >
            Todas
          </button>
          {categorias.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategoria(c)}
              aria-pressed={categoria === c}
              className={`touch-target shrink-0 rounded-full px-4 text-sm font-bold ${
                categoria === c ? 'bg-primary text-white' : 'border border-border text-text-muted'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {!categoria && !texto.trim() && resultados.length > 0 && (
        <p className="text-xs font-bold uppercase tracking-wide text-text-faint">
          Selección rápida
        </p>
      )}

      <ul className="flex flex-col gap-2">
        {resultados.map((insumo) => (
          <li key={insumo.id}>
            <Card
              as="button"
              type="button"
              onClick={() => onSelect(insumo)}
              className="touch-target flex w-full items-center gap-3 px-3.5 text-left"
            >
              <span className="text-sm font-bold text-text">{insumo.nombre}</span>
              <span className="text-xs text-text-muted">({insumo.categoria})</span>
            </Card>
          </li>
        ))}
      </ul>

      {sinCoincidencias && !mostrarCrearInsumo && (
        <Card className="flex flex-col gap-2 p-3.5">
          <p className="text-sm text-text-muted">
            No se encontraron insumos para &quot;{texto}&quot;.
          </p>
          <TouchButton
            type="button"
            variant="secondary"
            onClick={() => setMostrarCrearInsumo(true)}
          >
            Crear insumo nuevo
          </TouchButton>
        </Card>
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
      dadoDeBajaEn: null,
      dadoDeBajaPor: null,
    }
    await db.insumos.add(insumo)
    onCreated(insumo)
  }

  return (
    <Card
      as="form"
      onSubmit={(event: FormEvent<HTMLFormElement>) => void handleSubmit(event)}
      className="flex flex-col gap-3 p-3.5"
    >
      <IconField label="Nombre" htmlFor="nuevo-insumo-nombre">
        <input
          id="nuevo-insumo-nombre"
          type="text"
          required
          value={nombre}
          onChange={(event) => setNombre(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>
      <IconField label="Categoría" htmlFor="nuevo-insumo-categoria">
        <input
          id="nuevo-insumo-categoria"
          type="text"
          required
          value={categoria}
          onChange={(event) => setCategoria(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>
      <label className="flex flex-col gap-1.5 text-sm font-bold text-text">
        Unidad de medida
        <select
          value={unidadMedida}
          onChange={(event) =>
            setUnidadMedida(
              event.target.value as (typeof UNIDADES_MEDIDA)[number],
            )
          }
          className="touch-target rounded-xl border border-border bg-surface px-3.5 text-[15px] font-normal text-text"
        >
          {UNIDADES_MEDIDA.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </label>
      <label className="touch-target flex items-center gap-2 text-sm text-text">
        <input
          type="checkbox"
          checked={noCaduca}
          onChange={(event) => setNoCaduca(event.target.checked)}
        />
        Este insumo no caduca (p. ej. instrumental reutilizable)
      </label>
      <IconField
        label="Código de fabricante (opcional)"
        htmlFor="nuevo-insumo-codigo"
      >
        <input
          id="nuevo-insumo-codigo"
          type="text"
          value={codigoFabricante}
          onChange={(event) => setCodigoFabricante(event.target.value)}
          className="h-full w-full border-none bg-transparent text-[15px] text-text outline-none"
        />
      </IconField>
      <div className="flex gap-2">
        <TouchButton type="submit" className="flex-1">
          Guardar insumo
        </TouchButton>
        <TouchButton type="button" variant="ghost" onClick={onCancel} className="flex-1">
          Cancelar
        </TouchButton>
      </div>
    </Card>
  )
}
