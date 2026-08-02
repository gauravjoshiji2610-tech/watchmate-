import type { Server } from 'socket.io';
import { SystemEvents } from '@antigravity/shared-types';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';
import { createSocketAuthMiddleware } from '../middleware/socketAuth.js';
import { createEnvelopeValidatorMiddleware } from '../middleware/envelopeValidator.js';

/**
 * Initializes the `/presence` Socket.IO namespace.
 *
 * Scope: Room lifecycle, join, leave, reconnect, host-end, screen-share-ended.
 *
 * Middleware stack:
 * Connection level (nsp.use):
 *   1. socketAuth — validates userToken in handshake.auth
 * Packet level (socket.use):
 *   2. envelopeValidator — validates common envelope shape & token consistency
 */
export function setupPresenceNamespace(io: Server) {
  const nsp = io.of('/presence');

  // Connection-level auth middleware
  nsp.use(createSocketAuthMiddleware());

  // Instantiate packet-level middleware
  const envelopeValidator = createEnvelopeValidatorMiddleware();

  nsp.on('connection', (socket) => {
    const data = socket.data as ServerSocketData;
    logger.info(
      {
        socketId: socket.id,
        token: truncateToken(data.userToken),
      },
      'Client connected to /presence namespace',
    );

    // Attach socket reference to event array for error emission inside packet middlewares
    socket.use((event, next) => {
      (event as unknown as { socket: typeof socket }).socket = socket;
      next();
    });

    // Register packet-level middleware for this socket
    socket.use(envelopeValidator);

    socket.on('error', (err: Error & { code?: string }) => {
      logger.warn({ socketId: socket.id, err: err.message, code: err.code }, 'Presence socket error');
      socket.emit(SystemEvents.SERVER_ERROR, {
        code: err.code ?? 'ERR_PRESENCE_ERROR',
        message: err.message,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from /presence namespace');
    });
  });

  logger.info('Namespace /presence initialized');
  return nsp;
}
