<!--
Sync Impact Report
==================
Version change: [UNSET TEMPLATE] → 1.0.0 (initial ratification)
Modified principles: N/A (template placeholders replaced with concrete principles)
Added sections:
  - Core Principles: I. Offline-First por Diseño; II. Estado Reactivo Local con Zustand;
    III. Interfaz Táctil para Entornos Clínicos; IV. Trazabilidad y Alertas de Inventario;
    V. Búsqueda Manual Ágil como Flujo Primario; VI. Control Multi-Usuario
  - Pila Tecnológica Obligatoria (SECTION_2)
  - Flujo de Trabajo de Desarrollo (SECTION_3)
  - Governance
Removed sections: none (all bracketed placeholders from the scaffold were resolved)
Deferred items: none — all placeholders were filled from user-supplied input
Templates requiring follow-up: none checked in this run (dependent templates read this file
  at runtime per the command's scope guard; no direct edits made here)
-->

# inDENTory Constitution

## Core Principles

### I. Offline-First por Diseño
La aplicación DEBE funcionar de forma completa y fluida sin conexión a internet en todo momento.
IndexedDB es la fuente de verdad local y el punto de escritura primario para toda operación de
inventario (registro, consumo, ajuste de stock); ninguna acción del usuario en el flujo clínico
puede bloquearse o degradarse por falta de red. La sincronización con el backend relacional
(Supabase) se ejecuta en segundo plano, de forma incremental y resiliente a interrupciones,
reintentando automáticamente sin intervención del usuario y sin perder ni duplicar
transacciones. Los conflictos de sincronización DEBEN resolverse de manera determinista y
auditable, nunca mediante pérdida silenciosa de datos.
Rationale: El sistema se usa en gabinetes dentales donde la conectividad es intermitente o
inexistente; interrumpir el flujo clínico por falta de red es inaceptable para la operación.

### II. Estado Reactivo Local con Zustand
El estado de la interfaz DEBE gestionarse mediante Zustand como única fuente de estado local
reactivo, leyendo y escribiendo contra IndexedDB. Los cambios de inventario (altas, consumos,
ajustes) se reflejan en la UI de forma inmediata y optimista, antes de confirmar la
sincronización remota. No se introducen capas de estado adicionales (Redux, Context anidados
extensos, etc.) que dupliquen la responsabilidad de Zustand sobre el estado de inventario.
Rationale: Una única fuente de estado reactivo simplifica el razonamiento sobre consistencia
offline-first y evita divergencias entre lo que el usuario ve y lo que hay en IndexedDB.

### III. Interfaz Táctil para Entornos Clínicos
Todo objetivo interactivo (botones, controles, ítems de lista seleccionables) DEBE tener un área
táctil mínima de 48x48px, sin excepciones para elementos de uso frecuente. El diseño es
touch-first: se optimiza para dedos con guantes de nitrilo/látex, evitando controles pequeños,
hover-only, o gestos de precisión (arrastres finos, doble-tap ambiguo) como único medio de
interacción. La densidad de información cede ante la usabilidad táctil en todas las pantallas de
registro y consumo.
Rationale: El uso con guantes en gabinetes dentales reduce la precisión táctil; objetivos
pequeños generan errores de registro que comprometen la trazabilidad del inventario.

### IV. Trazabilidad y Alertas de Inventario
El sistema DEBE registrar y exponer trazabilidad por lote (número de lote, fecha de caducidad,
proveedor y movimientos de entrada/salida) para cada insumo gestionado. DEBE generar alertas
visuales, no solo textuales, para: (a) insumos próximos a caducar o ya caducados, y (b) insumos
por debajo del stock mínimo configurado. Estas alertas se calculan localmente desde IndexedDB y
están disponibles sin conexión, ya que dependen de la trazabilidad y no del backend.
Rationale: La caducidad y el desabasto de insumos dentales tienen impacto clínico directo; las
alertas deben ser visibles de inmediato y no depender de sincronización con el servidor.

### V. Búsqueda Manual Ágil como Flujo Primario
El método predeterminado e inmediato para registrar o consumir insumos DEBE ser la búsqueda
manual ágil (por texto, categoría o selección rápida), disponible sin pasos previos ni permisos
adicionales al abrir el formulario. La captura por escaneo de cámara (códigos de barras y
DataMatrix) es un canal alternativo, plenamente integrado pero secundario: el sensor de video
NUNCA se activa automáticamente al abrir un formulario de ingreso o consumo, y solo se habilita
mediante una acción explícita del usuario (p. ej. pulsar un botón de "Escanear"). Cualquier
implementación que active la cámara por defecto o interrumpa el flujo de búsqueda manual viola
este principio.
Rationale: Interrumpir el ritmo de trabajo clínico con permisos de cámara o activaciones
automáticas del sensor de video degrada la experiencia y ralentiza el registro; la búsqueda
manual debe ser siempre la vía más rápida disponible.

### VI. Control Multi-Usuario
El sistema DEBE soportar múltiples usuarios con identidad diferenciada por cada registro de
movimiento de inventario (quién registró, consumió o ajustó cada ítem), gestionados y
autenticados a través de Supabase. La autenticación y autorización se apoyan en el backend
relacional, pero el registro de qué usuario realizó una acción offline DEBE quedar capturado
localmente y sincronizarse junto con la transacción correspondiente, sin perder la atribución de
autoría.
Rationale: La trazabilidad de insumos clínicos requiere saber no solo qué ocurrió sino quién lo
hizo, incluso en operaciones realizadas sin conexión.

## Pila Tecnológica Obligatoria

La aplicación se construye como una PWA sobre la siguiente pila, sin sustituciones no
justificadas por una excepción documentada en Governance:
- Build/Dev: Vite.
- UI: React.
- Estilos: Tailwind CSS, con utilidades dimensionadas para cumplir el Principio III (objetivos
  táctiles ≥48x48px).
- Estado local: Zustand (Principio II).
- Persistencia local/offline: IndexedDB como almacenamiento primario (Principio I).
- Backend relacional y sincronización remota: Supabase (datos, autenticación multi-usuario,
  sincronización en segundo plano).
- Captura óptica: librería de escaneo de códigos de barras/DataMatrix activada únicamente bajo
  demanda explícita del usuario (Principio V), nunca en segundo plano ni al montar un formulario.

## Flujo de Trabajo de Desarrollo

Toda funcionalidad nueva o modificada relacionada con registro/consumo de insumos, alertas de
caducidad/stock mínimo, o sincronización, DEBE verificarse contra los Principios I-VI antes de
mergear:
- Cambios que toquen formularios de ingreso o consumo DEBEN confirmar que la cámara no se activa
  automáticamente y que la búsqueda manual sigue siendo la vía inmediata por defecto.
- Cambios de UI DEBEN verificar tamaños táctiles mínimos (48x48px) en los componentes
  interactivos afectados.
- Cambios que toquen la capa de datos DEBEN confirmar que la escritura primaria ocurre en
  IndexedDB y que la sincronización con Supabase es no bloqueante y tolerante a fallos de red.
- Los revisores de PR usan esta constitución como checklist de aceptación; cualquier excepción
  DEBE documentarse explícitamente en la descripción del PR con su justificación.

## Governance

Esta constitución prevalece sobre cualquier otra guía de desarrollo, plantilla o convención
implícita del proyecto. En caso de conflicto entre esta constitución y cualquier otro documento
(README, plantillas de Spec Kit, comentarios de código), esta constitución tiene precedencia.

**Procedimiento de enmienda**: Cualquier cambio a esta constitución se propone mediante el
comando `/speckit-constitution`, documentando el motivo del cambio. El cambio se considera
ratificado al escribirse en este archivo con su Sync Impact Report actualizado.

**Política de versionado** (SemVer aplicado a la constitución):
- MAJOR: eliminación o redefinición incompatible de un principio existente.
- MINOR: adición de un nuevo principio o expansión material de una guía existente.
- PATCH: aclaraciones, correcciones de redacción o refinamientos no semánticos.

**Revisión de cumplimiento**: Toda PR que afecte formularios de registro/consumo, componentes de
UI interactivos, la capa de persistencia (IndexedDB/Zustand) o la sincronización con Supabase
DEBE verificar cumplimiento de los Principios I-VI antes de aprobarse. La complejidad añadida que
se desvíe de la Pila Tecnológica Obligatoria DEBE justificarse explícitamente en la PR.

**Version**: 1.0.0 | **Ratified**: 2026-09-05 | **Last Amended**: 2026-09-05
