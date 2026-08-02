import pino from 'pino';
import { config } from './config.js';

/**
 * Singleton Pino logger instance.
 *
 * Usage across the server:
 *   import { logger } from './logger.js';
 *   logger.info({ roomId, event: 'room_created' }, 'Room created');
 *
 * In development: pretty-printed output (human-readable).
 * In production:  raw JSON output (machine-readable for log aggregators).
 *
 * Per CONVENTIONS.md — never log a full userToken.
 * Use the truncateToken() helper exported from this module.
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  base: { service: 'watchmate-server' },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(config.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:HH:MM:ss',
        ignore: 'pid,hostname,service',
        messageFormat: '[{service}] {msg}',
      },
    },
  }),
});

/**
 * Truncates a userToken to the first 8 characters for safe log output.
 *
 * Per CONVENTIONS.md: userToken values in logs are always truncated
 * to prevent token leakage in log files or log aggregator UIs.
 *
 * @example
 * logger.info({ token: truncateToken(userToken) }, 'User joined');
 * // → { token: 'abc12345...' }
 */
export function truncateToken(token: string): string {
  return `${token.slice(0, 8)}...`;
}
