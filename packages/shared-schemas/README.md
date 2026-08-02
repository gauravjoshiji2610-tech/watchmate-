# @antigravity/shared-schemas

Zod validation schemas for all WebSocket event payloads, REST API inputs, and SDP/ICE messages.

## Dependency Policy

| Category | Policy |
|---|---|
| **Runtime dependencies** | ✅ `zod` ONLY. No other runtime dep is allowed. |
| **Dev dependencies** | ✅ Allowed (TypeScript, build tooling) |
| **@antigravity/shared-types** | ✅ Allowed as a dev dep for type inference |

**Why Zod only**: Schemas are imported by both client and server. Every additional runtime dep increases the browser bundle. If Zod cannot express a validation rule natively, write it as a `.refine()` call — do not pull in another library.

## Validation Scope

Schemas in this package validate:

1. **Shape** — correct field names and types
2. **Role authorization** — the sender of this event is allowed to send it (e.g., only host can send `END_ROOM`)
3. **Size limits** — SDP payloads capped at 16 KB before Zod parsing runs (middleware layer)

## Consumers

- `apps/server` — validates all incoming WebSocket events before processing
- `apps/client` — validates outgoing events before emission (defense in depth)

## Forbidden

- Any runtime dependency other than `zod`
- Business logic (use `apps/server` for that)
- Database queries or side effects
