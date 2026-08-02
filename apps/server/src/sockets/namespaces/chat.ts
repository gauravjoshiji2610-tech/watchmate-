import type { Server } from 'socket.io';
import { SystemEvents } from '@antigravity/shared-types';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';
import { createSocketAuthMiddleware } from '../middleware/socketAuth.js';
import { createEnvelopeValidatorMiddleware } from '../middleware/envelopeValidator.js';

/**
 * Initializes the `/chat` Socket.IO namespace.
 *
 * Scope: Chat messages only.
 *
 * Middleware stack:
 * Connection level (nsp.use):
 *   1. socketAuth — validates userToken in handshake.auth
 * Packet level (socket.use):
 *   2. envelopeValidator — validates common envelope shape & token consistency
 *   (Rate limiting per userToken will be attached in Phase 6)
 */
export function setupChatNamespace(io: Server) {
  const nsp = io.of('/chat');

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
      'Client connected to /chat namespace',
    );

    // Attach socket reference to event array for error emission inside packet middlewares
    socket.use((event, next) => {
      (event as unknown as { socket: typeof socket }).socket = socket;
      next();
    });

    // Register packet-level middleware for this socket
    socket.use(envelopeValidator);

    socket.on('error', (err: Error & { code?: string }) => {
      logger.warn({ socketId: socket.id, err: err.message, code: err.code }, 'Chat socket error');
      socket.emit(SystemEvents.SERVER_ERROR, {
        code: err.code ?? 'ERR_CHAT_ERROR',
        message: err.message,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from /chat namespace');
    });
  });

  logger.info('Namespace /chat initialized');
  return nsp;
}
