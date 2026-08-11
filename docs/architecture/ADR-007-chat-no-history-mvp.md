# ADR-007 — Chat History: Last 50 Messages Buffer in Redis

**Date**: 2026-08-02
**Status**: Superseded / Updated in Phase 6
**Deciders**: Lead Engineer

---

## Context

During initial architecture planning, chat history was proposed to be omitted for MVP simplicity. However, during Phase 6 engineering, chat history replay was refined to provide better user experience for participants joining or reconnecting mid-session.

## Decision

**Store the last 50 chat messages per room in Redis.**

Implement a lightweight, auto-cleaning history buffer in Redis:
- Storage Key: `chat:history:{roomId}`
- Append message: `RPUSH chat:history:{roomId} <chatMessageJson>`
- Buffer cap: `LTRIM chat:history:{roomId} -50 -1`
- Expiry TTL: `EX 7200` (refreshed on every message)

## Event Protocol Integration

When a user connects or joins a room channel on the `/chat` namespace, the server automatically responds with:
- Event: `chat:history` (`ChatEvents.HISTORY`)
- Payload: `{ roomId: string, messages: ChatMessage[] }`

## Cleanup Strategy

Chat history is automatically cleaned up:
1. Primary path: `deleteChatHistory(roomId)` is invoked by `RoomService` when the room is ended or becomes empty (`leaveRoom` / `endRoom`).
2. Fallback path: Redis key TTL (`EX 7200`) ensures phantom room chat history self-cleans if the server crashes.

## Consequences

- Participants joining or reconnecting mid-session see the full recent context (up to 50 messages).
- Storage footprint is bounded to ~25 KB max per active room in Redis.
- Zero leftover keys after room lifecycle completes.
