import type { Server } from 'socket.io';
import { SystemEvents } from '@antigravity/shared-types';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';
import { createSocketAuthMiddleware } from '../middleware/socketAuth.js';
import { createSdpSizeLimitMiddleware } from '../middleware/sdpSizeLimit.js';
import { createEnvelopeValidatorMiddleware } from '../middleware/envelopeValidator.js';
import { createSignalingPayloadValidatorMiddleware } from '../middleware/signalingValidator.js';

/**
 * Initializes the `/signaling` Socket.IO namespace.
 *
 * Scope: WebRTC SDP offer, SDP answer, ICE candidates only.
 *
 * Middleware stack:
 * Connection level (nsp.use):
 *   1. socketAuth — validates userToken in handshake.auth
 * Packet level (socket.use):
 *   2. sdpSizeLimit — 16 KB raw byte cap before parsing
 *   3. envelopeValidator — validates common envelope shape & token consistency
 *   4. signalingPayloadValidator — validates SDP / ICE payload via Zod
 */
export function setupSignalingNamespace(io: Server) {
  const nsp = io.of('/signaling');

  // Connection-level auth middleware
  nsp.use(createSocketAuthMiddleware());

  // Instantiate packet-level middleware functions
  const sdpSizeLimit = createSdpSizeLimitMiddleware();
  const envelopeValidator = createEnvelopeValidatorMiddleware();
  const signalingPayloadValidator = createSignalingPayloadValidatorMiddleware();

  nsp.on('connection', (socket) => {
    const data = socket.data as ServerSocketData;
    logger.info(
      {
        socketId: socket.id,
        token: truncateToken(data.userToken),
      },
      'Client connected to /signaling namespace',
    );

    // Attach socket reference to event array for error emission inside packet middlewares
    socket.use((event, next) => {
      (event as unknown as { socket: typeof socket }).socket = socket;
      next();
    });

    // Register packet-level middlewares for this socket
    socket.use(sdpSizeLimit);
    socket.use(envelopeValidator);
    socket.use(signalingPayloadValidator);

    // Socket error handler for middleware rejections
    socket.on('error', (err: Error & { code?: string }) => {
      logger.warn({ socketId: socket.id, err: err.message, code: err.code }, 'Signaling socket error');
      socket.emit(SystemEvents.SERVER_ERROR, {
        code: err.code ?? 'ERR_SIGNALING_ERROR',
        message: err.message,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from /signaling namespace');
    });
  });

  logger.info('Namespace /signaling initialized');
  return nsp;
}
