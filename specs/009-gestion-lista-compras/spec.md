# Feature Specification: Gestión de Lista de Compras (Reabastecimiento)

**Feature Branch**: `009-gestion-lista-compras`

**Created**: 2026-09-23

**Status**: Draft

**Input**: User description: "Continuar el desarrollo del roadmap (spec 9): Nueva vista dedicada para la gestión de compras que agrupa automáticamente productos con stock bajo o caducados, permitiendo además agregar ítems manualmente en cualquier momento y marcar ítems como reabastecidos para actualizar el stock."

## Clarifications

### Session 2026-09-23

- Q: Cuando alguien agrega un ítem manual con una cantidad, ¿esa cantidad debe ser un número (con los mismos controles +/- y reglas de decimales que el resto de la app) o un texto libre? → A: Número (entero o decimal), sin unidad fija, con los mismos controles +/- de la app; la descripción libre (marca, presentación) queda en el campo "nota".
- Q: ¿Cualquier usuario autenticado puede eliminar un ítem manual que agregó otra persona, o solo puede eliminarlo quien lo creó (más un administrador)? → A: Cualquier usuario autenticado puede eliminarlo, igual que puede agregarlo y marcarlo como recibido.
- Q: Al marcar un ítem como recibido, ¿el flujo admite registrar más de un lote en la misma operación, o se limita a un único lote por recepción? → A: Un único lote por recepción, igual que la spec 008; si llega más de un lote, se repite la acción de recepción para cada uno.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver la lista de compras sugerida automáticamente (Priority: P1)

Como personal clínico, quiero abrir la sección "Compras" y ver, sin ninguna acción adicional, los materiales que necesitan reposición porque su stock está por debajo del mínimo configurado o porque alguno de sus lotes con stock disponible ya caducó, para saber qué pedir a los proveedores sin tener que revisar el inventario completo insumo por insumo.

**Why this priority**: Es el valor central del roadmap para esta spec: automatizar la detección de qué comprar. Sin esto, "Compras" seguiría siendo la vista mínima placeholder introducida en la spec 006.

**Independent Test**: Puede probarse bajando el stock de un insumo por debajo de su mínimo (o dejando un lote con stock caducar), abriendo "Compras", y verificando que el insumo aparece en la sección de sugeridos con el badge correspondiente, sin haber tocado nada manualmente.

**Acceptance Scenarios**:

1. **Given** un insumo con stock actual por debajo de su stock mínimo configurado, **When** el usuario abre "Compras", **Then** el insumo aparece en la sección "Sugeridos" con el badge "🟠 Stock Mínimo".
2. **Given** un insumo con al menos un lote con stock disponible cuya fecha de caducidad ya pasó, **When** el usuario abre "Compras", **Then** el insumo aparece en "Sugeridos" con el badge "🔴 Caducado", incluso si su stock total sigue por encima del mínimo.
3. **Given** un insumo que cumple ambas condiciones a la vez, **When** el usuario abre "Compras", **Then** aparece una sola vez en "Sugeridos" mostrando los dos badges, sin duplicarse.
4. **Given** un insumo sin stock mínimo configurado y sin lotes caducados, **When** el usuario abre "Compras", **Then** ese insumo no aparece en "Sugeridos".
5. **Given** el usuario da de alta un insumo nuevo con stock inicial en 0 y sin stock mínimo configurado (spec 008), **When** abre "Compras", **Then** ese insumo no aparece en "Sugeridos" hasta que se le configure un stock mínimo (spec 007, edición).
6. **Given** el dispositivo está sin conexión, **When** el usuario abre "Compras", **Then** la lista de sugeridos se calcula y se muestra igual, usando solo datos disponibles localmente.
7. **Given** no hay ningún insumo con stock bajo ni con lotes caducados, **When** el usuario abre "Compras", **Then** la sección "Sugeridos" muestra un estado vacío que lo indica claramente, sin parecer un error.

---

### User Story 2 - Marcar un ítem sugerido como recibido e ingresarlo al inventario (Priority: P1)

Como personal que recibe un pedido, quiero marcar un ítem sugerido de "Compras" como recibido y, en el mismo paso, indicar el lote y la cantidad que llegó, para que el stock del inventario quede actualizado de inmediato sin tener que ir después a otra pantalla a registrar el ingreso.

**Why this priority**: Cierra el ciclo completo del roadmap (detectar qué falta → comprarlo → ingresarlo) y reemplaza el flujo "Registrar insumo" embebido en "Más" para materiales ya existentes, que hoy es el único camino para sumar stock a un insumo existente.

**Independent Test**: Puede probarse marcando como "Recibido" un ítem sugerido, completando cantidad, número de lote, proveedor y (si el material caduca) fecha de vencimiento, y verificando que el stock del insumo sube en el listado de Inventario y que el ítem deja de aparecer en "Compras" si ya no cumple ningún criterio de sugerencia.

**Acceptance Scenarios**:

1. **Given** un ítem sugerido en "Compras", **When** el usuario marca su checkbox "Comprado / Recibido", **Then** se abre un flujo que pide cantidad recibida, número de lote y proveedor, mostrando fecha de vencimiento solo si el material está sujeto a caducidad.
2. **Given** el usuario completó los datos del flujo de recepción, **When** confirma, **Then** el sistema crea un lote y un movimiento de ingreso atribuido al usuario autenticado, igual que al dar de alta stock en la spec 008, y el stock del insumo se actualiza de inmediato en Inventario.
3. **Given** el ítem se marcó como recibido y, tras la actualización, el insumo ya no tiene stock bajo ni lotes caducados con stock disponible, **When** el usuario vuelve a "Compras", **Then** el ítem ya no aparece en "Sugeridos".
4. **Given** el ítem tenía badge "🔴 Caducado" por un lote vencido que sigue con stock sin resolver, **When** el usuario recibe stock nuevo para el mismo insumo, **Then** el insumo permanece en "Sugeridos" con el badge "🔴 Caducado" hasta que el lote vencido se consuma, se ajuste o se marque de otra forma (fuera de alcance de esta spec).
5. **Given** el usuario cierra el flujo de recepción sin completarlo, **When** vuelve a "Compras", **Then** el ítem sigue en "Sugeridos" sin cambios, sin stock añadido.
6. **Given** el dispositivo está sin conexión, **When** el usuario marca un ítem como recibido y completa el flujo, **Then** el stock se actualiza de inmediato en el dispositivo y se sincroniza en segundo plano al recuperar la conexión.

---

### User Story 3 - Agregar y gestionar ítems manuales de compra (Priority: P2)

Como personal clínico, quiero agregar en cualquier momento un ítem a la lista de compras que no depende de una alerta automática (por ejemplo, algo que el administrador pidió comprar o un material nuevo que aún no está en el catálogo), para no depender de una nota aparte o de la memoria de alguien.

**Why this priority**: Cubre compras puntuales y pedidos que no encajan en las reglas automáticas; es una capa complementaria a la sugerencia automática, valiosa pero no bloqueante para el valor principal de la spec.

**Independent Test**: Puede probarse tocando "+ Añadir Ítem Manual", escribiendo un nombre libre (p. ej. "Guantes talla M, marca X"), guardando, y verificando que aparece en la sección "Agregados Manualmente" con el badge "✏️ Manual", pudiendo marcarse como comprado o eliminarse.

**Acceptance Scenarios**:

1. **Given** el usuario toca "+ Añadir Ítem Manual", **When** completa un nombre (obligatorio) y, opcionalmente, una cantidad y una nota, **Then** el ítem se guarda y aparece en "Agregados Manualmente" con el badge "✏️ Manual".
2. **Given** el usuario está escribiendo el nombre del ítem manual, **When** el texto coincide con materiales ya existentes en el catálogo, **Then** el sistema sugiere vincularlo a uno de esos materiales existentes en lugar de crear un ítem suelto.
3. **Given** un ítem manual quedó vinculado a un material existente del catálogo, **When** el usuario lo marca como "Comprado / Recibido", **Then** se abre el mismo flujo de recepción de la User Story 2 (cantidad, lote, proveedor, vencimiento si aplica) y el stock de ese material se actualiza.
4. **Given** un ítem manual no está vinculado a ningún material del catálogo, **When** el usuario lo marca como "Comprado / Recibido", **Then** el sistema le ofrece crear el material en el catálogo (formulario de alta de la spec 008, con el nombre precargado) o simplemente marcarlo como comprado sin afectar el inventario.
5. **Given** un ítem manual pendiente, **When** el usuario lo elimina desde su menú de opciones, **Then** desaparece de la lista sin pedir el flujo de recepción y sin afectar el inventario.
6. **Given** un ítem manual se marcó como comprado (con o sin ingreso a inventario), **When** el usuario vuelve a "Compras", **Then** el ítem ya no aparece en la lista de pendientes.
7. **Given** dos usuarios en dispositivos distintos sin conexión agregan ítems manuales, **When** ambos sincronizan, **Then** ambos ítems se conservan sin perderse ni fusionarse.

---

### User Story 4 - Compartir la lista de compras con proveedores (Priority: P3)

Como administrador o personal encargado de hacer pedidos, quiero compartir la lista de compras pendiente (sugerida y manual) en un formato legible fuera de la app, para enviarla a un proveedor sin tener que copiar cada ítem a mano.

**Why this priority**: Es una comodidad para el flujo de compra real con proveedores externos, pero la app ya cumple su función principal (detectar y registrar reposición) sin esta acción.

**Independent Test**: Puede probarse con al menos un ítem sugerido y uno manual pendientes, tocando "Compartir Lista", y verificando que se abre el mecanismo de compartir del dispositivo con un texto que enumera todos los ítems pendientes, su cantidad (si aplica) y su origen (sugerido o manual).

**Acceptance Scenarios**:

1. **Given** hay al menos un ítem pendiente (sugerido o manual), **When** el usuario toca "Compartir Lista", **Then** el sistema abre el mecanismo nativo de compartir del dispositivo con un texto que enumera cada ítem pendiente, su cantidad si fue indicada, y si es sugerido o manual.
2. **Given** no hay ningún ítem pendiente, **When** el usuario busca la acción "Compartir Lista", **Then** el botón aparece deshabilitado o no se ofrece, con una indicación de que no hay nada que compartir.
3. **Given** el dispositivo no tiene ningún mecanismo de compartir disponible, **When** el usuario toca "Compartir Lista", **Then** el sistema muestra un mensaje claro y ofrece copiar el texto al portapapeles como alternativa.

---

### Edge Cases

- ¿Qué pasa si un insumo con lote caducado se da de baja (spec 007) mientras está en "Sugeridos"? Desaparece de "Compras" de inmediato, igual que desaparece del listado de Inventario y de Alertas.
- ¿Qué pasa si el mismo ítem manual se marca como recibido dos veces muy rápido (doble toque)? Solo se crea un lote y un movimiento de ingreso; el segundo toque no tiene efecto porque el ítem ya se marcó como comprado.
- ¿Qué pasa si dos usuarios en dispositivos distintos marcan el mismo ítem sugerido como recibido casi al mismo tiempo, cada uno con una cantidad distinta, sin conexión? Ambas recepciones se conservan como movimientos de ingreso independientes al sincronizar (igual que dos altas de stock concurrentes); el stock final refleja la suma de ambas, sin perder ninguna.
- ¿Qué pasa si un ítem manual vinculado a un material se elimina del catálogo (baja lógica, spec 007) antes de marcarse como comprado? El ítem manual pierde el vínculo y pasa a comportarse como no vinculado: al marcarlo como recibido, se ofrece crear el material de nuevo o marcarlo como comprado sin afectar inventario.
- ¿Qué pasa con un ítem manual que nunca se marca como comprado ni se elimina? Permanece indefinidamente en "Agregados Manualmente"; esta spec no define una expiración automática.
- ¿Qué pasa si el nombre del ítem manual queda vacío o solo con espacios? El sistema no permite guardarlo y muestra el error junto al campo.
- ¿Qué pasa si se agrega un ítem manual con el mismo nombre que otro ítem manual pendiente? Se permite; no hay restricción de unicidad para ítems manuales, a diferencia de los materiales del catálogo.
- ¿Qué pasa si un pedido trae varios lotes de un mismo material sugerido y, tras recibir el primer lote, el insumo ya no cumple ninguna condición de "Sugeridos" (FR-014)? El ítem sugerido desaparece de "Compras" aunque falten lotes por ingresar; para el o los lotes restantes, el usuario agrega un ítem manual vinculado a ese mismo material (FR-016) y lo marca como recibido, ya que ese camino no depende de que el material siga sugerido.

## Requirements *(mandatory)*

### Functional Requirements

**Vista y estructura**

- **FR-001**: La sección "Compras" de la navegación principal DEBE reemplazar la vista mínima placeholder de la spec 006 por la vista completa de gestión de compras, disponible para todo usuario autenticado.
- **FR-002**: La vista "Compras" DEBE organizar los ítems pendientes en dos secciones claramente diferenciadas: "Sugeridos por el Sistema" y "Agregados Manualmente", cada una con su propio estado vacío cuando no tiene ítems.
- **FR-003**: Cada ítem DEBE mostrar un checkbox amplio (≥48x48px) para marcarlo como "Comprado / Recibido", su nombre, su badge de origen (`🟠 Stock Mínimo`, `🔴 Caducado` o `✏️ Manual`, pudiendo combinarse los dos primeros en un mismo ítem) y, si se indicó, su cantidad.

**Sugeridos automáticos**

- **FR-004**: El sistema DEBE incluir en "Sugeridos" todo insumo activo cuyo stock actual esté por debajo de su stock mínimo configurado, usando la misma condición de alerta de stock bajo definida en la spec 004.
- **FR-005**: El sistema DEBE incluir en "Sugeridos" todo insumo activo con al menos un lote con stock disponible cuya fecha de caducidad ya haya pasado, usando la misma condición de alerta de caducidad definida en la spec 004, independientemente de si el stock total del insumo está o no por debajo de su mínimo.
- **FR-006**: Un insumo que cumpla ambas condiciones (FR-004 y FR-005) DEBE aparecer una sola vez en "Sugeridos", mostrando ambos badges.
- **FR-007**: La lista de "Sugeridos" DEBE recalcularse de inmediato ante cualquier cambio local relevante (nuevo movimiento, cambio de stock mínimo, alta o baja de lote o insumo), sin depender de sincronización, igual que las alertas de la spec 004.
- **FR-008**: Un insumo dado de baja (spec 007) NO DEBE aparecer en "Sugeridos", incluso si cumplía alguna de las condiciones antes de darse de baja.

**Recepción de un ítem (actualización de stock)**

- **FR-009**: Al marcar como "Comprado / Recibido" un ítem sugerido, o un ítem manual vinculado a un material del catálogo, el sistema DEBE abrir un flujo que capture cantidad recibida, número de lote y proveedor, y la fecha de vencimiento del lote solo si el material está sujeto a caducidad. El flujo admite un único lote por recepción, igual que el alta con stock inicial de la spec 008 (FR-018); si un mismo pedido trae más de un lote, el usuario repite la acción "Comprado / Recibido" una vez por cada lote.
- **FR-010**: Al confirmar ese flujo, el sistema DEBE crear el lote y un movimiento de ingreso atribuido al usuario autenticado como una sola operación (o se guardan ambos, o ninguno), reutilizando las reglas de lotes y decimales de la spec 002 y la advertencia de vencimiento ya pasado de la spec 008 (FR-017) si aplica.
- **FR-011**: Esta vista DEBE ser el punto de entrada para ingresar stock adicional a un material ya existente en el catálogo, reemplazando el flujo "Registrar insumo" embebido en "Más" que se mantenía como excepción temporal desde la spec 008.
- **FR-012**: Al marcar como "Comprado / Recibido" un ítem manual sin vincular a ningún material del catálogo, el sistema DEBE ofrecer dos caminos: crear el material en el catálogo (formulario de alta de la spec 008, con el nombre del ítem precargado) para continuar con el flujo de recepción, o marcar el ítem como comprado sin afectar el inventario.
- **FR-013**: Cerrar el flujo de recepción sin confirmarlo NO DEBE crear ningún lote, movimiento, ni marcar el ítem como comprado.
- **FR-014**: Un ítem sugerido que ya no cumple ninguna de las condiciones de FR-004/FR-005 DEBE dejar de aparecer en "Sugeridos" de inmediato, sin requerir que el usuario lo marque manualmente.

**Ítems manuales**

- **FR-015**: La vista "Compras" DEBE ofrecer una acción visible "+ Añadir Ítem Manual" para todo usuario autenticado, que capture un nombre (obligatorio, no vacío), y opcionalmente una cantidad numérica (entera o decimal, sin unidad fija, con los mismos controles "+"/"−" del resto de la app) y una nota libre para describir marca, presentación u otro detalle.
- **FR-016**: Mientras el usuario escribe el nombre del ítem manual, el sistema DEBE sugerir materiales activos del catálogo con nombre parecido (misma lógica de la spec 008, FR-019), permitiendo vincular el ítem manual a uno de ellos en lugar de dejarlo suelto.
- **FR-017**: Un ítem manual vinculado a un material del catálogo que se dé de baja (spec 007) DEBE perder el vínculo y pasar a comportarse como no vinculado, sin eliminarse de "Compras".
- **FR-018**: Todo usuario autenticado DEBE poder eliminar cualquier ítem manual pendiente desde su menú de opciones, sin importar quién lo haya creado; eliminarlo no afecta el inventario ni requiere el flujo de recepción.
- **FR-019**: Un ítem manual marcado como comprado (con o sin ingreso a inventario) DEBE dejar de aparecer en la lista de ítems pendientes.
- **FR-020**: No DEBE existir restricción de nombre único entre ítems manuales, ni entre un ítem manual y un material del catálogo.

**Compartir**

- **FR-021**: La vista "Compras" DEBE ofrecer una acción "Compartir Lista" que, cuando hay al menos un ítem pendiente (sugerido o manual), genere un texto legible con cada ítem pendiente, su cantidad si se indicó, y si es sugerido o manual, y lo entregue al mecanismo de compartir del dispositivo.
- **FR-022**: Cuando no haya ítems pendientes, la acción "Compartir Lista" NO DEBE ofrecerse o DEBE mostrarse deshabilitada.
- **FR-023**: Si el dispositivo no ofrece ningún mecanismo de compartir, el sistema DEBE mostrar un mensaje claro y permitir copiar el texto de la lista al portapapeles como alternativa.

**Transversales**

- **FR-024**: Todas las operaciones de esta spec (recibir un ítem, agregar/eliminar un ítem manual, vincular un ítem manual a un material) DEBEN funcionar completamente sin conexión, aplicándose primero localmente y sincronizándose en segundo plano sin bloquear al usuario ni perder datos.
- **FR-025**: Si dos dispositivos sin conexión marcan como recibido el mismo ítem sugerido con cantidades distintas, ambas recepciones DEBEN conservarse como movimientos de ingreso independientes al sincronizar, sumando el stock resultante sin descartar ninguna.
- **FR-026**: Todos los controles nuevos de esta spec (checkboxes, botón "+ Añadir Ítem Manual", controles del flujo de recepción, botón "Compartir Lista", opciones del menú de un ítem manual) DEBEN cumplir un área táctil mínima de 48x48px.

### Key Entities

- **Ítem de Compra Manual**: Entidad nueva. Representa un pedido puntual agregado a mano. Atributos: nombre, cantidad numérica (opcional, sin unidad fija), nota libre (opcional), material del catálogo vinculado (opcional), estado (pendiente/comprado), quién y cuándo lo creó, quién y cuándo lo marcó como comprado. Se sincroniza entre dispositivos como cualquier otro dato de la app.
- **Insumo / Material (sin cambios estructurales)**: Reutiliza el stock actual, stock mínimo (spec 004) y estado activo/baja (spec 007) para determinar su presencia en "Sugeridos".
- **Lote (sin cambios estructurales)**: Reutiliza fecha de caducidad y estado (spec 002/004) para determinar el badge "🔴 Caducado"; el flujo de recepción crea nuevos lotes con sus mismos atributos.
- **Movimiento (sin cambios estructurales)**: El flujo de recepción genera un movimiento de ingreso, igual que el alta con stock inicial de la spec 008.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un usuario puede identificar todos los materiales sugeridos para compra (por stock bajo o caducidad) en menos de 5 segundos desde que abre "Compras", sin navegar a otras pantallas.
- **SC-002**: El 100% de los ítems recibidos (sugeridos o manuales vinculados) generan su lote y su movimiento de ingreso atribuido al usuario, con o sin conexión; 0 casos de stock actualizado sin su lote correspondiente o viceversa.
- **SC-003**: Un usuario puede agregar un ítem manual a la lista de compras en menos de 15 segundos.
- **SC-004**: Un usuario puede completar la recepción de un ítem sugerido (marcar, indicar cantidad y lote, confirmar) en menos de 45 segundos.
- **SC-005**: Un administrador puede compartir la lista de compras pendiente completa en menos de 10 segundos desde que abre "Compras".
- **SC-006**: 0 ítems sugeridos permanecen visibles en "Compras" después de que su condición de origen (stock bajo o lote caducado con stock) deja de cumplirse, sin necesidad de recargar la app manualmente.

## Assumptions

- **Alcance de "Sugeridos"**: se reutilizan literalmente las condiciones de stock bajo y caducidad ya definidas y calculadas en la spec 004 (Alertas); esta spec no introduce nuevas reglas de umbral ni una ventana de "próximo a caducar" para Compras — solo lotes ya vencidos generan el badge "🔴 Caducado", siguiendo la redacción del roadmap ("stock bajo o caducados").
- **Permisos**: agregar ítems manuales, eliminarlos y marcar cualquier ítem como recibido son operaciones diarias abiertas a todo el personal autenticado, siguiendo el mismo criterio que el alta de stock de la spec 008 (recibir mercadería no es gestión de catálogo). Vincular un ítem manual a un material o crear un material nuevo desde el flujo de recepción reutiliza los permisos ya definidos en las specs 007/008 para esas acciones (crear categorías sigue siendo solo de administrador si el material nuevo lo requiere).
- **Reemplazo de "Registrar insumo"**: esta spec sustituye definitivamente el flujo "Registrar insumo" embebido en "Más" para materiales existentes (excepción documentada como deuda en la spec 008); dar de alta un material completamente nuevo sigue siendo el formulario de la spec 008, accesible también desde el flujo de recepción cuando un ítem manual no tiene material vinculado.
- **Historial de ítems manuales comprados**: no se conserva una vista de ítems manuales ya comprados; una vez marcados, desaparecen de la lista de pendientes. La trazabilidad de lo recibido queda cubierta por el historial de movimientos ya existente (spec 002), no por un historial propio de compras.
- **Formato de "Compartir Lista"**: se entrega como texto plano al mecanismo nativo de compartir del sistema operativo (o portapapeles como alternativa); no se define aquí un formato de archivo específico (PDF u otro), quedando esa decisión para el diseño técnico.
- **Base**: se reutilizan el listado, detalle y navegación de la spec 006, las acciones de edición/baja de la spec 007, el formulario y las reglas de lote/decimales de la spec 008, y las condiciones de alerta de la spec 004.
