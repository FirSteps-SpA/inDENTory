# Phase 1 Data Model: Inicio de Sesión de Personal Clínico

Two entities: one lives only locally (Dexie), the other lives only in Supabase Postgres and is
documented as a contract (`contracts/supabase-schema.md`) since it's authored/read outside this
codebase's direct control.

## UsuarioActual (local, Dexie)

The locally-cached authenticated identity that gates offline app access (spec Key Entities:
"Sesión"; research.md's offline-durable session decision).
This is one of the two halves spec.md's "Sesión" entity maps to — the other half (the actual
Supabase Auth token) is not modeled as an entity here; it lives in `supabase-js`'s own default
storage and is irrelevant to gating offline access (research.md).

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
Assumptions) — the table is cleared before each successful login, so there is only ever one row,
keyed by the real Supabase Auth user id (not a fixed/synthetic key). Logout is a single `clear()`.

### Dexie schema (local)

```ts
db.version(1).stores({
  usuarioActual: 'id', // at most one row at a time; cleared on login/logout
})
```

Feature 001 never called `.version()` (no domain tables existed yet), so this is the first real
schema version. Whichever feature ships next (e.g., 002's `insumos`/`lotes`/`movimientos`) adds
its tables via an additive `db.version(2).stores({...})` — no migration of this table is needed.

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
