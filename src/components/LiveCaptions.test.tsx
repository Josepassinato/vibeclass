import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { render, screen, fireEvent } from '@testing-library/react';
import { useCaptions, LiveCaptionsOverlay, CaptionsToggle } from './LiveCaptions';

describe('useCaptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (localStorage.getItem as any).mockReturnValue(null);
  });

  it('should default to enabled', () => {
    const { result } = renderHook(() => useCaptions());
    expect(result.current.captionsEnabled).toBe(true);
  });

  it('should respect stored preference', () => {
    (localStorage.getItem as any).mockReturnValue('false');
    const { result } = renderHook(() => useCaptions());
    expect(result.current.captionsEnabled).toBe(false);
  });

  it('should toggle and persist', () => {
    const { result } = renderHook(() => useCaptions());

    act(() => result.current.toggleCaptions());
    expect(result.current.captionsEnabled).toBe(false);
    expect(localStorage.setItem).toHaveBeenCalledWith('vibe-class-captions-enabled', 'false');

    act(() => result.current.toggleCaptions());
    expect(result.current.captionsEnabled).toBe(true);
    expect(localStorage.setItem).toHaveBeenCalledWith('vibe-class-captions-enabled', 'true');
  });
});

describe('LiveCaptionsOverlay', () => {
  it('should not render when disabled', () => {
    const { container } = render(
      <LiveCaptionsOverlay text="Hello" isActive={true} enabled={false} />
    );
    expect(container.firstChild).toBeNull();
  });

  it('should not render when no text', () => {
    const { container } = render(
      <LiveCaptionsOverlay text="" isActive={true} enabled={true} />
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('CaptionsToggle', () => {
  it('should call onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<CaptionsToggle enabled={true} onToggle={onToggle} />);

    const button = screen.getByTitle('Desativar legendas');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('should show correct title based on enabled state', () => {
    const { rerender } = render(<CaptionsToggle enabled={true} onToggle={vi.fn()} />);
    expect(screen.getByTitle('Desativar legendas')).toBeTruthy();

    rerender(<CaptionsToggle enabled={false} onToggle={vi.fn()} />);
    expect(screen.getByTitle('Ativar legendas')).toBeTruthy();
  });
});
