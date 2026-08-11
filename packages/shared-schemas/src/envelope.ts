import { z } from 'zod';

/**
 * Zod schema for the common EventEnvelope.
 *
 * Validates:
 * - Structure (all required fields present)
 * - Types (string, number, etc.)
 * - Basic size bounds (eventId, userToken, roomId max length)
 *
 * Does NOT validate:
 * - That userToken matches the authenticated socket (that is done in
 *   envelopeValidator middleware by comparing against socket.data.userToken)
 * - The payload contents (done per-event in Phase 4/5/6/8 handlers)
 *
 * Keep in sync with: packages/shared-types/src/envelope.ts
 */
export const eventEnvelopeSchema = z.object({
  /** nanoid is 21 chars by default; allow up to 50 for future flexibility */
  eventId: z
    .string()
    .min(1, 'eventId must not be empty')
    .max(50, 'eventId exceeds maximum length'),

  /** Unix ms — must be a positive integer, reasonably close to now */
  timestamp: z
    .number()
    .int('timestamp must be an integer')
    .positive('timestamp must be positive'),

  /** userToken: nanoid 21 chars, allow up to 50 */
  userToken: z
    .string()
    .min(1, 'userToken must not be empty')
    .max(50, 'userToken exceeds maximum length'),

  /** roomId: nanoid, same bounds */
  roomId: z
    .string()
    .min(1, 'roomId must not be empty')
    .max(50, 'roomId exceeds maximum length'),

  /** payload: validated per-event by namespace-specific schemas */
  payload: z.unknown(),
});

export type EventEnvelopeInput = z.input<typeof eventEnvelopeSchema>;
export type EventEnvelopeParsed = z.output<typeof eventEnvelopeSchema>;
