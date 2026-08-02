/**
 * Chat message data model.
 *
 * Shared between client and server. Zero runtime dependencies.
 */

export interface ChatMessage {
  /** Unique message identifier (nanoid) */
  readonly messageId: string;
  /** Target room ID */
  readonly roomId: string;
  /** Sender's userToken */
  readonly userToken: string;
  /** Sender's display name (verified server-side from room state) */
  readonly displayName: string;
  /** Sanitized message text content */
  readonly message: string;
  /** Unix timestamp (ms) when message was processed */
  readonly timestamp: number;
}
