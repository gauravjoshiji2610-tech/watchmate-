import type { ErrorRequestHandler } from 'express';
import { config } from '../config.js';
import { logger } from '../logger.js';

/**
 * Global Express error handler.
 *
 * Must be the LAST middleware registered in app.ts (Express requires all 4
 * parameters for error handlers — (err, req, res, next)).
 *
 * Rules:
 * - Always logs the error structurally (never console.error).
 * - Never exposes stack traces in production responses.
 * - Returns a JSON body with a stable error shape for all failures.
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const statusCode: number =
    typeof (err as { status?: number }).status === 'number'
      ? ((err as { status: number }).status)
      : 500;

  logger.error(
    {
      err,
      method: req.method,
      url: req.url,
      statusCode,
    },
    'Unhandled Express error',
  );

  res.status(statusCode).json({
    error: {
      code: (err as { code?: string }).code ?? 'INTERNAL_SERVER_ERROR',
      message:
        config.NODE_ENV === 'production'
          ? 'An unexpected error occurred'
          : (err as Error).message,
    },
  });
};
