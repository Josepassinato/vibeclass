import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

export type VoiceProviderType = 'grok' | 'openai' | 'gemini';

interface UseVoiceProviderOptions {
  /** Preferred provider (default: grok) */
  preferred?: VoiceProviderType;
  /** Max consecutive failures before switching */
  maxFailures?: number;
  /** Callback when provider switches */
  onSwitch?: (from: VoiceProviderType, to: VoiceProviderType) => void;
}

/**
 * Manages which voice provider (OpenAI or Gemini) is active.
 * Automatically switches on repeated failures.
 */
export function useVoiceProvider(options: UseVoiceProviderOptions = {}) {
  const { preferred = 'grok', maxFailures = 3, onSwitch } = options;

  const [activeProvider, setActiveProvider] = useState<VoiceProviderType>(preferred);
  const failureCountRef = useRef(0);
  const switchCountRef = useRef(0);

  const getAlternate = useCallback((provider: VoiceProviderType): VoiceProviderType => {
    // Fallback chain: grok -> openai -> gemini -> grok
    const chain: Record<VoiceProviderType, VoiceProviderType> = {
      grok: 'openai',
      openai: 'gemini',
      gemini: 'grok',
    };
    return chain[provider];
  }, []);

  /** Record a connection failure. Returns true if provider was switched. */
  const recordFailure = useCallback((): boolean => {
    failureCountRef.current += 1;
    logger.warn(`[VoiceProvider] Failure #${failureCountRef.current} for ${activeProvider}`);

    if (failureCountRef.current >= maxFailures) {
      const alternate = getAlternate(activeProvider);
      logger.warn(`[VoiceProvider] Switching from ${activeProvider} to ${alternate}`);

      switchCountRef.current += 1;
      failureCountRef.current = 0;
      setActiveProvider(alternate);
      onSwitch?.(activeProvider, alternate);
      toast.info(`Conexao restaurada com professor alternativo`, { duration: 4000 });
      return true;
    }
    return false;
  }, [activeProvider, maxFailures, getAlternate, onSwitch]);

  /** Record a successful connection. Resets failure counter. */
  const recordSuccess = useCallback(() => {
    failureCountRef.current = 0;
  }, []);

  /** Manually set provider */
  const setProvider = useCallback((provider: VoiceProviderType) => {
    failureCountRef.current = 0;
    setActiveProvider(provider);
  }, []);

  return {
    activeProvider,
    switchCount: switchCountRef.current,
    recordFailure,
    recordSuccess,
    setProvider,
  };
}
