import type { Router } from 'express';
import { Router as createRouter } from 'express';
import { pingRedis } from '../redis.js';

/**
 * Health check route — GET /api/health
 *
 * Architecture (ADR-004, architecture review finding 2.8):
 * A health endpoint that only checks process liveness is a false signal.
 * This endpoint checks:
 *   1. Process is alive (implicitly — if this runs, Node.js is up)
 *   2. Redis responds to PING with PONG
 *   3. Socket.IO server is initialized (injected via dependency)
 *
 * Response shape:
 * {
 *   status:   'ok' | 'degraded' | 'down',
 *   redis:    'ok' | 'error',
 *   socketio: 'ok' | 'not_initialized',
 *   activeRooms: number,          ← always 0 until Phase 4 Room Service
 *   uptime:   number,             ← process uptime in seconds
 *   timestamp: string             ← ISO 8601
 * }
 *
 * HTTP status codes:
 *   200 → status: 'ok'
 *   207 → status: 'degraded' (some deps down but process alive)
 *   503 → status: 'down'     (critical deps unavailable)
 */

// Injected from index.ts after Socket.IO is initialized
let _socketioReady = false;

export function setSocketioReady(ready: boolean): void {
  _socketioReady = ready;
}

export function createHealthRouter(): Router {
  const router = createRouter();

  router.get('/health', async (_req, res) => {
    const redisStatus = await pingRedis();
    const socketioStatus = _socketioReady ? 'ok' : 'not_initialized';

    const allOk = redisStatus === 'ok' && socketioStatus === 'ok';
    const anyOk = redisStatus === 'ok' || socketioStatus === 'ok';

    const overallStatus = allOk ? 'ok' : anyOk ? 'degraded' : 'down';
    const httpStatus = allOk ? 200 : anyOk ? 207 : 503;

    res.status(httpStatus).json({
      status: overallStatus,
      redis: redisStatus,
      socketio: socketioStatus,
      activeRooms: 0, // Phase 4: Room Service will update this
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  return router;
}
