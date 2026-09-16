# Feature Specification: Overhaul de Diseño Visual

**Feature Branch**: `005-overhaul-diseno-visual`

**Created**: 2026-09-09

**Status**: Draft

**Input**: User description: "Overhaul de diseño visual de inDENTory: aplicar a las pantallas reales de la app (Login, Registrar, Consumir, Alertas) la nueva dirección de diseño ya validada con el usuario mediante un canvas de mockups aprobado (paleta teal, tipografía Manrope, tarjetas y badges consistentes, header y navegación inferior unificados), reemplazando el estilo Tailwind genérico actual sin cambiar ningún flujo o requisito funcional ya especificado en las specs 002/003/004."

## Clarifications

### Session 2026-09-09

- Q: ¿El rediseño puede incluir pequeños elementos de contenido nuevo que aparecen en el mockup
  pero no existen hoy en la app, o debe limitarse estrictamente a re-vestir visualmente los datos
  y controles ya existentes? → A: Visual + cálculos derivados triviales — se permite mostrar
  información calculada a partir de datos ya existentes (ej. "vida útil restante" desde la fecha
  de caducidad ya guardada) siempre que no requiera nueva persistencia ni cambie ningún flujo;
  elementos que sí requerirían exponer estado nuevo (ej. un contador de sincronización pendiente)
  quedan fuera de alcance.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar a una app con identidad visual consistente desde el primer momento (Priority: P1)

Un miembro del personal clínico abre la app, inicia sesión, y desde la pantalla de login hasta el
resto de la aplicación (encabezado y navegación inferior compartidos entre pestañas) percibe una
sola identidad visual coherente y profesional, en vez del estilo genérico y sin marca actual.

**Why this priority**: El login y el marco compartido (encabezado, navegación) son lo primero y lo
más frecuente que ve cualquier usuario en cada sesión; sientan la base visual (paleta, tipografía,
componentes) que las demás pantallas reutilizan, por lo que deben resolverse primero.

**Independent Test**: Puede probarse abriendo la app sin sesión iniciada (pantalla de login) y,
tras iniciar sesión, alternando entre las tres pestañas del shell (Registrar/Consumir/Alertas) —
el encabezado y la navegación inferior deben verse y comportarse de forma idéntica en las tres,
sin necesidad de que el contenido interno de cada pestaña esté ya rediseñado.

**Acceptance Scenarios**:

1. **Given** la pantalla de login, **When** un usuario la abre, **Then** ve la nueva identidad
   visual (paleta, tipografía, componentes) en vez del estilo genérico anterior, sin que haya
   cambiado ningún campo, validación o mensaje de error ya especificado.
2. **Given** una sesión iniciada, **When** el usuario cambia entre las pestañas Registrar,
   Consumir y Alertas, **Then** el encabezado y la navegación inferior mantienen exactamente el
   mismo aspecto y comportamiento en las tres.

---

### User Story 2 - Registrar y consumir insumos con una interfaz clara bajo uso clínico (Priority: P2)

Un miembro del personal clínico usa las pantallas de Registrar y Consumir —las de uso más
frecuente durante el día— y encuentra una interfaz visualmente clara y fácil de escanear
rápidamente (campos con iconos, tarjetas de insumo legibles, badges de estado), sin que cambie
ninguna de las reglas ya definidas (búsqueda manual por defecto, escaneo opcional, FEFO,
validación de cantidades, rechazo de sobreconsumo).

**Why this priority**: Son los flujos de mayor frecuencia de uso diario; mejorar su legibilidad
tiene el mayor impacto operativo inmediato, pero dependen del marco visual ya resuelto en la
Historia 1.

**Independent Test**: Puede probarse completando un registro de lote y un consumo de insumo de
principio a fin con la nueva interfaz, confirmando que cada paso (búsqueda, selección de lote,
validación, confirmación, mensajes de error) funciona exactamente igual que antes del rediseño,
solo con una presentación visual distinta.

**Acceptance Scenarios**:

1. **Given** el formulario de registro rediseñado, **When** un usuario busca un insumo y completa
   los datos de un lote, **Then** el flujo se comporta igual que antes (mismos campos, mismas
   validaciones, mismo resultado), solo con la nueva apariencia visual.
2. **Given** el formulario de consumo rediseñado, **When** un usuario intenta consumir más
   cantidad de la disponible, **Then** ve el mismo mensaje de rechazo ya especificado, presentado
   con el nuevo estilo visual de error.

---

### User Story 3 - Distinguir la urgencia de una alerta de un vistazo (Priority: P3)

Un miembro del personal clínico o un administrador abre la pantalla de Alertas y distingue
visualmente, sin tener que leer cada texto, qué insumos están en stock bajo, qué lotes están en
cada nivel de urgencia de caducidad (30/7/1 días o ya caducados), y cuáles están en revisión
manual — con los paneles de configuración y la acción de resolución seguir visibles solo para el
rol administrador.

**Why this priority**: Es la pantalla con más información simultánea y la que más se beneficia de
una jerarquía visual cuidada, pero depende de que el vocabulario visual (tarjetas, badges, colores
semánticos) ya esté resuelto en las historias anteriores.

**Independent Test**: Puede probarse abriendo Alertas con insumos/lotes en cada uno de los seis
estados posibles (stock bajo, tres niveles de aviso, caducado, en revisión) y confirmando que cada
uno es distinguible por su color/indicador sin leer el texto, y que los controles de administrador
siguen ocultos para el rol personal.

**Acceptance Scenarios**:

1. **Given** la pantalla de Alertas con ejemplos de los tres niveles de aviso de caducidad y del
   estado caducado, **When** un usuario la observa, **Then** cada nivel usa un color/indicador
   distinto y consistente, distinguible de un vistazo.
2. **Given** un usuario con rol personal, **When** abre Alertas rediseñada, **Then** ve las tres
   secciones de alerta pero no ve ningún control de configuración ni el botón de "marcar como
   resuelto", igual que antes del rediseño.

---

### Edge Cases

- ¿Qué ocurre si el dispositivo tiene activado el tema oscuro del sistema? Esta funcionalidad
  entrega un único tema claro; no se garantiza legibilidad si el sistema fuerza un tema oscuro.
- ¿Qué ocurre con los estados de carga o vacíos ya definidos (p. ej. "ningún insumo está por
  debajo de su stock mínimo")? Deben reflejar el mismo estilo visual que el resto de la pantalla,
  no quedar sin rediseñar.
- ¿Qué ocurre con los mensajes de error y éxito ya definidos textualmente en specs anteriores
  (p. ej. el mensaje genérico de login, el de sobreconsumo)? Su texto se mantiene idéntico; solo
  cambia su presentación visual (color, icono, tarjeta contenedora).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE aplicar un mismo sistema visual (paleta de color, tipografía, forma
  de los componentes) a las cuatro pantallas existentes (Login, Registrar, Consumir, Alertas),
  reemplazando el estilo genérico actual.
- **FR-002**: El sistema NO DEBE alterar ningún flujo, validación, regla de negocio, texto de
  mensaje, o restricción de rol ya especificados en las specs 002 (registro y consumo), 003
  (login) y 004 (alertas) — esta funcionalidad es exclusivamente visual.
- **FR-002a**: El sistema PUEDE mostrar información adicional calculada de forma trivial a partir
  de datos que ya existen (p. ej. "vida útil restante" derivada de la fecha de caducidad ya
  guardada), siempre que no requiera nueva persistencia, nuevo estado expuesto, ni cambie ningún
  flujo ya especificado (Clarifications). El sistema NO DEBE incorporar elementos del mockup que
  requieran exponer estado hoy no expuesto (p. ej. un contador de operaciones de sincronización
  pendientes) — eso queda fuera de alcance de esta funcionalidad.
- **FR-003**: El sistema DEBE mantener un área táctil mínima de 48x48px en todo objetivo
  interactivo rediseñado, sin excepciones (Constitución, Principio III).
- **FR-004**: El sistema DEBE reutilizar un mismo encabezado y una misma navegación inferior en
  las tres pantallas autenticadas (Registrar, Consumir, Alertas), de forma visualmente idéntica
  entre ellas.
- **FR-005**: El sistema DEBE distinguir visualmente, mediante colores/indicadores consistentes y
  no solo texto, cada uno de los estados de alerta ya definidos en la spec 004 (stock bajo, cada
  nivel de aviso de caducidad, caducado, en revisión).
- **FR-006**: El sistema NO DEBE cambiar qué acciones o controles son visibles para cada rol
  (administrador vs. personal) — el rediseño no debe ocultar ni exponer ninguna capacidad
  distinta a la ya especificada.
- **FR-007**: El sistema DEBE mantener el texto y las etiquetas accesibles (labels, mensajes de
  error/éxito) de los controles ya existentes, salvo cambios estrictamente necesarios por la
  nueva jerarquía visual.
- **FR-008**: El sistema DEBE aplicar el nuevo sistema visual también a los estados de carga y
  vacíos ya definidos en specs anteriores, no solo a la vista con datos.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Al observar las cuatro pantallas una junto a otra, una persona externa las
  identifica como parte de una misma aplicación en menos de 5 segundos.
- **SC-002**: El 100% de los objetivos interactivos de las pantallas rediseñadas miden al menos
  48x48px, sin excepciones.
- **SC-003**: El 100% de las pruebas automatizadas de comportamiento ya existentes (specs
  002/003/004) siguen pasando sin necesitar cambios en su lógica de aserción.
- **SC-004**: Un usuario distingue el nivel de urgencia de una alerta (stock bajo, cada nivel de
  aviso, caducado, en revisión) sin leer su texto, solo por su color/indicador, en el 100% de los
  casos observados.
- **SC-005**: El 100% de las restricciones de visibilidad por rol (administrador vs. personal) ya
  especificadas siguen comportándose exactamente igual tras el rediseño.

## Assumptions

- El canvas de mockups ya aprobado con el usuario (pantallas Login, Registrar en sus dos estados,
  Consumir y Alertas — https://claude.ai/code/artifact/e3b15933-5c7f-46fa-95c0-65cec7b29b0e) es
  la referencia visual de esta funcionalidad; los valores exactos de la paleta y la tipografía se
  documentan en el plan técnico, no en esta especificación.
- Se actualiza también el color de tema y el ícono de la PWA (manifest/favicon) para reflejar la
  nueva identidad visual, ya que forman parte de cómo se percibe la marca de la app fuera de la
  propia pantalla (p. ej. al agregarla a la pantalla de inicio).
- No se introduce un tema oscuro dedicado en esta iteración — un único tema claro, consistente
  con el estado actual de la app.
- La separación visual de "Registrar" en dos estados (búsqueda y formulario de lote) mostrada en
  el canvas de mockups no implica un cambio de flujo: el comportamiento ya existente (buscar,
  luego completar el lote) se conserva; solo cambia su tratamiento visual.
- Esta funcionalidad no agrega pantallas, entidades de datos, persistencia, ni capacidades de
  negocio nuevas — es un rediseño de presentación sobre las capacidades ya construidas en specs
  002, 003 y 004, con la única excepción acotada en FR-002a (cálculos derivados triviales sobre
  datos ya existentes).
