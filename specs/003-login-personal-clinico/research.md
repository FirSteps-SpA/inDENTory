# Phase 0 Research: Inicio de Sesión de Personal Clínico

No unresolved `NEEDS CLARIFICATION` markers remain in the Technical Context — every choice below
was already implied by the constitution and the existing feature-001 scaffold. This phase
documents the decisions and the reasoning, in the same Decision/Rationale/Alternatives format
used by feature 002's research.md.

## Offline-durable session vs. Supabase token lifecycle

**Decision**: Introduce a locally-cached `usuarioActual` record in Dexie (id, email, nombre,
rol), written on successful login and cleared only on explicit logout. All app-access decisions
(show login screen vs. app shell) read this local record, never a live Supabase session check.
Supabase's own access/refresh token pair (managed internally by `supabase-js`, default storage)
is left untouched and is only relevant when the background sync layer (feature 002) needs an
authenticated call.

**Rationale**: Spec FR-002/FR-006/FR-010 require the app to stay usable offline indefinitely
after the first login, with no forced re-authentication from the mere passage of time. Supabase
access tokens expire hourly by default and can only be refreshed with connectivity; gating the UI
on "is the Supabase session still valid" would force a re-login precisely when Constitution I
says the app must keep working (intermittent/no connectivity in the clinic). Decoupling "can the
user use the app" (local cache) from "can we sync right now" (Supabase token) satisfies both the
spec and Constitution I without weakening Constitution VI's attribution requirement — the
`usuarioId` recorded on every offline Movimiento (feature 002) comes from this same local cache.

**Alternatives considered**:
- *Gate the UI on `supabase.auth.getSession()` / `onAuthStateChange` only* — rejected: this
  reflects Supabase's own token expiry/refresh timing, which requires network to renew, directly
  violating FR-006/FR-010's "no forced reauthentication while offline."
- *Store the local session marker in `localStorage` instead of Dexie* — rejected: Dexie/IndexedDB
  is already the project's one local persistence layer (Constitution I, feature 001's Structure
  Decision); adding `localStorage` as a second local store for this one value would duplicate the
  responsibility Zustand+Dexie already have, with no benefit (login/logout are infrequent writes,
  so IndexedDB's async API cost is irrelevant here).

## Logout that never depends on connectivity

**Decision**: Call `supabase.auth.signOut({ scope: 'local' })`, then clear the local
`usuarioActual` Dexie record and reset `authStore`.

**Rationale**: Supabase's default `signOut()` attempts a network call to revoke the refresh token
server-side before resolving; `scope: 'local'` clears the SDK's local token storage immediately
without waiting on or requiring network, matching spec FR-004 and the offline logout edge case
directly.

**Alternatives considered**:
- *Default-scope `signOut()`* — rejected: can hang or reject without connectivity, blocking a
  clinical-flow action that spec FR-004 explicitly requires to work offline.

## Role storage and shape

**Decision**: Add a `perfiles` table in Supabase Postgres — `id` (references `auth.users.id`,
primary key), `rol` (`'administrador' | 'personal'`), `nombre`. On login, fetch the caller's own
`perfiles` row (RLS-restricted to `id = auth.uid()`) and cache `rol`/`nombre` into the local
`usuarioActual` Dexie record alongside the Supabase Auth `id`/`email`.

**Rationale**: Spec Clarifications establish exactly two roles with different permissions.
Supabase Auth's built-in user object has no first-class "app role" field; a small sidecar table
keyed by the auth user id is the standard, RLS-friendly pattern for this and keeps role data
queryable/joinable from other tables later (e.g., a future feature restricting catalog writes to
`administrador`) without touching `auth.users`.

**Alternatives considered**:
- *Store role in Supabase Auth `user_metadata`* — rejected: `user_metadata` is
  self-editable by the authenticated user via the client SDK, which would let a `personal` user
  grant themselves `administrador` — unacceptable for a permission-bearing field.
- *Store role only in `app_metadata`* — technically safer (only settable via the service-role
  Admin API, which matches "provisioned by an administrator," FR-009) but harder to query/join
  from Postgres for future admin-only RLS policies than a plain table; the `perfiles` table
  achieves the same non-self-editable guarantee via RLS (no `update`/`insert` policy grants it to
  regular users) while staying relationally simple. Documented as the "who can write this row"
  policy in `contracts/supabase-schema.md`.

## Account provisioning (admin-only, no signup screen)

**Decision**: This feature builds no signup/invite UI. Account + `perfiles` row creation for new
clinical staff is assumed to happen through Supabase's own tooling (dashboard or an
administrator-triggered flow) — out of this feature's scope per spec Assumptions.

**Rationale**: Spec FR-009 only requires that self-registration *not* exist from the login
screen; it does not require this feature to build the administrator's provisioning flow, which
the spec explicitly defers to a separate future feature.

**Alternatives considered**:
- *Build an in-app "invite user" screen now* — rejected as scope creep: not requested by any user
  story/acceptance scenario in spec.md, and spec Assumptions explicitly separates it out.

## Error messaging for failed login

**Decision**: On any `signInWithPassword` failure (bad password, unknown email, disabled user),
show one generic message ("Correo o contraseña incorrectos") regardless of the underlying reason.

**Rationale**: Directly required by spec FR-005 (don't reveal whether an email is registered) —
a standard anti-enumeration practice for login forms.

**Alternatives considered**: *Distinguish "unknown email" vs. "wrong password" messages* —
rejected: contradicts FR-005 outright.
