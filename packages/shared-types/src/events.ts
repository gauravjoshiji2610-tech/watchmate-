/**
 * Centralized event name constants for all three Socket.IO namespaces.
 *
 * Rules (CONVENTIONS.md):
 * - All Socket.IO event names must be imported from here — never hardcoded as string literals.
 * - Both client and server import these same constants to guarantee wire-format consistency.
 * - Adding a new event: add it here first, then add the Zod schema in shared-schemas.
 *
 * SFU-agnostic note (ADR-005):
 * Signaling events use producerId/consumerId semantics inside the envelope payload,
 * not hostSocketId/viewerSocketId. The event names themselves are SFU-neutral.
 */

// ── /signaling namespace ──────────────────────────────────────────────────────
// WebRTC offer/answer/ICE only. Phase 8 implements the handlers.

export const SignalingEvents = {
  /** Client → Server: WebRTC SDP offer from producer */
  OFFER: 'offer',
  /** Client → Server: WebRTC SDP answer from consumer */
  ANSWER: 'answer',
  /** Client → Server: Trickle ICE candidate from either peer */
  ICE_CANDIDATE: 'ice_candidate',
} as const;

export type SignalingEventName = (typeof SignalingEvents)[keyof typeof SignalingEvents];

// ── /presence namespace ───────────────────────────────────────────────────────
// Room lifecycle, user join/leave, reconnect, host controls. Phase 4/5 implements handlers.

export const PresenceEvents = {
  // Client → Server
  /** Client requests to join or create a room */
  JOIN_ROOM: 'join_room',
  /** Client leaves a room intentionally (also sent via beforeunload) */
  LEAVE_ROOM: 'leave_room',
  /**
   * Client attempts reconnect within the 20-second grace period.
   * Server restores role, identity, and room membership. (ADR-003)
   */
  RECONNECT: 'reconnect',
  /** Host ends the room — server-enforced, not UI-only (Architecture Review 2.3) */
  HOST_END_ROOM: 'host_end_room',
  /**
   * Host's screen share track ended (track.onended fired on sender).
   * Required — without this, viewer sees a frozen frame. (Architecture Review, missing features)
   */
  SCREEN_SHARE_ENDED: 'screen_share_ended',
  /**
   * Sent via beforeunload to distinguish intentional close from crash.
   * Prevents 20-second grace period from triggering on a deliberate tab close.
   * (Architecture Review, missing features)
   */
  LEAVE_INTENTIONAL: 'leave_intentional',

  // Server → Client
  /** Broadcast: a new user joined the room */
  USER_JOINED: 'user_joined',
  /** Broadcast: a user left the room */
  USER_LEFT: 'user_left',
  /** Broadcast: a user disconnected temporarily (reconnect grace period started) */
  USER_DISCONNECTED_TEMPORARILY: 'user_disconnected_temporarily',
  /** Broadcast: a user reconnected within grace period */
  USER_RECONNECTED: 'user_reconnected',
  /** Broadcast: host ended the room — all clients must disconnect */
  ROOM_CLOSED: 'room_closed',
  /** Unicast to reconnecting client: reconnect accepted, state restored */
  RECONNECT_ACCEPTED: 'reconnect_accepted',
  /** Unicast to reconnecting client: grace period expired, reconnect rejected */
  RECONNECT_REJECTED: 'reconnect_rejected',
  /** Unicast on join: current room state snapshot */
  ROOM_STATE: 'room_state',
} as const;

export type PresenceEventName = (typeof PresenceEvents)[keyof typeof PresenceEvents];

export const ChatEvents = {
  // Client → Server
  /** Client sends a chat message */
  SEND_MESSAGE: 'chat:send',

  // Server → Client
  /** Broadcast: a chat message from any participant */
  MESSAGE: 'chat:message',
  /** Error event on /chat namespace */
  ERROR: 'chat:error',
  /** Unicast on room join: last 50 chat messages */
  HISTORY: 'chat:history',
} as const;

export type ChatEventName = (typeof ChatEvents)[keyof typeof ChatEvents];

// ── System events (all namespaces) ────────────────────────────────────────────

export const SystemEvents = {
  /** Server → Client: structured error response when middleware or handler rejects */
  SERVER_ERROR: 'server_error',
} as const;

// ── Server error codes (CONVENTIONS.md) ──────────────────────────────────────

export const ServerErrors = {
  ROOM_NOT_FOUND: 'ERR_ROOM_NOT_FOUND',
  ROOM_FULL: 'ERR_ROOM_FULL',
  ROOM_LIMIT_REACHED: 'ERR_ROOM_LIMIT_REACHED',
  TOKEN_ROOM_MISMATCH: 'ERR_TOKEN_ROOM_MISMATCH',
  UNAUTHORIZED: 'ERR_UNAUTHORIZED',
  INVALID_PAYLOAD: 'ERR_INVALID_PAYLOAD',
  PAYLOAD_TOO_LARGE: 'ERR_PAYLOAD_TOO_LARGE',
  RECONNECT_EXPIRED: 'ERR_RECONNECT_EXPIRED',
  AUTH_FAILED: 'ERR_AUTH_FAILED',
  CHAT_RATE_LIMITED: 'ERR_CHAT_RATE_LIMITED',
  DUPLICATE_MESSAGE_ID: 'ERR_DUPLICATE_MESSAGE_ID',
} as const;

export type ServerErrorCode = (typeof ServerErrors)[keyof typeof ServerErrors];
