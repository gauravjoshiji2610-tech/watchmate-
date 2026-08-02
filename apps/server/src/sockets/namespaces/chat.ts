import type { Server } from 'socket.io';
import { ChatEvents, SystemEvents, type EventEnvelope } from '@antigravity/shared-types';
import { sendMessagePayloadSchema, type SendMessagePayload } from '@antigravity/shared-schemas';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';
import { createSocketAuthMiddleware } from '../middleware/socketAuth.js';
import { createEnvelopeValidatorMiddleware } from '../middleware/envelopeValidator.js';
import { registerUserSocket, unregisterUserSocket } from '../../services/reconnectService.js';
import { processSendMessage, getChatHistory } from '../../services/chatService.js';

/**
 * Initializes the `/chat` Socket.IO namespace.
 *
 * Scope: Room-scoped chat messaging, rate limiting, Zod validation, history.
 *
 * Handlers:
 *   - 'join_room' / channel join: Subscribes socket to room channel, emits 'chat:history' (last 50 messages)
 *   - 'chat:send': Validates message, checks rate limit, applies server displayName, stores history, broadcasts 'chat:message'
 */
export function setupChatNamespace(io: Server) {
  const nsp = io.of('/chat');

  // Connection-level auth middleware
  nsp.use(createSocketAuthMiddleware());

  // Instantiate packet-level middleware
  const envelopeValidator = createEnvelopeValidatorMiddleware();

  nsp.on('connection', (socket) => {
    const data = socket.data as ServerSocketData;
    const userToken = data.userToken;

    // Register active user socket & evict older duplicate sessions
    registerUserSocket(userToken, '/chat', socket);

    logger.info(
      {
        socketId: socket.id,
        token: truncateToken(userToken),
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

    // ── Channel Join Handler (room-scoped subscription & history replay) ──────
    socket.on('join_room', async (envelope: EventEnvelope<{ roomId: string }>) => {
      try {
        const roomId = envelope.payload?.roomId ?? envelope.roomId;
        if (!roomId) return;

        await socket.join(roomId);

        // Fetch last 50 messages for room from ChatService
        const history = await getChatHistory(roomId);
        socket.emit(ChatEvents.HISTORY, { roomId, messages: history });
      } catch (err: unknown) {
        const error = err as Error;
        logger.warn({ socketId: socket.id, err: error.message }, 'Chat channel join failed');
      }
    });

    // ── SEND_MESSAGE Handler ('chat:send') ─────────────────────────────────────
    socket.on(ChatEvents.SEND_MESSAGE, async (envelope: EventEnvelope<SendMessagePayload>) => {
      try {
        const payloadResult = sendMessagePayloadSchema.safeParse(envelope.payload);

        if (!payloadResult.success) {
          const msg = payloadResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          logger.warn({ socketId: socket.id, issues: msg }, 'Chat message Zod validation failed');
          socket.emit(ChatEvents.ERROR, {
            code: 'ERR_INVALID_PAYLOAD',
            message: msg,
          });
          return;
        }

        const { messageId, roomId, message: rawMessage } = payloadResult.data;

        // Auto-join socket to room channel if not already joined
        if (!socket.rooms.has(roomId)) {
          await socket.join(roomId);
          // Send history snapshot on first interaction
          const history = await getChatHistory(roomId);
          socket.emit(ChatEvents.HISTORY, { roomId, messages: history });
        }

        // Process message via ChatService
        const chatMessage = await processSendMessage(
          envelope.userToken,
          roomId,
          messageId,
          rawMessage,
        );

        // Broadcast verified ChatMessage to all clients in the room
        nsp.in(roomId).emit(ChatEvents.MESSAGE, chatMessage);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        logger.warn(
          {
            socketId: socket.id,
            err: error.message,
            code: error.code,
          },
          'Chat message send failed',
        );

        // Return structured error payload on 'chat:error' event
        socket.emit(ChatEvents.ERROR, {
          code: error.code ?? 'ERR_CHAT_SEND_FAILED',
          message: error.message,
        });
      }
    });

    socket.on('error', (err: Error & { code?: string }) => {
      logger.warn({ socketId: socket.id, err: err.message, code: err.code }, 'Chat socket error');
      socket.emit(ChatEvents.ERROR, {
        code: err.code ?? 'ERR_CHAT_ERROR',
        message: err.message,
      });
    });

    socket.on('disconnect', (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from /chat namespace');
      unregisterUserSocket(userToken, '/chat', socket.id);
    });
  });

  logger.info('Namespace /chat initialized with ChatService handlers');
  return nsp;
}
