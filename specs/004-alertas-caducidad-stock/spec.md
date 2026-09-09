# Feature Specification: Alertas de Caducidad y Stock Mínimo

**Feature Branch**: `004-alertas-caducidad-stock`

**Created**: 2026-09-08

**Status**: Draft

**Input**: User description: "alertas de caducidad y stock mínimo, incluyendo lotes en revisión por sobregiro"

## Clarifications

### Session 2026-09-08

- Q: ¿La ventana de "próximo a caducar" debe ser un único valor global para todos los insumos, o
  configurable insumo por insumo? → A: Global (no por insumo), con tres niveles de aviso por
  defecto: 30, 7 y 1 día antes de la fecha de caducidad.
- Q: ¿Quién debe poder ver las alertas de stock bajo, caducidad y lotes en revisión — todo el
  personal autenticado, o solo el administrador? → A: Todo el personal autenticado ve las tres
  alertas; solo configurar umbrales y resolver revisiones es exclusivo de administrador.
- Q: ¿Las tres alertas deben vivir en una pantalla dedicada de "Alertas", o integrarse como
  indicadores en las pantallas existentes? → A: Pantalla dedicada de "Alertas" (nueva vista/ruta)
  que consolida los tres tipos.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver alertas de stock por debajo del mínimo (Priority: P1)

Un miembro del personal clínico abre la vista de alertas (o el listado de insumos) y ve, de forma
visual e inmediata, qué insumos tienen un stock actual por debajo de su stock mínimo configurado,
para poder reponerlos a tiempo y evitar quedarse sin ellos durante un procedimiento.

**Why this priority**: El desabasto de un insumo dental tiene impacto clínico directo e inmediato
(Constitución, Principio IV); es el riesgo operativo más costoso de los tres cubiertos por esta
funcionalidad y el más urgente de prevenir.

**Independent Test**: Puede probarse configurando un stock mínimo para un insumo existente,
llevando su stock actual (ya calculado a partir de sus movimientos, spec 002) por debajo de ese
umbral mediante consumos, y verificando que la alerta visual aparece sin necesidad de que exista
ningún lote próximo a caducar ni en revisión.

**Acceptance Scenarios**:

1. **Given** un insumo con stock mínimo configurado en una cantidad N y stock actual por debajo de
   N, **When** un usuario abre la vista de alertas, **Then** el insumo aparece marcado
   visualmente como en stock bajo.
2. **Given** un insumo con stock actual igual o mayor a su stock mínimo, **When** un usuario abre
   la vista, **Then** ese insumo no aparece marcado como en stock bajo.
3. **Given** un administrador cambia el stock mínimo de un insumo cuyo stock actual queda por
   debajo del nuevo umbral, **When** cualquier usuario abre la vista de alertas, **Then** la
   alerta aparece de inmediato, calculada localmente sin depender de sincronización.
4. **Given** un insumo sin stock mínimo configurado, **When** se evalúan las alertas, **Then** ese
   insumo nunca genera una alerta de stock bajo.

---

### User Story 2 - Ver alertas de caducidad de lotes (Priority: P2)

Un miembro del personal clínico ve qué lotes con stock disponible están próximos a caducar o ya
caducados, para priorizar su uso o gestionarlos antes de que se conviertan en pérdida.

**Why this priority**: Previene el uso de insumos caducados y reduce el desperdicio, pero depende
de que ya existan lotes con fecha de caducidad registrados (spec 002); es menos urgente que un
desabasto porque suele haber margen de días o semanas para reaccionar.

**Independent Test**: Puede probarse registrando lotes con fecha de caducidad a 30, 7 y 1 día, y
otro ya vencido, y verificando que los cuatro aparecen marcados visualmente en la vista de
alertas con niveles de urgencia distinguibles entre sí, sin necesidad de ninguna alerta de stock
bajo.

**Acceptance Scenarios**:

1. **Given** un lote con stock disponible cuya fecha de caducidad cae dentro de alguno de los
   niveles de aviso configurados (30, 7 o 1 día por defecto), **When** un usuario abre la vista
   de alertas, **Then** el lote aparece marcado como próximo a caducar, junto con su fecha y el
   nivel de urgencia correspondiente al umbral más cercano que cumple.
2. **Given** un lote con stock disponible cuya fecha de caducidad ya pasó, **When** un usuario
   abre la vista de alertas, **Then** el lote aparece marcado como caducado, visualmente
   distinguible (más urgente) de cualquier nivel de "próximo a caducar".
3. **Given** un insumo marcado como que no caduca, **When** se evalúan las alertas de caducidad,
   **Then** ninguno de sus lotes genera alerta de caducidad.
4. **Given** un lote sin stock disponible (ya agotado), **When** se evalúan las alertas de
   caducidad, **Then** ese lote no genera alerta, sin importar su fecha de caducidad.

---

### User Story 3 - Revisar lotes marcados para revisión manual (Priority: P3)

Un administrador consulta los lotes que quedaron marcados para revisión manual por un sobregiro de
stock durante la sincronización de consumos concurrentes sin conexión (spec 002, FR-014),
verifica el conteo físico real, y los marca como resueltos una vez corregidos.

**Why this priority**: Es un caso operativo poco frecuente (solo ocurre tras un conflicto de
sincronización específico) frente a las alertas de stock y caducidad, que son de uso diario; pero
sin esta vista, los lotes marcados quedan invisibles indefinidamente (deuda señalada
explícitamente en spec 002).

**Independent Test**: Puede probarse marcando manualmente un lote en estado de revisión (o
provocando el sobregiro descrito en spec 002), abriendo la vista de alertas como administrador, y
verificando que el lote aparece listado con el detalle del sobregiro y puede marcarse como
resuelto.

**Acceptance Scenarios**:

1. **Given** uno o más lotes en estado de revisión, **When** un administrador abre la vista de
   alertas, **Then** los ve listados junto con el stock negativo/sobregirado que motivó la
   marca.
2. **Given** un lote en revisión cuyo conteo físico ya fue corregido, **When** un administrador lo
   marca como resuelto, **Then** el lote vuelve a su estado normal y desaparece de la lista de
   revisión.
3. **Given** un usuario con rol de personal regular (no administrador), **When** abre la vista de
   alertas, **Then** puede ver los lotes en revisión pero no cuenta con la acción para marcarlos
   como resueltos.

---

### Edge Cases

- ¿Qué ocurre si un insumo tiene simultáneamente stock bajo mínimo y uno de sus lotes está
  próximo a caducar? Ambas alertas se muestran de forma independiente; no se ocultan ni se
  combinan en una sola.
- ¿Qué ocurre si el dispositivo está sin conexión? Todas las alertas (stock, caducidad, revisión)
  se calculan y muestran igual, ya que dependen solo de datos ya disponibles localmente
  (Constitución, Principio IV).
- ¿Qué ocurre si un administrador marca un lote en revisión como resuelto sin haber corregido
  realmente el conteo? El sistema confía en la acción del administrador; no valida el conteo
  físico real, solo limpia la marca.
- ¿Qué ocurre con las alertas de un insumo si cambia su unidad de medida después de tener un
  stock mínimo configurado? Queda fuera de alcance de esta funcionalidad; el stock mínimo se
  interpreta en la unidad de medida vigente del insumo en el momento de evaluar la alerta.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a un administrador configurar, de forma opcional, un stock
  mínimo por insumo, expresado en la unidad de medida de ese insumo.
- **FR-002**: El sistema DEBE calcular localmente, sin depender de conexión a internet, si el
  stock actual de un insumo está por debajo de su stock mínimo configurado.
- **FR-003**: El sistema DEBE mostrar una alerta visual (no únicamente textual) para todo insumo
  cuyo stock esté por debajo de su mínimo configurado, visible a cualquier usuario autenticado.
- **FR-004**: El sistema NO DEBE generar alerta de stock bajo para un insumo que no tiene stock
  mínimo configurado.
- **FR-005**: El sistema DEBE permitir a un administrador configurar, de forma global (no por
  insumo individual), los niveles de aviso de caducidad como una lista de días previos a la fecha
  de caducidad (valor por defecto: 30, 7 y 1 día si no se configuran otros).
- **FR-006**: El sistema DEBE calcular localmente, sin depender de conexión a internet, qué lotes
  con stock disponible están próximos a caducar (dentro de alguno de los niveles de aviso
  configurados) o ya caducados, excluyendo los lotes de insumos marcados como que no caducan.
- **FR-007**: El sistema DEBE mostrar una alerta visual para cada lote próximo a caducar o
  caducado, distinguiendo visualmente el nivel de urgencia (cada nivel de aviso configurado, y de
  forma más urgente aún el estado caducado), visible a cualquier usuario autenticado.
- **FR-008**: El sistema NO DEBE generar alerta de caducidad para lotes sin stock disponible.
- **FR-009**: El sistema DEBE mostrar, en una vista consolidada de alertas, los lotes marcados en
  estado de revisión manual por sobregiro de sincronización, visible a cualquier usuario
  autenticado, incluyendo el stock negativo/sobregirado que motivó la marca.
- **FR-010**: El sistema DEBE permitir únicamente a un administrador marcar un lote en revisión
  como resuelto, devolviéndolo a su estado normal.
- **FR-011**: El sistema DEBE recalcular todas las alertas (stock bajo, caducidad, revisión) de
  forma inmediata ante cualquier cambio local relevante (nuevo movimiento, cambio de
  configuración de umbrales), sin esperar a sincronización con el backend.
- **FR-012**: El sistema DEBE conservar la configuración de stock mínimo por insumo y los niveles
  de aviso de caducidad de forma que estén disponibles sin conexión a internet.
- **FR-013**: El sistema DEBE proveer una pantalla dedicada de alertas, accesible desde la
  navegación principal, que consolide los tres tipos de alerta (stock bajo, caducidad, lotes en
  revisión) en un solo lugar.

### Key Entities

- **Insumo (extendido)**: Se agrega el atributo stock mínimo (opcional, en la unidad de medida del
  insumo) a la entidad ya definida en spec 002 — determina cuándo se genera la alerta de stock
  bajo para ese insumo; sin configurar, ese insumo nunca genera esa alerta.
- **Lote (sin cambios estructurales)**: Reutiliza los atributos fecha de caducidad y estado
  (activo/revisión) ya definidos en spec 002 como fuente de las alertas de caducidad y de
  revisión manual definidas aquí.
- **Configuración de Alertas**: Parámetro global — la lista de niveles de aviso de caducidad, en
  días antes de la fecha de caducidad (por defecto 30, 7 y 1 día) — ajustable por un
  administrador; no varía por insumo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede identificar todos los insumos con stock por debajo de su mínimo, en
  menos de 5 segundos desde que abre la vista de alertas, sin navegar a otras pantallas.
- **SC-002**: El 100% de los lotes con stock disponible próximos a caducar (dentro de alguno de
  los niveles de aviso configurados) o ya caducados aparecen marcados visualmente, sin
  excepciones.
- **SC-003**: El 100% de los lotes marcados para revisión manual son visibles para todo el
  personal, y accionables (marcables como resueltos) exclusivamente por administradores.
- **SC-004**: Un administrador puede configurar el stock mínimo de un insumo, o los niveles de
  aviso de caducidad, en menos de 15 segundos.
- **SC-005**: El 100% de las alertas se calculan y muestran correctamente con el dispositivo sin
  conexión a internet, sin depender de sincronización con el backend.

## Assumptions

- No se contempla el envío de notificaciones push, por correo electrónico, ni ningún canal fuera
  de la propia aplicación — las alertas son visuales dentro de la app, consistente con el
  Principio IV de la constitución del proyecto.
- Marcar un lote en revisión como resuelto no incluye construir una herramienta de conteo físico
  ni de recuento de stock; se asume que el administrador ya corrigió el stock mediante un
  movimiento de ajuste (spec 002, FR-015) antes de limpiar la marca.
- Esta funcionalidad no construye un historial de alertas pasadas o resueltas; las alertas se
  recalculan en vivo a partir del estado actual de insumos, lotes y movimientos, sin persistir un
  registro propio de alertas.
- Las restricciones de "solo administrador" (FR-001, FR-005, FR-010) se aplican a nivel de
  interfaz de cliente. Solo la configuración de niveles de aviso de caducidad (FR-005) cuenta
  además con una política de Postgres RLS que rechaza a nivel de base de datos la escritura de un
  usuario no-administrador; el stock mínimo por insumo (FR-001) y la resolución de lotes en
  revisión (FR-010) no tienen ese respaldo adicional, consistente con que `insumos`/`lotes` ya
  quedan sin RLS habilitado desde spec 002 (contracts/supabase-schema.md, research.md).
