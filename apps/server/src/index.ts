import { createServer } from 'http';
import { config } from './config.js';
import { logger } from './logger.js';
import { createApp } from './app.js';
import { initSocketIO } from './socket.js';
import { getRedisClient, closeRedis } from './redis.js';
import { setSocketioReady } from './routes/health.js';

/**
 * Server entry point.
 *
 * Boot sequence (linear — each step must succeed before the next):
 *   1. Config loaded and validated (happens at import time in config.ts)
 *   2. Logger initialized (happens at import time in logger.ts)
 *   3. Express app created
 *   4. HTTP server created (wraps Express for Socket.IO attachment)
 *   5. Socket.IO initialized and attached to HTTP server
 *   6. Redis connectivity verified (startup ping)
 *   7. Server starts listening on configured PORT
 *   8. Graceful shutdown handlers registered (SIGTERM, SIGINT)
 *
 * If Redis is unreachable at startup, the server logs a warning but
 * continues — Redis may become available shortly after (e.g., Docker startup order).
 * The health endpoint will report 'degraded' until Redis responds.
 */
async function main(): Promise<void> {
  logger.info({ nodeVersion: process.version, env: config.NODE_ENV }, 'WatchMate server starting...');

  // Step 3: Express app
  const app = createApp();

  // Step 4: HTTP server
  const httpServer = createServer(app);

  // Step 5: Socket.IO
  const _io = initSocketIO(httpServer);
  setSocketioReady(true);

  // Step 6: Redis startup ping (non-fatal — health endpoint reports status)
  const redis = getRedisClient();
  try {
    await redis.connect();
    const pong = await redis.ping();
    if (pong === 'PONG') {
      logger.info('Redis startup ping: OK');
    } else {
      logger.warn({ pong }, 'Redis startup ping: unexpected response');
    }
  } catch (err) {
    logger.warn({ err }, 'Redis unreachable at startup — health endpoint will report degraded');
  }

  // Step 7: Listen
  await new Promise<void>((resolve) => {
    httpServer.listen(config.PORT, () => {
      logger.info(
        {
          port: config.PORT,
          corsOrigin: config.CORS_ORIGIN,
          logLevel: config.LOG_LEVEL,
        },
        `WatchMate server listening on port ${config.PORT}`,
      );
      resolve();
    });
  });

  // Step 8: Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received — closing server gracefully');

    // Stop accepting new connections
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    // Disconnect Socket.IO clients
    await _io.close();
    logger.info('Socket.IO server closed');

    // Disconnect Redis
    await closeRedis();

    logger.info('Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Catch unhandled rejections — log and exit (never silently swallow)
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection — exiting');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
}

main().catch((err: unknown) => {
  // config.ts may not have run yet if this fires very early — use console as fallback
  console.error('[WatchMate] Fatal startup error:', err);
  process.exit(1);
});
