import type { Categoria, Insumo } from '../../../lib/db'

/**
 * Categorías precargadas (spec 008 research.md R1): constantes de código,
 * nunca filas — disponibles sin conexión desde el primer uso (FR-010).
 */
export const CATEGORIAS_PRECARGADAS = [
  'Cirugía',
  'Restauración',
  'Tratamientos pulpares',
  'Fresas',
] as const

export const SIN_CATEGORIA = 'Sin categoría'

/**
 * Plegado de acentos/mayúsculas compartido con `sugerirMateriales`
 * (research.md R2/R8) — sin trim ni colapso de espacios, para poder usarse
 * también sobre substrings de búsqueda.
 */
export function plegar(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es')
}

/**
 * Clave normalizada de una categoría (research.md R2): trim → sin acentos →
 * minúsculas → espacios colapsados. Punto único de verdad para deduplicar
 * "Restauración"/"restauracion"/"RESTAURACIÓN".
 */
export function claveCategoria(nombre: string): string {
  return plegar(nombre.trim()).replace(/\s+/g, ' ')
}

export interface CategoriaCatalogo {
  clave: string
  nombre: string
  origen: 'precargada' | 'sin-categoria' | 'creada' | 'texto-libre'
}

const CLAVE_SIN_CATEGORIA = claveCategoria(SIN_CATEGORIA)

function compararCategorias(a: Categoria, b: Categoria): number {
  if (a.creadoEn !== b.creadoEn) return a.creadoEn < b.creadoEn ? -1 : 1
  if (a.id === b.id) return 0
  return a.id < b.id ? -1 : 1
}

/**
 * Selector de alta/edición (FR-009, research.md R1/R2): funde precargadas,
 * filas `Categoria` no rechazadas (la más antigua por clave gana) y nombres
 * de texto libre presentes en insumos activos (el primero en orden
 * alfabético gana), alfabético y con "Sin categoría" siempre al final.
 */
export function catalogoCategorias(
  categorias: Categoria[],
  insumosActivos: Insumo[],
): CategoriaCatalogo[] {
  const porClave = new Map<string, CategoriaCatalogo>()

  for (const nombre of CATEGORIAS_PRECARGADAS) {
    porClave.set(claveCategoria(nombre), {
      clave: claveCategoria(nombre),
      nombre,
      origen: 'precargada',
    })
  }

  const creadas = categorias
    .filter((categoria) => categoria.rechazadoEn === null)
    .sort(compararCategorias)
  for (const fila of creadas) {
    const clave = claveCategoria(fila.nombre)
    if (clave === CLAVE_SIN_CATEGORIA) continue
    if (!porClave.has(clave)) {
      porClave.set(clave, { clave, nombre: fila.nombre, origen: 'creada' })
    }
  }

  const textoLibre = [...new Set(insumosActivos.map((insumo) => insumo.categoria))]
    .filter((nombre) => nombre.trim() !== '')
    .sort((a, b) => a.localeCompare(b, 'es'))
  for (const nombre of textoLibre) {
    const clave = claveCategoria(nombre)
    if (clave === CLAVE_SIN_CATEGORIA) continue
    if (!porClave.has(clave)) {
      porClave.set(clave, { clave, nombre, origen: 'texto-libre' })
    }
  }

  const resultado = [...porClave.values()].sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  )
  resultado.push({
    clave: CLAVE_SIN_CATEGORIA,
    nombre: SIN_CATEGORIA,
    origen: 'sin-categoria',
  })
  return resultado
}

/** Chips del Inventario (FR-011a): solo claves con ≥1 insumo activo. */
export function categoriasEnUso(
  categorias: Categoria[],
  insumosActivos: Insumo[],
): CategoriaCatalogo[] {
  const clavesEnUso = new Set(
    insumosActivos.map((insumo) => claveCategoria(insumo.categoria)),
  )
  return catalogoCategorias(categorias, insumosActivos).filter((entrada) =>
    clavesEnUso.has(entrada.clave),
  )
}

/** Nombre canónico si la clave existe en el catálogo; `null` si sería nueva (FR-012). */
export function resolverCategoria(
  nombre: string,
  catalogo: CategoriaCatalogo[],
): string | null {
  const clave = claveCategoria(nombre)
  return catalogo.find((entrada) => entrada.clave === clave)?.nombre ?? null
}
