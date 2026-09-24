# Feature Specification: Ajustes de Interfaz Pre-Release (Rebranding, Navegación y Visibilidad)

**Feature Branch**: `[011-ajustes-pre-release]`

**Created**: 2026-09-24

**Status**: Draft

**Input**: User description: "ajustes para release: rename app a DENTDELION (repo mantiene nombre indentory), mover panel de navegación a borde inferior de pantalla (tipo app nativa). ocultar "sesión iniciada como..." y boton de cerrar sesión, ya se muestra en pestaña de config. ocultar por ahora opción de escaneo de insumos"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - La app se presenta como DENTDELION (Priority: P1)

Como usuario del personal clínico, veo el nombre "DENTDELION" en todas las pantallas y puntos de contacto visibles de la aplicación (pantalla de carga, pantalla de inicio de sesión, encabezado, título de pestaña del navegador, ícono/nombre al instalar la app en el dispositivo), de modo que la identidad de marca sea consistente para el release, sin que esto afecte el nombre técnico del repositorio o del proyecto ("inDENTory"), que permanece sin cambios.

**Why this priority**: Es el cambio de mayor visibilidad para el release; cualquier inconsistencia de marca (nombre viejo en algunas pantallas y nuevo en otras) es inmediatamente notoria para todos los usuarios y clientes.

**Independent Test**: Puede probarse completamente navegando por cada pantalla y punto de contacto visible de la app (carga, login, encabezado, pestaña del navegador, instalación como PWA) y confirmando que todos muestran "DENTDELION" y ninguno muestra "inDENTory".

**Acceptance Scenarios**:

1. **Given** la app recién cargando (splash/estado de carga), **When** el usuario abre la aplicación, **Then** el texto mostrado dice "DENTDELION" y no "inDENTory".
2. **Given** un usuario no autenticado, **When** ve la pantalla de inicio de sesión, **Then** el encabezado de dicha pantalla muestra "DENTDELION".
3. **Given** un usuario autenticado en cualquier pantalla principal, **When** observa el encabezado superior de la app, **Then** el nombre mostrado es "DENTDELION".
4. **Given** la app instalada como PWA en un dispositivo, **When** el usuario ve el ícono/nombre en su pantalla de inicio o en el selector de apps del sistema operativo, **Then** el nombre mostrado es "DENTDELION".
5. **Given** el repositorio de código y su configuración de proyecto, **When** se revisan tras el cambio, **Then** el nombre interno del proyecto/repositorio permanece "inDENTory" (no se renombra internamente).

---

### User Story 2 - Navegación fija en el borde inferior (Priority: P1)

Como usuario que opera la app principalmente desde un teléfono o tablet en el gabinete, quiero que el panel de navegación principal permanezca siempre visible, fijo en el borde inferior de la pantalla —igual que en una app nativa—, de modo que pueda cambiar de sección en cualquier momento sin tener que desplazarme hacia abajo para encontrarlo ni perderlo de vista mientras reviso contenido largo.

**Why this priority**: La navegación es el mecanismo que el usuario usa constantemente durante todo el flujo clínico; si no es persistente, cada cambio de sección exige desplazamiento adicional, lo cual fricciona un entorno donde la rapidez y el uso con una mano (o con guantes) importan.

**Independent Test**: Puede probarse abriendo cualquier pantalla con contenido que exceda el alto de la pantalla, desplazándose hacia abajo, y confirmando que el panel de navegación permanece visible y fijo en el borde inferior en todo momento, sin ser tapado ni requerir scroll para alcanzarlo.

**Acceptance Scenarios**:

1. **Given** una pantalla con una lista larga de insumos que excede el alto visible, **When** el usuario se desplaza (scroll) por el contenido, **Then** el panel de navegación permanece fijo y visible en el borde inferior de la pantalla en todo momento.
2. **Given** el usuario está en cualquiera de las secciones principales (Inventario, Compras, Alertas, Más), **When** observa la pantalla, **Then** el panel de navegación aparece anclado al borde inferior, con separación visual clara del contenido y sin superponerse de forma que oculte información o controles interactivos relevantes.
3. **Given** un dispositivo con área segura del sistema operativo en el borde inferior (p. ej. barra de gestos), **When** se muestra el panel de navegación, **Then** el panel respeta esa área segura y sus controles no quedan parcial u totalmente inaccesibles.

---

### User Story 3 - Ocultar información de sesión y cierre de sesión duplicados (Priority: P2)

Como usuario autenticado, ya no veo el texto "Sesión iniciada como…" ni el botón "Cerrar sesión" en el encabezado superior de la app, porque esa misma información y esa misma acción ya están disponibles en la pestaña de Ajustes/Configuración, y mostrarlas en dos lugares genera redundancia visual y ocupa espacio innecesario en el encabezado.

**Why this priority**: Es una limpieza de interfaz que reduce redundancia y libera espacio en el encabezado, pero no bloquea ni degrada ninguna capacidad existente (el cierre de sesión sigue disponible en Ajustes), por lo que tiene menor urgencia que el rebranding y la navegación.

**Independent Test**: Puede probarse iniciando sesión y revisando el encabezado superior en cualquier pantalla: no debe aparecer texto de sesión ni botón de cerrar sesión ahí. Luego, en la pestaña de Ajustes, debe seguir siendo posible ver los datos de la sesión y cerrar sesión con éxito.

**Acceptance Scenarios**:

1. **Given** un usuario autenticado en cualquier pantalla principal, **When** observa el encabezado superior de la app, **Then** no se muestra el texto "Sesión iniciada como…" ni el botón "Cerrar sesión".
2. **Given** un usuario autenticado, **When** navega a la pestaña de Ajustes, **Then** puede ver su información de sesión (nombre, correo, rol) y cerrar sesión exitosamente desde ahí, tal como antes.
3. **Given** un usuario que cierra sesión desde la pestaña de Ajustes, **When** la acción se completa, **Then** el comportamiento de cierre de sesión es idéntico al que tenía previamente el botón del encabezado (misma acción, mismo resultado).

---

### User Story 4 - Ocultar temporalmente la opción de escaneo de insumos (Priority: P3)

Como usuario que registra, busca o consume insumos, ya no veo ninguna opción para escanear (código de barras/DataMatrix) en los formularios y pantallas donde antes estaba disponible (alta de material, consumo, filtro/búsqueda de inventario, edición), porque esa función se oculta temporalmente para este release; en su lugar, sigo pudiendo completar todas esas tareas mediante búsqueda y captura manual, sin ningún paso adicional ni degradación del flujo.

**Why this priority**: Es una función secundaria y opcional dentro del flujo (la búsqueda manual ya es la vía principal); ocultarla temporalmente no bloquea ninguna tarea crítica, por lo que es la de menor urgencia dentro de este conjunto de ajustes.

**Independent Test**: Puede probarse abriendo cada pantalla/formulario relacionado con insumos (alta, edición, consumo, filtro de inventario) y confirmando que no aparece ningún botón o control de "Escanear", mientras que la búsqueda y captura manual de datos siguen funcionando de forma completa y sin fricción adicional.

**Acceptance Scenarios**:

1. **Given** el formulario de alta de un nuevo material, **When** el usuario lo abre, **Then** no aparece ningún botón o control de "Escanear", y puede completar el alta ingresando los datos manualmente.
2. **Given** el formulario de consumo de un insumo, **When** el usuario lo abre, **Then** no aparece la opción de escaneo, y puede seleccionar el insumo mediante búsqueda manual.
3. **Given** la vista de inventario con filtros de búsqueda, **When** el usuario interactúa con los filtros, **Then** no aparece la opción de escanear como método de búsqueda, y la búsqueda manual por texto/categoría sigue disponible.
4. **Given** el formulario de edición de un insumo existente, **When** el usuario lo abre, **Then** no aparece la opción de escaneo.

---

### Edge Cases

- ¿Qué ocurre con textos compartidos o notificados fuera de la propia interfaz (p. ej. contenido de "compartir lista de compras", títulos de notificaciones push) que hoy mencionen el nombre de la app? Deben actualizarse también a "DENTDELION" para mantener consistencia de marca en todo punto de contacto visible al usuario.
- ¿Qué pasa si el nombre "DENTDELION" es más largo que "inDENTory" y provoca recorte visual (truncamiento) en encabezados o en la pantalla de carga en dispositivos de pantalla angosta? El texto debe seguir siendo legible y no truncarse de forma que pierda significado.
- ¿Qué ocurre cuando el teclado en pantalla está abierto en un formulario mientras la navegación permanece fija en el borde inferior? La navegación fija no debe ocultar campos de entrada activos ni impedir que el usuario complete el formulario.
- ¿Qué pasa si un usuario intenta acceder al botón de cerrar sesión o a la opción de escaneo por un camino distinto al encabezado o a los formularios ya cubiertos (p. ej. un acceso directo o estado previamente guardado)? Estas opciones deben permanecer inaccesibles desde cualquier parte de la interfaz fuera de los lugares explícitamente permitidos (Ajustes, para sesión/cierre de sesión) o completamente inaccesibles (para escaneo).
- ¿Qué pasa con usuarios que ya tienen una sesión activa cuando se despliega esta actualización? Deben ver los cambios de interfaz (nombre, navegación, encabezado) sin necesidad de volver a iniciar sesión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE mostrar "DENTDELION" como nombre visible de la aplicación en la pantalla de carga/inicio, la pantalla de inicio de sesión, el encabezado superior de la app y el título de la pestaña del navegador.
- **FR-002**: El sistema DEBE mostrar "DENTDELION" como nombre de la aplicación en los metadatos usados al instalar la app como aplicación (PWA), incluyendo el nombre mostrado en la pantalla de inicio del dispositivo y en el selector de apps del sistema operativo.
- **FR-003**: El sistema DEBE mantener sin cambios el nombre interno del repositorio, del proyecto de código y de cualquier identificador técnico (paquete, configuración de build, nombres de variables/carpetas) como "inDENTory"; el cambio de nombre es exclusivamente de cara al usuario final.
- **FR-004**: El sistema DEBE mostrar el panel de navegación principal anclado (fijo) al borde inferior de la pantalla en todas las pantallas principales, permaneciendo visible y accesible independientemente del desplazamiento (scroll) del contenido.
- **FR-005**: El panel de navegación fijo DEBE respetar las áreas seguras del dispositivo (p. ej. barra de gestos/home indicator) para que ninguno de sus controles quede oculto o inaccesible.
- **FR-006**: El sistema DEBE ocultar, en el encabezado superior de la app, el texto "Sesión iniciada como…" y el botón "Cerrar sesión" para todos los usuarios autenticados.
- **FR-007**: El sistema DEBE mantener disponible la información de sesión (nombre, correo, rol) y la acción de cerrar sesión dentro de la pestaña de Ajustes/Configuración, con el mismo comportamiento funcional que tenía previamente el control del encabezado.
- **FR-008**: El sistema DEBE ocultar toda opción de escaneo (código de barras/DataMatrix) relacionada con insumos en todas las pantallas y formularios donde existe actualmente: alta de material, edición de insumo, consumo de insumo y filtro/búsqueda de inventario.
- **FR-009**: El sistema DEBE permitir completar íntegramente, mediante búsqueda y captura manual, todas las tareas que antes podían usar la opción de escaneo (alta, edición, consumo y búsqueda de insumos), sin pasos adicionales ni degradación de la experiencia.
- **FR-010**: El ocultamiento de la opción de escaneo (FR-008) DEBE ser reversible en una futura actualización sin requerir rediseño de los formularios afectados; por ahora, la opción no debe ser visible ni accesible por ningún medio desde la interfaz.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de las pantallas y puntos de contacto visibles al usuario (carga, login, encabezado, título de pestaña, instalación como PWA) muestran "DENTDELION" y ninguno muestra "inDENTory".
- **SC-002**: El panel de navegación permanece visible en el borde inferior de la pantalla el 100% del tiempo mientras el usuario navega o se desplaza por cualquier pantalla principal, sin requerir scroll adicional para acceder a él.
- **SC-003**: El texto de sesión iniciada y el botón de cerrar sesión no aparecen en el encabezado superior en ninguna pantalla, y siguen estando disponibles y funcionales al 100% desde la pestaña de Ajustes.
- **SC-004**: La opción de escaneo no es visible ni accesible en ninguna de las 4 pantallas/formularios de insumos identificados, mientras que el 100% de las tareas de alta, edición, consumo y búsqueda de insumos se completan exitosamente mediante los métodos manuales existentes.
- **SC-005**: Ningún usuario reporta pérdida de acceso a cerrar sesión o a completar tareas de gestión de insumos tras el cambio (medido por ausencia de incidentes/soporte relacionados en las primeras semanas post-release).

## Assumptions

- El cambio de nombre a "DENTDELION" aplica a todo texto y metadato de cara al usuario (interfaz, manifiesto de instalación, título de pestaña, notificaciones y contenido compartido), pero no a identificadores técnicos internos (repositorio, nombre de paquete, configuración de build, base de datos), que permanecen como "inDENTory" según lo indicado explícitamente.
- "Tipo app nativa" para la navegación se interpreta como un panel de navegación con posición fija (persistente) en el borde inferior de la pantalla, siempre visible por encima del contenido desplazable, siguiendo el patrón común de barras de pestañas de apps móviles nativas.
- Ocultar la opción de escaneo es una medida temporal para este release; no se requiere una bandera de configuración visible para el usuario final que la reactive, ya que el objetivo actual es simplemente que no esté disponible por ahora.
- Ocultar el escaneo no infringe el principio de búsqueda manual como flujo primario del proyecto, dado que el escaneo ya era un canal secundario y opcional; su ausencia temporal no afecta la vía principal (manual) de ninguna tarea.
- No se requiere migración de datos ni cambios en el modelo de datos existente para ninguno de los cuatro ajustes de esta especificación: son cambios de presentación/visibilidad de interfaz.
- Los usuarios con sesión activa al momento del despliegue verán los cambios de interfaz sin necesidad de volver a autenticarse (comportamiento estándar de actualización de la aplicación).
