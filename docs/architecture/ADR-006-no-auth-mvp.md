# ADR-006 — No Authentication in MVP (Accepted Risk)

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

Implementing a full authentication system (JWT, OAuth, session management) is a significant engineering scope increase. The MVP requires only a display name for identification.

## Decision

No authentication in MVP. Users identify with a display name only.

### What Is in Scope (MVP Security)

1. **CORS restricted to frontend origin** — no cross-origin requests
2. **Rate limiting per userToken** — prevents event flooding
3. **Host permissions enforced server-side** — host role is never trusted from client
4. **Zod validation on all WebSocket events** — shape + role authorization
5. **SDP payload size limit** — 16 KB hard cap
6. **userToken bound to roomId** — token cannot be reused across rooms
7. **Namespace auth middleware** — validates userToken on every namespace connect

### What Is NOT in Scope (Accepted Risks)

| Risk | Severity | Reason Not Mitigated |
|---|---|---|
| userToken has no expiry | Medium | Token rotation requires a session store — post-MVP scope |
| XSS can steal localStorage token | Medium | Requires CSP and httpOnly cookies — post-MVP scope |
| No room password protection | Low | Private room URLs are sufficient for MVP 1:1 use case |
| No audit log | Low | Structured logging captures events but not for audit purposes |

### Post-MVP Auth Path

When auth is added:
- Replace localStorage userToken with server-issued JWT (httpOnly cookie)
- Rate limiting transitions from token-based to user-ID based
- Room permissions become tied to authenticated user ID

## Consequences

- All server-side enforcement must treat the frontend as untrusted at all times
- No feature should rely on client-reported identity being authoritative
- Security limitations must not be overstated in UI copy or documentation
