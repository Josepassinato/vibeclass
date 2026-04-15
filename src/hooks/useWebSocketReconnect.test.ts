import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWebSocketReconnect } from './useWebSocketReconnect';

describe('useWebSocketReconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, 'onLine', { value: true, writable: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start in idle state', () => {
    const { result } = renderHook(() => useWebSocketReconnect());
    expect(result.current.getReconnectStatus()).toBe('idle');
  });

  it('should not reconnect after manual disconnect', () => {
    const onReconnectAttempt = vi.fn();
    const { result } = renderHook(() => useWebSocketReconnect({ onReconnectAttempt }));

    const mockConnect = vi.fn().mockResolvedValue(undefined);
    act(() => result.current.setReconnectFn(mockConnect));

    act(() => result.current.markManualDisconnect());
    act(() => result.current.scheduleReconnect());

    vi.advanceTimersByTime(10000);
    expect(onReconnectAttempt).not.toHaveBeenCalled();
    expect(mockConnect).not.toHaveBeenCalled();
  });

  it('should schedule reconnect with exponential backoff', () => {
    const onReconnectAttempt = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnectAttempt, maxAttempts: 3, initialDelayMs: 100, maxDelayMs: 5000 })
    );

    const mockConnect = vi.fn().mockRejectedValue(new Error('fail'));
    act(() => result.current.setReconnectFn(mockConnect));
    act(() => result.current.scheduleReconnect());

    // First attempt after ~100ms
    vi.advanceTimersByTime(200);
    expect(onReconnectAttempt).toHaveBeenCalledWith(1, 3);
  });

  it('should call onReconnectFailed after max attempts', async () => {
    const onReconnectFailed = vi.fn();
    const { result } = renderHook(() =>
      useWebSocketReconnect({ onReconnectFailed, maxAttempts: 1, initialDelayMs: 50, maxDelayMs: 100 })
    );

    const mockConnect = vi.fn().mockRejectedValue(new Error('fail'));
    act(() => result.current.setReconnectFn(mockConnect));

    // First scheduleReconnect - attempt 0 < maxAttempts(1), will schedule
    act(() => result.current.scheduleReconnect());
    await vi.advanceTimersByTimeAsync(200);

    // After first attempt fails, scheduleReconnect is called again, attempt is now 1 >= maxAttempts(1)
    expect(onReconnectFailed).toHaveBeenCalled();
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => useWebSocketReconnect());

    const mockConnect = vi.fn().mockRejectedValue(new Error('fail'));
    act(() => result.current.setReconnectFn(mockConnect));
    act(() => result.current.scheduleReconnect());
    act(() => result.current.reset());

    expect(result.current.getReconnectStatus()).toBe('idle');
  });

  it('should not reconnect when offline', () => {
    Object.defineProperty(navigator, 'onLine', { value: false, writable: true });

    const onReconnectAttempt = vi.fn();
    const { result } = renderHook(() => useWebSocketReconnect({ onReconnectAttempt }));

    const mockConnect = vi.fn().mockResolvedValue(undefined);
    act(() => result.current.setReconnectFn(mockConnect));
    act(() => result.current.scheduleReconnect());

    vi.advanceTimersByTime(60000);
    // Should not attempt reconnect while offline
    expect(mockConnect).not.toHaveBeenCalled();
  });
});
