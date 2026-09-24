# Quickstart: Validación de Ajustes de Interfaz Pre-Release

## Prerrequisitos

```bash
npm install
npm run dev
```

Abrir la URL local que imprime Vite en un navegador con emulación de dispositivo móvil (DevTools → toggle device toolbar), idealmente simulando un iPhone con "home indicator" para validar el área segura.

## US1 — Nombre visible "DENTDELION" (ver contrato en `contracts/ui-contracts.md`)

1. Con la app aún sin iniciar sesión, recargar la página y observar el instante de carga ("Cargando…"): el encabezado debe decir "DENTDELION".
2. En la pantalla de login, confirmar que el encabezado dice "DENTDELION".
3. Iniciar sesión y confirmar que el logo del encabezado superior dice "DENTDELION".
4. Verificar el título de la pestaña del navegador: debe decir "DENTDELION".
5. Ejecutar `npm run build && npm run preview`, abrir el `manifest.webmanifest` generado en `dist/` y confirmar `name`/`short_name: "DENTDELION"`.
6. Confirmar que **no** cambiaron: el nombre del paquete en `package.json` (`indentory`), el nombre de la base Dexie (`inDENToryDB`, visible en DevTools → Application → IndexedDB) ni los prefijos `[inDENTory]` en la consola.

## US2 — Navegación fija en el borde inferior

1. Iniciar sesión y navegar a "Inventario" con suficientes insumos para que la lista exceda el alto de la pantalla.
2. Hacer scroll hacia abajo dentro del contenido: el panel de navegación (Inventario/Compras/Alertas/Más) debe permanecer visible y fijo en el borde inferior de la pantalla en todo momento.
3. Cambiar entre las 4 secciones y confirmar que ningún control de la vista activa queda oculto detrás de la barra de navegación.
4. En la emulación de un dispositivo con home indicator (o un iPhone real), confirmar que los botones de navegación no quedan parcialmente tapados por la barra de gestos del sistema, y que el `index.html` incluye `viewport-fit=cover` en su meta viewport (prerrequisito para que `env(safe-area-inset-bottom)` tenga efecto).
5. Medir con las DevTools que cada botón de la barra mantiene un área táctil renderizada ≥48×48px.

## US3 — Sesión/logout solo en Ajustes

1. Con sesión iniciada, revisar el encabezado superior en cada una de las 4 secciones: no debe aparecer "Sesión iniciada como…" ni el botón "Cerrar sesión".
2. Ir a la pestaña "Más" (Ajustes) → sección Perfil: debe verse el nombre, correo y rol del usuario, y el botón "Cerrar sesión".
3. Pulsar "Cerrar sesión" desde Ajustes y confirmar que la sesión se cierra correctamente (vuelve a la pantalla de login), igual que antes hacía el botón del encabezado.

## US4 — Escaneo oculto en insumos

1. Abrir "Alta de material" (Inventario → agregar): confirmar que no aparece ningún botón de "Escanear", y completar un alta manualmente.
2. Abrir el formulario de consumo de un insumo existente: confirmar ausencia del botón de escaneo y completar el consumo por búsqueda manual.
3. En Inventario, abrir los filtros de búsqueda: confirmar que no aparece la opción de escanear como método de filtro.
4. Abrir la edición de un insumo existente: confirmar que no aparece el control de escaneo (ícono `Scan` / "Cancelar escaneo").

## Pruebas automatizadas relacionadas

```bash
npm run test      # Vitest — actualizar/crear specs de AppHeader, BottomNav y los formularios de insumos afectados
npm run lint
npm run build      # valida también que el manifest.webmanifest generado tenga el nombre correcto
```

No se requieren nuevos scripts de base de datos ni contratos de API: esta feature es exclusivamente de interfaz.
