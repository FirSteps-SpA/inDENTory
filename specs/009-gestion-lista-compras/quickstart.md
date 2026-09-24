# Quickstart Validation: Gestión de Lista de Compras (Reabastecimiento)

Guía para validar la feature de punta a punta, mapeada a user stories y criterios de éxito. Solo
validación; la implementación vive en `tasks.md`.

## Prerequisites

- Entorno de las specs 001-008 funcionando (`npm run dev`; ver skill `run-indentory`).
- Esquema Supabase actualizado con [contracts/supabase-schema.md](./contracts/supabase-schema.md)
  (solo para el escenario 7).
- Dos cuentas: una `administrador` y una `personal` (ambas ven y usan Compras igual — no hay
  distinción de rol en esta spec).
- Datos: un insumo activo "Guantes M" con stock mínimo configurado por encima de su stock actual
  (para que aparezca sugerido por stock bajo), y otro insumo "Anestesia X" que caduca, con un lote
  vencido con stock disponible (para que aparezca sugerido por caducidad).

## Automated checks

```bash
npm run lint && npm run build && npm test
```

Esperado: verde, incluidas las pruebas nuevas de `sugeridos`, `itemsManuales`, `recepcion`,
`compartir`, `sync-items-compra` y la integración `compras`, y las existentes ajustadas
(`bottom-nav`) o eliminadas (`registro`, que probaba el `RegistroForm` retirado).

## Scenarios

1. **Sugeridos automáticos (US1, SC-001)** — abrir "Compras". Esperado: "Guantes M" en Sugeridos
   con badge "🟠 Stock Mínimo"; "Anestesia X" con badge "🔴 Caducado"; en menos de 5 s, sin tocar
   nada. Un insumo sin stock mínimo ni lotes caducados no aparece. Sin conexión (DevTools
   offline): la lista se calcula igual.
2. **Recepción de un sugerido (US2, SC-002, SC-004)** — marcar "Guantes M" como
   "Comprado / Recibido". Completar cantidad, número de lote, proveedor → confirmar. Esperado: en
   menos de 45 s; el stock sube en Inventario de inmediato; si con esa cantidad el insumo ya no
   está bajo mínimo ni tiene lotes caducados, desaparece de Sugeridos al volver.
3. **Lote ya caducado en la recepción (FR-010)** — recibir "Anestesia X" con una fecha de
   vencimiento de ayer. Esperado: diálogo "Este lote ingresaría ya caducado"; tras "Guardar
   igual", el lote nuevo aparece en Alertas; el insumo sigue en Sugeridos con "🔴 Caducado" por el
   lote vencido original hasta resolverlo aparte (Edge Cases).
4. **Ítem manual, agregar y vincular (US3, SC-003)** — tocar "+ Añadir Ítem Manual", escribir
   "Composite A2" (si ya existe un insumo con nombre parecido, debe sugerirse para vincular) →
   guardar. Esperado: en menos de 15 s; aparece en "Agregados Manualmente" con badge "✏️ Manual".
   Marcarlo como recibido: se abre el mismo flujo de recepción que en el escenario 2.
5. **Ítem manual sin vincular (FR-012)** — agregar "Torundas de algodón" (sin coincidencia en el
   catálogo) → marcarlo como recibido. Esperado: se ofrecen "Crear material" (abre "Nuevo
   Material" con el nombre precargado, spec 008) o "Marcar como comprado sin inventario". Elegir
   la segunda: desaparece de pendientes sin tocar el inventario.
6. **Eliminar un ítem manual (FR-018)** — como cualquiera de las dos cuentas, eliminar un ítem
   manual que agregó la otra cuenta. Esperado: desaparece de inmediato, sin pedir el flujo de
   recepción ni afectar el inventario.
7. **Sin conexión y sincronización (FR-024/FR-025)** — dos dispositivos sin conexión reciben el
   mismo ítem sugerido con cantidades distintas; reconectar. Esperado: ambas recepciones se
   conservan como movimientos de ingreso independientes; el stock final suma ambas.
8. **Compartir lista (US4, SC-005)** — con al menos un sugerido y un manual pendientes, tocar
   "Compartir Lista". Esperado: en menos de 10 s se abre el mecanismo nativo de compartir (o, si
   no hay ninguno disponible, un mensaje con opción de copiar al portapapeles) con un texto que
   enumera cada ítem, su cantidad si la tiene, y si es sugerido o manual. Sin ítems pendientes, el
   botón aparece deshabilitado.
9. **"Registrar insumo" ya no existe (FR-011)** — abrir "Más". Esperado: solo aparece "Consumir
   insumo"; no hay ninguna opción para registrar/recibir stock ahí — todo pasa por "Compras".
10. **Táctil (FR-026)** — con DevTools, todos los checkboxes y controles de "Compras" (incluidos
    los del flujo de recepción y del formulario de ítem manual) miden ≥48×48px en un ancho de
    360px.
