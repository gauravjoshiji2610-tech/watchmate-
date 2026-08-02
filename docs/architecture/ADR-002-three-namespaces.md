# ADR-002 — Three Socket.IO Namespaces

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

The platform requires real-time communication for three distinct concerns: WebRTC signaling (latency-critical), room/user presence (moderate criticality), and chat (lower criticality). A naive implementation uses a single Socket.IO connection for all three.

## Decision

Three separate Socket.IO namespaces:

- `/signaling` — SDP offer/answer/ICE candidates only
- `/presence` — join, leave, reconnect, room lifecycle, host-end events
- `/chat` — chat messages only

## Why Not Two Namespaces

A combined presence+chat namespace was considered. Rejected because:

- Chat rate limit bugs (a common occurrence) are structurally incapable of affecting signaling if they are on different namespaces
- A stuck message queue in `/chat` cannot delay `/signaling` events
- Each namespace gets independent auth middleware, making role enforcement cleaner

## Why Not Four Namespaces

A fourth namespace for telemetry was considered as a WebSocket namespace. Rejected because:

- Telemetry does not require real-time push — a buffered `POST /api/telemetry` endpoint is sufficient and simpler
- One fewer namespace reduces connection overhead

## Consequences

- Each namespace requires its own auth middleware (validates `userToken` on `socket.handshake.auth`)
- Rate limiting is applied per-namespace: strict on `/chat`, near-unlimited on `/signaling`
- Client must maintain three concurrent Socket.IO connections (negligible overhead)
- SDP payload size limit (16 KB) enforced as middleware on `/signaling` namespace before Zod parsing
