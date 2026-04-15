import { useRef, useCallback, useEffect } from 'react';
import { logger } from '@/lib/logger';

export type ReconnectStatus = 'idle' | 'reconnecting' | 'failed';

interface UseWebSocketReconnectOptions {
  /** Max number of reconnection attempts before giving up */
  maxAttempts?: number;
  /** Initial delay in ms before first retry */
  initialDelayMs?: number;
  /** Maximum delay in ms between retries */
  maxDelayMs?: number;
  /** Called when a reconnection attempt is starting */
  onReconnectAttempt?: (attempt: number, maxAttempts: number) => void;
  /** Called when reconnection succeeds */
  onReconnected?: () => void;
  /** Called when all attempts are exhausted */
  onReconnectFailed?: () => void;
}

const DEFAULT_MAX_ATTEMPTS = 5;
const DEFAULT_INITIAL_DELAY = 1000;
const DEFAULT_MAX_DELAY = 30000;

export function useWebSocketReconnect(options: UseWebSocketReconnectOptions = {}) {
  const {
    maxAttempts = DEFAULT_MAX_ATTEMPTS,
    initialDelayMs = DEFAULT_INITIAL_DELAY,
    maxDelayMs = DEFAULT_MAX_DELAY,
    onReconnectAttempt,
    onReconnected,
    onReconnectFailed,
  } = options;

  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const statusRef = useRef<ReconnectStatus>('idle');
  const isManualDisconnectRef = useRef(false);
  const reconnectFnRef = useRef<(() => Promise<void>) | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  /** Calculate delay with exponential backoff + jitter */
  const getDelay = useCallback((attempt: number): number => {
    const exponential = initialDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * initialDelayMs * 0.5;
    return Math.min(exponential + jitter, maxDelayMs);
  }, [initialDelayMs, maxDelayMs]);

  /** Reset state — call after successful reconnection or manual disconnect */
  const reset = useCallback(() => {
    clearTimer();
    attemptRef.current = 0;
    statusRef.current = 'idle';
  }, [clearTimer]);

  /** Mark that the user disconnected intentionally (skip auto-reconnect) */
  const markManualDisconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    reset();
  }, [reset]);

  /** Register the reconnect function (typically the connect() from the voice hook) */
  const setReconnectFn = useCallback((fn: () => Promise<void>) => {
    reconnectFnRef.current = fn;
  }, []);

  /** Trigger reconnection logic — call this from ws.onclose / ws.onerror */
  const scheduleReconnect = useCallback(() => {
    // Don't reconnect if user disconnected intentionally
    if (isManualDisconnectRef.current) {
      isManualDisconnectRef.current = false;
      logger.debug('[Reconnect] Manual disconnect, skipping reconnect');
      return;
    }

    // Don't reconnect if offline — wait for online event
    if (!navigator.onLine) {
      logger.debug('[Reconnect] Offline, waiting for network to return');
      statusRef.current = 'reconnecting';
      return;
    }

    if (attemptRef.current >= maxAttempts) {
      logger.warn('[Reconnect] Max attempts reached, giving up');
      statusRef.current = 'failed';
      onReconnectFailed?.();
      return;
    }

    if (!reconnectFnRef.current) {
      logger.warn('[Reconnect] No reconnect function registered');
      return;
    }

    statusRef.current = 'reconnecting';
    const attempt = attemptRef.current;
    const delay = getDelay(attempt);

    logger.debug(`[Reconnect] Attempt ${attempt + 1}/${maxAttempts} in ${Math.round(delay)}ms`);
    onReconnectAttempt?.(attempt + 1, maxAttempts);

    clearTimer();
    timerRef.current = setTimeout(async () => {
      attemptRef.current += 1;
      try {
        await reconnectFnRef.current!();
        // If connect succeeds, reset
        logger.debug('[Reconnect] Reconnected successfully');
        reset();
        onReconnected?.();
      } catch (err) {
        logger.warn('[Reconnect] Attempt failed:', err);
        // Schedule next attempt
        scheduleReconnect();
      }
    }, delay);
  }, [maxAttempts, getDelay, clearTimer, reset, onReconnectAttempt, onReconnected, onReconnectFailed]);

  /** Listen for browser online event to resume reconnection */
  useEffect(() => {
    const handleOnline = () => {
      if (statusRef.current === 'reconnecting') {
        logger.debug('[Reconnect] Network back online, resuming reconnect');
        attemptRef.current = 0; // Reset attempts since it was a network issue
        scheduleReconnect();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimer();
    };
  }, [scheduleReconnect, clearTimer]);

  return {
    scheduleReconnect,
    markManualDisconnect,
    setReconnectFn,
    reset,
    getReconnectStatus: () => statusRef.current,
  };
}
