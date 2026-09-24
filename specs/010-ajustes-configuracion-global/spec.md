# Feature Specification: Separación de Ajustes y Configuración Global

**Feature Branch**: `010-ajustes-configuracion-global`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Continuar el desarrollo del roadmap (spec 10): Desacoplamiento de la sección de configuración de la pestaña de alertas para moverla a una vista/drawer propio de usuario, administrando la clínica, categorías, usuarios y preferencias de notificaciones."

## Clarifications

### Session 2026-09-23

- Q: Las specs 002, 006, 007, 008 y 009 dejaron anotados tres pendientes explícitamente asignados a "la spec 010": cerrar la falta de permisos a nivel de base de datos (RLS) en `insumos`/`lotes`/`movimientos`, permitir renombrar/fusionar categorías, y poder ver/restaurar insumos dados de baja. ¿Se incluyen los tres en esta spec? → A: Sí, los tres se incluyen (ver User Stories 3, 5 y 6 y sus requisitos).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Configurar alertas desde "Ajustes" en vez de "Alertas" (Priority: P1)

Como administrador, quiero encontrar el control de stock mínimo por insumo y de niveles de aviso de caducidad dentro de "Ajustes" (antes "Más"), para que la sección "Alertas" muestre únicamente alertas y no controles de configuración mezclados.

**Why this priority**: Es el objetivo central del roadmap para esta spec: desacoplar la configuración de la pantalla de alertas. Sin esto, "Alertas" sigue mezclando dos responsabilidades distintas (consultar y configurar), tal como quedó documentado como deuda desde la spec 004.

**Independent Test**: Puede probarse iniciando sesión como administrador, abriendo "Ajustes" desde la navegación inferior, verificando que ahí aparecen los controles de stock mínimo y niveles de aviso, y confirmando que "Alertas" ya no los muestra.

**Acceptance Scenarios**:

1. **Given** un administrador autenticado, **When** abre "Ajustes" desde la navegación inferior, **Then** encuentra una sección con el control para configurar el stock mínimo de cada insumo, con el mismo comportamiento que tenía antes en "Alertas".
2. **Given** un administrador autenticado, **When** abre "Ajustes", **Then** encuentra una sección con el control para configurar los niveles de aviso de caducidad (días), con el mismo comportamiento que tenía antes en "Alertas".
3. **Given** cualquier usuario autenticado, **When** abre la sección "Alertas", **Then** solo ve alertas de stock bajo, caducidad y lotes en revisión, sin ningún control de configuración.
4. **Given** un usuario sin rol administrador, **When** abre "Ajustes", **Then** no ve los controles de stock mínimo ni de niveles de aviso de caducidad.
5. **Given** el dispositivo está sin conexión, **When** un administrador cambia el stock mínimo de un insumo o los niveles de aviso desde "Ajustes", **Then** el cambio se aplica de inmediato localmente y se sincroniza en segundo plano, igual que ocurría en "Alertas".

---

### User Story 2 - Ver el propio perfil y cerrar sesión desde "Ajustes" (Priority: P1)

Como usuario autenticado, quiero ver mi nombre, correo y rol, y poder cerrar sesión, desde la sección "Ajustes", para tener un único lugar reconocible donde revisar quién soy en la app y salir de mi sesión.

**Why this priority**: Es la base de la nueva vista propia de usuario que pide el roadmap; sin ella, "Ajustes" no tendría una sección de identidad y el cierre de sesión seguiría existiendo solo en el encabezado, sin relación con la nueva pantalla.

**Independent Test**: Puede probarse abriendo "Ajustes" con cualquier usuario autenticado y verificando que se muestran su nombre, correo y rol, y que la acción "Cerrar sesión" funciona igual que la del encabezado.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado, **When** abre "Ajustes", **Then** ve una sección "Perfil" con su nombre, correo y rol actuales.
2. **Given** un usuario autenticado en "Ajustes", **When** toca "Cerrar sesión" en la sección "Perfil", **Then** su sesión se cierra igual que al usar la acción existente del encabezado.
3. **Given** el rol de un usuario cambia del lado del servidor (ej. deja de ser administrador), **When** ese cambio se refleja localmente, **Then** la sección "Perfil" en "Ajustes" muestra el rol actualizado.

---

### User Story 3 - Impedir que un usuario sin rol administrador modifique el catálogo saltándose la app (Priority: P1)

Como responsable de la clínica, quiero que la regla "solo un administrador edita o da de baja un material" se cumpla también en el servidor y no solo dentro de la app, para que una llamada directa a la base de datos (con una sesión válida pero sin permisos) no pueda modificar el catálogo de insumos.

**Why this priority**: Es una brecha de seguridad ya identificada y documentada como deuda heredada desde la spec 002 en las specs 004, 007, 008 y 009, explícitamente señalada para cerrarse en esta spec. Tiene prioridad alta porque protege la integridad del catálogo, aunque no tenga una pantalla propia.

**Independent Test**: Puede probarse intentando, con las credenciales de un usuario sin rol administrador y sin pasar por la interfaz de la app (una llamada directa al backend), modificar el nombre, la categoría o el stock mínimo de un insumo existente, o darlo de baja, y verificando que el backend rechaza la operación. También puede probarse que ese mismo usuario sigue pudiendo dar de alta un insumo nuevo, registrar un lote o un movimiento de consumo/ingreso, sin que estas operaciones se vean afectadas.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado sin rol administrador, **When** intenta modificar directamente en el backend el nombre, la categoría, la unidad de medida, el stock mínimo, el código de fabricante o si caduca de un insumo ya existente, **Then** la operación es rechazada.
2. **Given** un usuario autenticado sin rol administrador, **When** intenta dar de baja o restaurar un insumo directamente en el backend, **Then** la operación es rechazada.
3. **Given** un usuario autenticado sin rol administrador, **When** da de alta un insumo nuevo, registra un lote o registra un movimiento de ingreso/consumo/ajuste (dentro de la app, como ya lo hace hoy), **Then** la operación se realiza con normalidad, sin ningún cambio de comportamiento respecto de hoy.
4. **Given** un administrador autenticado, **When** modifica el catálogo o da de baja/restaura un insumo, **Then** la operación se realiza con normalidad, igual que hoy.
5. **Given** cualquier dispositivo (administrador o no) sincronizando insumos que no cambiaron, **When** el ciclo de sincronización en segundo plano se ejecuta, **Then** esa sincronización rutinaria no se ve bloqueada ni rechazada por esta restricción.

---

### User Story 4 - Gestionar categorías desde "Ajustes": crear, renombrar, fusionar y desactivar (Priority: P2)

Como administrador, quiero ver todas las categorías disponibles, crear nuevas, corregir el nombre de una ya creada (fusionándola con otra si el nuevo nombre coincide) y desactivar las que ya no se usan, todo desde "Ajustes", para mantener el catálogo de categorías ordenado sin depender de crearlas al vuelo dentro del formulario de alta de material.

**Why this priority**: Extiende una capacidad que ya existe parcialmente (crear categorías al dar de alta un material, spec 008) a un lugar centralizado de administración, y cierra una limitación documentada desde esa misma spec ("renombrar/eliminar categorías" quedó explícitamente para esta spec). Agrega valor pero no bloquea el objetivo principal de desacoplar la configuración de alertas.

**Independent Test**: Puede probarse abriendo "Ajustes" como administrador, creando una categoría nueva, verificando que aparece disponible en el formulario de alta de material, renombrándola (o fusionándola con otra existente), confirmando que los materiales que ya la usaban muestran el nombre actualizado, y luego desactivándola para confirmar que deja de ofrecerse como opción.

**Acceptance Scenarios**:

1. **Given** un administrador en "Ajustes", **When** abre la sección "Categorías", **Then** ve el listado completo de categorías disponibles en el selector de materiales (precargadas y creadas), indicando cuáles están activas y cuáles desactivadas.
2. **Given** un administrador en la sección "Categorías", **When** crea una categoría nueva con un nombre no usado por ninguna categoría activa, **Then** la categoría se guarda y queda disponible de inmediato en el selector del formulario de alta y edición de materiales.
3. **Given** un administrador intenta crear una categoría cuyo nombre normalizado (sin acentos, mayúsculas ni espacios extra) coincide con una ya existente, **When** confirma, **Then** el sistema le indica que ya existe y no crea un duplicado.
4. **Given** una categoría creada previamente, **When** un administrador le cambia el nombre a uno que no coincide (por clave normalizada) con ninguna otra categoría existente, **Then** la categoría pasa a mostrarse con el nuevo nombre y todos los materiales (activos o dados de baja) que la usaban se actualizan al nuevo nombre.
5. **Given** una categoría creada previamente, **When** un administrador le cambia el nombre a uno que sí coincide (por clave normalizada) con otra categoría activa o precargada, **Then** ambas quedan fusionadas: los materiales de la primera pasan a usar el nombre de la categoría existente, y la categoría renombrada se desactiva automáticamente para no listarse por separado.
6. **Given** una categoría creada previamente, **When** un administrador la desactiva ("eliminar" de la lista de opciones), **Then** deja de ofrecerse como opción en el selector de materiales, sin afectar a los materiales que ya la tenían asignada.
7. **Given** una categoría desactivada, **When** un administrador la reactiva, **Then** vuelve a ofrecerse como opción en el selector de materiales.
8. **Given** las categorías precargadas (Cirugía, Restauración, Tratamientos pulpares, Fresas) o "Sin categoría", **When** un administrador busca renombrarlas, fusionarlas, desactivarlas o eliminarlas desde "Ajustes", **Then** el sistema no lo permite, porque siempre deben estar disponibles con su nombre original.
9. **Given** el dispositivo está sin conexión, **When** un administrador crea, renombra, fusiona o desactiva una categoría, **Then** el cambio se aplica de inmediato localmente (incluida la actualización de los materiales afectados) y se sincroniza en segundo plano al recuperar la conexión.

---

### User Story 5 - Configurar el nombre de la clínica (Priority: P2)

Como administrador, quiero configurar el nombre de la clínica o gabinete que se muestra en el encabezado de la app, para que refleje el nombre real del lugar en vez de la etiqueta genérica "Gabinete".

**Why this priority**: Es una personalización visible y sencilla que cierra otro de los puntos nombrados en el roadmap ("administrar la clínica"); tiene menor impacto operativo que las alertas, la seguridad del catálogo o las categorías.

**Independent Test**: Puede probarse abriendo "Ajustes" como administrador, escribiendo un nombre de clínica, guardando, y verificando que ese nombre reemplaza la etiqueta "Gabinete" en el encabezado de todas las pantallas.

**Acceptance Scenarios**:

1. **Given** un administrador en "Ajustes", **When** abre la sección "Clínica" y escribe un nombre no vacío, **Then** ese nombre reemplaza la etiqueta "Gabinete" en el encabezado de la app en cuanto se guarda.
2. **Given** ningún administrador configuró todavía un nombre de clínica, **When** cualquier usuario ve el encabezado, **Then** se sigue mostrando la etiqueta por defecto "Gabinete".
3. **Given** un administrador intenta guardar un nombre de clínica vacío o solo con espacios, **When** confirma, **Then** el sistema no lo permite y conserva el valor anterior (o el default "Gabinete").
4. **Given** un usuario sin rol administrador, **When** abre "Ajustes", **Then** no ve la sección "Clínica".
5. **Given** el dispositivo está sin conexión, **When** un administrador guarda el nombre de la clínica, **Then** el cambio se refleja de inmediato en el encabezado local y se sincroniza en segundo plano.

---

### User Story 6 - Ver y restaurar insumos dados de baja (Priority: P2)

Como administrador, quiero ver el listado de insumos dados de baja y poder restaurarlos, para corregir una baja hecha por error sin tener que volver a cargar el material desde cero.

**Why this priority**: Cierra una limitación documentada desde la spec 007 ("la consulta y restauración de insumos dados de baja queda fuera de alcance... podría incorporarse en la spec 010"). Es valioso para corregir errores operativos, pero no bloquea el resto de "Ajustes".

**Independent Test**: Puede probarse dando de baja un insumo (spec 007), abriendo la nueva sección "Insumos dados de baja" en "Ajustes", restaurándolo, y verificando que vuelve a aparecer en Inventario, Alertas y Compras con su historial de lotes y movimientos intacto.

**Acceptance Scenarios**:

1. **Given** un administrador en "Ajustes", **When** abre la sección "Insumos dados de baja", **Then** ve el listado de todos los insumos con baja lógica activa, mostrando su nombre, categoría, y quién y cuándo los dio de baja.
2. **Given** un insumo dado de baja, **When** un administrador lo restaura, **Then** el insumo vuelve a aparecer de inmediato en Inventario, Alertas y Compras, con su stock y lotes tal como quedaron al momento de la baja.
3. **Given** un usuario sin rol administrador, **When** abre "Ajustes", **Then** no ve la sección "Insumos dados de baja".
4. **Given** no hay ningún insumo dado de baja, **When** un administrador abre esta sección, **Then** ve un estado vacío que lo indica claramente.
5. **Given** el dispositivo está sin conexión, **When** un administrador restaura un insumo, **Then** el cambio se aplica de inmediato localmente y se sincroniza en segundo plano.

---

### User Story 7 - Configurar preferencias de notificaciones (Priority: P3)

Como usuario autenticado, quiero decidir qué tipos de alerta (stock bajo, caducidad) quiero ver reflejados como indicador en la navegación inferior, para no sentirme abrumado por un contador si solo me interesa un tipo de alerta.

**Why this priority**: Es una comodidad de personalización individual; la app ya cumple su función principal de mostrar alertas dentro de la sección "Alertas" sin este indicador adicional.

**Independent Test**: Puede probarse desactivando en "Ajustes" el tipo de alerta "Stock bajo", generando una condición de stock bajo, y verificando que el indicador de la navegación inferior no lo cuenta, mientras que la sección "Alertas" lo sigue mostrando igual.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en "Ajustes", **When** abre la sección "Notificaciones", **Then** ve un interruptor por cada tipo de alerta (stock bajo, caducidad) para incluirlo o no en el indicador de la navegación inferior.
2. **Given** ambos tipos de alerta están habilitados (valor por defecto), **When** existen alertas pendientes de cualquiera de los dos tipos, **Then** el ícono "Alertas" de la navegación inferior muestra un indicador con el total combinado.
3. **Given** un usuario desactiva el tipo "Stock bajo" en sus preferencias, **When** existen insumos con stock bajo pero ninguna alerta de caducidad, **Then** el indicador de la navegación inferior no se muestra, aunque la sección "Alertas" sí siga listando esos insumos con stock bajo.
4. **Given** un usuario desactiva ambos tipos de alerta, **When** existen alertas pendientes de cualquier tipo, **Then** el indicador de la navegación inferior no se muestra en absoluto.
5. **Given** las preferencias de notificaciones de un dispositivo, **When** distintos usuarios inician sesión en ese mismo dispositivo, **Then** las preferencias se mantienen sin cambios, porque pertenecen al dispositivo y no a una cuenta específica.

---

### Edge Cases

- ¿Qué pasa si un administrador desactiva una categoría que sigue asignada a insumos activos? Esos insumos conservan su categoría actual sin cambios; la categoría solo deja de ofrecerse para nuevas selecciones (alta o edición).
- ¿Qué pasa si dos administradores, sin conexión, crean una categoría con el mismo nombre normalizado? Se aplica la misma regla de deduplicación por clave normalizada ya definida en la spec 008: una de las dos categorías queda como la vigente de forma determinística y la otra no se duplica.
- ¿Qué pasa si se renombra una categoría a un nombre que coincide con una categoría precargada (por ejemplo, a "cirugia")? Se aplica la misma regla de fusión que con otra categoría creada: los materiales pasan a usar el nombre precargado y la fila creada queda desactivada.
- ¿Qué pasa si dos administradores renombran la misma categoría a nombres distintos casi al mismo tiempo, sin conexión? Se resuelve con el mismo criterio determinístico ya usado para conflictos de catálogo (spec 007 FR-021a): uno de los dos cambios queda como vigente; no se dejan insumos con nombres de categoría inconsistentes entre sí.
- ¿Qué pasa si el rol de un usuario cambia mientras tiene abierta una sección solo para administradores ("Categorías", "Clínica" o "Insumos dados de baja")? Deja de ver esas secciones en cuanto el cambio de rol se refleja localmente, igual que ya ocurre hoy en "Alertas" (spec 007).
- ¿Qué pasa con el puente temporal "Consumir insumo" que hoy ocupa la sección "Más"? Se retira como parte de esta spec: quedó documentado como puente temporal desde la spec 006 y ya es redundante frente a las acciones rápidas de consumo de la spec 007 disponibles directamente en el listado principal.
- ¿Qué pasa si se desactivan todas las categorías creadas? Las categorías precargadas y "Sin categoría" siguen disponibles siempre, por lo que el selector de materiales nunca queda sin opciones.
- ¿Qué pasa si un usuario sin rol administrador intenta, por fuera de la app, dar de alta un insumo con datos de catálogo que normalmente requieren permisos (por ejemplo, asignarle directamente un stock mínimo alto)? El alta en sí sigue abierta a todo el personal (spec 008); esta spec no restringe la creación, solo la modificación posterior y la baja/restauración de un insumo ya existente.
- ¿Qué pasa si se restaura un insumo cuya categoría fue desactivada mientras estaba dado de baja? El insumo vuelve activo conservando esa categoría como texto (igual que cualquier insumo con una categoría desactivada); la categoría simplemente no se ofrece para nuevas selecciones.
- ¿Qué pasa si dos administradores restauran el mismo insumo dado de baja casi al mismo tiempo, sin conexión? El resultado final es el mismo (insumo activo); se resuelve con el mismo criterio de conflicto por campo ya usado para cualquier cambio de catálogo (spec 007 FR-021a).

## Requirements *(mandatory)*

### Functional Requirements

**Estructura y acceso**

- **FR-001**: La sección "Más" de la navegación inferior DEBE reemplazar su contenido actual (incluido el puente temporal "Consumir insumo" heredado de la spec 006, ya redundante frente a las acciones rápidas de consumo de la spec 007) por la vista "Ajustes", disponible para todo usuario autenticado.
- **FR-002**: La vista "Ajustes" DEBE organizarse en secciones diferenciadas: "Perfil" y "Notificaciones" (visibles para cualquier usuario autenticado), y "Clínica", "Categorías" e "Insumos dados de baja" (visibles solo para administradores).
- **FR-003**: Un usuario sin rol administrador que abra "Ajustes" NO DEBE ver ni poder acceder a las secciones "Clínica", "Categorías" e "Insumos dados de baja" bajo ninguna circunstancia; deben estar completamente ocultas, no solo deshabilitadas.

**Perfil**

- **FR-004**: La sección "Perfil" DEBE mostrar el nombre, correo y rol del usuario autenticado actual.
- **FR-005**: La sección "Perfil" DEBE ofrecer una acción "Cerrar sesión" con el mismo comportamiento que la ya existente en el encabezado de la app.

**Configuración de alertas (relocalizada desde "Alertas")**

- **FR-006**: El control para configurar el stock mínimo por insumo (spec 004) DEBE trasladarse de la sección "Alertas" a una sección de "Ajustes" visible solo para administradores, conservando su comportamiento actual sin cambios.
- **FR-007**: El control para configurar los niveles de aviso de caducidad, en días (spec 004), DEBE trasladarse de la sección "Alertas" a esa misma sección de "Ajustes" visible solo para administradores, conservando su comportamiento actual sin cambios.
- **FR-008**: La sección "Alertas" DEBE quedar dedicada exclusivamente a mostrar alertas de stock bajo, caducidad y lotes en revisión, sin ningún control de configuración.

**Seguridad de datos: cerrar el catálogo a nivel de servidor**

- **FR-009**: El sistema DEBE rechazar, a nivel de servidor (no solo dentro de la app), cualquier intento de un usuario sin rol administrador de modificar los campos de catálogo de un insumo ya existente: nombre, categoría, unidad de medida, stock mínimo, código de fabricante o si caduca.
- **FR-010**: El sistema DEBE rechazar, a nivel de servidor, cualquier intento de un usuario sin rol administrador de dar de baja o restaurar un insumo.
- **FR-011**: Esta restricción NO DEBE alterar ninguna regla de permisos ya vigente: cualquier usuario autenticado DEBE seguir pudiendo dar de alta un insumo nuevo (spec 008), registrar lotes (spec 002/008/009) y registrar movimientos de ingreso, consumo o ajuste (spec 002/007/009), exactamente igual que hoy.
- **FR-012**: La sincronización rutinaria en segundo plano de insumos sin cambios de catálogo pendientes NO DEBE verse bloqueada ni rechazada por esta restricción, para ningún usuario, con o sin rol administrador.

**Categorías**

- **FR-013**: La sección "Categorías" (solo administradores) DEBE listar todas las categorías disponibles en el selector de materiales (precargadas y creadas), indicando cuáles están activas y cuáles desactivadas.
- **FR-014**: Un administrador DEBE poder crear una nueva categoría desde "Ajustes", con la misma validación y deduplicación por nombre normalizado ya usada en el alta de materiales (spec 008, FR-009/R2).
- **FR-015**: Un administrador DEBE poder renombrar una categoría previamente creada. Si el nuevo nombre normalizado no coincide con ninguna categoría existente, la categoría pasa a mostrarse con ese nuevo nombre. Si coincide con otra categoría activa o precargada, ambas quedan fusionadas: la categoría renombrada se desactiva automáticamente y sus materiales pasan a usar el nombre de la categoría existente.
- **FR-016**: Al renombrar o fusionar una categoría (FR-015), todos los materiales (activos o dados de baja) cuya categoría coincide por clave normalizada con el nombre anterior DEBEN actualizarse al nombre resultante, como parte de la misma operación.
- **FR-017**: Un administrador DEBE poder desactivar ("eliminar" de la lista de opciones) una categoría previamente creada, para que deje de ofrecerse como opción al dar de alta o editar un material; los materiales que ya usaban esa categoría conservan su valor actual sin cambios.
- **FR-018**: Un administrador DEBE poder reactivar una categoría previamente desactivada, devolviéndola al selector de materiales.
- **FR-019**: Las categorías precargadas (Cirugía, Restauración, Tratamientos pulpares, Fresas) y "Sin categoría" NO DEBEN poder renombrarse, desactivarse, eliminarse, ni ser el origen de una fusión (FR-015) desde "Ajustes" — sí pueden ser el destino de una fusión iniciada por una categoría creada (FR-015, Edge Cases).

**Clínica**

- **FR-020**: La sección "Clínica" (solo administradores) DEBE permitir configurar un nombre de clínica/gabinete de texto libre, no vacío, que reemplace la etiqueta fija "Gabinete" mostrada en el encabezado de la app.
- **FR-021**: Mientras no se haya configurado un nombre de clínica, o si se intenta guardar uno vacío o solo con espacios, el encabezado DEBE seguir mostrando (o conservar) la etiqueta por defecto "Gabinete".

**Insumos dados de baja**

- **FR-022**: La sección "Insumos dados de baja" (solo administradores) DEBE listar todos los insumos con baja lógica activa (spec 007), mostrando su nombre, categoría, y quién y cuándo los dio de baja.
- **FR-023**: Un administrador DEBE poder restaurar un insumo dado de baja; al confirmar, el insumo DEBE volver a aparecer de inmediato en Inventario, Alertas y Compras, con su stock y lotes tal como quedaron al momento de la baja.
- **FR-024**: Restaurar un insumo DEBE quedar registrado en su historial de cambios de catálogo, igual que la baja original (spec 007, Principio IV de trazabilidad).

**Notificaciones**

- **FR-025**: La sección "Notificaciones" (todo usuario autenticado) DEBE ofrecer un interruptor por cada tipo de alerta (stock bajo, caducidad) para incluirlo o no en el indicador de alertas pendientes de la navegación inferior; ambos DEBEN estar habilitados por defecto.
- **FR-026**: El ícono "Alertas" de la navegación inferior DEBE mostrar un indicador visual con el total de alertas pendientes de los tipos habilitados en las preferencias del dispositivo, recalculado localmente ante cualquier cambio relevante, igual que el resto de las alertas (spec 004).
- **FR-027**: Las preferencias de notificaciones DEBEN ser propias de cada dispositivo (no de una cuenta de usuario ni sincronizadas entre dispositivos), y persistir entre sesiones en ese mismo dispositivo.
- **FR-028**: Si un dispositivo tiene desactivados ambos tipos de alerta en sus preferencias, el indicador de la navegación inferior NO DEBE mostrarse, sin afectar la disponibilidad de las alertas dentro de la sección "Alertas".

**Transversales**

- **FR-029**: Las operaciones de "Clínica", "Categorías" e "Insumos dados de baja" (guardar nombre de clínica, crear/renombrar/fusionar/desactivar/reactivar categoría, restaurar un insumo) DEBEN funcionar completamente sin conexión, aplicándose primero localmente y sincronizándose en segundo plano sin bloquear al usuario ni perder datos.
- **FR-030**: Todos los controles nuevos de esta spec (interruptores, botones, campos de texto) DEBEN cumplir un área táctil mínima de 48x48px.

### Key Entities

- **Configuración de Clínica**: Entidad nueva, de fila única (similar a la configuración global de alertas de la spec 004). Atributos: nombre de la clínica/gabinete.
- **Categoría (extendida)**: Reutiliza la entidad de la spec 008, agregando un estado activo/desactivado gestionable por un administrador, y dejando de ser inmutable: su nombre puede corregirse (renombrar/fusionar), lo que además actualiza el nombre de categoría guardado en los materiales que la usaban. Las categorías precargadas y "Sin categoría" siguen siendo constantes de código, sin estos cambios.
- **Insumo (sin cambios estructurales, nuevo flujo)**: Reutiliza la baja lógica de la spec 007 (`dadoDeBajaEn`/`dadoDeBajaPor`); esta spec agrega la operación inversa (restaurar), registrada en el mismo historial de cambios de catálogo.
- **Preferencia de Notificaciones**: Entidad nueva, local al dispositivo (no sincronizada). Atributos: si el tipo "stock bajo" cuenta para el indicador de la navegación, si el tipo "caducidad" cuenta para el indicador de la navegación.
- **Movimiento / ConfiguracionAlertas (sin cambios estructurales)**: Reutilizados sin modificación; solo cambia la pantalla donde se editan los umbrales de alerta.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un administrador puede localizar y modificar el stock mínimo de cualquier insumo o los niveles de aviso de caducidad desde "Ajustes" en menos de 15 segundos desde que abre la app, sin pasar por "Alertas".
- **SC-002**: El 100% de las visitas a la sección "Alertas" muestran únicamente alertas, sin ningún control de configuración.
- **SC-003**: 0 modificaciones de catálogo (nombre, categoría, unidad, stock mínimo, código, caduca) o bajas/restauraciones de insumo realizadas por un usuario sin rol administrador logran persistir, sea a través de la app o mediante una llamada directa al backend.
- **SC-004**: Un administrador puede crear, renombrar o desactivar una categoría desde "Ajustes" en menos de 20 segundos, y el 100% de los materiales afectados por un renombrado/fusión quedan con el nombre correcto de inmediato.
- **SC-005**: Un usuario puede ver su nombre, correo, rol y cerrar sesión desde "Ajustes" sin necesitar otra pantalla, en menos de 5 segundos desde que abre la sección.
- **SC-006**: Un administrador puede restaurar un insumo dado de baja por error en menos de 15 segundos desde que abre "Ajustes", sin perder ningún dato de su historial.
- **SC-007**: El indicador de alertas pendientes en la navegación inferior refleja correctamente las preferencias configuradas en el 100% de los casos verificados, con y sin conexión.
- **SC-008**: Un usuario puede ajustar sus preferencias de notificaciones en menos de 10 segundos.

## Assumptions

- **Clínica de tenant único**: la app sigue siendo de una sola clínica por instalación (no existe hoy ningún campo que asocie insumos, lotes o movimientos a una clínica específica); "administrar la clínica" en esta spec se limita a un nombre configurable de un único registro global, no a soporte multi-clínica ni a cambiar de clínica activa, cambio que implicaría rediseñar todo el modelo de datos y está fuera de alcance.
- **Usuarios**: siguiendo la decisión ya tomada en la spec 003 (la creación de cuentas y la asignación de roles se realiza exclusivamente mediante herramientas de administración de Supabase, fuera de la app), "administrar usuarios" en esta spec se limita a que cada usuario vea su propio perfil (nombre, correo, rol) y cierre sesión; no se agrega un listado ni gestión de otras cuentas del personal de la clínica dentro de la app.
- **Categorías con rename/merge, sin FK**: `Insumo.categoria` sigue siendo texto libre (spec 008); renombrar o fusionar una categoría actualiza ese texto en cada material afectado como parte de la misma operación (igual que una edición de catálogo, spec 007), en vez de introducir una relación por identificador — cambio de modelo que las specs 008/007 ya evaluaron y descartaron por costo.
- **Seguridad del catálogo, sin cambiar reglas de permisos**: el cierre de RLS en `insumos`/`lotes`/`movimientos` (User Story 3) refuerza a nivel de servidor una regla que ya existe y se aplica en el cliente desde la spec 007 (solo administrador edita/da de baja el catálogo); no amplía ni reduce quién puede hacer qué, solo hace que el servidor la haga cumplir también.
- **Notificaciones dentro de la app, no push**: no existe ni se introduce en esta spec ningún canal de notificaciones del sistema operativo, push o por correo; "preferencias de notificaciones" se limita a un indicador visual dentro de la propia app (badge en la navegación inferior), consistente con el Principio IV de la constitución (alertas visuales calculadas localmente, sin depender del backend).
- **Puente "Consumir insumo"**: su retiro de la sección "Más" es un efecto colateral necesario de esta spec (esa pestaña pasa a ser "Ajustes"), no una redefinición del flujo de consumo, que sigue cubierto por las acciones rápidas de la spec 007 desde el listado principal de Inventario.
- **Restaurar insumo, sin reconstruir historial perdido**: como la baja lógica (spec 007) nunca borró lotes ni movimientos, restaurar un insumo no necesita recuperar nada — solo revertir el marcador de baja; su stock y lotes ya estaban intactos, solo ocultos de las vistas operativas.
- **Permisos**: se reutiliza el mismo criterio ya establecido en las specs 004/007/008 (rol "administrador") para las secciones "Clínica", "Categorías" e "Insumos dados de baja"; "Perfil" y "Notificaciones" están abiertas a todo usuario autenticado, igual que las alertas de solo lectura en la spec 004.
- **Base**: se reutiliza la navegación de la spec 006, las alertas y su configuración de la spec 004, la baja lógica y el ledger de cambios de la spec 007, el catálogo de categorías de la spec 008, y el criterio de permisos de administrador de las specs 004/007/008.
