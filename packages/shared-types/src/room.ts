/**
 * Room and Participant data models.
 *
 * Shared between client and server. Zero runtime dependencies.
 */

export type Role = 'host' | 'viewer';

export interface Participant {
  /** Stable user identity token (nanoid) */
  readonly userToken: string;
  /** Display name entered by user */
  readonly displayName: string;
  /** Role in the room: 'host' (screen sharer) or 'viewer' */
  readonly role: Role;
  /** Unix timestamp (ms) when participant joined */
  readonly joinedAt: number;
}

export interface Room {
  /** Unique room identifier (nanoid) */
  readonly roomId: string;
  /** userToken of the host who created the room */
  readonly hostToken: string;
  /** List of current active participants (max 2 for 1-to-1 MVP) */
  readonly participants: readonly Participant[];
  /** Unix timestamp (ms) when room was created */
  readonly createdAt: number;
  /** Unix timestamp (ms) of last activity/update */
  readonly updatedAt: number;
}

/**
 * Token binding payload stored in Redis for security validation (ADR-003).
 */
export interface UserTokenBinding {
  readonly userToken: string;
  readonly roomId: string;
  readonly displayName: string;
  readonly role: Role;
}
