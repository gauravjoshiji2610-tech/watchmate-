/**
 * Common event envelope — wraps every Socket.IO event on every namespace.
 *
 * Architecture (CONVENTIONS.md — event envelope section):
 * Every event emitted by the client on any namespace must use this shape.
 * No event bypasses the envelope. The server validates the envelope via Zod
 * before any event handler runs.
 *
 * Fields:
 * - eventId    nanoid — enables server-side deduplication on retry
 * - timestamp  client-side Unix ms — used for latency tracking/logging
 * - userToken  must match the token presented at connection (socket.handshake.auth)
 * - roomId     the room this event belongs to
 * - payload    namespace + event-specific data, validated by per-event Zod schemas
 *
 * SFU-agnostic note (ADR-005):
 * For signaling events, payload carries { producerId, consumerId, sdp/candidate }
 * rather than hostSocketId/viewerSocketId. This survives a P2P → SFU migration.
 */
export interface EventEnvelope<TPayload = unknown> {
  /** nanoid — used for deduplication when client retries on reconnect */
  readonly eventId: string;
  /** Client-side Unix milliseconds timestamp */
  readonly timestamp: number;
  /** Stable user identity token (stored in localStorage). Must match handshake token. */
  readonly userToken: string;
  /** Target room ID */
  readonly roomId: string;
  /** Event-specific payload — validated per namespace + event name in Phase 4/5/6/8 */
  readonly payload: TPayload;
}

/**
 * Server error response shape — emitted on the 'server_error' system event.
 */
export interface ServerErrorPayload {
  readonly code: string;
  readonly message: string;
}
