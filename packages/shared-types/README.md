# @antigravity/shared-types

Pure TypeScript interfaces and type definitions shared between `apps/client` and `apps/server`.

## Dependency Policy

| Category | Policy |
|---|---|
| **Runtime dependencies** | ❌ FORBIDDEN. Zero `dependencies` entries. Ever. |
| **Dev dependencies** | ✅ Allowed (`typescript`, `rimraf`, build tooling only) |
| **Peer dependencies** | ❌ Not applicable |
| **Type-only imports** | ✅ Allowed from other `@antigravity/*` packages |

**Why**: This package is imported by both the frontend (browser bundle) and the backend (Node.js). Any runtime dependency added here gets bundled into the client, increasing load time and attack surface. If you need runtime logic, it belongs in `@antigravity/shared-utils`.

## Consumers

- `apps/client` — imports room, user, and event types
- `apps/server` — imports the same types to guarantee wire-format consistency
- `packages/shared-schemas` — imports types to build Zod validators against them

## Allowed Exports

- TypeScript `interface` definitions
- TypeScript `type` aliases
- TypeScript `enum` (but prefer union types for tree-shaking)
- `const` assertions used as type-level constants

## Forbidden Exports

- Functions
- Classes with methods
- Any import from a third-party package at runtime
