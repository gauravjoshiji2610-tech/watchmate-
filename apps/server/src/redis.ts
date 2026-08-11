import { Redis } from 'ioredis';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Singleton Redis client used across the server.
 *
 * Phase 2: Used only for health check pings.
 * Phase 4: Room Service will import this same client for room state operations.
 *
 * Architecture (ADR-004):
 * - Redis is a required dependency — the server should not start without it.
 * - Health endpoint pings this client to report Redis connectivity status.
 * - All room keys use TTL (ROOM_TTL_SECONDS) as a crash-safety net.
 *
 * Connection errors are logged but do not crash the process here —
 * index.ts performs the startup ping check and decides whether to abort.
 */
let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      // Disable auto-reconnect retries beyond what's reasonable
      maxRetriesPerRequest: 3,
      // Timeout for each command
      commandTimeout: 5000,
      // Keep connection alive
      keepAlive: 10000,
      // On connection events — log but do not crash
      lazyConnect: true,
    });

    redisClient.on('connect', () => {
      logger.info({ url: config.REDIS_URL.replace(/:\/\/.*@/, '://***@') }, 'Redis connected');
    });

    redisClient.on('ready', () => {
      logger.info('Redis ready');
    });

    redisClient.on('error', (err: Error) => {
      logger.error({ err }, 'Redis connection error');
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });
  }

  return redisClient;
}

/**
 * Sets or overrides the singleton Redis client (used for unit testing with mock clients).
 */
export function setRedisClient(client: Redis | null): void {
  redisClient = client;
}

/**
 * Pings Redis and returns a status string.
 * Used by the health endpoint.
 *
 * @returns 'ok' if Redis responds with PONG, 'error' otherwise.
 */
export async function pingRedis(): Promise<'ok' | 'error'> {
  try {
    const response = await getRedisClient().ping();
    return response === 'PONG' ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

/**
 * Gracefully disconnects the Redis client.
 * Called during server shutdown in index.ts.
 */
export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected gracefully');
  }
}
