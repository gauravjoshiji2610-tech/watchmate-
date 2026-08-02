import type { Event } from 'socket.io';
import { eventEnvelopeSchema } from '@antigravity/shared-schemas';
import { ServerErrors, SystemEvents } from '@antigravity/shared-types';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';

/**
 * Socket.IO packet-level middleware to validate the common EventEnvelope.
 *
 * Runs for every incoming socket event across all namespaces.
 *
 * Validates:
 * 1. Payload structure matches `eventEnvelopeSchema` (eventId, timestamp, userToken, roomId, payload).
 * 2. `envelope.userToken` strictly matches `socket.data.userToken` established during handshake auth.
 *
 * Emits `server_error` event to client and rejects if invalid.
 */
export function createEnvelopeValidatorMiddleware() {
  return (event: Event, next: (err?: Error) => void): void => {
    const [eventName, rawEnvelope] = event;

    // Skip internal Socket.IO events or system events if any
    if (typeof eventName !== 'string' || eventName.startsWith('socket.')) {
      next();
      return;
    }

    const parseResult = eventEnvelopeSchema.safeParse(rawEnvelope);

    if (!parseResult.success) {
      const issues = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
      logger.warn(
        {
          eventName,
          issues,
        },
        'Event envelope validation failed',
      );

      const err = new Error(`Invalid event envelope: ${issues}`);
      (err as NodeJS.ErrnoException).code = ServerErrors.INVALID_PAYLOAD;
      next(err);
      return;
    }

    const envelope = parseResult.data;
    const socketData = (event as unknown as { socket: { data: ServerSocketData } }).socket.data;

    // Token consistency check: event envelope userToken MUST match connection handshake userToken
    if (socketData.userToken && envelope.userToken !== socketData.userToken) {
      logger.warn(
        {
          eventName,
          envelopeToken: truncateToken(envelope.userToken),
          socketToken: truncateToken(socketData.userToken),
        },
        'Event envelope userToken mismatch with socket authentication',
      );

      const err = new Error('Unauthorized: event userToken does not match connection identity');
      (err as NodeJS.ErrnoException).code = ServerErrors.UNAUTHORIZED;
      next(err);
      return;
    }

    next();
  };
}
