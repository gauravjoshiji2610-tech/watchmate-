import type { Event } from 'socket.io';
import { sdpPayloadSchema, iceCandidatePayloadSchema } from '@antigravity/shared-schemas';
import { SignalingEvents, ServerErrors } from '@antigravity/shared-types';
import { logger } from '../../logger.js';

/**
 * Socket.IO packet-level middleware for payload validation on the /signaling namespace.
 *
 * Validates:
 * - 'offer' and 'answer' events against `sdpPayloadSchema`
 * - 'ice_candidate' events against `iceCandidatePayloadSchema`
 */
export function createSignalingPayloadValidatorMiddleware() {
  return (event: Event, next: (err?: Error) => void): void => {
    const [eventName, rawEnvelope] = event;

    if (
      eventName !== SignalingEvents.OFFER &&
      eventName !== SignalingEvents.ANSWER &&
      eventName !== SignalingEvents.ICE_CANDIDATE
    ) {
      next();
      return;
    }

    const payload = (rawEnvelope as { payload?: unknown })?.payload;

    if (eventName === SignalingEvents.OFFER || eventName === SignalingEvents.ANSWER) {
      const parseResult = sdpPayloadSchema.safeParse(payload);
      if (!parseResult.success) {
        const issues = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        logger.warn({ eventName, issues }, 'Signaling SDP payload validation failed');

        const err = new Error(`Invalid SDP payload: ${issues}`);
        (err as NodeJS.ErrnoException).code = ServerErrors.INVALID_PAYLOAD;
        next(err);
        return;
      }
    } else if (eventName === SignalingEvents.ICE_CANDIDATE) {
      const parseResult = iceCandidatePayloadSchema.safeParse(payload);
      if (!parseResult.success) {
        const issues = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
        logger.warn({ eventName, issues }, 'Signaling ICE payload validation failed');

        const err = new Error(`Invalid ICE candidate payload: ${issues}`);
        (err as NodeJS.ErrnoException).code = ServerErrors.INVALID_PAYLOAD;
        next(err);
        return;
      }
    }

    next();
  };
}
