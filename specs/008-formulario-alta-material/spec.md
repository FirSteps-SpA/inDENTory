# Feature Specification: Formulario Unificado para Creación de Nuevo Material

**Feature Branch**: `008-formulario-alta-material`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Continuar el desarrollo del roadmap (spec 8): Reestructuración de la vista para dar de alta nuevos materiales en el catálogo, incorporando un selector desplegable de categorías, configuración de umbrales de stock mínimo y la opción de vincular lotes/fechas de vencimiento iniciales. Categorías reales de la clínica (a precargar en el selector desplegable): Cirugía, Restauración, Tratamientos pulpares, Fresas."

## Clarifications

### Session 2026-09-23

- Q: ¿Quién puede dar de alta materiales nuevos con "+ Material"? → A: Todo el personal autenticado (administrador o personal regular); crear categorías nuevas sigue siendo solo para administradores.
- Q: ¿Qué unidades de medida ofrece el formulario? → A: Las del roadmap combinadas con las actuales: Caja, Frasco, Pieza, Cartucho, mL y g (solo mL y g admiten decimales).
- Q: Si dos dispositivos sin conexión dan de alta un material con el mismo nombre, ¿qué pasa al sincronizar? → A: Se conservan ambos; el más reciente muestra un badge "Posible duplicado" solo a administradores, que desaparece al renombrar o dar de baja uno de los dos.
- Q: Si la fecha de vencimiento del primer lote ya pasó, ¿se puede guardar? → A: Sí, con advertencia "Este lote ingresaría ya caducado" y confirmación explícita; el lote queda caducado y aparece en Alertas.
- Q: ¿Hasta cuándo se conserva el borrador de un alta sin guardar? → A: En el dispositivo, sobreviviendo a cambios de sección y a cerrar/recargar la app; se descarta al guardar, cancelar o cerrar sesión.
- Q: Si alguien del personal regular da de alta un material que no encaja en ninguna categoría, ¿qué hace? → A: Elige la opción fija "Sin categoría"; un administrador lo recategoriza después con Editar (spec 007), apoyándose en el filtro "Sin categoría". Crear categorías sigue siendo solo para administradores.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dar de alta un material nuevo desde el Inventario (Priority: P1)

Como personal clínico (cualquier usuario autenticado), quiero tocar "+ Material" en la pantalla de Inventario y completar en un único formulario el nombre, la categoría (elegida de una lista desplegable), la unidad de medida, el stock mínimo y si el material caduca, para que el material quede disponible en el catálogo sin pasar por la búsqueda de otro flujo.

**Why this priority**: Hoy el alta de materiales está escondida dentro del flujo de registro de lotes (en "Más") y no permite fijar categoría de una lista, stock mínimo ni unidad de forma cómoda. Sin un alta clara, el catálogo se llena de categorías escritas a mano y materiales sin umbral de alerta.

**Independent Test**: Puede probarse tocando "+ Material", completando nombre, categoría "Fresas", unidad, stock mínimo 5 y "sin stock inicial", guardando, y verificando que el material aparece en el listado de Inventario, bajo el filtro "Fresas", con estado "Sin stock" y su umbral configurado.

**Acceptance Scenarios**:

1. **Given** el usuario está en la pantalla de Inventario, **When** toca "+ Material", **Then** se abre la vista "Nuevo Material" con el campo de nombre listo para escribir, sin activar la cámara.
2. **Given** el formulario está abierto, **When** el usuario abre el selector de categoría, **Then** ve al menos las categorías Cirugía, Restauración, Tratamientos pulpares y Fresas, más las categorías ya usadas en el catálogo, sin duplicados.
3. **Given** el usuario completó nombre, categoría y unidad de medida, **When** toca "Guardar", **Then** el material queda creado, la vista se cierra y el listado de Inventario lo muestra de inmediato con un aviso de confirmación.
4. **Given** el usuario indicó un stock mínimo de 5 y no cargó stock inicial, **When** guarda, **Then** el material aparece con estado "Sin stock" y cuenta en el resumen de alertas de stock bajo.
5. **Given** el usuario deja vacío el nombre o elige un nombre que ya tiene otro material activo, **When** intenta guardar, **Then** el sistema no guarda y muestra el error junto al campo afectado, conservando todo lo demás escrito.
6. **Given** el usuario toca "Cancelar" con datos escritos, **When** confirma que desea descartar, **Then** vuelve al Inventario sin crear nada y con la búsqueda y filtros que tenía activos.
7. **Given** el dispositivo está sin conexión, **When** el usuario guarda un material nuevo, **Then** el material se crea igual de inmediato y se sincroniza en segundo plano cuando vuelva la conexión.

---

### User Story 2 - Ingresar stock inicial y primer lote en el mismo paso (Priority: P1)

Como personal que recibe un material nuevo, quiero indicar en el mismo formulario de alta la cantidad que llegó y, si el material caduca, el número de lote, el proveedor y la fecha de vencimiento, para que el material quede en el inventario con su stock real y su trazabilidad desde el primer momento, sin tener que ir después a registrar el lote por separado.

**Why this priority**: El caso habitual de alta es "llegó algo que no teníamos"; obligar a dos flujos separados duplica el trabajo y deja materiales con stock 0 que en realidad sí existen. Es el "Guardar e Ingresar" del roadmap.

**Independent Test**: Puede probarse creando un material que caduca con stock inicial 10 cajas, lote "A123", proveedor y fecha de vencimiento, y verificando que el listado muestra 10 cajas, el detalle muestra el lote con su fecha, y el historial contiene un ingreso atribuido al usuario.

**Acceptance Scenarios**:

1. **Given** el formulario de alta está abierto, **When** el usuario ajusta "Stock inicial" con los botones "+" y "−" o escribiendo el número, **Then** el valor cambia en pasos de 1 y nunca baja de 0.
2. **Given** el interruptor "Sujeto a caducidad" está activado y el stock inicial es mayor a 0, **When** el usuario mira el formulario, **Then** se muestran los campos de número de lote, proveedor y fecha de vencimiento del primer lote, y son obligatorios.
3. **Given** el interruptor "Sujeto a caducidad" está desactivado y el stock inicial es mayor a 0, **When** el usuario mira el formulario, **Then** se muestran número de lote y proveedor, pero no la fecha de vencimiento.
4. **Given** el stock inicial es 0, **When** el usuario mira el formulario, **Then** los campos del primer lote no se muestran ni se exigen, y el botón principal dice "Guardar" en lugar de "Guardar e Ingresar".
5. **Given** el usuario completó un stock inicial con su primer lote, **When** toca "Guardar e Ingresar", **Then** se crean a la vez el material, su primer lote y el movimiento de ingreso atribuido al usuario autenticado; si alguno no puede guardarse, no se guarda ninguno.
6. **Given** la fecha de vencimiento ingresada ya pasó, **When** el usuario intenta guardar, **Then** el sistema advierte que el lote ingresaría ya caducado y pide confirmación explícita antes de guardar.

---

### User Story 3 - Crear una categoría nueva sin salir del formulario (Priority: P2)

Como administrador, cuando el material que estoy dando de alta no encaja en ninguna categoría existente, quiero elegir "+ Crear nueva categoría" en el mismo selector, escribir su nombre y dejarla seleccionada, para no tener que abandonar el alta.

**Why this priority**: Las cuatro categorías precargadas cubren la mayoría de los casos; crear categorías es ocasional, pero sin esta opción el usuario quedaría bloqueado o forzado a una categoría incorrecta.

**Independent Test**: Puede probarse eligiendo "+ Crear nueva categoría", escribiendo "Ortodoncia", confirmando, guardando el material, y verificando que "Ortodoncia" aparece como chip de filtro en el Inventario y en el selector de altas y ediciones posteriores.

**Acceptance Scenarios**:

1. **Given** el administrador abre el selector de categoría, **When** elige "+ Crear nueva categoría", **Then** aparece un campo para escribir el nombre de la categoría sin perder lo ya escrito en el formulario.
2. **Given** el administrador escribe un nombre que coincide (sin distinguir mayúsculas, minúsculas ni tildes) con una categoría existente, **When** confirma, **Then** el sistema no crea un duplicado y deja seleccionada la categoría existente.
3. **Given** el administrador creó la categoría y luego cancela el alta del material, **When** vuelve al Inventario, **Then** la categoría no queda creada.
4. **Given** una categoría nueva se guardó junto con el material, **When** cualquier usuario abre el selector de categoría (alta o edición) o los chips de filtro del Inventario, **Then** la categoría aparece disponible.
5. **Given** el usuario tiene rol personal regular, **When** abre el selector de categoría, **Then** no ve la opción "+ Crear nueva categoría", pero sí la opción "Sin categoría".

---

### User Story 4 - Evitar duplicados con sugerencias y código de barras (Priority: P3)

Como usuario que da de alta un material, quiero que al escribir el nombre se me sugieran los materiales parecidos que ya existen, y poder escanear (solo si lo pido) el código de barras del envase, para no crear por error un material que ya está en el catálogo.

**Why this priority**: Reduce duplicados y errores de catálogo, pero el alta funciona sin ello.

**Independent Test**: Puede probarse escribiendo parte del nombre de un material existente y verificando que aparece como sugerencia con acceso directo a él; y escaneando el código de un material existente y verificando que el sistema avisa que ya existe.

**Acceptance Scenarios**:

1. **Given** el usuario escribe al menos 2 caracteres en el nombre, **When** existen materiales activos con nombres parecidos, **Then** se muestran como sugerencias debajo del campo, indicando que ya existen, con la opción de abrir su detalle en lugar de crear uno nuevo.
2. **Given** el usuario toca el botón "Escanear" junto al campo de código de barras, **When** la cámara lee un código, **Then** el código se completa en el campo; la cámara solo se activa tras ese toque explícito.
3. **Given** el código escaneado o escrito ya pertenece a un material activo, **When** se completa el campo, **Then** el sistema avisa "Este código ya corresponde a «<material>»" y ofrece abrir ese material en lugar de continuar el alta.
4. **Given** el usuario no tiene cámara disponible o niega el permiso, **When** toca "Escanear", **Then** ve un mensaje claro y puede seguir escribiendo el código a mano.

---

### Edge Cases

- ¿Qué pasa si en el catálogo ya existen categorías escritas a mano que difieren solo en mayúsculas o tildes de una precargada (p. ej. "fresas" vs "Fresas")? El selector las muestra como una sola categoría, usando el nombre precargado.
- ¿Qué pasa si se da de alta un material con el mismo nombre que uno dado de baja? Se permite: la unicidad de nombre solo aplica entre materiales activos (regla de la spec 007).
- ¿Qué pasa si la unidad de medida admite decimales (p. ej. mL o g)? El stock inicial y el stock mínimo aceptan decimales y los botones "+"/"−" siguen sumando/restando 1; en unidades contables solo se aceptan enteros.
- ¿Qué pasa si el stock mínimo se deja vacío? El material no genera alertas de stock bajo (regla de la spec 004); 0 también es válido y equivale a no alertar hasta quedar en negativo.
- ¿Qué pasa si el usuario activa "Sujeto a caducidad", escribe la fecha y luego lo desactiva? La fecha se descarta y no se guarda.
- ¿Qué pasa si dos dispositivos sin conexión crean materiales con el mismo nombre? Ambos se conservan al sincronizar (nunca se pierde un alta); el de alta más reciente muestra a los administradores un badge "Posible duplicado" hasta que se renombra o se da de baja uno de los dos.
- ¿Qué pasa si un administrador crea una categoría sin conexión y, antes de sincronizar, pierde el rol de administrador? Se aplica la regla de rechazo por permisos de la spec 007 (FR-021b): la categoría queda rechazada y deja de ofrecerse en el selector, el material se conserva pasando a "Sin categoría", y el usuario ve un aviso único.
- ¿Qué pasa si dos administradores sin conexión crean la misma categoría nueva? Al sincronizar se consideran la misma categoría si coinciden sin distinguir mayúsculas, minúsculas ni tildes; no aparecen duplicadas en el selector.
- ¿Qué pasa si el usuario sale de la app o cambia de sección con el formulario a medio llenar? Al volver a "+ Material" el borrador se restaura, aunque la app se haya cerrado o recargado; tras guardar, cancelar o cerrar sesión se descarta.
- ¿Qué pasa si se toca "Guardar" dos veces muy rápido? Solo se crea un material y un lote.
- ¿Qué pasa con el alta de insumos que hoy existe dentro del flujo "Registrar insumo" en "Más"? La opción "Crear insumo nuevo" de esa búsqueda abre este mismo formulario con el nombre buscado ya escrito, de modo que exista una sola forma de dar de alta materiales.

## Requirements *(mandatory)*

### Functional Requirements

**Acceso y estructura**

- **FR-001**: La pantalla de Inventario DEBE ofrecer un botón visible "+ Material" que abra la vista "Nuevo Material", disponible para todo usuario autenticado (administrador o personal regular).
- **FR-002**: La vista "Nuevo Material" DEBE presentar un encabezado con el título y un botón "Cancelar", el formulario, y un botón principal fijo visible sin necesidad de desplazarse hasta el final.
- **FR-003**: El formulario DEBE abrirse con el foco en el campo de nombre y NUNCA DEBE activar la cámara al abrirse.
- **FR-004**: La opción "Crear insumo nuevo" existente en la búsqueda del registro de lotes DEBE abrir este mismo formulario con el texto buscado precargado como nombre, reemplazando el formulario de alta embebido actual.

**Datos del material**

- **FR-005**: El formulario DEBE capturar: nombre comercial (obligatorio), categoría (obligatoria), unidad de medida (obligatoria), código de barras/fabricante (opcional), stock mínimo (opcional) y si el material está sujeto a caducidad (activado por defecto).
- **FR-006**: El nombre DEBE ser no vacío y no coincidir, sin distinguir mayúsculas/minúsculas, con el de otro material activo; los errores se muestran junto al campo sin perder lo escrito.
- **FR-007**: La unidad de medida DEBE elegirse con un control de opciones visibles de un toque (no una lista oculta) entre: Caja, Frasco, Pieza, Cartucho, mL y g. Solo mL y g admiten cantidades decimales. Si la unidad admite decimales se determina automáticamente según la unidad, como en la spec 002.
- **FR-008**: El stock mínimo DEBE ingresarse con botones "+" y "−" grandes además de escritura directa, aceptar valores ≥ 0 (enteros si la unidad no admite decimales) y quedar vacío por defecto (sin alerta).

**Categorías**

- **FR-009**: El selector de categoría DEBE ser una lista desplegable que incluya las categorías precargadas Cirugía, Restauración, Tratamientos pulpares y Fresas, más toda categoría ya usada en el catálogo o creada después, ordenadas alfabéticamente y sin duplicados (comparando sin distinguir mayúsculas, minúsculas ni tildes), y al final la opción fija "Sin categoría", disponible para todos los usuarios.
- **FR-010**: Las categorías precargadas DEBEN estar disponibles desde el primer uso de la app, incluso sin conexión y con el catálogo vacío.
- **FR-011**: El selector DEBE ofrecer "+ Crear nueva categoría" solo a administradores, con un nombre de 1 a 40 caracteres; la categoría nueva se crea al guardar el material (si se cancela el alta no se crea) y queda disponible en el selector de alta, en el de edición (spec 007) y en los chips de filtro del Inventario.
- **FR-011a**: "Sin categoría" DEBE poder elegirse como categoría válida de un material, DEBE aparecer como chip de filtro en el Inventario cuando al menos un material activo la tenga, y DEBE poder cambiarse después desde la edición de la spec 007. No puede renombrarse ni eliminarse, ni crearse otra categoría con ese nombre.
- **FR-012**: Una categoría nueva cuyo nombre coincida con una existente (sin distinguir mayúsculas, minúsculas ni tildes) NO DEBE crearse; se selecciona la existente.

**Stock inicial y primer lote**

- **FR-013**: El formulario DEBE incluir "Stock inicial" con botones "+" y "−" grandes y escritura directa, con valor por defecto 0, sin permitir valores negativos y respetando la regla de decimales de la unidad.
- **FR-014**: Cuando el stock inicial es mayor a 0, el formulario DEBE mostrar y exigir los datos del primer lote según la spec 002: número de lote y proveedor siempre, y fecha de vencimiento solo si el material está sujeto a caducidad.
- **FR-015**: Cuando el stock inicial es 0, los campos del primer lote NO DEBEN mostrarse ni exigirse, y el botón principal DEBE decir "Guardar"; cuando es mayor a 0, DEBE decir "Guardar e Ingresar".
- **FR-016**: Al guardar con stock inicial, el sistema DEBE crear el material, su primer lote y un movimiento de ingreso atribuido al usuario autenticado como una sola operación: o se guardan los tres o ninguno.
- **FR-017**: Si la fecha de vencimiento del primer lote es anterior a hoy, el sistema DEBE advertir "Este lote ingresaría ya caducado" y exigir una confirmación explícita antes de guardar; tras confirmar, el lote se guarda como caducado y aparece de inmediato en Alertas. Una fecha igual a hoy no se considera caducada.
- **FR-018**: El alta DEBE admitir un único lote inicial; lotes adicionales se registran después con el flujo de registro de lotes existente.

**Prevención de duplicados**

- **FR-019**: Al escribir 2 o más caracteres en el nombre, el sistema DEBE sugerir hasta 5 materiales activos con nombre parecido (su nombre contiene el texto escrito, sin distinguir mayúsculas, minúsculas ni tildes), indicando que ya existen, con opción de abrir su detalle en lugar de continuar el alta.
- **FR-020**: Junto al campo de código de barras DEBE haber un botón "Escanear" que active la cámara solo al tocarlo; si el código (escaneado o escrito) ya pertenece a un material activo, el sistema DEBE avisarlo y ofrecer abrir ese material.

**Transversales**

- **FR-021**: El alta de materiales, la creación de categorías y el ingreso del primer lote DEBEN funcionar completamente sin conexión, aplicándose primero localmente y sincronizándose en segundo plano sin bloquear al usuario ni perder altas.
- **FR-022**: Al guardar, el listado de Inventario, los chips de categoría, los filtros y los conteos del resumen de alertas DEBEN reflejar el nuevo material de inmediato; al volver se conservan la búsqueda y filtros previos.
- **FR-023**: Cancelar con datos escritos DEBE pedir confirmación antes de descartar; cancelar con el formulario vacío cierra directamente.
- **FR-024**: Si el usuario sale del formulario sin guardar ni cancelar (cambia de sección, cierra o recarga la app), el borrador DEBE conservarse en ese dispositivo y restaurarse al volver a abrir "+ Material"; se descarta al guardar, al cancelar o al cerrar sesión, y nunca se sincroniza a otros dispositivos. Cuando se restaura un borrador, el formulario DEBE indicarlo (p. ej. "Recuperamos tu alta sin terminar").
- **FR-025**: Todos los controles del formulario (botones "+"/"−", opciones de unidad, interruptor de caducidad, selector de categoría, botón "Escanear", botones de guardar/cancelar) DEBEN cumplir un área táctil mínima de 48x48px.
- **FR-026**: Si al sincronizar se detecta que otro dispositivo creó un material activo con el mismo nombre (sin distinguir mayúsculas/minúsculas), ambos DEBEN conservarse y el de alta más reciente DEBE mostrar en su tarjeta un badge "Posible duplicado", visible solo para administradores. El badge desaparece cuando cualquiera de los dos se renombra o se da de baja (acciones de la spec 007) y deja de haber coincidencia.

### Key Entities

- **Categoría**: Agrupación de materiales del catálogo (nueva como entidad propia). Atributos: nombre visible, si es precargada, quién y cuándo la creó. Las cuatro precargadas y la opción fija "Sin categoría" existen siempre; las categorías de texto ya presentes en materiales existentes se incorporan como categorías.
- **Insumo / Material**: Material del catálogo (existente). Esta spec define su alta completa: nombre, categoría, unidad de medida, código de fabricante, stock mínimo, si caduca, y quién lo creó.
- **Lote**: Unidad de stock con número de lote, proveedor y fecha de vencimiento (existente, sin cambios). El alta puede crear el primer lote.
- **Movimiento**: Registro de solo-apéndice (existente). El alta con stock inicial genera un movimiento de ingreso normal.
- **Borrador de alta**: Lo escrito en un formulario sin guardar (incluida una categoría nueva pendiente), guardado solo en el dispositivo, nunca sincronizado; como máximo uno por dispositivo, descartado al guardar, cancelar o cerrar sesión.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede dar de alta un material nuevo con su stock inicial y primer lote en menos de 60 segundos desde que toca "+ Material".
- **SC-002**: Un usuario puede dar de alta un material sin stock inicial en menos de 30 segundos.
- **SC-003**: El 100% de los materiales creados con stock inicial tienen su lote y su movimiento de ingreso atribuido al usuario, con o sin conexión; 0 casos de material creado sin su lote o viceversa.
- **SC-004**: Tras poner en uso esta spec, 0 materiales nuevos quedan en categorías duplicadas por diferencias de mayúsculas o tildes.
- **SC-005**: En pruebas con el catálogo existente, el 90% de los intentos de crear un material que ya existe se detienen gracias a la sugerencia o al aviso de código antes de guardar.
- **SC-006**: En su primer uso, el 90% del personal completa un alta con primer lote sin ayuda.

## Assumptions

- **Categorías precargadas**: Cirugía, Restauración, Tratamientos pulpares y Fresas vienen de la clínica real (roadmap). Las categorías de texto libre ya existentes se conservan e integran en el selector; renombrar, fusionar o eliminar categorías queda para la spec 010 (Ajustes).
- **Sugerencias de nombre**: se basan solo en el catálogo propio de la clínica; una base externa de "materiales comunes" queda fuera de alcance.
- **Código de barras**: se reutiliza el campo de código de fabricante existente y el escáner bajo demanda ya presente; no se consulta ninguna base de productos externa, por lo que "autocompletar si existe el código" significa detectar un material ya existente en el catálogo.
- **Primer lote**: los campos obligatorios del lote son los ya definidos en la spec 002 (número de lote, proveedor, fecha de vencimiento si caduca).
- **Registro de lotes para materiales existentes**: el flujo "Registrar insumo" de "Más" se mantiene para ingresar nuevos lotes de materiales ya existentes, hasta que la spec 009 (recepción de compras) lo reemplace; esta spec solo sustituye su alta de material embebida.
- **Permisos**: dar de alta materiales y su primer lote es operación diaria de quien recibe el material, por eso está abierta a todo el personal (como el alta embebida actual); crear categorías es gestión de catálogo y queda restringido a administradores (spec 003).
- **Unidades existentes**: los insumos existentes conservan su unidad (pieza, caja, mL o g), todas incluidas en la nueva lista; la edición de la spec 007 ofrece la misma lista.
- **"Sujeto a caducidad" activado por defecto**: la mayoría de los insumos dentales caducan; el instrumental reutilizable es la excepción.
- **Edición**: el formulario de edición de la spec 007 pasa a usar el mismo selector de categorías; el resto de la edición no cambia.
- **Base**: se reutiliza el listado, detalle, filtros y resumen de alertas de las specs 006/007, la lógica de lotes, cantidades y decimales de la spec 002, y el stock mínimo de la spec 004.
