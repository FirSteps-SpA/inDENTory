# Quickstart Validation: Overhaul de Diseño Visual

Purpose: a runnable script to prove this feature works end-to-end, mapped to the spec's user
stories and success criteria. Validation guide only — implementation lives in `tasks.md` and the
implementation phase.

## Prerequisites

- Local dev environment set up per `001-project-setup-local-dev`'s README, with features 002-004
  already applied (this feature restyles their screens, it doesn't reimplement them).
- The approved mockup canvas open side by side for visual comparison:
  https://claude.ai/code/artifact/e3b15933-5c7f-46fa-95c0-65cec7b29b0e

## Scenario 1 — Identidad visual consistente desde el login (User Story 1, FR-001/004, SC-001)

1. Abre la app sin sesión iniciada. Compara la pantalla de login contra el artboard "Login" del
   canvas aprobado (paleta, tipografía, forma de los componentes).
2. Inicia sesión y alterna entre las pestañas Registrar, Consumir y Alertas.

**Expected outcome**: el encabezado y la navegación inferior se ven y comportan de forma idéntica
en las tres pestañas (FR-004); un observador externo identifica las 4 pantallas como parte de la
misma app en menos de 5 segundos (SC-001).

## Scenario 2 — Registrar y consumir sin cambios de comportamiento (User Story 2, FR-002, SC-003)

1. Completa un registro de lote de principio a fin (buscar insumo, completar datos, guardar).
2. Completa un consumo de un insumo con varios lotes, confirmando que el lote FEFO se sigue
   seleccionando por defecto.
3. Intenta un consumo que exceda el stock disponible.
4. Corre la suite de pruebas existente: `npm run test`.

**Expected outcome**: los tres pasos manuales se comportan exactamente igual que antes del
rediseño (mismos campos, mismas validaciones, mismo mensaje de rechazo en el paso 3, ahora con la
nueva presentación visual). `npm run test` pasa 100% sin haber tocado ninguna aserción existente
(SC-003).

## Scenario 3 — Distinguir la urgencia de una alerta de un vistazo (User Story 3, FR-005, SC-004)

1. Con datos de ejemplo cubriendo los seis estados (stock bajo, niveles 30/7/1 días, caducado, en
   revisión), abre Alertas como `administrador`.
2. Repite como `personal`.

**Expected outcome**: cada estado usa un color/indicador distinto y consistente con
`contracts/design-system.md`, distinguible sin leer el texto (SC-004); como `personal`, las
secciones de alerta se ven pero ningún control de configuración ni el botón "marcar como
resuelto" aparecen (FR-006, SC-005) — igual que antes del rediseño.

## Scenario 4 — Touch targets y accesibilidad (FR-003, SC-002)

1. Con las herramientas de desarrollador del navegador, inspecciona cada botón, campo y elemento
   de lista seleccionable en las 4 pantallas rediseñadas.

**Expected outcome**: el 100% mide al menos 48x48px, sin excepciones.

## Scenario 5 — Tipografía disponible sin conexión (Constitution I)

1. Carga la app una vez con conexión (para que el service worker precachee los assets).
2. Desconecta la red por completo y recarga la app.

**Expected outcome**: Manrope se sigue viendo correctamente (no cae a una fuente del sistema);
ninguna pantalla muestra un error o un retraso visible por falta de red.

## Scenario 6 — Verificación de calidad estándar

1. Corre `npm run lint`, `npm run test`, y `npm run build`.

**Expected outcome**: los tres terminan sin errores, confirmando que el rediseño no introdujo
regresiones de tipos, lint, ni de comportamiento.

## Traceability

| Scenario | Spec references |
|---|---|
| 1 | User Story 1, FR-001, FR-004, SC-001 |
| 2 | User Story 2, FR-002, FR-007, SC-003 |
| 3 | User Story 3, FR-005, FR-006, SC-004, SC-005 |
| 4 | FR-003, SC-002 |
| 5 | Constitution Principle I, research.md's font decision |
| 6 | General quality gate (README's "Verificaciones de calidad") |
