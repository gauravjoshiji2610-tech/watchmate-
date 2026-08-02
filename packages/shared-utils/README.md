# @antigravity/shared-utils

Pure utility functions shared between `apps/client` and `apps/server`.

## Dependency Policy

| Category | Policy |
|---|---|
| **Runtime dependencies** | ✅ Allowed — but MUST be isomorphic (runs in both Node.js AND browser) |
| **Node.js-only deps** | ❌ FORBIDDEN (e.g., `fs`, `path`, `crypto` — these break the browser bundle) |
| **Browser-only deps** | ❌ FORBIDDEN (e.g., anything that touches `window`, `document`, `localStorage`) |
| **React / framework deps** | ❌ FORBIDDEN |
| **Dev dependencies** | ✅ Allowed |

**Before adding any dependency**: verify it has no `window` or `process` coupling. If a utility is Node.js-only, it belongs in `apps/server/src/utils/`. If it's browser-only, it belongs in `apps/client/src/utils/`.

## Currently Allowed Runtime Deps

| Package | Reason |
|---|---|
| `nanoid` | Room ID and userToken generation — isomorphic, no Node.js/browser coupling |

## Adding a New Dep

1. Verify it is isomorphic
2. Add justification comment to this README
3. Add to `dependencies` in `package.json`

## Consumers

- `apps/client`
- `apps/server`
- `packages/shared-schemas` (if needed for schema helpers)
