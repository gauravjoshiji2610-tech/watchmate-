# ADR-007 — Chat History: No History for MVP (Option A)

**Date**: 2026-08-02
**Status**: Accepted
**Deciders**: Lead Engineer

---

## Context

The architecture review identified that chat history strategy was unspecified. When a user joins mid-session, what do they see?

## Decision

**Option A: No history.** Users joining mid-session see no prior messages.

A UI notice is shown on join: *"Chat history is not available. You'll see messages from the moment you join."*

## Why Option A Over Option B

Option B (last N messages in Redis as a list) adds:
- Redis list management (`RPUSH`, `LTRIM`, `LRANGE`)
- A new event type on join (`CHAT_HISTORY_REPLAY`)
- Edge cases: what if the user rejoins? Do they see duplicate messages?

The UX delta for a 1:1 screen sharing session is minimal — both participants are typically present from the start.

## Future Path

If history is added post-MVP:
- Store last 10 messages per room as Redis list: `RPUSH chat:{roomId} <message> EX 7200`
- Trim to 10 entries: `LTRIM chat:{roomId} -10 -1`
- Emit `CHAT_HISTORY_REPLAY` on join with the list contents

## Consequences

- No Redis storage needed for chat in MVP (messages are ephemeral)
- Client must display the join notice
- This decision is final for MVP — do not add Redis chat storage without a full phase for it
