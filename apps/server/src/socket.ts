import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { config } from './config.js';
import { logger } from './logger.js';
import { setupSignalingNamespace } from './sockets/namespaces/signaling.js';
import { setupPresenceNamespace } from './sockets/namespaces/presence.js';
import { setupChatNamespace } from './sockets/namespaces/chat.js';

/**
 * Socket.IO server initialization.
 *
 * Architecture (ADR-002):
 * Three Socket.IO namespaces, isolated structurally:
 *   - /signaling : offer, answer, ice_candidate
 *   - /presence  : join_room, leave_room, reconnect, host_end_room, etc.
 *   - /chat      : send_message, message
 *
 * Each namespace is initialized with its authentication and payload validation middleware.
 */
export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.CORS_ORIGIN,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 30000,
    pingInterval: 10000,
    maxHttpBufferSize: 1e6, // 1 MB
  });

  // Initialize isolated namespaces (ADR-002)
  setupSignalingNamespace(io);
  setupPresenceNamespace(io);
  setupChatNamespace(io);

  logger.info('Socket.IO server initialized with isolated namespaces (/signaling, /presence, /chat)');
  return io;
}
