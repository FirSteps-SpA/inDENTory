# Quickstart Validation: Inicio de Sesión de Personal Clínico

Purpose: a runnable script to prove this feature works end-to-end, mapped to the spec's user
stories, edge cases, and clarifications. Validation guide only — implementation lives in
`tasks.md` and the implementation phase.

## Prerequisites

- Local dev environment set up per `001-project-setup-local-dev`'s README (clone, install, run),
  connected to a Supabase dev project.
- At least one test account created directly in the Supabase dev project (dashboard): a row in
  `auth.users` plus a matching `perfiles` row with `rol = 'personal'`, and a second with
  `rol = 'administrador'` (contracts/supabase-schema.md — no in-app provisioning UI exists).

## Scenario 1 — Inicio de sesión con conexión (User Story 1, FR-001/005/007, SC-001)

1. Con el dispositivo conectado a internet, abrir la app. Confirmar que se muestra la pantalla de
   inicio de sesión (no el inventario) porque aún no hay sesión local.
2. Ingresar el correo/contraseña de la cuenta de prueba `personal`. Confirmar.

   **Expected outcome**: en menos de 15 segundos, la app muestra la pantalla principal del
   inventario con el nombre del usuario visible.
3. Repetir con una contraseña incorrecta.

   **Expected outcome**: mensaje de error genérico (no distingue "correo no existe" de
   "contraseña incorrecta"); el formulario permite reintentar.
4. Inspeccionar visualmente los campos y el botón del formulario de login.

   **Expected outcome**: cada control mide al menos 48x48px (Principio III).

## Scenario 2 — Continuidad de sesión sin conexión (User Story 2, FR-002/006/010, SC-003)

1. Habiendo completado el Escenario 1 (sesión iniciada al menos una vez en este dispositivo),
   desconectar la red del dispositivo (modo avión o desconectar Wi-Fi).
2. Cerrar y reabrir la aplicación.

   **Expected outcome**: la app abre directamente en el inventario, sin pedir credenciales ni
   mostrar ningún mensaje de bloqueo por falta de red.
3. Con la app aún sin conexión, registrar o consumir un insumo (feature 002).

   **Expected outcome**: el movimiento queda guardado localmente atribuido al usuario autenticado
   (visible su `usuarioId`/nombre en el registro), listo para sincronizar cuando vuelva la
   conexión.

## Scenario 3 — Cierre de sesión, con y sin conexión (User Story 3, FR-004)

1. Con conexión y sesión iniciada, seleccionar "Cerrar sesión".

   **Expected outcome**: la app vuelve a la pantalla de inicio de sesión de inmediato.
2. Iniciar sesión de nuevo, luego desconectar la red, y seleccionar "Cerrar sesión" otra vez.

   **Expected outcome**: el cierre de sesión se completa igualmente sin conexión (no se bloquea
   ni queda cargando indefinidamente); la app vuelve a la pantalla de inicio de sesión.

## Scenario 4 — Diferenciación de rol (Clarifications, FR-008)

1. Iniciar sesión con la cuenta de prueba `administrador`.

   **Expected outcome**: el rol `administrador` queda disponible en el estado de la app (por
   ejemplo, visible en cualquier indicador de usuario/rol en la interfaz), distinto del de una
   cuenta `personal`.
2. Repetir con la cuenta `personal`.

   **Expected outcome**: el rol mostrado/almacenado es `personal`.

   Nota: este feature no construye pantallas restringidas por rol (esas dependen de features
   futuras); este escenario solo valida que el rol correcto queda disponible tras el login.

## Scenario 5 — Sin autorregistro (FR-009)

1. En la pantalla de inicio de sesión, buscar cualquier opción de "crear cuenta" o registro.

   **Expected outcome**: no existe tal opción; la única vía de acceso es con credenciales ya
   provisionadas.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-001, FR-005, FR-007, SC-001 |
| 2 | User Story 2, FR-002, FR-006, FR-010, SC-003 |
| 3 | User Story 3, FR-004, Edge Cases |
| 4 | Clarifications (roles), FR-008 |
| 5 | FR-009 |
