import { generateRoomId } from '@antigravity/shared-utils';
import type { Room, Participant, UserTokenBinding, Role } from '@antigravity/shared-types';
import { ServerErrors } from '@antigravity/shared-types';
import { config } from '../config.js';
import { getRedisClient } from '../redis.js';
import { logger, truncateToken } from '../logger.js';

/**
 * Service for Redis-backed room state lifecycle management.
 *
 * Architecture (ADR-003, ADR-004):
 * - State stored strictly in Redis (`room:{roomId}`) with safety TTL (`config.ROOM_TTL_SECONDS`).
 * - Token binding (`userToken:{token}`) enforces one active room per token (ADR-003 security).
 * - Host slot distributed lock (`lock:host:{roomId}`) protects against dual-host race conditions.
 * - MAX_ACTIVE_ROOMS cap enforced on room creation.
 * - Nanoid room ID collision check (max 3 retries).
 */

const ROOM_KEY_PREFIX = 'room:';
const TOKEN_KEY_PREFIX = 'userToken:';
const HOST_LOCK_PREFIX = 'lock:host:';

function roomKey(roomId: string): string {
  return `${ROOM_KEY_PREFIX}${roomId}`;
}

function tokenKey(userToken: string): string {
  return `${TOKEN_KEY_PREFIX}${userToken}`;
}

function hostLockKey(roomId: string): string {
  return `${HOST_LOCK_PREFIX}${roomId}`;
}

/**
 * Counts total active room keys currently stored in Redis.
 */
export async function countActiveRooms(): Promise<number> {
  const redis = getRedisClient();
  const keys = await redis.keys(`${ROOM_KEY_PREFIX}*`);
  return keys.length;
}

/**
 * Fetches a room state from Redis by roomId.
 * Refreshes the room key TTL on read (ADR-004).
 */
export async function getRoom(roomId: string): Promise<Room | null> {
  const redis = getRedisClient();
  const key = roomKey(roomId);
  const raw = await redis.get(key);

  if (!raw) {
    return null;
  }

  try {
    // Refresh safety TTL on read activity (ADR-004)
    await redis.expire(key, config.ROOM_TTL_SECONDS);
    return JSON.parse(raw) as Room;
  } catch (err) {
    logger.error({ err, roomId }, 'Failed to parse room JSON from Redis');
    return null;
  }
}

/**
 * Fetches the room binding for a userToken from Redis.
 */
export async function getUserBinding(userToken: string): Promise<UserTokenBinding | null> {
  const redis = getRedisClient();
  const raw = await redis.get(tokenKey(userToken));

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as UserTokenBinding;
  } catch {
    return null;
  }
}

/**
 * Binds a userToken to a room and role in Redis.
 */
async function setUserBinding(binding: UserTokenBinding): Promise<void> {
  const redis = getRedisClient();
  await redis.set(
    tokenKey(binding.userToken),
    JSON.stringify(binding),
    'EX',
    config.ROOM_TTL_SECONDS,
  );
}

/**
 * Removes a userToken binding from Redis.
 */
async function removeUserBinding(userToken: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(tokenKey(userToken));
}

/**
 * Creates a new room in Redis.
 *
 * Checks MAX_ACTIVE_ROOMS cap, generates nanoid roomId with collision check,
 * binds host userToken, and acquires host slot lock.
 */
export async function createRoom(hostToken: string, displayName: string): Promise<Room> {
  const activeCount = await countActiveRooms();
  if (activeCount >= config.MAX_ACTIVE_ROOMS) {
    logger.warn({ activeCount, max: config.MAX_ACTIVE_ROOMS }, 'Room creation rejected: room limit reached');
    const err = new Error(`Server room limit reached (max ${config.MAX_ACTIVE_ROOMS} active rooms)`);
    (err as NodeJS.ErrnoException).code = ServerErrors.ROOM_LIMIT_REACHED;
    throw err;
  }

  // Check if token is already bound to an active room
  const existingBinding = await getUserBinding(hostToken);
  if (existingBinding) {
    const existingRoom = await getRoom(existingBinding.roomId);
    if (existingRoom) {
      logger.warn(
        { hostToken: truncateToken(hostToken), roomId: existingBinding.roomId },
        'Token already bound to an active room',
      );
      const err = new Error(`userToken is already bound to room ${existingBinding.roomId}`);
      (err as NodeJS.ErrnoException).code = ServerErrors.TOKEN_ROOM_MISMATCH;
      throw err;
    }
  }

  const redis = getRedisClient();
  let roomId = '';
  let attempts = 0;

  // Collision check loop (Architecture Review Finding 2.10)
  while (attempts < 3) {
    const candidateId = generateRoomId();
    const exists = await redis.exists(roomKey(candidateId));
    if (exists === 0) {
      roomId = candidateId;
      break;
    }
    attempts++;
  }

  if (!roomId) {
    logger.error('Failed to generate unique room ID after 3 attempts');
    const err = new Error('Failed to generate unique room ID');
    (err as NodeJS.ErrnoException).code = 'ERR_ROOM_GENERATION_FAILED';
    throw err;
  }

  const now = Date.now();
  const hostParticipant: Participant = {
    userToken: hostToken,
    displayName,
    role: 'host',
    joinedAt: now,
  };

  const room: Room = {
    roomId,
    hostToken,
    participants: [hostParticipant],
    createdAt: now,
    updatedAt: now,
  };

  // Save room state in Redis with safety TTL (ADR-004)
  await redis.set(roomKey(roomId), JSON.stringify(room), 'EX', config.ROOM_TTL_SECONDS);

  // Set token binding (ADR-003)
  await setUserBinding({
    userToken: hostToken,
    roomId,
    displayName,
    role: 'host',
  });

  // Acquire host slot lock for grace period (Architecture Review Finding 2.2)
  await redis.set(
    hostLockKey(roomId),
    hostToken,
    'PX',
    config.RECONNECT_GRACE_PERIOD_MS,
    'NX',
  );

  logger.info(
    { roomId, hostToken: truncateToken(hostToken), displayName },
    'Room created successfully in Redis',
  );

  return room;
}

/**
 * Joins an existing room.
 *
 * Enforces 1-to-1 participant cap (max 2), verifies token binding,
 * updates room state in Redis.
 */
export async function joinRoom(
  roomId: string,
  userToken: string,
  displayName: string,
): Promise<Room> {
  const room = await getRoom(roomId);
  if (!room) {
    const err = new Error(`Room '${roomId}' not found`);
    (err as NodeJS.ErrnoException).code = ServerErrors.ROOM_NOT_FOUND;
    throw err;
  }

  // Verify token binding (ADR-003)
  const existingBinding = await getUserBinding(userToken);
  if (existingBinding && existingBinding.roomId !== roomId) {
    const boundRoom = await getRoom(existingBinding.roomId);
    if (boundRoom) {
      const err = new Error(`userToken is bound to a different room (${existingBinding.roomId})`);
      (err as NodeJS.ErrnoException).code = ServerErrors.TOKEN_ROOM_MISMATCH;
      throw err;
    }
  }

  const existingParticipant = room.participants.find((p) => p.userToken === userToken);

  let updatedParticipants: Participant[];
  let assignedRole: Role = 'viewer';

  if (existingParticipant) {
    // Rejoining / updating display name
    assignedRole = existingParticipant.role;
    updatedParticipants = room.participants.map((p) =>
      p.userToken === userToken ? { ...p, displayName } : p,
    );
  } else {
    // New participant joining
    if (room.participants.length >= 2) {
      logger.warn({ roomId, userToken: truncateToken(userToken) }, 'Room join rejected: room is full (max 2)');
      const err = new Error(`Room '${roomId}' is full (1-to-1 maximum reached)`);
      (err as NodeJS.ErrnoException).code = ServerErrors.ROOM_FULL;
      throw err;
    }

    assignedRole = room.participants.length === 0 ? 'host' : 'viewer';

    const newParticipant: Participant = {
      userToken,
      displayName,
      role: assignedRole,
      joinedAt: Date.now(),
    };

    updatedParticipants = [...room.participants, newParticipant];
  }

  const updatedRoom: Room = {
    ...room,
    participants: updatedParticipants,
    updatedAt: Date.now(),
  };

  const redis = getRedisClient();
  await redis.set(roomKey(roomId), JSON.stringify(updatedRoom), 'EX', config.ROOM_TTL_SECONDS);

  await setUserBinding({
    userToken,
    roomId,
    displayName,
    role: assignedRole,
  });

  logger.info(
    { roomId, userToken: truncateToken(userToken), role: assignedRole },
    'Participant joined room',
  );

  return updatedRoom;
}

/**
 * Leaves a room. If empty, deletes room state & bindings from Redis.
 */
export async function leaveRoom(
  roomId: string,
  userToken: string,
): Promise<{ room: Room | null; isDeleted: boolean }> {
  const room = await getRoom(roomId);
  if (!room) {
    await removeUserBinding(userToken);
    return { room: null, isDeleted: true };
  }

  await removeUserBinding(userToken);

  const remaining = room.participants.filter((p) => p.userToken !== userToken);
  const redis = getRedisClient();

  if (remaining.length === 0) {
    // Delete room state & host lock when empty
    await redis.del(roomKey(roomId));
    await redis.del(hostLockKey(roomId));
    logger.info({ roomId }, 'Room deleted (empty)');
    return { room: null, isDeleted: true };
  }

  const updatedRoom: Room = {
    ...room,
    participants: remaining,
    updatedAt: Date.now(),
  };

  await redis.set(roomKey(roomId), JSON.stringify(updatedRoom), 'EX', config.ROOM_TTL_SECONDS);
  logger.info({ roomId, userToken: truncateToken(userToken) }, 'Participant left room');

  return { room: updatedRoom, isDeleted: false };
}

/**
 * Ends a room. Enforces host role requirement.
 * Deletes room state, host lock, and all token bindings.
 */
export async function endRoom(roomId: string, hostToken: string): Promise<boolean> {
  const room = await getRoom(roomId);
  if (!room) {
    const err = new Error(`Room '${roomId}' not found`);
    (err as NodeJS.ErrnoException).code = ServerErrors.ROOM_NOT_FOUND;
    throw err;
  }

  if (room.hostToken !== hostToken) {
    logger.warn(
      { roomId, token: truncateToken(hostToken), actualHost: truncateToken(room.hostToken) },
      'Unauthorized endRoom attempt',
    );
    const err = new Error('Unauthorized: only the host can end the room');
    (err as NodeJS.ErrnoException).code = ServerErrors.UNAUTHORIZED;
    throw err;
  }

  // Remove all token bindings
  for (const p of room.participants) {
    await removeUserBinding(p.userToken);
  }

  const redis = getRedisClient();
  await redis.del(roomKey(roomId));
  await redis.del(hostLockKey(roomId));

  logger.info({ roomId, hostToken: truncateToken(hostToken) }, 'Room closed by host');
  return true;
}
