# AntiGravity Project Conventions

This document defines conventions that apply to the entire project. Read this before writing any code.

---

## 1. Git Workflow

### Branch Strategy

```
main          ← production-ready, tagged releases only
 └── dev      ← integration branch, always passes typecheck + build
      └── feature/*   ← feature branches, branch from dev
      └── fix/*       ← bug fix branches, branch from dev
      └── hotfix/*    ← critical production fixes, branch from MAIN (not dev)
```

### Rules

- `main` is protected — never push directly
- Tags are applied to `main` only, after a merge from `dev`
- Tag format: `v{major}.{minor}-{description}` (e.g., `v0.1-room-service`, `v0.2-reconnect`)
- Feature branches are deleted after merge

### Commit Message Format

```
<type>(<scope>): <short description>

Types: feat | fix | chore | docs | refactor | test | perf
Scope: server | client | shared-types | shared-schemas | shared-utils | infra | docs

Examples:
feat(server): add health endpoint with Redis connectivity check
fix(client): disable host mode on iOS Safari before room entry
docs(architecture): add ADR-008 for TURN fallback monitoring
chore(infra): add pnpm workspace and base tsconfig
```

---

## 2. TypeScript Conventions

- `strict: true` — no exceptions
- `exactOptionalPropertyTypes: true` — `undefined` must be explicit
- `noUncheckedIndexedAccess: true` — array/object index access returns `T | undefined`
- No `any` — use `unknown` and narrow explicitly
- Prefer `type` over `interface` for union types; use `interface` for object shapes
- Prefer named exports over default exports (better refactoring support)

---

## 3. Package Dependency Rules

| Package | Runtime deps allowed |
|---|---|
| `shared-types` | None (zero) |
| `shared-schemas` | `zod` only |
| `shared-utils` | Isomorphic-only libs |
| `apps/server` | Node.js + framework deps |
| `apps/client` | Browser + React deps |

**Before adding any dep to a shared package**: ask "does this run in both Node.js and the browser with zero modification?" If no → it does not belong in shared packages.

---

## 4. WebSocket Event Envelope

All events on all three namespaces must use this envelope:

```typescript
{
  eventId: string;      // nanoid — for deduplication on retry
  timestamp: number;    // client-side Unix ms, for latency tracking
  userToken: string;    // always present — server validates on every event
  roomId: string;       // always present
  payload: unknown;     // namespace-specific, Zod-validated
}
```

No event skips the envelope. No exceptions.

---

## 5. Error Codes

All server-sent errors use structured error codes (never raw strings):

| Code | Meaning |
|---|---|
| `ERR_ROOM_NOT_FOUND` | Room does not exist |
| `ERR_ROOM_FULL` | Room already has 2 participants |
| `ERR_ROOM_LIMIT_REACHED` | MAX_ACTIVE_ROOMS exceeded |
| `ERR_TOKEN_ROOM_MISMATCH` | userToken is bound to a different room |
| `ERR_UNAUTHORIZED` | Action requires a role the sender does not have |
| `ERR_INVALID_PAYLOAD` | Zod validation failed |
| `ERR_PAYLOAD_TOO_LARGE` | SDP/ICE payload exceeds 16 KB |
| `ERR_RECONNECT_EXPIRED` | Reconnect attempted after 20s grace period |

---

## 6. Environment Variables

All env vars are defined in `.env.example` (committed) and loaded from `.env` (never committed). Required vars cause server startup failure if missing — no silent defaults for security-critical values.

---

## 7. Logging

Structured logging from day one (Phase 3). No `console.log` in production code. Log format:

```json
{ "level": "info", "timestamp": "...", "service": "server", "event": "room_created", "roomId": "...", "userToken": "...[truncated]" }
```

`userToken` values in logs are always truncated to 8 characters to prevent token leakage in log files.

---

## 8. File Naming

- TypeScript files: `camelCase.ts`
- React components: `PascalCase.tsx`
- Test files: `*.test.ts` or `*.spec.ts` co-located with source
- ADRs: `ADR-{number}-{kebab-description}.md`
