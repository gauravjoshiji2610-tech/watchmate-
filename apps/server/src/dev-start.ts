/**
 * dev-start.ts — Local development entry point with Redis auto-fallback.
 *
 * If a real Redis server is reachable at the configured REDIS_URL, it uses it.
 * If not (ECONNREFUSED), it swaps in an ioredis-mock in-memory store so the
 * full application works locally without requiring Redis to be installed.
 *
 * This file is ONLY used for local development (`pnpm dev:local`).
 * Production always uses a real Redis instance.
 */

import net from 'net';
import { config } from './config.js';
import { logger } from './logger.js';

/**
 * Check if a TCP port is open on a given host.
 */
function isPortOpen(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);
    socket
      .once('connect', () => { socket.destroy(); resolve(true); })
      .once('timeout', () => { socket.destroy(); resolve(false); })
      .once('error', () => { socket.destroy(); resolve(false); })
      .connect(port, host);
  });
}

/**
 * Parse host and port from a Redis URL.
 * Supports redis://host:port and redis://user:pass@host:port
 */
function parseRedisUrl(url: string): { host: string; port: number } {
  try {
    const u = new URL(url);
    return { host: u.hostname || 'localhost', port: Number(u.port) || 6379 };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

async function bootstrap(): Promise<void> {
  const { host, port } = parseRedisUrl(config.REDIS_URL);
  const redisAvailable = await isPortOpen(host, port);

  if (!redisAvailable) {
    logger.warn(
      { redisUrl: config.REDIS_URL },
      '⚠️  Redis not reachable — starting with in-memory mock (ioredis-mock). ' +
        'All features work, but state is lost on restart.',
    );

    // Dynamically import ioredis-mock and inject it as the singleton client
    const { default: RedisMock } = await import('ioredis-mock');
    const { setRedisClient } = await import('./redis.js');
    // ioredis-mock matches the ioredis API — cast is safe for local dev
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setRedisClient(new RedisMock() as any);
    logger.info('✅ In-memory Redis mock active');
  } else {
    logger.info({ host, port }, '✅ Real Redis detected — connecting normally');
  }

  // Now run the real server entry point
  await import('./index.js');
}

bootstrap().catch((err: unknown) => {
  console.error('[WatchMate] Fatal dev startup error:', err);
  process.exit(1);
});
