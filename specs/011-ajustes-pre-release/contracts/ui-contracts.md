# UI Contracts: Ajustes de Interfaz Pre-Release

Esta aplicación no expone una API pública ni un CLI; su única "interfaz" externa es la UI misma. Estos contratos documentan el comportamiento observable que cada componente afectado debe cumplir, para que la verificación (manual o con tests) pueda hacerse contra un criterio explícito por componente.

## Nombre visible de la app (`APP_NAME`)

- **Contrato**: Un único valor de texto ("DENTDELION") se usa en los 3 puntos de contacto en tiempo de ejecución de React: encabezado de arranque/carga (`App.tsx`), logo del encabezado autenticado (`AppHeader.tsx`) y encabezado de login (`LoginForm.tsx`). Los 3 deben leer el mismo valor (constante compartida), no literales independientes.
- **Fuera de este contrato** (literales propios, no derivados de la constante): `index.html` `<title>` y `vite.config.ts` `manifest.name`/`short_name`, por ser artefactos estáticos/de build.
- **Invariante**: Ningún punto de contacto de cara al usuario (los 5 anteriores) debe mostrar el texto "inDENTory".

## `BottomNav` — posicionamiento fijo

- **Contrato de props**: `BottomNav` conserva exactamente su interfaz actual (`active`, `onChange`, `alertasBadge`) — este cambio es solo de posicionamiento/CSS, no de comportamiento ni de datos.
- **Contrato visual/estructural**:
  - El elemento raíz de `BottomNav` se renderiza con posición fija al borde inferior del viewport (`position: fixed`, `bottom: 0`, ancho completo), permaneciendo por encima de cualquier contenido con el que coincida en el eje Z.
  - Incluye `padding-bottom` (o equivalente) igual a `env(safe-area-inset-bottom)`, y esto solo tiene efecto si `index.html` declara `viewport-fit=cover` en su meta viewport.
  - El contenedor de contenido scrollable de `App.tsx` reserva espacio inferior (padding/margin) al menos igual a la altura renderizada de `BottomNav` (incluyendo su safe-area), de modo que ningún control o texto de las vistas (`InventarioView`, `ComprasView`, `AlertasView`, `AjustesView`) quede oculto detrás de la barra.
  - Cada botón de pestaña conserva la clase `touch-target` con un área táctil renderizada ≥48×48px (Constitución III), incluso con el padding de safe-area aplicado.

## `AppHeader` — remoción de sesión/logout

- **Contrato de props**: La prop `onSignOut` deja de usarse para renderizar el bloque de sesión/logout (puede eliminarse de `AppHeaderProps` si ya no tiene otro consumidor tras el cambio).
- **Contrato visual**: `AppHeader` ya no renderiza el texto "Sesión iniciada como…" ni el botón "Cerrar sesión" en ningún estado (autenticado o no). El resto del encabezado (logo, pill de clínica, indicador de conexión, avatar de iniciales) permanece sin cambios.
- **Invariante**: `PerfilSection` (Ajustes → Perfil) sigue siendo el único lugar de la UI que muestra el texto de sesión y el botón "Cerrar sesión", y su comportamiento de cierre de sesión (`useLogout().signOut`) no cambia.

## Puntos de entrada de escaneo — ocultamiento

- **Contrato**: En `InsumoFiltros.tsx`, `AltaMaterialView.tsx` y `ConsumoForm.tsx`, el elemento `<ScanButton ... />` deja de renderizarse (o se envuelve en una condición que siempre evalúa a "no renderizar" para este release). En `EditarInsumoForm.tsx`, el botón inline que invoca `useBarcodeScanner().scan` deja de renderizarse.
- **Invariante de reversibilidad (FR-010)**: `ScanButton.tsx` y `useBarcodeScanner.ts` permanecen sin cambios de implementación; el ocultamiento se hace en el sitio de uso (call site), no eliminando el componente/hook compartido.
- **Invariante funcional**: Cada uno de los 4 formularios/vistas sigue permitiendo completar su tarea (alta, edición, consumo, filtro) exclusivamente por búsqueda/captura manual, sin ningún paso adicional respecto al comportamiento previo del flujo manual.
