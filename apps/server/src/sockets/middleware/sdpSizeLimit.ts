import type { Event } from 'socket.io';
import { ServerErrors, SystemEvents } from '@antigravity/shared-types';
import { logger } from '../../logger.js';

/** Hard limit of 16 KB (16,384 bytes) for SDP/ICE payload size */
const MAX_SDP_BYTES = 16 * 1024;

/**
 * Socket.IO packet-level middleware for /signaling namespace.
 *
 * Runs BEFORE Zod parsing.
 * Calculates approximate byte size of incoming packet arguments.
 * Rejects with ERR_PAYLOAD_TOO_LARGE if size exceeds 16 KB.
 *
 * Architecture (Architecture Review Finding 2.4):
 * Memory exhaustion defence: oversized SDP offers are rejected at raw byte inspection
 * level before any parsing or memory allocation takes place.
 */
export function createSdpSizeLimitMiddleware() {
  return (event: Event, next: (err?: Error) => void): void => {
    try {
      // Approximate payload byte size by JSON stringifying the arguments array
      const rawString = JSON.stringify(event);
      const byteSize = Buffer.byteLength(rawString, 'utf8');

      if (byteSize > MAX_SDP_BYTES) {
        const eventName = event[0] as string;
        logger.warn(
          {
            eventName,
            byteSize,
            maxAllowed: MAX_SDP_BYTES,
          },
          'Signaling payload rejected: byte size exceeds limit',
        );

        const socket = (event as unknown as { socket?: { emit: (event: string, payload: unknown) => void } }).socket;
        if (socket) {
          socket.emit(SystemEvents.SERVER_ERROR, {
            code: ServerErrors.PAYLOAD_TOO_LARGE,
            message: `Payload size (${byteSize} bytes) exceeds maximum permitted limit (${MAX_SDP_BYTES} bytes)`,
          });
        }

        const err = new Error('Payload size exceeds 16KB limit');
        (err as NodeJS.ErrnoException).code = ServerErrors.PAYLOAD_TOO_LARGE;
        next(err);
        return;
      }
    } catch {
      // If serialization fails, allow next middleware to catch malformed structure
    }

    next();
  };
}
