/**
 * Structured client-side logger.
 * Formats log messages with timestamps, log levels, and contextual metadata.
 * Avoids bare console.log calls.
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class ClientLogger {
  private formatMessage(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [AntiGravity-Client] [${level.toUpperCase()}]`;

    const consoleMethod = level === 'debug' ? console.debug : level === 'info' ? console.info : level === 'warn' ? console.warn : console.error;

    if (meta && Object.keys(meta).length > 0) {
      consoleMethod(`${prefix} ${message}`, meta);
    } else {
      consoleMethod(`${prefix} ${message}`);
    }
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.formatMessage('debug', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.formatMessage('info', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.formatMessage('warn', message, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.formatMessage('error', message, meta);
  }
}

export const logger = new ClientLogger();
