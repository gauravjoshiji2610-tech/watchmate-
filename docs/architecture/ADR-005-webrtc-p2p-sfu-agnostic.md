# ADR-005 — WebRTC P2P for MVP (SFU-Agnostic Event Schema)

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

1-to-1 screen sharing is the MVP scope. WebRTC P2P is sufficient for 1:1. However, adding a third participant later requires an SFU (Selective Forwarding Unit — e.g., Mediasoup, LiveKit). Designing the signaling protocol as "peer A sends to peer B" hardcodes P2P semantics and forces a protocol rewrite when moving to SFU.

## Decision

Use WebRTC P2P for MVP. Design the signaling event schema with abstract `producerId`/`consumerId` semantics — not `hostSocketId` / `viewerSocketId`.

```typescript
// ❌ P2P-hardcoded (avoid)
{ from: hostSocketId, to: viewerSocketId, sdp: ... }

// ✅ SFU-agnostic (use this)
{ producerId: userToken, consumerId: userToken, sdp: ... }
```

When moving to SFU, the backend routing logic changes but the event schema does not.

### TURN

TURN is required, not optional. Users behind symmetric NAT (~15% of internet traffic) cannot establish a direct P2P connection without relay. Self-hosted coturn or Metered/Twilio free tier are both acceptable for MVP.

### Quality Tiers

Fixed tiers only in MVP: 480p, 720p, 1080p (best-effort). Implemented via `getDisplayMedia` video constraints. Quality change triggers `RTCRtpSender.replaceTrack()` — no full renegotiation required.

### Known Browser Behaviors (Documented, Not Worked Around)

- Firefox: changing quality issues a second OS-level screen picker dialog. This is browser behavior, not a bug. UI copy should inform the user.
- iOS Safari: `getDisplayMedia` is not available. Host mode is disabled at the UI level before the user enters the flow.

### Track Lifecycle

- Host stopping share fires `track.onended` on the sender's MediaStreamTrack
- Server must receive a presence event when this happens (`SCREEN_SHARE_ENDED`)
- Without this, viewer sees a frozen frame indefinitely

### ICE Restart

`iceConnectionState: failed` triggers an ICE restart (not a full session teardown). `iceConnectionState: disconnected` triggers a 5-second timer before attempting ICE restart.

## Future Path (Post-MVP)

When adding a third participant:
1. Introduce Mediasoup or LiveKit as SFU
2. Backend routing changes: forward to SFU instead of directly to consumer socket
3. Event schema unchanged — producerId/consumerId semantics already match SFU model
4. Frontend unchanged for MVP participants

## Consequences

- Signaling events must use `producerId`/`consumerId` as stable identifiers (userToken values)
- ICE restart logic must be implemented in Phase 8 alongside initial WebRTC setup
- `track.onended` listener is required — not optional
