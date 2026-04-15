/**
 * Centralized logger with Sentry integration.
 *
 * - dev mode: all levels go to console
 * - prod mode: warn/error go to console + Sentry
 *
 * Usage:
 *   import { logger } from '@/lib/logger';
 *   logger.debug('[Module]', 'message');
 *   logger.error('[Module]', 'crash', err);
 */
import * as Sentry from '@sentry/react';

const isDev = import.meta.env.DEV;

function noop(..._args: unknown[]) {
  // intentionally empty
}

export const logger = {
  /** Only visible during development. */
  debug: isDev ? console.log.bind(console) : noop,

  /** Only visible during development. */
  info: isDev ? console.info.bind(console) : noop,

  /** Always visible. In production, also captured by Sentry. */
  warn: (...args: unknown[]) => {
    console.warn(...args);
    if (!isDev) {
      Sentry.captureMessage(args.map(String).join(' '), 'warning');
    }
  },

  /** Always visible. In production, also captured by Sentry. */
  error: (...args: unknown[]) => {
    console.error(...args);
    if (!isDev) {
      const err = args.find(a => a instanceof Error);
      if (err) {
        Sentry.captureException(err);
      } else {
        Sentry.captureMessage(args.map(String).join(' '), 'error');
      }
    }
  },
};
