import express from 'express';
import { corsMiddleware } from './middleware/cors.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.js';

/**
 * Express application factory.
 *
 * Returns a configured Express app — does NOT start listening.
 * Separating app construction from server startup means:
 *   - The health route can be tested without binding a real port.
 *   - index.ts controls the lifecycle (bind, listen, shutdown).
 *
 * Middleware order is intentional:
 *   1. CORS       — reject disallowed origins before any processing
 *   2. JSON parser — parse request bodies
 *   3. Routes     — application logic
 *   4. Error handler — MUST be last (Express requires 4-param signature)
 */
export function createApp(): express.Application {
  const app = express();

  // 1. CORS — restricts to configured CORS_ORIGIN
  app.use(corsMiddleware);

  // 2. Body parsing — JSON only (no URL-encoded forms needed)
  app.use(express.json({ limit: '16kb' }));

  // 3. Routes
  app.use('/api', createHealthRouter());

  // 4. Global error handler — must be last
  app.use(errorHandler);

  return app;
}
