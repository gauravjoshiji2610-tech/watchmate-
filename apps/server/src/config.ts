import 'dotenv/config';
import { z } from 'zod';

/**
 * Zod schema for all server environment variables.
 *
 * Rules:
 * - Required vars have no default — missing them exits the process.
 * - Optional vars with safe defaults use .default().
 * - Numeric env vars are coerced from string via z.coerce.number().
 * - NODE_ENV is restricted to known values.
 *
 * Add new vars here as new phases are implemented.
 * Keep in sync with apps/server/.env.example.
 */
const envSchema = z.object({
  // ── Server ──────────────────────────────────────────────────────────────────
  PORT: z.coerce.number().int().min(1).max(65535).default(3001),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // ── CORS ────────────────────────────────────────────────────────────────────
  CORS_ORIGIN: z.string().url('CORS_ORIGIN must be a valid URL with protocol'),

  // ── Redis (Phase 4) ──────────────────────────────────────────────────────────
  REDIS_URL: z.string().url('REDIS_URL must be a valid Redis connection URL'),
  ROOM_TTL_SECONDS: z.coerce.number().int().min(60).default(7200),
  MAX_ACTIVE_ROOMS: z.coerce.number().int().min(1).default(5),

  // ── Reconnect (Phase 5) ──────────────────────────────────────────────────────
  RECONNECT_GRACE_PERIOD_MS: z.coerce.number().int().min(1000).default(20000),

  // ── Rate Limiting (Phase 6) ──────────────────────────────────────────────────
  RATE_LIMIT_CHAT_MAX_MESSAGES: z.coerce.number().int().min(1).default(20),
  RATE_LIMIT_CHAT_WINDOW_MS: z.coerce.number().int().min(1000).default(10000),
  RATE_LIMIT_API_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_API_WINDOW_MS: z.coerce.number().int().min(1000).default(60000),

  // ── Logging ──────────────────────────────────────────────────────────────────
  LOG_LEVEL: z
    .enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal'])
    .default('info'),

  // ── TURN / ICE (Phase 8) ─────────────────────────────────────────────────────
  TURN_URLS: z.string().min(1, 'TURN_URLS must not be empty').default(''),
  TURN_USERNAME: z.string().default(''),
  TURN_CREDENTIAL: z.string().default(''),
});

/**
 * Parsed and validated configuration object.
 * Import this throughout the server — never import process.env directly.
 */
export type Config = z.infer<typeof envSchema>;

function loadConfig(): Config {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Format errors clearly before crashing — never swallow config failures
    const formatted = result.error.errors
      .map((e) => `  ${e.path.join('.')}: ${e.message}`)
      .join('\n');

    console.error(
      `\n[WatchMate] Server startup failed — invalid environment variables:\n${formatted}\n\n` +
        `Copy apps/server/.env.example to apps/server/.env and fill in required values.\n`,
    );
    process.exit(1);
  }

  return result.data;
}

export const config = loadConfig();
