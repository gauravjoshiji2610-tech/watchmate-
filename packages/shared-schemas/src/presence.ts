import { z } from 'zod';

/**
 * Zod schemas for presence events.
 *
 * Used to validate the inner `payload` of presence EventEnvelopes.
 */

// ── JOIN_ROOM ─────────────────────────────────────────────────────────────────

export const joinRoomPayloadSchema = z.object({
  /** Participant's display name */
  displayName: z
    .string()
    .min(1, 'Display name must not be empty')
    .max(30, 'Display name must not exceed 30 characters')
    .trim(),

  /**
   * Room ID to join.
   * If undefined or empty string, server treats request as "Create New Room".
   */
  roomId: z.string().max(50).optional(),
});

export type JoinRoomPayload = z.infer<typeof joinRoomPayloadSchema>;

// ── LEAVE_ROOM ────────────────────────────────────────────────────────────────

export const leaveRoomPayloadSchema = z.object({
  roomId: z.string().min(1, 'roomId must not be empty').max(50),
});

export type LeaveRoomPayload = z.infer<typeof leaveRoomPayloadSchema>;

// ── HOST_END_ROOM ─────────────────────────────────────────────────────────────

export const hostEndRoomPayloadSchema = z.object({
  roomId: z.string().min(1, 'roomId must not be empty').max(50),
});

export type HostEndRoomPayload = z.infer<typeof hostEndRoomPayloadSchema>;

// ── RECONNECT ─────────────────────────────────────────────────────────────────

export const reconnectPayloadSchema = z.object({
  roomId: z.string().min(1, 'roomId must not be empty').max(50),
});

export type ReconnectPayload = z.infer<typeof reconnectPayloadSchema>;
