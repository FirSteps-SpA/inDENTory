# Phase 1 Data Model: Inicio de Sesión de Personal Clínico

Two entities: one lives only locally (Dexie), the other lives only in Supabase Postgres and is
documented as a contract (`contracts/supabase-schema.md`) since it's authored/read outside this
codebase's direct control.

## UsuarioActual (local, Dexie)

The locally-cached authenticated identity that gates offline app access (spec Key Entities:
"Sesión"; research.md's offline-durable session decision).

| Field | Type | Notes |
|---|---|---|
| `id` | `string` (UUID) | Primary key — the Supabase Auth user id (`auth.users.id`) |
| `email` | `string` | Displayed identifier, from Supabase Auth |
| `nombre` | `string` | Display name, from `perfiles.nombre` |
| `rol` | `"administrador" \| "personal"` | From `perfiles.rol` — read by any future permission check (spec FR-008) |
| `autenticadoEn` | `string` (ISO datetime) | When this device last completed a successful login |

**Lifecycle**: written once per successful `signInWithPassword` call (research.md); read on every
app boot to decide login screen vs. app shell (FR-002/FR-006); deleted only by explicit logout
(FR-004/FR-010) — never expired by a timer or background job.

**Cardinality**: at most one row at a time (single active local user per device, spec
Assumptions) — implemented as a fixed-id singleton row (`id: 'actual'`) rather than a growing
table, so logout is a single `delete`/`clear` rather than a query.

### Dexie schema (local)

```ts
db.version(2).stores({
  usuarioActual: 'id', // singleton row, primary key fixed at 'actual'
})
```

Versioned as `2` (additive) on top of feature 001's `db.version(1)` — no existing table is
touched, so no migration of feature 002's `insumos`/`lotes`/`movimientos` data is needed.

## Perfil (Supabase Postgres — external, see contracts/supabase-schema.md)

Represents a clinical staff member's role assignment (spec Key Entities: "Usuario de Personal
Clínico"), keyed 1:1 to a Supabase Auth user.

| Field | Type | Notes |
|---|---|---|
| `id` | `uuid` | Primary key, references `auth.users(id)` |
| `nombre` | `text` | Display name |
| `rol` | `text` | `'administrador' \| 'personal'` (spec Clarifications) |

**Validation**: `rol` constrained to the two known values at the database level (`check`
constraint) — see contract for the exact DDL and RLS policy.

## Relationships

```
auth.users (Supabase Auth, 1) ──── (1) Perfil        [Supabase Postgres]
auth.users (Supabase Auth, 1) ──── (1) UsuarioActual  [local Dexie cache, one device at a time]
```

`Perfil.id` / `UsuarioActual.id` both equal the Supabase Auth user id — the same id already
referenced by feature 002's `Movimiento.usuarioId`, so no change is needed there for attribution
to keep working.
