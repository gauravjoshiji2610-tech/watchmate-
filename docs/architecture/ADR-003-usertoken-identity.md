# ADR-003 — userToken for User Identity (Not socket.id)

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

WebRTC signaling and room membership must survive socket disconnections. Browser mobile networks, tab background-throttling, and network switching cause frequent socket drops. Identifying users by `socket.id` means every disconnect creates a new identity.

## Decision

Every user is assigned a `userToken` (nanoid, 21 chars) on first visit, stored in `localStorage`. This token is the stable identity across all socket connections.

### Token Binding (Security Boundary)

On first join, the server binds the token:
```
Redis: SET userToken:{token} → { roomId, displayName, role } EX 7200
```

A token cannot be used to join a **different** room than it was originally bound to. Attempting to do so is rejected with `ERR_TOKEN_ROOM_MISMATCH`. This is the minimum security enforcement that breaks the most dangerous attack vector (token theft leading to room impersonation).

### Accepted MVP Risk

- Token has no expiry/rotation in MVP
- Anyone who can read `localStorage` (e.g., via XSS) can steal the token
- This risk is accepted and documented — mitigating it requires a proper auth system, which is a post-MVP scope item

### Rate Limiting Scope

Rate limiting is per-userToken, not per-socket. A new socket on reconnect would bypass a socket-scoped limiter. Token-scoped limiting survives reconnects.

## Consequences

- Rate limiting middleware must extract `userToken` from `socket.handshake.auth`, not from `socket.id`
- All server-side user lookups use `userToken`, never `socket.id`
- `socket.id` is used only for direct socket addressing (e.g., `io.to(socketId).emit(...)`)
- 20-second reconnect grace period uses a Redis distributed lock on the host slot to prevent dual-host race conditions
