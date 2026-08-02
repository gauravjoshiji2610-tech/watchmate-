import type { Server } from 'socket.io';
import { PresenceEvents, SystemEvents, type EventEnvelope } from '@antigravity/shared-types';
import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  hostEndRoomPayloadSchema,
  type JoinRoomPayload,
  type LeaveRoomPayload,
  type HostEndRoomPayload,
} from '@antigravity/shared-schemas';
import { logger, truncateToken } from '../../logger.js';
import type { ServerSocketData } from '../../types/socket.js';
import { createSocketAuthMiddleware } from '../middleware/socketAuth.js';
import { createEnvelopeValidatorMiddleware } from '../middleware/envelopeValidator.js';
import {
  createRoom,
  joinRoom,
  leaveRoom,
  endRoom,
} from '../../services/roomService.js';

/**
 * Initializes the `/presence` Socket.IO namespace.
 *
 * Handles room lifecycle events:
 *   - JOIN_ROOM: create or join a room (1-to-1 cap enforced)
 *   - LEAVE_ROOM: leave room (auto-deletes room if empty)
 *   - HOST_END_ROOM: host closes room for all participants
 */
export function setupPresenceNamespace(io: Server) {
  const nsp = io.of('/presence');

  // Connection-level auth
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

    // ── JOIN_ROOM Handler ──────────────────────────────────────────────────────
    socket.on(PresenceEvents.JOIN_ROOM, async (envelope: EventEnvelope<JoinRoomPayload>) => {
      try {
        const payloadResult = joinRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) {
          const msg = payloadResult.error.errors.map((e) => e.message).join(', ');
          socket.emit(SystemEvents.SERVER_ERROR, { code: 'ERR_INVALID_PAYLOAD', message: msg });
          return;
        }

        const { displayName, roomId } = payloadResult.data;
        const userToken = envelope.userToken;

        let room;
        if (roomId && roomId.trim().length > 0) {
          // Join existing room
          room = await joinRoom(roomId.trim(), userToken, displayName);
        } else {
          // Create new room
          room = await createRoom(userToken, displayName);
        }

        // Join Socket.IO room channel
        await socket.join(room.roomId);

        // Emit room state snapshot to joining socket
        socket.emit(PresenceEvents.ROOM_STATE, room);

        // Broadcast to other participants in the room
        socket.to(room.roomId).emit(PresenceEvents.USER_JOINED, {
          userToken,
          displayName,
          role: room.participants.find((p) => p.userToken === userToken)?.role ?? 'viewer',
        });
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        logger.warn({ socketId: socket.id, err: error.message }, 'JOIN_ROOM failed');
        socket.emit(SystemEvents.SERVER_ERROR, {
          code: error.code ?? 'ERR_JOIN_FAILED',
          message: error.message,
        });
      }
    });

    // ── LEAVE_ROOM Handler ─────────────────────────────────────────────────────
    socket.on(PresenceEvents.LEAVE_ROOM, async (envelope: EventEnvelope<LeaveRoomPayload>) => {
      try {
        const payloadResult = leaveRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) {
          return;
        }

        const { roomId } = payloadResult.data;
        const userToken = envelope.userToken;

        const { room } = await leaveRoom(roomId, userToken);
        await socket.leave(roomId);

        if (room) {
          socket.to(roomId).emit(PresenceEvents.USER_LEFT, { userToken });
        }
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        logger.warn({ socketId: socket.id, err: error.message }, 'LEAVE_ROOM failed');
      }
    });

    // ── HOST_END_ROOM Handler ──────────────────────────────────────────────────
    socket.on(PresenceEvents.HOST_END_ROOM, async (envelope: EventEnvelope<HostEndRoomPayload>) => {
      try {
        const payloadResult = hostEndRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) {
          return;
        }

        const { roomId } = payloadResult.data;
        const hostToken = envelope.userToken;

        await endRoom(roomId, hostToken);

        // Broadcast room closed to all clients in the room
        nsp.in(roomId).emit(PresenceEvents.ROOM_CLOSED, { roomId, reason: 'host_ended' });

        // Force all sockets to leave the Socket.IO room channel
        nsp.in(roomId).socketsLeave(roomId);
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        logger.warn({ socketId: socket.id, err: error.message }, 'HOST_END_ROOM failed');
        socket.emit(SystemEvents.SERVER_ERROR, {
          code: error.code ?? 'ERR_END_ROOM_FAILED',
          message: error.message,
        });
      }
    });

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

  logger.info('Namespace /presence initialized with RoomService handlers');
  return nsp;
}
