# ADR-001 — Monorepo Structure with pnpm Workspaces

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

AntiGravity consists of a frontend (React/Vite), a backend (Node.js/Express/Socket.IO), and shared TypeScript code (types, validation schemas, utilities). These components must share types without duplication while remaining independently deployable.

## Decision

Use a pnpm monorepo with the following workspace layout:

```
apps/
  client/           # React frontend
  server/           # Node.js backend
packages/
  shared-types/     # Pure TS interfaces, zero runtime deps
  shared-schemas/   # Zod schemas, only dep is zod
  shared-utils/     # Isomorphic utility functions
```

pnpm is chosen over npm workspaces or yarn because:
- Strict, correct dependency hoisting (phantom dep prevention)
- Fastest install times via content-addressable store
- First-class workspace protocol (`workspace:*`)
- Native support for `pnpm -r` recursive scripts

## Consequences

- All three `packages/*` must be built before `apps/*` during CI
- Adding a dep to a shared package requires evaluating whether it is isomorphic
- Type drift between client and server is structurally impossible — they share the same interface definitions
