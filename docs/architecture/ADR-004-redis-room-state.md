# ADR-004 — Redis-Backed Room State with Explicit TTL

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

Room state (participants, roles, metadata) must survive server restarts. Pure in-memory state would create ghost rooms on crash — participants stuck in rooms that no longer exist on the server.

## Decision

All room state is stored in Redis. Not in-memory. Not in a database.

### TTL Strategy (Critical)

Every Redis room key has an explicit TTL of 7200 seconds (2 hours):

```
SET room:{roomId} <json> EX 7200
```

On every meaningful room event (join, heartbeat, message), the TTL is refreshed:
```
EXPIRE room:{roomId} 7200
```

**Why TTL is mandatory**: If the server crashes mid-session, `onDisconnect` never fires, the room key is never deleted by application logic, and the room slot is permanently consumed. Without TTL, `MAX_ACTIVE_ROOMS` fills with phantom rooms after the first crash. With TTL, phantom rooms self-clean within 2 hours.

### Room Deletion

Primary deletion path: application logic deletes the room key when the last participant leaves.
Fallback deletion path: Redis TTL expiry (safety net for crash scenarios).

### Room Limit

`MAX_ACTIVE_ROOMS` (default: 5) is configured via environment variable. Enforcement: before creating a new room, count keys matching `room:*` pattern. If at limit, reject with `ERR_ROOM_LIMIT_REACHED`.

### Room ID Collision

Room IDs are generated with nanoid. Before committing a new room ID, the server checks for key existence in Redis. On collision (astronomically rare), a new ID is generated. Max 3 attempts, then 503.

## Consequences

- Redis is a required dependency for server startup — not optional
- Server startup must check Redis connectivity before accepting connections
- Health endpoint must verify Redis `PING` before returning `status: ok`
- Room state serialized as JSON in Redis — must be deserialized on every access
