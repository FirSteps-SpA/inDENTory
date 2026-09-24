# Quickstart Validation: Separación de Ajustes y Configuración Global

Guía para validar la feature de punta a punta, mapeada a user stories y criterios de éxito. Solo
validación; la implementación vive en `tasks.md`.

## Prerequisites

- Entorno de las specs 001-009 funcionando (`npm run dev`; ver skill `run-indentory`).
- Esquema Supabase actualizado con [contracts/supabase-schema.md](./contracts/supabase-schema.md)
  (necesario para los escenarios 8 y 11, que verifican RLS real).
- Dos cuentas: una `administrador` y una `personal`.
- Datos: al menos un insumo activo con stock mínimo configurado, un insumo con un lote caducado
  con stock, un insumo dado de baja (spec 007), y una categoría creada por un administrador
  (spec 008) que ya tenga algún material asignado.

## Automated checks

```bash
npm run lint && npm run build && npm test
```

Esperado: verde, incluidas las pruebas nuevas (`proyeccion` con `restaurarInsumo`,
`categoriasAdmin`, `clinica`, `preferencias`, `resumen`, `sync-configuracion-clinica`) y las
existentes ajustadas (`bottom-nav`, que deja de referenciar `MasView`/"Consumir insumo";
`AlertasView`, que deja de probar los controles de configuración movidos).

## Scenarios

1. **Alertas relocalizadas (US1, SC-001/SC-002)** — como administrador, abrir "Ajustes" (antes
   "Más"). Esperado: en menos de 15 s se encuentran los controles de stock mínimo por insumo y de
   niveles de aviso de caducidad, con el mismo comportamiento que antes. Abrir "Alertas": solo
   quedan stock bajo, próximos a caducar y lotes en revisión, sin controles. Como `personal`, esos
   controles no aparecen en "Ajustes".
2. **Perfil (US2, SC-005)** — abrir "Ajustes" con cualquier cuenta. Esperado: en menos de 5 s se
   ven nombre, correo y rol; "Cerrar sesión" cierra la sesión igual que desde el encabezado.
3. **RLS del catálogo, intento no autorizado (US3, SC-003)** — con el token de la cuenta
   `personal`, hacer una llamada directa a Supabase (fuera de la app) para cambiar el `nombre` de
   un insumo existente. Esperado: la fila no cambia (el trigger la revierte). Repetir dando de baja
   ese insumo directamente: tampoco persiste.
4. **RLS, operaciones normales sin cambios (US3, SC-003)** — con la cuenta `personal`, dar de alta
   un insumo nuevo, registrar un lote y un movimiento de consumo (dentro de la app, como siempre).
   Esperado: funciona igual que antes de esta spec, sin rechazos.
5. **Resync rutinario no bloqueado (US3, FR-012)** — con la cuenta `personal`, sin hacer ningún
   cambio de catálogo, dejar correr un ciclo de sincronización en segundo plano. Esperado: sin
   errores en consola; los insumos existentes se resincronizan con normalidad.
6. **Renombrar categoría, sin colisión (US4, SC-004)** — como administrador, en "Ajustes" ▸
   "Categorías", renombrar una categoría creada a un nombre no usado. Esperado: en menos de 20 s,
   la categoría muestra el nuevo nombre y los materiales que la usaban también, tanto en Inventario
   como en el formulario de alta/edición.
7. **Fusionar categorías (US4)** — renombrar una categoría creada a un nombre que coincide con otra
   ya existente (por ejemplo, una precargada). Esperado: la categoría renombrada desaparece del
   listado de opciones; sus materiales pasan a mostrar el nombre de la categoría existente; en
   "Ajustes" ▸ "Categorías" sigue listada, marcada como desactivada.
8. **Desactivar/reactivar categoría (US4)** — desactivar una categoría creada con materiales
   asignados. Esperado: desaparece del selector de materiales; esos materiales conservan su
   categoría sin cambios. Reactivarla: vuelve a aparecer en el selector.
9. **Categorías precargadas protegidas (US4, FR-019)** — intentar renombrar, fusionar o desactivar
   "Fresas" o "Sin categoría". Esperado: el sistema no lo permite.
10. **Nombre de clínica (US5, SC-006 numeración, ver Success Criteria)** — como administrador,
    guardar un nombre de clínica no vacío. Esperado: reemplaza "Gabinete" en el encabezado de todas
    las pantallas de inmediato. Intentar guardar vacío: se rechaza, se conserva el valor anterior.
11. **Ver y restaurar un insumo dado de baja (US6, SC-006)** — como administrador, abrir "Ajustes"
    ▸ "Insumos dados de baja". Esperado: el insumo dado de baja de los prerequisitos aparece con
    quién y cuándo lo dio de baja. Restaurarlo: en menos de 15 s vuelve a Inventario/Alertas/
    Compras con su stock y lotes intactos. Como `personal`, esta sección no aparece.
12. **Preferencias de notificaciones (US7, SC-007/SC-008)** — desactivar "Stock bajo" en
    "Ajustes" ▸ "Notificaciones" (en menos de 10 s). Con un insumo bajo mínimo y ninguna alerta de
    caducidad, el ícono "Alertas" de la navegación inferior no muestra indicador, mientras "Alertas"
    sigue listando ese insumo. Desactivar también "Caducidad": el indicador no aparece bajo ninguna
    condición. Reactivar ambas: vuelve a reflejar el total combinado.
13. **Sin conexión (todas las US con escritura)** — con DevTools en modo offline, repetir los
    escenarios 6, 8, 10, 11 y 12. Esperado: cada cambio se aplica de inmediato en el dispositivo;
    al reconectar, se sincroniza sin intervención ni pérdida de datos.
14. **Puente "Consumir insumo" retirado** — confirmar que "Ajustes" no ofrece ninguna acción de
    consumo (ese flujo vive en las acciones rápidas del listado de Inventario, spec 007).

## Trazabilidad a Success Criteria

SC-001→Escenario 1 · SC-002→Escenario 1 · SC-003→Escenarios 3-5 · SC-004→Escenarios 6-7 ·
SC-005→Escenario 2 · SC-006→Escenario 11 · SC-007→Escenario 12 · SC-008→Escenario 12.
