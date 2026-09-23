# Feature Specification: Rediseño de Navegación e Vista Principal de Insumos (Dashboard & Listado)

**Feature Branch**: `006-navegacion-inventario-dashboard`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Transición de la navegación actual a una vista principal por defecto basada en un listado unificado de insumos con barra de búsqueda, filtros avanzados por categoría/estado y un resumen superior compacto de alertas. Permite consultar el detalle completo de cada material. Parte del roadmap de evolución hacia un modelo de Listado Operativo + Acciones Rápidas, reemplazando la navegación Registrar/Consumir/Alertas por una nueva estructura de 4 secciones: Inventario, Compras, Alertas, Más/Config."

## Clarifications

### Session 2026-09-23

- Q: ¿Qué campos debe cubrir la búsqueda por texto libre además del nombre comercial del insumo? → A: Solo nombre comercial del insumo.
- Q: ¿Aproximadamente cuántos insumos distintos maneja el catálogo de una clínica típica que usará este listado? → A: Decenas a un par de cientos (≈20–300 insumos).
- Q: Además del color, ¿cómo debe distinguirse el estado de salud de un insumo (Ok/Bajo Stock/Caducado) en la tarjeta del listado? → A: Color + ícono/etiqueta de texto corta (p. ej. "Caducado") en cada tarjeta.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el estado general del inventario al entrar (Priority: P1)

Como personal clínico, al abrir la aplicación quiero ver de inmediato cuántos insumos están caducados/próximos a caducar y cuántos tienen stock bajo, para priorizar qué materiales requieren atención antes de empezar a trabajar.

**Why this priority**: Es el valor central del nuevo modelo: reemplaza la pestaña de Alertas como único lugar donde ver esta información y la convierte en el primer dato visible al abrir la app. Sin esto, el rediseño no aporta nada sobre el flujo actual.

**Independent Test**: Puede probarse abriendo la app con datos de inventario que incluyan insumos caducados, próximos a caducar y con stock bajo, y verificando que el resumen superior muestra los conteos correctos sin navegar a otra pantalla.

**Acceptance Scenarios**:

1. **Given** existen insumos caducados y con stock bajo en el inventario, **When** el usuario abre la aplicación, **Then** la pantalla principal (Inventario) muestra un resumen con el conteo de insumos caducados/próximos a caducar y el conteo de insumos con stock bajo.
2. **Given** el resumen superior muestra un indicador de "Caducados", **When** el usuario toca ese indicador, **Then** el listado de insumos se filtra automáticamente para mostrar solo los insumos caducados o próximos a caducar.
3. **Given** no hay insumos con alertas activas, **When** el usuario abre la aplicación, **Then** el resumen muestra que el inventario está en buen estado, sin conteos alarmantes.

---

### User Story 2 - Buscar y filtrar insumos desde una sola pantalla (Priority: P1)

Como personal clínico, quiero buscar insumos por texto y filtrarlos por categoría y estado desde una única pantalla, para encontrar rápidamente el material que necesito sin cambiar entre pantallas separadas de Registrar y Consumir.

**Why this priority**: Es el reemplazo directo de las pantallas separadas de Registrar/Consumir por un listado único; es la base sobre la que se apoyan las acciones rápidas de specs futuras (007).

**Independent Test**: Puede probarse escribiendo un término de búsqueda y aplicando un filtro de categoría y de estado, y verificando que el listado se actualiza combinando todos los criterios.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pantalla de Inventario, **When** escribe texto en la barra de búsqueda, **Then** el listado se filtra en tiempo real mostrando solo los insumos cuyo nombre coincide.
2. **Given** el usuario selecciona una categoría (p. ej. "Cirugía") mediante los chips de categoría, **When** la selección se aplica, **Then** el listado muestra solo insumos de esa categoría.
3. **Given** el usuario activa el filtro de estado "Bajo Stock" junto con una categoría y un texto de búsqueda, **When** los tres criterios están activos, **Then** el listado muestra solo los insumos que cumplen simultáneamente los tres criterios.
4. **Given** ningún insumo coincide con los criterios combinados, **When** se muestra el listado, **Then** aparece un estado vacío indicando que no hay coincidencias, con una opción para limpiar los filtros.

---

### User Story 3 - Consultar el detalle completo de un insumo (Priority: P2)

Como personal clínico, quiero tocar un insumo en el listado para ver su detalle completo (todos sus lotes y fechas de vencimiento, stock total), para verificar información antes de decidir una acción sobre él.

**Why this priority**: Necesario para que el listado unificado reemplace funcionalmente la información que hoy está dispersa, pero no bloquea el valor de las User Stories 1 y 2, que ya funcionan como MVP de consulta.

**Independent Test**: Puede probarse tocando una tarjeta de insumo con múltiples lotes y verificando que se muestra el detalle con todos los lotes, sus vencimientos y el stock total.

**Acceptance Scenarios**:

1. **Given** un insumo tiene varios lotes con distintas fechas de vencimiento, **When** el usuario toca su tarjeta en el listado, **Then** se muestra una vista de detalle con todos los lotes, sus fechas de vencimiento individuales y el stock total agregado.
2. **Given** el usuario está en la vista de detalle de un insumo, **When** toca la acción de volver/cerrar, **Then** regresa al listado conservando la búsqueda y los filtros previamente aplicados.

---

### User Story 4 - Navegar entre las secciones principales de la app (Priority: P3)

Como personal clínico, quiero navegar entre las secciones principales (Inventario, Compras, Alertas, Más) desde una barra de navegación inferior clara, para entender en qué parte de la app estoy y acceder a cada área.

**Why this priority**: Es el cambio de estructura de navegación que habilita las demás secciones del roadmap (Compras, Ajustes), pero su valor aislado es menor que ver y encontrar insumos rápidamente.

**Independent Test**: Puede probarse tocando cada ítem de la barra de navegación inferior y verificando que la app cambia a la sección correspondiente y resalta visualmente el ítem activo.

**Acceptance Scenarios**:

1. **Given** el usuario abre la aplicación, **When** la app carga, **Then** la barra de navegación inferior muestra 4 secciones (Inventario, Compras, Alertas, Más) con "Inventario" seleccionado por defecto.
2. **Given** el usuario está en "Inventario", **When** toca la sección "Alertas", **Then** la app navega a la vista de Alertas y el ítem "Alertas" queda marcado como activo.
3. **Given** las secciones "Compras" y "Más" aún no tienen su funcionalidad completa implementada, **When** el usuario las abre, **Then** la app muestra una vista mínima reconocible de esa sección en lugar de un error o pantalla en blanco.

---

### Edge Cases

- ¿Qué pasa si el catálogo de insumos está completamente vacío (instalación nueva)? El listado debe mostrar un estado vacío que invite a agregar el primer material, no un error ni una lista en blanco sin contexto.
- ¿Qué pasa si el dispositivo está sin conexión? El resumen, la búsqueda, los filtros y el detalle deben seguir funcionando igual, ya que dependen de los datos locales.
- ¿Qué pasa si hay muchas categorías y no caben en una fila? Los chips de categoría deben permitir desplazamiento horizontal sin recortar opciones.
- ¿Qué pasa si un insumo no tiene lotes con fecha de caducidad (no es perecedero)? La tarjeta y el detalle deben mostrar el stock sin exigir ni mostrar información de vencimiento.
- ¿Qué pasa si el usuario borra el texto de búsqueda o desactiva todos los filtros? El listado debe volver a mostrar todos los insumos sin necesidad de recargar la pantalla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE reemplazar la navegación inferior actual (Registrar / Consumir / Alertas) por una nueva estructura de 4 secciones: Inventario, Compras, Alertas, Más.
- **FR-002**: El sistema DEBE establecer la sección "Inventario" como la pantalla principal mostrada por defecto al abrir la aplicación.
- **FR-003**: El sistema DEBE mostrar en la parte superior de "Inventario" un resumen compacto con el conteo de insumos caducados/próximos a caducar y el conteo de insumos con stock bajo o agotado.
- **FR-004**: Al tocar un indicador del resumen superior, el sistema DEBE aplicar automáticamente el filtro de estado correspondiente sobre el listado de insumos.
- **FR-005**: El sistema DEBE permitir buscar insumos por texto libre sobre el nombre comercial del insumo (no incluye código de barras ni número de lote), actualizando el listado en tiempo real conforme el usuario escribe.
- **FR-006**: El sistema DEBE ofrecer un botón de escaneo por cámara junto a la barra de búsqueda como canal alternativo, que solo se active mediante una acción explícita del usuario (nunca automáticamente al entrar a la pantalla).
- **FR-007**: El sistema DEBE permitir filtrar el listado por categoría mediante una selección de chips desplazable horizontalmente.
- **FR-008**: El sistema DEBE permitir filtrar el listado por estado de salud del insumo — cuatro categorías: Caducado, Próximo a caducar, Bajo Stock, Ok — combinable con la búsqueda por texto y el filtro de categoría. El resumen superior (FR-004) puede activar Caducado y Próximo a caducar simultáneamente con un solo toque; los chips de filtro individuales seleccionan una categoría a la vez.
- **FR-009**: El sistema DEBE mostrar cada insumo en el listado como una tarjeta que incluye: categoría, indicador visual de estado combinando color con un ícono y una etiqueta de texto corta (p. ej. "Caducado", "Bajo Stock", "Ok") — nunca solo color —, nombre comercial, información del lote más próximo a vencer (si aplica) y cantidad de stock disponible.
- **FR-010**: El sistema DEBE permitir tocar una tarjeta de insumo para acceder a una vista de detalle de solo lectura que muestre todos sus lotes, fechas de vencimiento y el stock total agregado.
- **FR-011**: Al volver desde la vista de detalle, el sistema DEBE conservar el texto de búsqueda y los filtros que estaban activos antes de entrar al detalle.
- **FR-012**: El sistema DEBE mostrar un estado vacío distintivo cuando la combinación de búsqueda y filtros no arroja resultados, ofreciendo una acción para limpiar los filtros.
- **FR-013**: El listado, el resumen superior, la búsqueda, los filtros y la vista de detalle DEBEN funcionar completamente sin conexión a internet, leyendo desde el almacenamiento local existente.
- **FR-014**: Todos los elementos interactivos de la nueva navegación y del listado (ítems de navegación inferior, chips, badges de estado, tarjetas de insumo) DEBEN cumplir un área táctil mínima de 48x48px.
- **FR-015**: Las secciones "Compras" y "Más" DEBEN existir como destinos navegables desde esta spec, aunque su funcionalidad completa se implemente en specs posteriores del roadmap.

### Key Entities

- **Insumo**: Material del catálogo de la clínica; expone nombre comercial, categoría, unidad de medida, stock total agregado y estado de salud derivado (Ok / Bajo Stock / Caducado / Próximo a caducar).
- **Lote**: Unidad de stock de un insumo con fecha de vencimiento propia; un insumo puede tener varios lotes activos simultáneamente.
- **Categoría**: Agrupación temática de insumos (p. ej. Cirugía, Restauración, Tratamientos pulpares, Fresas) usada para filtrar el listado.
- **Resumen de Alertas**: Vista agregada (no una entidad nueva de datos) que cuenta insumos caducados/próximos a caducar y con stock bajo, calculada a partir de Insumo y Lote según la lógica ya definida en la spec de alertas existente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede identificar cuántos insumos requieren atención (caducidad o stock) en menos de 2 segundos desde que abre la aplicación, sin navegar a otra pantalla.
- **SC-002**: Un usuario puede encontrar un insumo específico por nombre en menos de 5 segundos usando la búsqueda.
- **SC-003**: El 90% de los usuarios completan una búsqueda combinada con al menos un filtro de categoría o estado sin necesitar ayuda, en su primer uso de la nueva pantalla.
- **SC-004**: Con un catálogo típico de hasta 300 insumos, el listado y sus filtros responden en menos de 1 segundo percibido por el usuario, con o sin conexión a internet.
- **SC-005**: El 100% de los insumos del listado permiten consultar su detalle completo (lotes y vencimientos) en un máximo de 2 toques desde la pantalla principal.

## Assumptions

- Las secciones "Compras" y "Más/Config" se introducen en esta spec únicamente como destinos de navegación con una vista mínima reconocible; su funcionalidad completa corresponde a specs posteriores del roadmap (009 y 010 respectivamente).
- La lógica de cálculo de alertas de caducidad y stock mínimo ya existe (spec de alertas previa); esta spec solo la consume para el resumen superior y los filtros de estado, sin redefinirla.
- La vista de detalle de insumo introducida aquí es de solo lectura; las acciones de consumo rápido, edición y eliminación desde el listado se definen en la siguiente spec del roadmap (007).
- El catálogo de categorías ya existe o se gestiona en otra spec (008); esta spec no cubre la creación/edición de categorías, solo su uso como filtro.
- Se reutiliza el modelo de datos de insumos y lotes ya definido en specs anteriores (registro/consumo y alertas); esta spec no introduce cambios de esquema, solo una nueva forma de consultarlos.
- El catálogo de una clínica típica maneja del orden de decenas a un par de cientos de insumos distintos (≈20–300); no se requiere paginación ni virtualización especial para cumplir los objetivos de rendimiento de esta spec.
