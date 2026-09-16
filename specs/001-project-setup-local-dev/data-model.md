# Phase 1 Data Model: Configuración Inicial del Proyecto y Entorno de Desarrollo Local

This feature introduces no domain (business) entities. It bootstraps the project scaffold and
local-development documentation only — the spec's Requirements/Assumptions explicitly place
inventory domain modeling (insumos, lotes, alertas) out of scope, deferred to future feature
specs that will build on the `src/features/` placeholder and the Dexie/Supabase clients set up
here.

## Configuration surface (not a domain entity, but the shape this feature does define)

For traceability between the spec's functional requirements and what gets built, the only
"data" this feature defines is local developer configuration, not application data:

| Field | Source | Required | Notes |
|---|---|---|---|
| `VITE_SUPABASE_URL` | `.env` (local, git-ignored) | Yes, for backend connectivity | Cloud-hosted Supabase project URL (spec Clarifications Q1). Missing/invalid → FR-005 explicit error, app still starts per FR-004. |
| `VITE_SUPABASE_ANON_KEY` | `.env` (local, git-ignored) | Yes, for backend connectivity | Public anon key for the dev project. Same missing/invalid handling as above. |

`.env.example` (committed, FR-003/FR-009) documents both keys with placeholder values and no
real secrets.

## Future domain entities (explicitly out of scope here)

Batch/lote, insumo, alerta de stock/caducidad, and usuario/atribución entities are governed by
constitution Principles IV and VI and will be defined in the data-model.md of the feature(s) that
implement inventory registration, traceability, and alerts.
