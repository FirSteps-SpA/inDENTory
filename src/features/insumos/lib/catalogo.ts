import {
  db,
  type CambioInsumo,
  type CampoEditableInsumo,
  type Insumo,
} from '../../../lib/db'
import { useAuthStore } from '../../../stores/authStore'
import { categoriasDisponibles } from '../../../stores/inventoryStore'
import { reproyectarEnTransaccion } from './proyeccion'
import { permiteDecimales } from './quantity'

/** Mismas unidades que el alta de insumos (spec 002, `SearchPicker`). */
export const UNIDADES_MEDIDA = ['pieza', 'caja', 'mL', 'g'] as const

export type CambiosInsumoInput = Partial<Pick<Insumo, CampoEditableInsumo>>

export type ValidacionEdicion =
  | { valido: true }
  | { valido: false; errores: Partial<Record<CampoEditableInsumo, string>> }

const CAMPOS_EDITABLES: CampoEditableInsumo[] = [
  'nombre',
  'categoria',
  'unidadMedida',
  'stockMinimo',
  'codigoFabricante',
  'caduca',
]

function claveNombre(nombre: string): string {
  return nombre.trim().toLocaleLowerCase('es')
}

/** Normaliza lo escrito en el formulario al valor que se persiste. */
function normalizar(cambios: CambiosInsumoInput): CambiosInsumoInput {
  const normalizados: CambiosInsumoInput = { ...cambios }
  if (normalizados.nombre !== undefined)
    normalizados.nombre = normalizados.nombre.trim()
  if (normalizados.codigoFabricante !== undefined) {
    normalizados.codigoFabricante =
      normalizados.codigoFabricante?.trim() || null
  }
  return normalizados
}

/**
 * Validación de la edición de un insumo (spec 007 FR-014, data-model.md).
 * Devuelve un mensaje por campo inválido, para mostrarlo junto al campo.
 */
export function validarEdicionInsumo(
  insumo: Insumo,
  cambios: CambiosInsumoInput,
  insumosActivos: Insumo[],
): ValidacionEdicion {
  const resultado = { ...insumo, ...normalizar(cambios) }
  const errores: Partial<Record<CampoEditableInsumo, string>> = {}

  if (!resultado.nombre) {
    errores.nombre = 'Ingresa el nombre comercial.'
  } else if (
    insumosActivos.some(
      (otro) =>
        otro.id !== insumo.id &&
        claveNombre(otro.nombre) === claveNombre(resultado.nombre),
    )
  ) {
    errores.nombre = 'Ya existe otro insumo con ese nombre.'
  }

  if (!categoriasDisponibles(insumosActivos).includes(resultado.categoria)) {
    errores.categoria = 'Elige una categoría existente.'
  }

  if (
    !(UNIDADES_MEDIDA as readonly string[]).includes(resultado.unidadMedida)
  ) {
    errores.unidadMedida = 'Elige una unidad de medida válida.'
  }

  const minimo = resultado.stockMinimo
  if (minimo !== null) {
    if (!Number.isFinite(minimo) || minimo < 0) {
      errores.stockMinimo =
        'El stock mínimo debe ser un número mayor o igual a 0.'
    } else if (
      !permiteDecimales(resultado.unidadMedida) &&
      !Number.isInteger(minimo)
    ) {
      errores.stockMinimo = `La unidad "${resultado.unidadMedida}" no admite decimales.`
    }
  }

  return Object.keys(errores).length === 0
    ? { valido: true }
    : { valido: false, errores }
}

function exigirAdministrador(accion: string): string {
  const usuario = useAuthStore.getState().usuario
  if (usuario?.rol !== 'administrador') {
    throw new Error(`Solo un administrador puede ${accion} insumos.`)
  }
  return usuario.id
}

function nuevoCambio(
  insumoId: string,
  campo: CambioInsumo['campo'],
  valorAnterior: CambioInsumo['valorAnterior'],
  valorNuevo: CambioInsumo['valorNuevo'],
  usuarioId: string,
): CambioInsumo {
  return {
    id: crypto.randomUUID(),
    insumoId,
    campo,
    valorAnterior,
    valorNuevo,
    usuarioId,
    creadoEn: new Date().toISOString(),
    sincronizado: false,
    rechazadoEn: null,
  }
}

/**
 * Edita los datos de producto de un insumo (spec 007 FR-013/FR-015): solo
 * administradores (FR-012), validado (FR-014), y registrado como un
 * `CambioInsumo` por campo realmente modificado en la misma transacción que
 * reproyecta la fila (FR-021a). Nunca toca lotes ni movimientos. Un guardado
 * sin diferencias no escribe nada.
 */
export async function editarInsumo(
  insumoId: string,
  cambios: CambiosInsumoInput,
): Promise<void> {
  const usuarioId = exigirAdministrador('editar')
  const normalizados = normalizar(cambios)

  await db.transaction('rw', db.insumos, db.cambiosInsumo, async () => {
    const insumo = await db.insumos.get(insumoId)
    if (!insumo) throw new Error('El insumo no existe.')

    const activos = (await db.insumos.toArray()).filter((i) => !i.dadoDeBajaEn)
    const validacion = validarEdicionInsumo(insumo, normalizados, activos)
    if (!validacion.valido) {
      throw new Error(Object.values(validacion.errores).join(' '))
    }

    const nuevos = CAMPOS_EDITABLES.filter(
      (campo) => campo in normalizados && normalizados[campo] !== insumo[campo],
    ).map((campo) =>
      nuevoCambio(
        insumoId,
        campo,
        insumo[campo],
        normalizados[campo] ?? null,
        usuarioId,
      ),
    )
    if (nuevos.length === 0) return

    await db.cambiosInsumo.bulkAdd(nuevos)
    await reproyectarEnTransaccion([insumoId])
  })
}

/**
 * Baja lógica (spec 007 FR-018): solo administradores; un `CambioInsumo`
 * `'baja'` + reproyección. No escribe movimientos aunque quede stock
 * (Clarification Q5) — lotes e historial quedan intactos.
 */
export async function darDeBajaInsumo(insumoId: string): Promise<void> {
  const usuarioId = exigirAdministrador('eliminar')

  await db.transaction('rw', db.insumos, db.cambiosInsumo, async () => {
    const insumo = await db.insumos.get(insumoId)
    if (!insumo) throw new Error('El insumo no existe.')
    if (insumo.dadoDeBajaEn) return

    await db.cambiosInsumo.add(
      nuevoCambio(insumoId, 'baja', null, true, usuarioId),
    )
    await reproyectarEnTransaccion([insumoId])
  })
}
