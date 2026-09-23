# Quickstart Validation: Formulario Unificado para Creación de Nuevo Material

Guía para validar la feature de punta a punta, mapeada a user stories y criterios de éxito.
Solo validación; la implementación vive en `tasks.md`.

## Prerequisites

- Entorno de las specs 001-007 funcionando (`npm run dev`; ver skill `run-indentory`).
- Esquema Supabase actualizado con [contracts/supabase-schema.md](./contracts/supabase-schema.md)
  (solo para los escenarios 8 y 9).
- Dos cuentas: una `administrador` y una `personal`.
- Datos: un insumo activo "Composite A2" (código `7790001`, categoría escrita a mano `restauracion`).

## Automated checks

```bash
npm run lint && npm run build && npm test
```

Esperado: verde, incluidas las pruebas nuevas de `categorias`, `alta`, `useBorradorAlta`,
`sync-categorias` y la integración `alta-material`, y las existentes de `registro`,
`acciones-rapidas` e `inventario`.

## Scenarios

1. **Alta sin stock (US1, SC-002)** — como `personal`: Inventario → `+ Material`. Esperado: foco
   en Nombre, sin cámara. Nombre "Fresa diamante 856", categoría **Fresas**, unidad **Pieza**,
   stock mínimo 5, stock inicial 0 → botón "Guardar". Esperado: < 30 s, vuelve al listado con
   aviso, tarjeta "Sin stock", aparece en el chip Fresas y en el conteo de Bajo Stock.
2. **Selector de categorías (FR-009/FR-010, SC-004)** — abrir el selector. Esperado: Cirugía,
   Fresas, Restauración, Tratamientos pulpares (una sola "Restauración", aunque exista
   `restauracion`), "Sin categoría" al final; como `personal`, sin "+ Crear nueva categoría".
   Chip "Restauración" del Inventario incluye "Composite A2".
3. **Alta con primer lote (US2, SC-001, SC-003)** — Nombre "Anestesia X", categoría Cirugía,
   unidad Cartucho, stock inicial 10 (con "+"), lote "A123", proveedor, vencimiento dentro de un
   año → "Guardar e Ingresar". Esperado: < 60 s; tarjeta muestra 10; el detalle muestra el lote;
   historial con un ingreso atribuido al usuario.
4. **Reglas del lote (FR-014/FR-015/FR-017)** — stock 0: sin sección de lote. Desactivar
   "Sujeto a caducidad" con stock > 0: sin campo de vencimiento. Fecha de ayer: diálogo "Este
   lote ingresaría ya caducado"; tras `Guardar igual`, el lote aparece en Alertas. Fecha de hoy:
   sin diálogo.
5. **Validación y cancelar (FR-006/FR-023)** — nombre vacío o "composite a2": error bajo el
   campo, nada se pierde. `Cancelar` con datos: pide confirmación; al descartar vuelve con los
   filtros previos.
6. **Borrador (FR-024)** — escribir nombre y categoría, cambiar a Alertas, recargar la app,
   volver a `+ Material`. Esperado: "Recuperamos tu alta sin terminar" con los datos. Cerrar
   sesión y volver a entrar: formulario vacío.
7. **Duplicados y código (US4)** — escribir "compo": sugerencia "Composite A2 — Ya existe" que
   abre su detalle. Escribir código `7790001`: aviso "Este código ya corresponde a «Composite
   A2»". `Escanear`: la cámara se activa solo tras el toque; negar el permiso muestra mensaje y
   se puede escribir a mano.
8. **Categoría nueva (US3)** — como `administrador`: `+ Crear nueva categoría` "ortodoncia"
   → guardar material. Esperado: chip "Ortodoncia" en el Inventario y opción en alta/edición.
   Crear "FRESAS": se selecciona la existente, sin duplicado. Crear "Implantes" y cancelar el
   alta: la categoría no existe.
9. **Sin conexión y sincronización (FR-021/FR-026)** — dos dispositivos sin conexión crean
   "Guantes M"; reconectar. Esperado: ambos existen; el más reciente muestra "Posible duplicado"
   solo al administrador; al darlo de baja, el badge desaparece. Rechazo: administrador crea
   categoría sin conexión, se le quita el rol en `perfiles`, reconecta → aviso de categoría
   rechazada; el material queda en "Sin categoría".
10. **Desde Registrar (FR-004)** — Más → Registrar insumo → buscar "Hilo sutura" sin resultados
    → "Crear insumo nuevo". Esperado: se abre este formulario con el nombre precargado. Sin
    stock inicial: al guardar queda seleccionado para registrar su lote. Con stock inicial:
    mensaje de éxito y vuelta a la búsqueda.
11. **Táctil (FR-025)** — con DevTools, todos los controles del formulario miden ≥48×48px en un
    ancho de 360px; el botón principal permanece visible sin desplazarse.
