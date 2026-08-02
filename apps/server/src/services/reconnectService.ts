import type { Socket } from 'socket.io';
import type { Room, Role } from '@antigravity/shared-types';
import { ServerErrors } from '@antigravity/shared-types';
import { config } from '../config.js';
import { getRedisClient } from '../redis.js';
import { logger, truncateToken } from '../logger.js';
import { getRoom, getUserBinding, leaveRoom } from './roomService.js';

/**
 * Service for auto-reconnect, session restoration, and duplicate socket eviction.
 *
 * Architecture (ADR-003, ADR-004 & Architecture Review):
 * - Reconnect within 20s restores exact session (role, identity, room membership).
 * - Grace timer starts on disconnect; cancels immediately on reconnect or intentional leave.
 * - Host reconnect has priority: host slot lock (lock:host:{roomId}) refreshed on reconnect.
 * - Duplicate sockets for same userToken on same namespace safely evict older socket.
 * - Idempotent reconnect processing.
 * - Structured logging with Pino for all reconnect events.
 */

/** Active 20-second grace timers: key `${roomId}:${userToken}` */
const graceTimers = new Map<string, NodeJS.Timeout>();

/** Active socket registry: key `${namespace}:${userToken}` */
const activeUserSockets = new Map<string, Socket>();

function graceTimerKey(roomId: string, userToken: string): string {
  return `${roomId}:${userToken}`;
}

function userSocketKey(namespace: string, userToken: string): string {
  return `${namespace}:${userToken}`;
}

/**
 * Registers an active socket for a userToken on a specific namespace.
 * Safely disconnects any existing older socket for the same userToken on that namespace.
 */
export function registerUserSocket(userToken: string, namespace: string, socket: Socket): void {
  const key = userSocketKey(namespace, userToken);
  const existingSocket = activeUserSockets.get(key);

  if (existingSocket && existingSocket.id !== socket.id) {
    logger.info(
      {
        userToken: truncateToken(userToken),
        namespace,
        oldSocketId: existingSocket.id,
        newSocketId: socket.id,
      },
      'Duplicate socket detected for userToken — evicting older session',
    );
    existingSocket.disconnect(true);
  }

  activeUserSockets.set(key, socket);
}

/**
 * Unregisters a socket when it disconnects.
 */
export function unregisterUserSocket(userToken: string, namespace: string, socketId: string): void {
  const key = userSocketKey(namespace, userToken);
  const existingSocket = activeUserSockets.get(key);

  if (existingSocket && existingSocket.id === socketId) {
    activeUserSockets.delete(key);
  }
}

/**
 * Starts the 20-second reconnect grace period timer for a disconnected participant.
 *
 * When timer expires without reconnect, triggers `leaveRoom()`.
 */
export function startGraceTimer(
  roomId: string,
  userToken: string,
  onExpire?: () => void,
): void {
  const key = graceTimerKey(roomId, userToken);

  // Clear existing timer if present (idempotent)
  cancelGraceTimer(roomId, userToken);

  logger.info(
    {
      userToken: truncateToken(userToken),
      roomId,
      graceMs: config.RECONNECT_GRACE_PERIOD_MS,
    },
    'Started 20-second reconnect grace period timer',
  );

  const timer = setTimeout(async () => {
    graceTimers.delete(key);
    logger.info(
      {
        userToken: truncateToken(userToken),
        roomId,
      },
      'Reconnect grace period expired — removing participant from room',
    );

    try {
      await leaveRoom(roomId, userToken);
      if (onExpire) {
        onExpire();
      }
    } catch (err) {
      logger.error({ err, roomId, userToken: truncateToken(userToken) }, 'Failed to execute room cleanup on grace period expiry');
    }
  }, config.RECONNECT_GRACE_PERIOD_MS);

  graceTimers.set(key, timer);
}

/**
 * Cancels an active grace period timer (e.g. on successful reconnect or intentional leave).
 */
export function cancelGraceTimer(roomId: string, userToken: string): boolean {
  const key = graceTimerKey(roomId, userToken);
  const timer = graceTimers.get(key);

  if (timer) {
    clearTimeout(timer);
    graceTimers.delete(key);
    logger.info(
      {
        userToken: truncateToken(userToken),
        roomId,
      },
      'Reconnect grace period timer cancelled',
    );
    return true;
  }

  return false;
}

/**
 * Checks if a user is currently in a grace period for a room.
 */
export function isUserInGracePeriod(roomId: string, userToken: string): boolean {
  return graceTimers.has(graceTimerKey(roomId, userToken));
}

/**
 * Idempotent reconnect attempt.
 *
 * Validates token binding & room state, cancels grace timer,
 * restores host slot lock if host, and returns updated Room snapshot & Role.
 */
export async function attemptReconnect(
  userToken: string,
  roomId: string,
): Promise<{ room: Room; role: Role }> {
  logger.info(
    {
      userToken: truncateToken(userToken),
      roomId,
    },
    'Processing reconnect attempt',
  );

  // Check room state
  const room = await getRoom(roomId);
  if (!room) {
    cancelGraceTimer(roomId, userToken);
    logger.warn({ roomId, userToken: truncateToken(userToken) }, 'Reconnect rejected: room not found or deleted');
    const err = new Error(`Reconnect failed: room '${roomId}' no longer exists`);
    (err as NodeJS.ErrnoException).code = ServerErrors.RECONNECT_EXPIRED;
    throw err;
  }

  // Check token binding
  const binding = await getUserBinding(userToken);
  if (!binding || binding.roomId !== roomId) {
    cancelGraceTimer(roomId, userToken);
    logger.warn({ roomId, userToken: truncateToken(userToken) }, 'Reconnect rejected: token not bound to room');
    const err = new Error(`Reconnect failed: token is not bound to room '${roomId}'`);
    (err as NodeJS.ErrnoException).code = ServerErrors.RECONNECT_EXPIRED;
    throw err;
  }

  const participant = room.participants.find((p) => p.userToken === userToken);
  if (!participant) {
    cancelGraceTimer(roomId, userToken);
    logger.warn({ roomId, userToken: truncateToken(userToken) }, 'Reconnect rejected: participant not in room state');
    const err = new Error(`Reconnect failed: participant is no longer in room '${roomId}'`);
    (err as NodeJS.ErrnoException).code = ServerErrors.RECONNECT_EXPIRED;
    throw err;
  }

  // Cancel grace timer immediately upon successful validation
  cancelGraceTimer(roomId, userToken);

  // Host priority & host lock restoration (Architecture Review Finding 2.2)
  if (participant.role === 'host' || room.hostToken === userToken) {
    const redis = getRedisClient();
    await redis.set(
      `lock:host:${roomId}`,
      userToken,
      'PX',
      config.RECONNECT_GRACE_PERIOD_MS,
    );
    logger.info({ roomId, hostToken: truncateToken(userToken) }, 'Host slot lock refreshed on reconnect');
  }

  logger.info(
    {
      roomId,
      userToken: truncateToken(userToken),
      role: participant.role,
    },
    'Reconnect successful — session restored',
  );

  return {
    room,
    role: participant.role,
  };
}
