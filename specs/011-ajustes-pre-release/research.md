# Research: Ajustes de Interfaz Pre-Release

No quedaron marcadores `NEEDS CLARIFICATION` en `spec.md` ni en el Technical Context del plan. Esta feature se apoya en un código base ya existente y bien entendido (confirmado por exploración directa del repo), por lo que la investigación se centra en decisiones técnicas puntuales necesarias para implementar cada requisito de forma segura y reversible.

## 1. Navegación fija en el borde inferior (FR-004, FR-005)

- **Decision**: Usar `position: fixed` con `inset-inline: 0; bottom: 0` para `BottomNav`, agregando `padding-bottom: env(safe-area-inset-bottom)` (o la utilidad equivalente en Tailwind) al contenedor de la barra. El contenedor de contenido scrollable debe reservar un espacio inferior equivalente (padding/margen) para que el contenido nunca quede tapado detrás de la barra fija.
- **Hallazgo bloqueante a resolver como parte de la implementación**: `index.html` actualmente declara `<meta name="viewport" content="width=device-width, initial-scale=1.0" />`, **sin** `viewport-fit=cover`. Sin `viewport-fit=cover`, iOS Safari no expone `env(safe-area-inset-bottom)` con un valor distinto de cero, por lo que FR-005 (respetar el área segura) no tendría efecto real en iPhones con barra de gestos. Es necesario añadir `viewport-fit=cover` al meta viewport como parte de este cambio.
- **Rationale**: `position: fixed` es el patrón estándar y sin dependencias nuevas para lograr una barra de navegación siempre visible tipo app nativa, independientemente de cómo esté estructurado el scroll del contenido interno.
- **Alternatives considered**: `position: sticky` — descartado porque su comportamiento depende del contenedor de scroll ancestro y de que el elemento sea el último en el flujo; no garantiza "siempre visible" si el layout cambia, y sigue ocupando espacio en el flujo normal (el problema actual). `fixed` es más simple y predecible para este caso.

## 2. Alcance del cambio de nombre visible ("DENTDELION")

- **Decision**: Actualizar exactamente estos 5 literales de cara al usuario: `index.html` (`<title>`), `vite.config.ts` (`manifest.name` y `manifest.short_name`), `src/app/App.tsx` (encabezado del estado "Cargando…"), `src/app/AppHeader.tsx` (texto del logo) y `src/features/auth/LoginForm.tsx` (encabezado de login). Para los 3 literales en tiempo de ejecución de React (`App.tsx`, `AppHeader.tsx`, `LoginForm.tsx`) se introduce una única constante exportada (p. ej. `APP_NAME`) para evitar duplicar el string tres veces. `index.html` y `vite.config.ts` permanecen como literales propios porque son artefactos estáticos/de build que no pueden importar un módulo TypeScript de `src/`.
- **Fuera de alcance (se dejan sin cambios)**: los prefijos de log `[inDENTory]` en `useBackendConnection.ts` y `sync/index.ts` (mensajes de consola para desarrolladores, no visibles a usuarios finales) y el nombre de la base de datos Dexie `inDENToryDB` en `src/lib/db/index.ts`.
- **Rationale**: FR-003 exige explícitamente que los identificadores internos/técnicos no cambien. Renombrar la base de datos Dexie crearía una base de datos IndexedDB nueva y vacía para los usuarios que ya tienen la app instalada, lo que se percibiría como pérdida de datos — un efecto secundario inaceptable para un cambio puramente cosmético del nombre mostrado.
- **Alternatives considered**: Renombrar también la base Dexie y escribir una migración de copia de datos — descartado por ser una complejidad y un riesgo innecesarios para un cambio que la propia especificación acota a texto visible al usuario.

## 3. Nombre del manifiesto PWA en dispositivos ya instalados

- **Decision**: Actualizar `manifest.name`/`short_name` en la configuración de `vite-plugin-pwa`; confiar en el flujo existente `registerType: 'autoUpdate'` del service worker para propagar el manifiesto nuevo. Documentar como limitación conocida de la plataforma que algunos sistemas operativos cachean la etiqueta del ícono de inicio hasta que el usuario reinstale la PWA o el SO refresque el manifiesto por su cuenta.
- **Rationale**: Es un comportamiento estándar de las PWAs en Android/Chrome e iOS/Safari; forzar un refresco inmediato del nombre/ícono en la pantalla de inicio del sistema operativo no es algo que los estándares web permitan controlar desde la aplicación.
- **Alternatives considered**: Pedir a los usuarios que desinstalen y reinstalen la PWA — descartado por fricción innecesaria; los criterios de éxito de la especificación (SC-001) se refieren a que la app *sirva* "DENTDELION" hacia adelante, no a forzar la actualización instantánea de cada instalación existente.

## 4. Alcance exacto de los puntos de entrada de escaneo a ocultar (FR-008, FR-009, FR-010)

- **Decision**: Ocultar el disparador visual de escaneo en los 4 puntos de entrada confirmados por búsqueda directa en el código:
  1. `src/features/insumos/components/InsumoFiltros.tsx` (`<ScanButton onSelect={onSelectDesdeEscaneo} />`, filtro/búsqueda de inventario)
  2. `src/features/insumos/components/AltaMaterialView.tsx` (`<ScanButton ... />`, alta de material)
  3. `src/features/insumos/components/ConsumoForm.tsx` (`<ScanButton onSelect={seleccionarInsumo} />`, consumo)
  4. `src/features/insumos/components/EditarInsumoForm.tsx` (botón inline con ícono `Scan` que invoca `useBarcodeScanner().scan`, edición)

  El componente compartido `ScanButton.tsx` y el hook `useBarcodeScanner.ts` **no se eliminan**; solo se deja de renderizar/montar su trigger en estos 4 lugares, de modo que la función pueda reactivarse más adelante (FR-010) sin tener que reescribirla.
- **Rationale**: Confirmado por búsqueda exhaustiva (`grep`) que estos son los únicos 4 usos existentes de escaneo relacionados con insumos. Conservar el código subyacente satisface el requisito de reversibilidad sin riesgo de código muerto que deba reconstruirse después.
- **Alternatives considered**: Eliminar por completo el hook y el componente de escaneo — descartado porque contradice FR-010 y obligaría a reimplementar la función desde cero cuando se decida reactivarla.
