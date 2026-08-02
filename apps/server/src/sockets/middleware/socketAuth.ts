import type { Socket } from 'socket.io';
import { ServerErrors } from '@antigravity/shared-types';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';

/**
 * Socket.IO connection-level authentication middleware.
 *
 * Applied at the namespace level: namespace.use(createSocketAuthMiddleware())
 * Runs ONCE per connection attempt, before the 'connection' event fires.
 *
 * Validates:
 *   - userToken is present in socket.handshake.auth
 *   - userToken is a non-empty string
 *   - Stores validated token on socket.data for all subsequent event handlers
 *
 * Rejects with ERR_AUTH_FAILED if validation fails.
 * Client receives a 'connect_error' event with the error.
 *
 * Phase 5 will extend this to check Redis for token-room binding.
 *
 * Architecture (ADR-003):
 * Rate limiting is per-userToken (not per-socket). This middleware extracts
 * the token so rate limiters in Phase 6 can reference socket.data.userToken.
 */
export function createSocketAuthMiddleware() {
  return (socket: Socket, next: (err?: Error) => void): void => {
    const auth = socket.handshake.auth as Record<string, unknown>;
    const rawToken = auth['userToken'];

    if (typeof rawToken !== 'string' || rawToken.trim().length === 0) {
      logger.warn(
        {
          socketId: socket.id,
          namespace: socket.nsp.name,
          ip: socket.handshake.address,
          hasToken: rawToken !== undefined,
        },
        'Socket auth failed: missing or invalid userToken',
      );

      const err = new Error('Authentication required: provide a valid userToken in handshake.auth');
      (err as NodeJS.ErrnoException).code = ServerErrors.AUTH_FAILED;
      next(err);
      return;
    }

    const userToken = rawToken.trim();

    // Store on socket.data — accessible by all event handlers and middlewares
    (socket.data as ServerSocketData).userToken = userToken;

    logger.debug(
      {
        socketId: socket.id,
        namespace: socket.nsp.name,
        token: truncateToken(userToken),
      },
      'Socket auth passed',
    );

    next();
  };
}
