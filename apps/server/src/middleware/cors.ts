import corsLib from 'cors';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * CORS middleware — restricts all cross-origin requests to the
 * configured CORS_ORIGIN. Rejects all other origins at the HTTP level.
 *
 * Architecture Review (ADR-006):
 * - Origin is read from config, never hardcoded.
 * - credentials: true is required for Socket.IO cookie-based auth (future).
 * - Rejecting unknown origins is a first-line defence — this is not optional.
 */
export const corsMiddleware = corsLib({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin, curl, Postman in dev)
    if (!origin) {
      callback(null, true);
      return;
    }

    if (origin === config.CORS_ORIGIN) {
      callback(null, true);
    } else {
      logger.warn({ origin, allowed: config.CORS_ORIGIN }, 'CORS rejected request from unknown origin');
      callback(new Error(`CORS: origin '${origin}' is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
