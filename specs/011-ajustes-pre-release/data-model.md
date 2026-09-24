# Data Model: Ajustes de Interfaz Pre-Release

Esta feature no introduce, modifica ni elimina entidades de datos, campos, relaciones ni transiciones de estado persistente. Los cuatro ajustes son cambios de presentación (texto mostrado, posición de un componente de navegación, visibilidad de controles existentes) sobre entidades y estado ya existentes:

- **Usuario / sesión** (`useAuthStore`): sin cambios en su forma ni en su ciclo de vida. Solo cambia *dónde* se muestra la información de sesión y el control de cierre de sesión (se deja de renderizar en `AppHeader`, se mantiene sin cambios en `PerfilSection` dentro de Ajustes).
- **Insumo / Lote / Movimiento** (`useInventoryStore`): sin cambios. El ocultamiento del escaneo no afecta cómo se crean, editan o consumen estos registros — solo elimina un método de captura (cámara) manteniendo intacto el método de captura manual y todos los campos y validaciones existentes.
- **Configuración de clínica / preferencias** (`useClinicaStore`, Ajustes): sin cambios.

No se requiere migración de datos, ni en IndexedDB (Dexie) ni en Supabase, para ninguno de los cuatro ajustes de esta especificación.
