import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { logger } from './logger.js';
import { truncateToken } from './logger.js';

/**
 * Socket.IO server instance — bootstrap only.
 *
 * Phase 2: Initializes the Socket.IO server, logs connections/disconnections.
 *          No namespaces, no room logic, no event handlers.
 *
 * Phase 3: Three namespaces (/signaling, /presence, /chat) are added here.
 *          Auth middleware is applied per namespace.
 *          SDP payload size limit middleware is applied to /signaling.
 *
 * Architecture (ADR-002): Three namespaces — signaling, presence, chat.
 * Architecture (ADR-003): Auth validates userToken from socket.handshake.auth.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
    },
    // Transports: WebSocket first, polling fallback
    transports: ['websocket', 'polling'],
    // Ping/pong to detect dead connections
    pingTimeout: 30000,
    pingInterval: 10000,
    // Limits on per-message size (defence in depth alongside SDP middleware in Phase 3)
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // ── Root namespace — bootstrap logging only ─────────────────────────────────
  // Phase 3 will replace this with specific namespace handlers.
  io.on('connection', (socket) => {
    const userToken = (socket.handshake.auth as { userToken?: string }).userToken ?? 'unknown';

    logger.info(
      {
        socketId: socket.id,
        token: userToken !== 'unknown' ? truncateToken(userToken) : 'none',
        transport: socket.conn.transport.name,
      },
      'Socket connected (root namespace — Phase 3 will move this to namespaces)',
    );

    socket.on('disconnect', (reason) => {
      logger.info(
        {
          socketId: socket.id,
          reason,
        },
        'Socket disconnected',
      );
    });
  });

  logger.info('Socket.IO server initialized');
  return io;
}
