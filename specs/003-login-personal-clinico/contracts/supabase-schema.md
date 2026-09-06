# Contract: Supabase Auth + `perfiles` Table

Supabase is external to this codebase (backend-as-a-service, per constitution). This contract
covers the one new table this feature adds, plus the Auth calls the client relies on. It follows
the same "this is the contract future changes must keep in sync" convention as feature 002's
`contracts/supabase-schema.md`.

## Auth calls used by the client

| Call | Used for | Notes |
|---|---|---|
| `supabase.auth.signInWithPassword({ email, password })` | Login (FR-001) | On success, caller fetches the matching `perfiles` row and writes `UsuarioActual` locally (data-model.md). On failure, show the single generic message from research.md (FR-005) regardless of error reason. |
| `supabase.auth.signOut({ scope: 'local' })` | Logout (FR-004) | Never awaits/requires a network round-trip to complete locally (research.md). |
| `supabase.auth.getUser()` / existing `getSession()` (feature 001, `useBackendConnection.ts`) | Background sync auth, unrelated to gating offline UI | Unchanged by this feature — this feature does not gate app access on it (research.md). |

No self-registration call (`signUp`) is used by this feature (spec FR-009).

## `perfiles` table

```sql
create table perfiles (
  id uuid primary key references auth.users(id),
  nombre text not null,
  rol text not null check (rol in ('administrador', 'personal'))
);
```

## Row Level Security

- **Read**: an authenticated user may read only their own row —
  `id = auth.uid()`. This is the only read this feature needs (fetching your own role/name on
  login); no screen in this feature lists other users' profiles.
- **Write (insert/update/delete)**: no policy grants these to authenticated clients from this
  feature. Row creation/role assignment happens exclusively through Supabase's service-role
  context (dashboard or an administrator-triggered server-side flow), consistent with FR-009 and
  the "account provisioning" research decision — this guarantees a `personal` user cannot
  self-promote to `administrador` by writing their own row.

```sql
alter table perfiles enable row level security;

create policy "perfiles: leer solo el propio perfil"
  on perfiles for select
  using (id = auth.uid());

-- No insert/update/delete policy is created for authenticated clients: writes are
-- performed only via the Supabase service role (dashboard / admin-side tooling),
-- outside this feature's client code.
```

## Interaction with existing `movimientos` table (feature 002)

No schema change: `movimientos.usuario_id` already references `auth.users(id)`
(`contracts/supabase-schema.md` in `specs/002-registro-consumo-insumos/`), and this feature's
`UsuarioActual.id` / `perfiles.id` are the same id space — attribution keeps working unchanged.
