import type { Server } from 'socket.io';
import { PresenceEvents, SystemEvents, type EventEnvelope } from '@antigravity/shared-types';
import {
  joinRoomPayloadSchema,
  leaveRoomPayloadSchema,
  hostEndRoomPayloadSchema,
  reconnectPayloadSchema,
  type JoinRoomPayload,
  type LeaveRoomPayload,
  type HostEndRoomPayload,
  type ReconnectPayload,
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
  getUserBinding,
} from '../../services/roomService.js';
import {
  registerUserSocket,
  unregisterUserSocket,
  startGraceTimer,
  cancelGraceTimer,
  attemptReconnect,
} from '../../services/reconnectService.js';

/**
 * Initializes the `/presence` Socket.IO namespace.
 *
 * Handles room lifecycle & reconnect events:
 *   - JOIN_ROOM: create or join a room (1-to-1 cap enforced)
 *   - RECONNECT: 20-second session restoration
 *   - LEAVE_ROOM / LEAVE_INTENTIONAL: leave room
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
    const userToken = data.userToken;

    // Register active user socket & evict older duplicate sessions (Requirement 4)
    registerUserSocket(userToken, '/presence', socket);

    logger.info(
      {
        socketId: socket.id,
        token: truncateToken(userToken),
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

    // Track current joined room on socket.data for graceful disconnect handling
    let currentRoomId: string | null = null;
    let isIntentionalLeave = false;

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

        let room;
        if (roomId && roomId.trim().length > 0) {
          // Join existing room
          room = await joinRoom(roomId.trim(), userToken, displayName);
        } else {
          // Create new room
          room = await createRoom(userToken, displayName);
        }

        currentRoomId = room.roomId;

        // Cancel any pending grace timer on join
        cancelGraceTimer(room.roomId, userToken);

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

    // ── RECONNECT Handler (Idempotent session restoration) ────────────────────
    socket.on(PresenceEvents.RECONNECT, async (envelope: EventEnvelope<ReconnectPayload>) => {
      try {
        const payloadResult = reconnectPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) {
          socket.emit(PresenceEvents.RECONNECT_REJECTED, {
            reason: 'invalid_payload',
          });
          return;
        }

        const { roomId } = payloadResult.data;

        // Attempt idempotent reconnect & host slot lock check
        const { room, role } = await attemptReconnect(userToken, roomId);

        currentRoomId = room.roomId;

        // Join Socket.IO room channel
        await socket.join(room.roomId);

        // Emit RECONNECT_ACCEPTED with restored session details
        socket.emit(PresenceEvents.RECONNECT_ACCEPTED, {
          room,
          role,
          userToken,
        });

        // Broadcast to remaining room participant
        socket.to(room.roomId).emit(PresenceEvents.USER_RECONNECTED, {
          userToken,
          role,
        });
      } catch (err: unknown) {
        const error = err as Error & { code?: string };
        logger.warn({ socketId: socket.id, err: error.message }, 'RECONNECT failed');
        socket.emit(PresenceEvents.RECONNECT_REJECTED, {
          code: error.code ?? 'ERR_RECONNECT_EXPIRED',
          message: error.message,
        });
      }
    });

    // ── LEAVE_ROOM / LEAVE_INTENTIONAL Handler ─────────────────────────────────
    const handleLeave = async (roomId: string) => {
      isIntentionalLeave = true;
      cancelGraceTimer(roomId, userToken);

      const { room } = await leaveRoom(roomId, userToken);
      await socket.leave(roomId);
      currentRoomId = null;

      if (room) {
        socket.to(roomId).emit(PresenceEvents.USER_LEFT, { userToken });
      }
    };

    socket.on(PresenceEvents.LEAVE_ROOM, async (envelope: EventEnvelope<LeaveRoomPayload>) => {
      try {
        const payloadResult = leaveRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) return;
        await handleLeave(payloadResult.data.roomId);
      } catch (err: unknown) {
        logger.warn({ socketId: socket.id, err }, 'LEAVE_ROOM failed');
      }
    });

    socket.on(PresenceEvents.LEAVE_INTENTIONAL, async (envelope: EventEnvelope<LeaveRoomPayload>) => {
      try {
        const payloadResult = leaveRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) return;
        await handleLeave(payloadResult.data.roomId);
      } catch (err: unknown) {
        logger.warn({ socketId: socket.id, err }, 'LEAVE_INTENTIONAL failed');
      }
    });

    // ── HOST_END_ROOM Handler ──────────────────────────────────────────────────
    socket.on(PresenceEvents.HOST_END_ROOM, async (envelope: EventEnvelope<HostEndRoomPayload>) => {
      try {
        const payloadResult = hostEndRoomPayloadSchema.safeParse(envelope.payload);
        if (!payloadResult.success) return;

        const { roomId } = payloadResult.data;

        await endRoom(roomId, userToken);
        currentRoomId = null;

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

    socket.on('disconnect', async (reason) => {
      logger.info({ socketId: socket.id, reason }, 'Client disconnected from /presence namespace');

      unregisterUserSocket(userToken, '/presence', socket.id);

      // If disconnect was unintended and user is in a room, start 20s grace period
      if (!isIntentionalLeave) {
        const activeRoomId = currentRoomId ?? (await getUserBinding(userToken))?.roomId;

        if (activeRoomId) {
          // Notify room of temporary disconnect
          socket.to(activeRoomId).emit(PresenceEvents.USER_DISCONNECTED_TEMPORARILY, {
            userToken,
          });

          // Start 20-second grace timer
          startGraceTimer(activeRoomId, userToken, () => {
            socket.to(activeRoomId).emit(PresenceEvents.USER_LEFT, { userToken });
          });
        }
      }
    });
  });

  logger.info('Namespace /presence initialized with ReconnectService handlers');
  return nsp;
}
