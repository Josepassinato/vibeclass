import { useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

export interface AudioPipelineConfig {
  sampleRate: number;
  vadEnabled: boolean;
  filters?: boolean; // highpass + lowpass + compressor
}

export interface AudioPipelineCallbacks {
  onAudioChunk: (buffer: ArrayBuffer) => void;
  onVoiceDetected?: (detected: boolean) => void;
}

/**
 * Unified audio capture pipeline.
 * Handles mic access, AudioWorklet/ScriptProcessor, optional filters and VAD.
 * Used by both OpenAI and Gemini hooks.
 */
export function useAudioPipeline() {
  const contextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<AudioWorkletNode | ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const start = useCallback(async (
    config: AudioPipelineConfig,
    callbacks: AudioPipelineCallbacks,
  ) => {
    const { sampleRate, vadEnabled, filters = false } = config;

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate,
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });

    streamRef.current = stream;
    const ctx = new AudioContext({ sampleRate });
    contextRef.current = ctx;
    const source = ctx.createMediaStreamSource(stream);

    // Optional filter chain
    let lastNode: AudioNode = source;
    if (filters) {
      const highpass = ctx.createBiquadFilter();
      highpass.type = 'highpass';
      highpass.frequency.value = 85;
      highpass.Q.value = 0.7;

      const lowpass = ctx.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 8000;
      lowpass.Q.value = 0.7;

      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -24;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.1;

      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(compressor);
      lastNode = compressor;
    }

    // Try AudioWorklet, fallback to ScriptProcessor
    const useWorklet = typeof ctx.audioWorklet?.addModule === 'function';

    if (useWorklet) {
      try {
        await ctx.audioWorklet.addModule('/audio-processor.worklet.js');
        const worklet = new AudioWorkletNode(ctx, 'audio-capture-processor');
        processorRef.current = worklet;

        worklet.port.postMessage({ type: 'config', data: { vadEnabled, bufferSize: 4096 } });

        worklet.port.onmessage = (event) => {
          if (event.data.type === 'audio') {
            callbacks.onAudioChunk(event.data.buffer);
          } else if (event.data.type === 'vad') {
            callbacks.onVoiceDetected?.(event.data.isVoice);
          }
        };

        lastNode.connect(worklet);
        worklet.connect(ctx.destination);
        logger.debug(`[AudioPipeline] Started via AudioWorklet (${sampleRate}Hz, VAD=${vadEnabled})`);
        return;
      } catch (err) {
        logger.warn('[AudioPipeline] AudioWorklet failed, using ScriptProcessor:', err);
      }
    }

    // Fallback: ScriptProcessor
    const processor = ctx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
      }
      callbacks.onAudioChunk(int16.buffer);
    };

    lastNode.connect(processor);
    processor.connect(ctx.destination);
    logger.debug(`[AudioPipeline] Started via ScriptProcessor fallback (${sampleRate}Hz)`);
  }, []);

  const stop = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;

    contextRef.current?.close().catch(() => {});
    contextRef.current = null;

    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  }, []);

  return { start, stop };
}
