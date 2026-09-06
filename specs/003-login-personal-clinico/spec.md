# Feature Specification: Inicio de Sesión de Personal Clínico

**Feature Branch**: `003-login-personal-clinico`

**Created**: 2026-09-05

**Status**: Draft

**Input**: User description: "inicio de sesión de personal clínico"

## Clarifications

### Session 2026-09-05

- Q: ¿El sistema debe distinguir roles/niveles de acceso entre el personal clínico, o todos los
  usuarios autenticados tienen las mismas capacidades sobre el inventario? → A: Dos roles:
  administrador y personal regular. El administrador puede gestionar catálogo, usuarios y
  configuración de stock mínimo; el personal regular solo registra y consume insumos.
- Q: ¿Cómo se crean las cuentas del personal clínico? → A: Provisionadas por un
  administrador/dueño del gabinete (invitación); no existe autorregistro abierto desde la
  pantalla de inicio de sesión.
- Q: ¿Por cuánto tiempo debe seguir siendo válida una sesión autenticada mientras el dispositivo
  está sin conexión? → A: Indefinida hasta un cierre de sesión explícito; la sesión offline no
  expira sola por el paso del tiempo.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Inicio de sesión con conexión disponible (Priority: P1)

Un miembro del personal clínico abre la aplicación en un dispositivo con conexión a internet e
ingresa sus credenciales (correo y contraseña) para acceder al inventario. El sistema valida las
credenciales contra el backend y le da acceso a las funciones de registro y consumo de insumos,
quedando su identidad asociada a toda acción que realice.

**Why this priority**: Sin un inicio de sesión funcional no hay forma de atribuir movimientos de
inventario a un usuario, lo cual es una base indispensable (Principio VI de la constitución) para
todo el resto de la aplicación.

**Independent Test**: Puede probarse íntegramente ingresando credenciales válidas de una cuenta
existente con el dispositivo conectado a internet, y verificando que la sesión queda iniciada y
que el nombre del usuario autenticado se muestra en la interfaz.

**Acceptance Scenarios**:

1. **Given** un dispositivo con conexión a internet y una cuenta válida de personal clínico,
   **When** el usuario ingresa correo y contraseña correctos, **Then** el sistema inicia sesión y
   muestra la pantalla principal del inventario con el usuario identificado.
2. **Given** un dispositivo con conexión a internet, **When** el usuario ingresa una contraseña
   incorrecta, **Then** el sistema muestra un mensaje de error claro sin revelar si el correo
   existe o no, y permite reintentar.
3. **Given** un formulario de inicio de sesión, **When** se muestra en pantalla, **Then** todos
   los campos y el botón de ingreso cumplen el tamaño táctil mínimo de 48x48px (Principio III).

---

### User Story 2 - Continuidad de sesión sin conexión (Priority: P2)

Un miembro del personal clínico que ya inició sesión previamente abre la aplicación en un momento
en que el gabinete no tiene conexión a internet. El sistema le permite continuar usando el
inventario con su sesión previamente autenticada, sin bloquear el flujo clínico por falta de red.

**Why this priority**: El Principio I (Offline-First) exige que la aplicación funcione sin
conexión en todo momento; una sesión que exige red para cada apertura de la app rompería ese
principio y bloquearía el trabajo diario.

**Independent Test**: Puede probarse iniciando sesión con conexión, luego desconectando la red y
reabriendo la aplicación, verificando que el usuario permanece autenticado y puede registrar y
consumir insumos con su identidad correctamente atribuida.

**Acceptance Scenarios**:

1. **Given** un usuario que inició sesión exitosamente al menos una vez, **When** reabre la
   aplicación sin conexión a internet, **Then** el sistema lo mantiene autenticado y le permite
   operar el inventario con normalidad.
2. **Given** un usuario autenticado sin conexión, **When** registra o consume un insumo, **Then**
   el movimiento queda guardado localmente con su identidad de usuario correctamente atribuida,
   lista para sincronizarse cuando vuelva la conexión.

---

### User Story 3 - Cierre de sesión (Priority: P3)

Un miembro del personal clínico que termina su turno o cambia de dispositivo cierra su sesión
explícitamente, para que el siguiente usuario que use el dispositivo no continúe operando bajo su
identidad.

**Why this priority**: Es necesario para la trazabilidad correcta (Principio VI) en dispositivos
compartidos entre distintos miembros del personal, pero depende de que el inicio de sesión
(Historia 1) ya exista.

**Independent Test**: Puede probarse iniciando sesión, cerrando sesión explícitamente, y
verificando que la aplicación vuelve a la pantalla de inicio de sesión y ya no permite registrar o
consumir insumos sin volver a autenticarse.

**Acceptance Scenarios**:

1. **Given** un usuario con sesión iniciada, **When** selecciona la opción de cerrar sesión,
   **Then** el sistema termina la sesión local y muestra la pantalla de inicio de sesión.
2. **Given** que el dispositivo no tiene conexión, **When** el usuario intenta cerrar sesión,
   **Then** el sistema permite el cierre de sesión local de todas formas, sin bloquear la acción
   por falta de red.

---

### Edge Cases

- ¿Qué sucede si el usuario intenta iniciar sesión por primera vez en un dispositivo sin conexión
  a internet (sin sesión previa guardada localmente)?
- ¿Qué sucede si las credenciales de un usuario cambian (p. ej. contraseña reseteada) mientras
  tiene una sesión offline activa en otro dispositivo?
- ¿Qué pasa si un usuario cierra sesión y luego intenta acceder a datos de inventario ya
  cacheados localmente en el dispositivo?
- ¿Cómo maneja el sistema múltiples intentos fallidos consecutivos de inicio de sesión?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema DEBE permitir a un miembro del personal clínico iniciar sesión con
  correo y contraseña, validando las credenciales contra el backend de autenticación (Supabase).
- **FR-002**: El sistema DEBE mantener la sesión de un usuario autenticado disponible localmente
  para que la aplicación siga siendo utilizable sin conexión a internet tras el primer inicio de
  sesión exitoso, conforme al Principio I.
- **FR-003**: El sistema DEBE asociar cada movimiento de inventario (registro, consumo, ajuste)
  con la identidad del usuario autenticado que lo realizó, incluyendo cuando se realiza sin
  conexión, conforme al Principio VI.
- **FR-004**: El sistema DEBE permitir a un usuario cerrar sesión explícitamente en cualquier
  momento, con o sin conexión a internet.
- **FR-005**: El sistema DEBE mostrar mensajes de error claros ante credenciales incorrectas, sin
  revelar información que permita distinguir si un correo está o no registrado.
- **FR-006**: El sistema DEBE requerir conexión a internet únicamente para el primer inicio de
  sesión de un usuario en un dispositivo dado; los siguientes accesos en ese mismo dispositivo
  DEBEN funcionar con la sesión guardada localmente, aunque no haya conexión.
- **FR-007**: Todos los controles del formulario de inicio de sesión (campos, botón) DEBEN
  cumplir el área táctil mínima de 48x48px definida en el Principio III.
- **FR-008**: El sistema DEBE diferenciar dos roles de acceso: **administrador**, con permiso
  para gestionar catálogo de insumos, usuarios y configuración de stock mínimo; y **personal
  regular**, con permiso para registrar y consumir insumos pero sin acceso a gestión de usuarios
  ni catálogo.
- **FR-009**: Las cuentas de personal clínico DEBEN ser provisionadas exclusivamente por un
  usuario con rol administrador (mediante invitación o alta directa); no existe autorregistro
  abierto desde la pantalla de inicio de sesión.
- **FR-010**: Una sesión autenticada sin conexión DEBE permanecer válida indefinidamente hasta
  que el usuario cierre sesión explícitamente; el sistema no debe forzar una reautenticación por
  el mero paso del tiempo mientras el dispositivo permanece sin conexión.

### Key Entities *(include if feature involves data)*

- **Usuario de Personal Clínico**: Representa a un miembro del personal autenticado en el
  sistema; incluye identificador único, correo, nombre para mostrar, y su rol/nivel de acceso.
  Es la entidad que se asocia a todo movimiento de inventario para trazabilidad.
- **Sesión**: Representa el estado de autenticación activo de un usuario en un dispositivo
  específico; incluye el token de sesión, momento de inicio, y validez para operar sin conexión.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un miembro del personal clínico puede iniciar sesión y llegar a la pantalla
  principal del inventario en menos de 15 segundos con conexión estable.
- **SC-002**: El 100% de los movimientos de inventario registrados, con o sin conexión, quedan
  correctamente atribuidos al usuario autenticado que los realizó.
- **SC-003**: Un usuario ya autenticado puede reabrir la aplicación sin conexión a internet y
  continuar operando el inventario en el 100% de los casos, sin mensajes de bloqueo por falta de
  red.
- **SC-004**: El 95% de los intentos de inicio de sesión con credenciales correctas se completan
  exitosamente en el primer intento.

## Assumptions

- Las credenciales de inicio de sesión son correo y contraseña, gestionadas y autenticadas contra
  Supabase, conforme a lo establecido en la constitución del proyecto.
- El dispositivo utilizado por el personal clínico es de uso relativamente estable (no se
  autentica un usuario distinto en cada apertura de la app en el mismo dispositivo de forma
  constante), por lo que cachear la sesión localmente es aceptable y deseable.
- No se incluye en este alcance un flujo de recuperación de contraseña vía la propia app; se
  asume un mecanismo estándar de "olvidé mi contraseña" provisto por Supabase Auth (correo de
  restablecimiento), fuera del detalle de esta especificación.
- El inicio de sesión es específico de un solo gabinete/práctica dental (no se contempla
  multi-tenencia entre distintas clínicas en esta especificación).
- Esta especificación cubre el inicio/cierre de sesión y la diferenciación de permisos por rol
  al operar el inventario; la pantalla o flujo específico que un administrador usa para invitar o
  dar de alta nuevas cuentas de personal se considera una funcionalidad relacionada pero separada,
  fuera del alcance detallado aquí.
