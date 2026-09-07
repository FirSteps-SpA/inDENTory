# Feature Specification: Registro y Consumo de Insumos con Búsqueda Manual y Escaneo Opcional

**Feature Branch**: `002-registro-consumo-insumos`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "registro y consumo de insumos con búsqueda manual y escaneo opcional"

## Clarifications

### Session 2026-09-05

- Q: Cuando dos usuarios, trabajando sin conexión, consumen del mismo lote y el total combinado supera lo disponible al sincronizar, ¿qué debe pasar con esas transacciones? → A: El stock queda sobregirado/negativo; el lote se marca para revisión manual; ninguna transacción se pierde ni se revierte.
- Q: ¿Se puede editar o eliminar un movimiento de registro/consumo ya guardado, o las correcciones solo deben hacerse agregando un nuevo movimiento de ajuste? → A: Bitácora de solo-adición — las correcciones se hacen agregando un nuevo movimiento de ajuste; el original nunca se edita ni se borra.
- Q: ¿Las cantidades de registro/consumo deben restringirse a números enteros, o el sistema también debe admitir cantidades decimales? → A: Cantidades decimales permitidas según la unidad de medida configurada en cada insumo (p. ej. mL, g admiten decimales; piezas, cajas no).

### Session 2026-09-07

- Q: ¿Cómo debe marcarse un insumo como "no caduca" para que el sistema complete la fecha automáticamente, sin que el usuario la escriba? → A: Flag `caduca: boolean` en el Insumo + `fechaCaducidad` opcional (`null`) en el Lote; el formulario oculta el campo de fecha si el insumo no caduca; FEFO ordena los lotes sin fecha al final (se consumen solo después de agotar los que sí tienen fecha).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registro de ingreso de un lote de insumo (Priority: P1)

Un miembro del personal clínico recibe una entrega de insumos dentales y registra el nuevo lote
en el sistema: busca el insumo manualmente (por texto, categoría o selección rápida), y captura
los datos del lote recibido (número de lote, fecha de caducidad, cantidad).

**Why this priority**: Sin insumos registrados no hay stock que consumir; es la base de todo el
flujo de inventario y debe funcionar de forma rápida y confiable desde el día uno.

**Independent Test**: Puede probarse íntegramente buscando un insumo existente en el catálogo (o
creando uno nuevo si no existe), completando los datos del lote, y confirmando que el lote queda
registrado con la cantidad y fecha de caducidad correctas, sin haber usado la cámara.

**Acceptance Scenarios**:

1. **Given** un insumo ya existente en el catálogo, **When** el usuario lo busca por texto y
   registra un nuevo lote con cantidad y fecha de caducidad, **Then** el sistema guarda el lote y
   el stock total del insumo aumenta en esa cantidad.
2. **Given** que la búsqueda no encuentra ningún insumo coincidente, **When** el usuario continúa
   el registro, **Then** el sistema le permite crear una nueva entrada de catálogo sin salir del
   flujo de registro.
3. **Given** un formulario de registro recién abierto, **When** el usuario no ha tocado ningún
   control de escaneo, **Then** la cámara nunca se activa automáticamente.

---

### User Story 2 - Consumo ágil de un insumo (Priority: P2)

Un miembro del personal clínico, durante o justo después de un procedimiento, registra el
consumo de un insumo: lo busca manualmente y confirma la cantidad utilizada, sin que el proceso
lo obligue a interactuar con la cámara.

**Why this priority**: Es la acción más frecuente del día a día clínico; debe ser tan rápida que
no interrumpa el ritmo de trabajo, pero depende de que existan insumos ya registrados (Historia 1).

**Independent Test**: Con al menos un insumo y lote ya existentes, puede probarse buscando el
insumo, confirmando una cantidad de consumo, y verificando que el stock disponible del lote
correspondiente disminuye en esa cantidad.

**Acceptance Scenarios**:

1. **Given** un insumo con stock disponible en un solo lote, **When** el usuario lo busca
   manualmente y confirma el consumo de una cantidad, **Then** el stock de ese lote disminuye en
   esa cantidad y el movimiento queda asociado al usuario que lo realizó.
2. **Given** un insumo con varios lotes en stock con distintas fechas de caducidad, **When** el
   usuario confirma un consumo sin elegir lote explícitamente, **Then** el sistema descuenta
   automáticamente del lote con la fecha de caducidad más próxima.
3. **Given** una cantidad de consumo mayor a la disponible, **When** el usuario intenta
   confirmarla, **Then** el sistema rechaza la operación con un mensaje claro y no modifica el
   stock.

---

### User Story 3 - Escaneo opcional como atajo (Priority: P3)

Un miembro del personal clínico, durante el registro o el consumo, decide usar la cámara para
escanear el código de barras o DataMatrix de un insumo en vez de escribir la búsqueda, pulsando
explícitamente un botón de "Escanear".

**Why this priority**: Acelera la selección para quien lo prefiere, pero es un canal alternativo,
no indispensable — ambas historias anteriores ya son completamente funcionales sin él.

**Independent Test**: Puede probarse abriendo el formulario de registro o consumo, pulsando el
botón de escaneo, apuntando la cámara a un código conocido, y confirmando que el insumo/lote
correspondiente queda seleccionado igual que si se hubiera elegido manualmente.

**Acceptance Scenarios**:

1. **Given** un formulario de registro o consumo abierto, **When** el usuario pulsa el botón de
   "Escanear" y apunta a un código reconocido, **Then** el insumo/lote correspondiente queda
   seleccionado como si se hubiera buscado manualmente.
2. **Given** que el usuario pulsó "Escanear", **When** el código no coincide con ningún insumo
   conocido o la cámara no está disponible, **Then** el sistema muestra un mensaje claro y
   permite continuar por búsqueda manual sin reiniciar el formulario.

---

### Edge Cases

- ¿Qué ocurre si el usuario intenta consumir más cantidad de la disponible en stock? El sistema
  rechaza la operación con un mensaje claro y no modifica ningún lote.
- ¿Qué ocurre si la cámara no está disponible o el permiso es denegado al pulsar "Escanear"? El
  usuario puede continuar por búsqueda manual sin que el formulario se reinicie o bloquee.
- ¿Qué ocurre si un código escaneado no coincide con ningún insumo o lote conocido? Se muestra un
  mensaje explícito y se ofrece continuar por búsqueda manual.
- ¿Qué ocurre si dos usuarios registran o consumen el mismo lote mientras ambos trabajan sin
  conexión y el total combinado supera el stock disponible al sincronizar? Ambas transacciones se
  conservan sin pérdida ni reversión; el lote queda marcado para revisión manual con stock
  resultante negativo/sobregirado en vez de rechazar o deshacer alguna de las dos.
- ¿Qué ocurre si se registra un lote con una fecha de caducidad ya vencida? El sistema permite el
  registro (puede ser stock real ya vencido pendiente de descarte) pero lo deja identificable como
  vencido para funcionalidades futuras de alertas.
- ¿Qué ocurre si el insumo no tiene una fecha de caducidad real (p. ej. instrumental reutilizable)?
  El insumo se marca como que no caduca (FR-002b); el sistema no le pide fecha de caducidad al
  registrar sus lotes, y esos lotes se descuentan (FEFO) solo después de agotar los lotes de ese
  insumo que sí tienen fecha.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir registrar el ingreso de un lote de un insumo mediante
  búsqueda manual (texto, categoría o selección rápida) como método inmediato y por defecto, sin
  activar la cámara automáticamente.
- **FR-002**: Al registrar un lote, el sistema DEBE capturar como mínimo: insumo, número de lote,
  fecha de caducidad, cantidad recibida y proveedor — excepto cuando el insumo está marcado como
  que no caduca (FR-002b), en cuyo caso la fecha de caducidad no se solicita.
- **FR-002a**: El sistema DEBE permitir capturar opcionalmente, tanto al crear un insumo como al
  registrar un lote, un código de barras/DataMatrix de fabricante, para que el escaneo (FR-010)
  tenga algo contra qué coincidir.
- **FR-002b**: El sistema DEBE permitir marcar un insumo como que no caduca (p. ej. instrumental
  reutilizable). Cuando un insumo está marcado así, el sistema NO DEBE pedirle al usuario una
  fecha de caducidad al registrar sus lotes — el lote se guarda automáticamente sin fecha de
  caducidad, sin que el usuario tenga que escribir ningún valor manualmente.
- **FR-003**: Si la búsqueda manual no encuentra un insumo coincidente durante el registro, el
  sistema DEBE permitir crear una nueva entrada de catálogo sin salir del flujo de registro.
- **FR-004**: El sistema DEBE permitir registrar el consumo de un insumo mediante el mismo
  mecanismo de búsqueda manual (texto, categoría o selección rápida) como método inmediato y por
  defecto, sin activar la cámara automáticamente.
- **FR-005**: Al registrar un consumo, el sistema DEBE capturar la cantidad consumida y asociarla
  al usuario autenticado que realizó la acción y a la fecha/hora en que ocurrió.
- **FR-006**: Cuando un insumo tiene stock en más de un lote, el sistema DEBE descontar por
  defecto del lote con la fecha de caducidad más próxima (FEFO), permitiendo que el usuario elija
  manualmente otro lote si lo necesita. Los lotes sin fecha de caducidad (insumo marcado como que
  no caduca, FR-002b) se consideran los últimos en el orden FEFO — se descuentan solo después de
  agotar todos los lotes del mismo insumo que sí tienen fecha.
- **FR-007**: El sistema DEBE rechazar cualquier consumo que deje el stock de un lote por debajo
  de cero, mostrando un mensaje claro sin modificar el stock.
- **FR-008**: El sistema DEBE ofrecer, tanto en el registro como en el consumo, una acción
  explícita iniciada por el usuario (p. ej. un botón "Escanear") para activar el escaneo de
  códigos de barras/DataMatrix como método alternativo de selección.
- **FR-009**: El sistema NUNCA DEBE activar la cámara automáticamente al abrir un formulario de
  registro o consumo; el escaneo solo se activa por la acción explícita del FR-008.
- **FR-010**: Cuando un escaneo coincide con un insumo/lote conocido, el sistema DEBE dejarlo
  seleccionado de la misma forma que si se hubiera elegido por búsqueda manual, permitiendo
  continuar el resto del flujo sin diferencias.
- **FR-011**: Cuando un escaneo no coincide con ningún insumo/lote conocido, o la cámara no está
  disponible, el sistema DEBE mostrar un mensaje explícito y permitir continuar por búsqueda
  manual sin reiniciar el formulario.
- **FR-012**: El sistema DEBE permitir completar el registro y el consumo de insumos sin conexión
  a internet, conservando ambas acciones localmente y sincronizándolas con el backend central sin
  pérdida de datos cuando la conexión se restablezca.
- **FR-013**: El sistema DEBE registrar qué usuario realizó cada registro y cada consumo, de
  forma que quede trazable incluso cuando la acción se realizó sin conexión.
- **FR-014**: Cuando la sincronización de movimientos concurrentes sin conexión resulte en un
  stock de lote negativo o sobregirado, el sistema DEBE conservar ambas transacciones sin pérdida
  ni reversión, y marcar el lote afectado para revisión manual.
- **FR-015**: El sistema NO DEBE permitir editar ni eliminar un movimiento de registro o consumo
  ya guardado; toda corrección DEBE hacerse agregando un nuevo movimiento de ajuste que quede
  vinculado al original, preservando la bitácora completa de movimientos.
- **FR-016**: El sistema DEBE validar la cantidad ingresada según la unidad de medida del insumo:
  cantidades decimales permitidas para unidades como mL/g, y solo enteras para unidades como
  piezas/cajas, rechazando con un mensaje claro cualquier cantidad que no cumpla ese formato.

### Key Entities

- **Insumo**: Un tipo de suministro dental gestionado por el inventario (p. ej. guantes, anestesia,
  gasas). Atributos clave: nombre, categoría, unidad de medida (indica si acepta cantidades
  decimales, p. ej. mL/g, o solo enteras, p. ej. piezas/cajas), si caduca o no (p. ej. instrumental
  reutilizable — determina si sus lotes piden fecha de caducidad, FR-002b).
- **Lote**: Una entrega específica de un insumo. Atributos clave: número de lote, fecha de
  caducidad (ausente si el insumo no caduca), cantidad disponible, proveedor, insumo al que
  pertenece.
- **Movimiento**: Un registro de ingreso, consumo o ajuste correctivo. Atributos clave: tipo
  (ingreso/consumo/ajuste), cantidad, lote afectado, usuario que lo realizó, fecha/hora. Es
  inmutable una vez guardado — las correcciones se hacen agregando un nuevo movimiento de ajuste,
  nunca editando ni borrando uno existente.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede registrar el ingreso de un lote de un insumo (búsqueda + datos del
  lote) en menos de 30 segundos usando solo búsqueda manual.
- **SC-002**: Un usuario puede registrar el consumo de un insumo en menos de 10 segundos usando
  solo búsqueda manual, sin necesidad de tocar la cámara.
- **SC-003**: El 100% de los intentos de consumo que excedan el stock disponible son rechazados
  con un mensaje claro, sin excepciones.
- **SC-004**: El 100% de los registros y consumos realizados sin conexión se reflejan
  correctamente en el sistema central una vez restablecida la conexión, sin pérdida de datos.
- **SC-005**: Un usuario puede completar un registro o consumo usando escaneo en menos tiempo que
  con búsqueda manual para el mismo insumo, cuando elige usar ese canal.

## Assumptions

- El consumo se asocia únicamente a insumo + lote + cantidad + usuario; no se asocia a un
  paciente ni a un procedimiento clínico específico — esa integración queda fuera de alcance de
  esta funcionalidad.
- El escaneo reconoce códigos de barras/DataMatrix preimpresos por el fabricante; generar o
  imprimir códigos internos para insumos sin código de fabricante queda fuera de alcance.
- Las alertas visuales de caducidad y stock mínimo (una funcionalidad separada) se construyen
  sobre los datos de lote capturados aquí, pero su interfaz no forma parte de esta funcionalidad.
- Mostrarle a un usuario los lotes marcados para revisión manual (FR-014) es responsabilidad de
  esa misma funcionalidad futura de alertas; esta funcionalidad solo escribe el marcador
  (`estado: 'revision'`) en el lote, sin construir una pantalla para verlo o actuar sobre él.
- Todo usuario autenticado puede tanto registrar como consumir insumos; la diferenciación de
  roles/permisos por tipo de usuario no se define en esta funcionalidad.
- El catálogo de insumos puede crecer sobre la marcha durante el registro (FR-003); no se
  requiere un módulo de administración de catálogo separado para esta funcionalidad.
