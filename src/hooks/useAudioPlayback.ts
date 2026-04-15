import { useRef, useCallback } from 'react';

/**
 * Unified audio playback for PCM16 audio from AI providers.
 * Handles buffering, queue management, gain/compressor chain.
 */
export function useAudioPlayback(sampleRate: number = 24000) {
  const contextRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const compressorRef = useRef<DynamicsCompressorNode | null>(null);
  const queueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);

  const getContext = useCallback(() => {
    if (!contextRef.current) {
      contextRef.current = new AudioContext({ sampleRate });
    }
    return contextRef.current;
  }, [sampleRate]);

  const ensureChain = useCallback((ctx: AudioContext) => {
    if (!compressorRef.current) {
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -12;
      comp.knee.value = 20;
      comp.ratio.value = 4;
      comp.attack.value = 0.01;
      comp.release.value = 0.15;
      comp.connect(ctx.destination);
      compressorRef.current = comp;
    }
    if (!gainRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 2.0;
      gain.connect(compressorRef.current);
      gainRef.current = gain;
    }
  }, []);

  const playQueue = useCallback(async (ctx: AudioContext): Promise<void> => {
    const allSamples: Float32Array[] = [];
    while (queueRef.current.length > 0) {
      allSamples.push(queueRef.current.shift()!);
    }

    if (allSamples.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    const totalLen = allSamples.reduce((a, b) => a + b.length, 0);
    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const s of allSamples) {
      merged.set(s, offset);
      offset += s.length;
    }

    const buffer = ctx.createBuffer(1, merged.length, sampleRate);
    buffer.getChannelData(0).set(merged);

    const source = ctx.createBufferSource();
    source.buffer = buffer;
    ensureChain(ctx);
    source.connect(gainRef.current!);
    source.start();

    await new Promise<void>(resolve => { source.onended = () => resolve(); });

    if (queueRef.current.length > 0) {
      await playQueue(ctx);
    } else {
      isPlayingRef.current = false;
    }
  }, [sampleRate, ensureChain]);

  /** Decode base64 PCM16 and queue for playback. Returns true if playback started. */
  const playAudio = useCallback((base64Audio: string): boolean => {
    const ctx = getContext();
    const bin = atob(base64Audio);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) float32[i] = int16[i] / 32768;

    queueRef.current.push(float32);

    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      playQueue(ctx);
      return true; // started
    }
    return false; // already playing
  }, [getContext, playQueue]);

  const clearQueue = useCallback(() => {
    queueRef.current = [];
    isPlayingRef.current = false;
  }, []);

  const isPlaying = useCallback(() => isPlayingRef.current, []);
  const queueLength = useCallback(() => queueRef.current.length, []);

  return { playAudio, clearQueue, isPlaying, queueLength };
}
