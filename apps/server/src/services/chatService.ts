import type { ChatMessage } from '@antigravity/shared-types';
import { ServerErrors } from '@antigravity/shared-types';
import { config } from '../config.js';
import { getRedisClient } from '../redis.js';
import { logger, truncateToken } from '../logger.js';
import { getRoom } from './roomService.js';

/**
 * Service for chat message processing, rate limiting, validation, deduplication, and history buffer.
 *
 * Architecture Requirements:
 * - Room-scoped chat (isolated per room, active participants only).
 * - Server-side displayName substitution (never trust client-supplied displayName).
 * - Redis-backed userToken rate limiting (default: max 10 messages per 10s).
 * - Message ID deduplication (Redis key chat:seen:{roomId}:{messageId}).
 * - Last 50 messages buffer per room in Redis (chat:history:{roomId}).
 * - Structured Pino logging for all events.
 */

const RATE_LIMIT_PREFIX = 'ratelimit:chat:';
const HISTORY_PREFIX = 'chat:history:';
const SEEN_MESSAGE_PREFIX = 'chat:seen:';

function rateLimitKey(userToken: string): string {
  return `${RATE_LIMIT_PREFIX}${userToken}`;
}

function historyKey(roomId: string): string {
  return `${HISTORY_PREFIX}${roomId}`;
}

function seenMessageKey(roomId: string, messageId: string): string {
  return `${SEEN_MESSAGE_PREFIX}${roomId}:${messageId}`;
}

/**
 * Checks and increments the userToken rate limit counter in Redis.
 *
 * Default: 10 messages per 10 seconds (configurable via ENV).
 *
 * @returns true if allowed, false if rate limited.
 */
export async function checkRateLimit(userToken: string): Promise<boolean> {
  const redis = getRedisClient();
  const key = rateLimitKey(userToken);
  const windowSeconds = Math.max(1, Math.ceil(config.RATE_LIMIT_CHAT_WINDOW_MS / 1000));

  const currentCount = await redis.incr(key);
  if (currentCount === 1) {
    await redis.expire(key, windowSeconds);
  }

  if (currentCount > config.RATE_LIMIT_CHAT_MAX_MESSAGES) {
    logger.warn(
      {
        userToken: truncateToken(userToken),
        currentCount,
        maxAllowed: config.RATE_LIMIT_CHAT_MAX_MESSAGES,
        windowMs: config.RATE_LIMIT_CHAT_WINDOW_MS,
      },
      'Chat rate limit exceeded for userToken',
    );
    return false;
  }

  return true;
}

/**
 * Processes an incoming chat message request.
 *
 * Performs:
 * 1. Rate limit check.
 * 2. Room existence & active participant membership check.
 * 3. Server-side verified displayName lookup.
 * 4. MessageId deduplication check.
 * 5. History buffer store (RPUSH + LTRIM -50 -1).
 *
 * Returns created `ChatMessage` object for broadcast.
 */
export async function processSendMessage(
  userToken: string,
  roomId: string,
  messageId: string,
  rawMessage: string,
): Promise<ChatMessage> {
  // 1. Rate limit check
  const allowed = await checkRateLimit(userToken);
  if (!allowed) {
    const err = new Error(`Rate limit exceeded. Maximum ${config.RATE_LIMIT_CHAT_MAX_MESSAGES} messages per ${config.RATE_LIMIT_CHAT_WINDOW_MS / 1000} seconds.`);
    (err as NodeJS.ErrnoException).code = ServerErrors.CHAT_RATE_LIMITED;
    throw err;
  }

  // 2. Room existence & membership check
  const room = await getRoom(roomId);
  if (!room) {
    logger.warn({ roomId, userToken: truncateToken(userToken) }, 'Chat message rejected: room not found');
    const err = new Error(`Room '${roomId}' not found`);
    (err as NodeJS.ErrnoException).code = ServerErrors.ROOM_NOT_FOUND;
    throw err;
  }

  const participant = room.participants.find((p) => p.userToken === userToken);
  if (!participant) {
    logger.warn(
      { roomId, userToken: truncateToken(userToken) },
      'Chat message rejected: user is not an active participant in room',
    );
    const err = new Error('Unauthorized: must be an active room participant to send messages');
    (err as NodeJS.ErrnoException).code = ServerErrors.UNAUTHORIZED;
    throw err;
  }

  // 3. MessageId deduplication check (5-minute TTL)
  const redis = getRedisClient();
  const seenKey = seenMessageKey(roomId, messageId);
  const setNXResult = await redis.set(seenKey, '1', 'PX', 300000, 'NX');

  if (setNXResult === null) {
    logger.warn({ roomId, messageId }, 'Chat message rejected: duplicate messageId');
    const err = new Error('Duplicate messageId');
    (err as NodeJS.ErrnoException).code = ServerErrors.DUPLICATE_MESSAGE_ID;
    throw err;
  }

  // 4. Construct ChatMessage with server-side verified displayName
  const now = Date.now();
  const chatMessage: ChatMessage = {
    messageId,
    roomId,
    userToken,
    displayName: participant.displayName,
    message: rawMessage,
    timestamp: now,
  };

  // 5. Store in Redis chat history buffer (last 50 messages)
  const histKey = historyKey(roomId);
  const jsonString = JSON.stringify(chatMessage);

  const pipeline = redis.pipeline();
  pipeline.rpush(histKey, jsonString);
  pipeline.ltrim(histKey, -50, -1);
  pipeline.expire(histKey, config.ROOM_TTL_SECONDS);
  await pipeline.exec();

  logger.info(
    {
      roomId,
      messageId,
      userToken: truncateToken(userToken),
      displayName: participant.displayName,
      messageLength: rawMessage.length,
    },
    'Chat message processed and stored successfully',
  );

  return chatMessage;
}

/**
 * Fetches the last 50 chat messages for a room from Redis.
 */
export async function getChatHistory(roomId: string): Promise<ChatMessage[]> {
  const redis = getRedisClient();
  const rawList = await redis.lrange(historyKey(roomId), 0, -1);

  const history: ChatMessage[] = [];
  for (const raw of rawList) {
    try {
      history.push(JSON.parse(raw) as ChatMessage);
    } catch {
      // Ignore corrupted entries
    }
  }

  return history;
}

/**
 * Deletes chat history key from Redis when room is closed.
 */
export async function deleteChatHistory(roomId: string): Promise<void> {
  const redis = getRedisClient();
  await redis.del(historyKey(roomId));
  logger.info({ roomId }, 'Chat history deleted for room');
}
