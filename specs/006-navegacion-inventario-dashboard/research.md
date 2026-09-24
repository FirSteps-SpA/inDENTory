# Phase 0 Research: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

No quedan marcadores `NEEDS CLARIFICATION` abiertos — la sesión de clarificación de la spec ya
resolvió el alcance de la búsqueda (FR-005), el volumen de datos esperado y la accesibilidad del
indicador de estado (FR-009). Las decisiones de abajo cubren las preguntas de forma de
implementación que quedan antes del diseño de Fase 1.

## Qué pasa con Registrar y Consumir mientras 007-009 no aterrizan

- **Decision**: `RegistroForm` y `ConsumoForm` (specs 002/005) se mantienen sin ningún cambio de
  código, pero pierden su pestaña dedicada en `BottomNav`. Durante el período en que solo existe
  esta spec (antes de que 007 dé acciones rápidas de consumo, 008 dé el alta de material, y 009
  dé la recepción de compras), ambos formularios se montan desde una pantalla puente nueva,
  `MasView`, alojada temporalmente detrás de la pestaña "Más".
- **Rationale**: La spec 006 (FR-010/Assumptions) deja el detalle de insumo como solo lectura y
  delega explícitamente las acciones de consumo/edición a la spec 007. Si `RegistroForm`/
  `ConsumoForm` simplemente desaparecieran de la navegación sin un punto de acceso alternativo,
  la app perdería temporalmente la capacidad de registrar entradas de stock o consumos con
  cantidad personalizada — una regresión funcional real para cualquier release intermedio entre
  006 y 009, aunque ninguna de las dos cosas esté en el alcance de esta spec. Colgarlos sin
  modificar detrás de "Más" preserva 100% del comportamiento y las pruebas existentes
  (`tests/integration/registro.test.tsx`, `tests/integration/consumo.test.tsx` siguen renderizando
  los componentes directamente, sin pasar por `App.tsx`, así que no requieren cambios) mientras la
  pestaña "Más" cumple su propio requisito de existir como destino navegable (FR-015).
- **Alternatives considered**: Quitar `RegistroForm`/`ConsumoForm` de la navegación sin
  reemplazo — rechazado, es una regresión de capacidad no pedida por ninguna spec. Adelantar el
  trabajo de la spec 007 (acciones rápidas) dentro de esta spec — rechazado, excede el alcance
  definido y las Assumptions de la spec 006, y duplicaría esfuerzo cuando 007 lo formalice con su
  propio flujo de UX. Poner el puente dentro de la pestaña "Compras" en vez de "Más" — rechazado,
  "Compras" tiene su propio significado futuro (spec 009) que no tiene relación con
  registrar/consumir, mientras que "Más" es explícitamente el destino de funciones
  administrativas/secundarias (spec 010), un mejor lugar semántico para un puente temporal.

## Cómo derivar el estado de salud por insumo (badge de la tarjeta)

- **Decision**: Una nueva función pura `computeEstadoInsumo(insumo, lotes, movimientos,
  nivelesAvisoDias)` en `src/features/insumos/lib/estado.ts` que reutiliza sin modificar
  `computeInsumosStockBajo` y `computeAlertasCaducidad` (spec 004) y aplica esta prioridad cuando
  un insumo cae en más de un estado simultáneamente: `Caducado` > `Próximo a caducar` > `Bajo
  Stock` > `Ok`. Esto da un único estado por insumo para el badge de la tarjeta (FR-009), sin
  duplicar ninguna regla de umbral ya definida en la spec 004.
- **Rationale**: FR-009 pide un solo indicador visual de estado por tarjeta, pero un insumo puede
  estar simultáneamente bajo su stock mínimo y con un lote a punto de caducar. Un insumo caducado
  representa el riesgo clínico más alto (Constitution IV), seguido de "próximo a caducar", y
  luego "bajo stock" (un problema de reabastecimiento, no de seguridad inmediata) — de ahí el
  orden de prioridad. Consumir directamente los resultados ya calculados por `stockBajo.ts`/
  `caducidad.ts` en vez de reimplementar sus condiciones evita que esta spec introduzca una
  segunda fuente de verdad para lo que cuenta como "bajo stock" o "próximo a caducar".
- **Alternatives considered**: Mostrar múltiples badges apilados por tarjeta cuando aplique más de
  un estado — rechazado por ahora, añade densidad visual no pedida por la spec y complica el
  criterio "un vistazo" de SC-001; queda como posible mejora futura, no bloqueante. Duplicar las
  condiciones de umbral dentro de `estado.ts` en vez de importar los cálculos de `features/alertas/
  lib` — rechazado, exactamente el tipo de divergencia de reglas que la spec 004 ya tuvo que
  evitar centralizando el cálculo.

## Cómo obtener el "lote más próximo a vencer" para la tarjeta

- **Decision**: Una función `loteMasProximoAVencer(lotes, movimientos)` en
  `src/features/insumos/lib/proximoLote.ts` que reutiliza `selectFefoLot` (spec 002's `fefo.ts`)
  llamándolo con `cantidadNecesaria = 0` sobre los lotes del insumo — con ese umbral, el primer
  resultado que cumple `stockDisponible >= 0` es siempre el lote con stock disponible que expira
  antes, exactamente el dato que la tarjeta necesita mostrar.
- **Rationale**: `selectFefoLot` ya implementa y tiene pruebas (`tests/unit/fefo.test.ts`) para el
  orden correcto por `fechaCaducidad` (con los lotes sin fecha — insumos que no caducan — siempre
  al final). Reimplementar ese mismo ordenamiento en un segundo lugar sería la clase exacta de
  duplicación que ya se evitó al centralizar `computeStockLote`.
- **Alternatives considered**: Ordenar los lotes directamente en el componente `InsumoCard` con
  una comparación ad hoc — rechazado, duplica lógica ya escrita y probada, y arriesga divergir
  sutilmente (p. ej. en el manejo de `fechaCaducidad: null`) de la que usa el flujo de consumo.

## Filtrado y volumen de datos

- **Decision**: El listado se filtra completamente en memoria sobre el snapshot reactivo que ya
  mantiene `inventoryStore` (igual que `SearchPicker` hoy), agregando una función
  `searchInsumosPorEstado(insumos, lotes, movimientos, nivelesAvisoDias, estado)` junto a
  `searchInsumosPorTexto`/`searchInsumosPorCategoria` ya existentes en `inventoryStore.ts`. No se
  introduce paginación, virtualización, ni un índice de búsqueda separado.
- **Rationale**: La spec (Clarifications, Assumptions) fija el catálogo típico en ~20-300 insumos.
  A esa escala, filtrar un arreglo en memoria en cada tecla es del orden de microsegundos —
  ampliamente dentro del objetivo de <1s percibido (SC-004) — y coincide con el patrón que
  `SearchPicker` ya usa en producción para el mismo tipo de dato. Mantener las tres funciones de
  filtro (texto/categoría/estado) como hermanas en el mismo módulo, en vez de crear un módulo de
  "motor de búsqueda" nuevo, sigue la convención ya establecida por ese archivo.
- **Alternatives considered**: Indexar por Dexie (`where(...).equals(...)`) en vez de filtrar en
  memoria — rechazado por ahora; el volumen documentado no lo justifica y complicaría combinar
  tres criterios simultáneos (texto + categoría + estado) que Dexie no compone tan directamente
  como un `Array.filter` encadenado. Virtualizar la lista (`react-window` o similar) — rechazado,
  añadiría una dependencia nueva para un volumen de datos que no la necesita; se puede reconsiderar
  si un catálogo real excede varios miles de insumos.

## Nuevos íconos para la navegación de 4 pestañas

- **Decision**: Extender `src/components/icons/index.tsx` (spec 005) con 3-4 íconos nuevos en el
  mismo estilo (SVG stroke-based, 1.75px, `currentColor`): `ShoppingCart` (Compras), `Settings`
  (Más), `ChevronRight` (afordancia de "ver detalle" en la tarjeta), y `X` (cerrar la vista de
  detalle).
- **Rationale**: Consistencia visual exacta con el resto del set ya aprobado, sin agregar una
  dependencia de íconos (Pila Tecnológica Obligatoria) para 3-4 símbolos adicionales.
- **Alternatives considered**: Reutilizar `Package`/`Bell` genéricos para las pestañas nuevas —
  rechazado, un ícono compartido entre dos pestañas distintas (p. ej. "Compras" y "Alertas")
  dificulta distinguirlas de un vistazo, justo lo que la nueva navegación busca mejorar.

## Dónde vive el estado de filtros/selección de detalle

- **Decision**: `texto`, `categoria`, `estado` (filtros) y `insumoSeleccionadoId` (para el detalle)
  viven como estado local de React dentro de `InventarioView`, no en una store de Zustand nueva ni
  existente.
- **Rationale**: Es estado transitorio de interacción, no estado de inventario (Constitution II
  regula el estado de *inventario* — altas, consumos, ajustes — no cada filtro de UI). Mantener
  este estado en el componente padre, en vez de desmontar/remontar por navegación, es lo que
  permite cumplir FR-011 (conservar búsqueda y filtros al volver del detalle) de forma directa: el
  detalle se renderiza condicionalmente dentro del mismo árbol, así que el estado de filtros nunca
  se pierde. Sigue el mismo patrón que `SearchPicker` ya usa para `texto`/`categoria` locales.
- **Alternatives considered**: Una store de Zustand dedicada a "UI de inventario" — rechazado,
  sobre-ingeniería para estado que ni se persiste ni se comparte entre componentes fuera de este
  árbol; iría en contra de Constitution II's intención de no duplicar responsabilidad de estado.
