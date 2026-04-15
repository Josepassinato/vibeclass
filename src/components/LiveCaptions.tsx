import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Subtitles, MessageSquareOff } from 'lucide-react';

const STORAGE_KEY = 'vibe-class-captions-enabled';
const FADE_DELAY_MS = 5000;

interface LiveCaptionsOverlayProps {
  /** Current transcript text from the AI tutor */
  text: string;
  /** Whether the AI is currently speaking */
  isActive: boolean;
  /** Whether captions are enabled */
  enabled: boolean;
}

/** Overlay rendered inside a position:relative video container */
export function LiveCaptionsOverlay({ text, isActive, enabled }: LiveCaptionsOverlayProps) {
  const [visible, setVisible] = useState(false);
  const [displayText, setDisplayText] = useState('');
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearFadeTimer = useCallback(() => {
    if (fadeTimerRef.current) {
      clearTimeout(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!text || !enabled) {
      if (!enabled) {
        setVisible(false);
        clearFadeTimer();
      }
      return;
    }

    setDisplayText(text);
    setVisible(true);
    clearFadeTimer();

    if (!isActive) {
      fadeTimerRef.current = setTimeout(() => setVisible(false), FADE_DELAY_MS);
    }
  }, [text, enabled, isActive, clearFadeTimer]);

  useEffect(() => {
    if (!isActive && displayText && enabled) {
      clearFadeTimer();
      fadeTimerRef.current = setTimeout(() => setVisible(false), FADE_DELAY_MS);
    }
    if (isActive && enabled && displayText) {
      clearFadeTimer();
      setVisible(true);
    }
  }, [isActive, displayText, enabled, clearFadeTimer]);

  useEffect(() => {
    return () => clearFadeTimer();
  }, [clearFadeTimer]);

  if (!enabled || !visible || !displayText) return null;

  return (
    <div className="absolute bottom-14 sm:bottom-16 left-2 right-2 z-10 flex justify-center pointer-events-none">
      <div className="bg-black/80 backdrop-blur-sm text-white px-3 py-2 rounded-lg max-w-[90%] text-center">
        <p className="text-sm sm:text-base leading-snug">{displayText}</p>
      </div>
    </div>
  );
}

/** Toggle button for enabling/disabling captions */
export function CaptionsToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onToggle}
      className="h-11 w-11 sm:h-9 sm:w-9 p-0"
      title={enabled ? 'Desativar legendas' : 'Ativar legendas'}
    >
      {enabled ? (
        <Subtitles className="h-4 w-4" />
      ) : (
        <MessageSquareOff className="h-4 w-4" />
      )}
    </Button>
  );
}

/** Hook to manage captions state with localStorage persistence */
export function useCaptions() {
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === null ? true : stored === 'true';
  });

  const toggle = useCallback(() => {
    setEnabled(prev => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  return { captionsEnabled: enabled, toggleCaptions: toggle };
}
