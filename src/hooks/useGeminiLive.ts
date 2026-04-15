import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoControls } from '@/types/video';
import { logger } from '@/lib/logger';
import { useWebSocketReconnect, ReconnectStatus } from './useWebSocketReconnect';

interface UseGeminiLiveOptions {
  systemInstruction?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  videoControls?: VideoControls | null;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

const stripEmojis = (input: string) => {
  try {
    // Removes most emoji/pictographic symbols
    return input.replace(/\p{Extended_Pictographic}/gu, '').replace(/\uFE0F/g, '');
  } catch {
    // Fallback for environments without unicode property escapes
    return input;
  }
};

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isVoiceDetected, setIsVoiceDetected] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState<ReconnectStatus>('idle');
  
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const videoControlsRef = useRef<VideoControls | null>(null);
  const processedCallIdsRef = useRef<Set<string>>(new Set());

  // Store callbacks in refs to avoid dependency issues
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  // Keep videoControls ref updated
  useEffect(() => {
    logger.debug('[GeminiLive] videoControls updated:', options.videoControls ? 'EXISTS' : 'NULL');
    videoControlsRef.current = options.videoControls || null;
  }, [options.videoControls]);

  // WebSocket reconnect with exponential backoff
  const {
    scheduleReconnect,
    markManualDisconnect,
    setReconnectFn,
    reset: resetReconnect,
  } = useWebSocketReconnect({
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    onReconnectAttempt: (attempt, max) => {
      setReconnectStatus('reconnecting');
      toast.info(`Reconectando ao tutor Gemini... (${attempt}/${max})`, { duration: 3000 });
    },
    onReconnected: () => {
      setReconnectStatus('idle');
      toast.success('Conexao com o tutor restaurada!', { duration: 3000 });
    },
    onReconnectFailed: () => {
      setReconnectStatus('failed');
      toast.error('Nao foi possivel reconectar ao tutor. Tente iniciar a aula novamente.', { duration: 8000 });
    },
  });

  const updateStatus = useCallback((newStatus: ConnectionStatus) => {
    setStatus(newStatus);
    optionsRef.current.onStatusChange?.(newStatus);
  }, []);

  const playQueue = useCallback(async (ctx: AudioContext) => {
    while (audioQueueRef.current.length > 0) {
      const samples = audioQueueRef.current.shift()!;
      const buffer = ctx.createBuffer(1, samples.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) {
        channelData[i] = samples[i];
      }
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      
      await new Promise(resolve => {
        source.onended = resolve;
      });
    }
    isPlayingRef.current = false;
    setIsSpeaking(false);
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext({ sampleRate: 24000 });
    }
    
    const ctx = audioContextRef.current;
    
    // Decode base64 to PCM
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Convert to Int16 array
    const int16Array = new Int16Array(bytes.buffer);
    
    // Convert to Float32
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768;
    }
    
    audioQueueRef.current.push(float32Array);
    
    if (!isPlayingRef.current) {
      isPlayingRef.current = true;
      setIsSpeaking(true);
      playQueue(ctx);
    }
  }, [playQueue]);

  const stopListening = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (captureContextRef.current) {
      captureContextRef.current.close().catch(() => {});
      captureContextRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    setIsListening(false);
  }, []);

  // Helper to wait for agent to finish speaking before playing video
  // Waits until audio queue is empty + 2 second buffer for natural pause
  const waitForSpeechToEnd = useCallback((): Promise<void> => {
    return new Promise((resolve) => {
      const checkSpeech = () => {
        const queueLength = audioQueueRef.current.length;
        const isPlaying = isPlayingRef.current;
        logger.debug('[GEMINI] Aguardando fala terminar - queue:', queueLength, 'isPlaying:', isPlaying);
        
        if (queueLength === 0 && !isPlaying) {
          logger.debug('[GEMINI] Fala terminou, aguardando 5 segundos...');
          // 5 second buffer after speech ends for natural pause
          setTimeout(() => {
            logger.debug('[GEMINI] Buffer de 5s concluído, prosseguindo...');
            resolve();
          }, 5000);
        } else {
          setTimeout(checkSpeech, 100);
        }
      };
      checkSpeech();
    });
  }, []);

  const handleToolCall = useCallback((functionCall: { name: string; id?: string; args?: Record<string, unknown> }) => {
    const name = functionCall.name;
    const callId = functionCall.id || `call_${Date.now()}`;
    const args = functionCall.args || {};

    // Detailed debug logging
    logger.debug('='.repeat(60));
    logger.debug('[GEMINI TOOL CALL] Recebido');
    logger.debug('[GEMINI TOOL CALL] Funcao:', name);
    logger.debug('[GEMINI TOOL CALL] Call ID:', callId);
    logger.debug('[GEMINI TOOL CALL] Argumentos:', JSON.stringify(args, null, 2));
    logger.debug('[GEMINI TOOL CALL] Raw functionCall:', JSON.stringify(functionCall, null, 2));
    logger.debug('[GEMINI TOOL CALL] Video Controls:', videoControlsRef.current ? 'DISPONIVEL' : 'INDISPONIVEL');
    logger.debug('[GEMINI TOOL CALL] Audio Queue:', audioQueueRef.current.length, 'isPlaying:', isPlayingRef.current);
    
    if (videoControlsRef.current) {
      logger.debug('[GEMINI TOOL CALL] Video Status - isPaused:', videoControlsRef.current.isPaused());
      logger.debug('[GEMINI TOOL CALL] Video Status - currentTime:', videoControlsRef.current.getCurrentTime());
    }

    if (processedCallIdsRef.current.has(callId)) {
      logger.debug('[GEMINI TOOL CALL] IGNORADO - Call ID ja processado:', callId);
      logger.debug('='.repeat(60));
      return;
    }
    processedCallIdsRef.current.add(callId);
    logger.debug('[GEMINI TOOL CALL] Call ID adicionado ao set de processados');

    // For play and restart, we need to wait for speech to end
    const executeWithDelay = async () => {
      let result: { ok: boolean; message?: string } = { ok: true };

      if (videoControlsRef.current) {
        const beforePaused = videoControlsRef.current.isPaused();
        const beforeTime = videoControlsRef.current.getCurrentTime();
        
        switch (name) {
          case "play_video":
            logger.debug('[GEMINI TOOL CALL] EXECUTANDO: play_video');
            logger.debug('[GEMINI TOOL CALL] Estado antes: isPaused =', beforePaused);
            logger.debug('[GEMINI TOOL CALL] Aguardando agente terminar de falar antes de dar play...');
            toast.info('Aguardando professor terminar de falar...', { duration: 2000 });
            await waitForSpeechToEnd();
            logger.debug('[GEMINI TOOL CALL] Agente terminou de falar, dando play agora!');
            toast.success('Dando play no video...', { duration: 2000 });
            videoControlsRef.current.play();
            setTimeout(() => {
              logger.debug('[GEMINI TOOL CALL] Estado depois: isPaused =', videoControlsRef.current?.isPaused());
            }, 100);
            result = { ok: true, message: "Video iniciado" };
            break;
          case "pause_video":
            logger.debug('[GEMINI TOOL CALL] EXECUTANDO: pause_video');
            logger.debug('[GEMINI TOOL CALL] Estado antes: isPaused =', beforePaused);
            toast.success('Pausando video...', { duration: 2000 });
            videoControlsRef.current.pause();
            setTimeout(() => {
              logger.debug('[GEMINI TOOL CALL] Estado depois: isPaused =', videoControlsRef.current?.isPaused());
            }, 100);
            result = { ok: true, message: "Video pausado" };
            break;
          case "restart_video":
            logger.debug('[GEMINI TOOL CALL] EXECUTANDO: restart_video');
            logger.debug('[GEMINI TOOL CALL] Tempo antes:', beforeTime);
            logger.debug('[GEMINI TOOL CALL] Aguardando agente terminar de falar antes de reiniciar...');
            toast.info('Aguardando professor terminar de falar...', { duration: 2000 });
            await waitForSpeechToEnd();
            logger.debug('[GEMINI TOOL CALL] Agente terminou de falar, reiniciando agora!');
            toast.success('Reiniciando video...', { duration: 2000 });
            videoControlsRef.current.restart();
            setTimeout(() => {
              logger.debug('[GEMINI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
            }, 100);
            result = { ok: true, message: "Video reiniciado" };
            break;
          case "seek_video":
            const targetSeconds = Number(args.seconds) || 0;
            logger.debug('[GEMINI TOOL CALL] EXECUTANDO: seek_video');
            logger.debug('[GEMINI TOOL CALL] Tempo antes:', beforeTime, '-> Destino:', targetSeconds);
            toast.success(`Pulando para ${targetSeconds}s...`, { duration: 2000 });
            videoControlsRef.current.seekTo(targetSeconds);
            setTimeout(() => {
              logger.debug('[GEMINI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
            }, 100);
            result = { ok: true, message: `Video pulou para ${targetSeconds} segundos` };
            break;
          default:
            logger.warn('[GEMINI TOOL CALL] ERRO: Funcao desconhecida:', name);
            result = { ok: false, message: `Funcao desconhecida: ${name}` };
        }
      } else {
        logger.error('[GEMINI TOOL CALL] ERRO: videoControlsRef.current e NULL');
        logger.error('[GEMINI TOOL CALL] Nao foi possivel executar:', name);
        toast.error('Nenhum video carregado');
        result = { ok: false, message: "Nenhum video carregado" };
      }

      logger.debug('[GEMINI TOOL CALL] Resultado:', JSON.stringify(result));

      // Send tool response back to Gemini using the correct format
      // The Gemini Live API expects the response in a specific structure
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        // Try the standard toolResponse format first
        const response = {
          toolResponse: {
            functionResponses: [{
              id: callId,
              name: name,
              response: result
            }]
          }
        };
        logger.debug('[GEMINI TOOL CALL] Enviando resposta:', JSON.stringify(response, null, 2));
        wsRef.current.send(JSON.stringify(response));
        logger.debug('[GEMINI TOOL CALL] Resposta enviada com sucesso');
      } else {
        logger.error('[GEMINI TOOL CALL] ERRO: WebSocket nao esta aberto, estado:', wsRef.current?.readyState);
      }
      
      logger.debug('='.repeat(60));
    };

    // Execute async
    executeWithDelay();
  }, [waitForSpeechToEnd]);

  const connect = useCallback(async () => {
    try {
      logger.debug('[GeminiLive] Starting connection...');
      updateStatus('connecting');
      
      const currentOptions = optionsRef.current;
      
       // Get API key (and preferred Live model) from backend function
      logger.debug('[GeminiLive] Requesting token from edge function...');
      const { data, error } = await supabase.functions.invoke('gemini-token', {
        body: { systemInstruction: currentOptions.systemInstruction }
      });
      
      if (error || !data?.token) {
        logger.error('[GeminiLive] Token error:', error);
        throw new Error(error?.message || 'Failed to get token');
      }
      
      logger.debug('[GeminiLive] Token received, connecting to WebSocket...');
      
      // Connect to Gemini Live API
      // IMPORTANT: Live API uses v1alpha for BidiGenerateContent
      const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${data.token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      
       const preferredModel = (() => {
          const m = (data as any)?.model as string | undefined;
          if (!m) return 'models/gemini-live-2.5-flash-preview';
          return m.startsWith('models/') ? m : `models/${m}`;
        })();

        const supportsToolCalling = (data as any)?.supportsToolCalling !== false;

        logger.debug('[GeminiLive] Using model:', preferredModel, 'supportsToolCalling:', supportsToolCalling);

        if (!supportsToolCalling) {
          toast.warning('Modelo atual não suporta controle de vídeo por voz. Use os botões na tela.', { duration: 5000 });
        }

       ws.onopen = () => {
        logger.debug('WebSocket connected to Gemini');
        processedCallIdsRef.current.clear();
        
        // Define tools for video control - only if model supports it
        const tools = supportsToolCalling ? [{
          functionDeclarations: [
            {
              name: "play_video",
              description: "OBRIGATORIO: Chame esta funcao para iniciar ou retomar o video. Gatilhos: 'play', 'da play', 'inicia', 'comeca', 'continua', 'roda', 'reproduz', 'volta a tocar', 'pode continuar'. Sempre que o aluno quiser que o video volte a rodar, use esta funcao."
            },
            {
              name: "pause_video",
              description: "OBRIGATORIO: Chame esta funcao para pausar o video. Gatilhos: 'pausa', 'para', 'pause', 'espera', 'segura', 'para ai', 'um momento', 'calma', 'interrompe'. Sempre que o aluno quiser parar o video temporariamente, use esta funcao."
            },
            {
              name: "restart_video",
              description: "OBRIGATORIO: Chame esta funcao para reiniciar o video do inicio. Gatilhos: 'reinicia', 'recomeca', 'volta pro inicio', 'do zero', 'desde o comeco', 'de novo', 'novamente'. Sempre que o aluno quiser ver o video desde o principio, use esta funcao."
            },
            {
              name: "seek_video",
              description: "Pula para um momento especifico do video em segundos. Use quando o aluno mencionar um tempo especifico.",
              parameters: {
                type: "object",
                properties: {
                  seconds: { 
                    type: "number", 
                    description: "O tempo em segundos para pular" 
                  }
                },
                required: ["seconds"]
              }
            }
          ]
        }] : undefined;
        
        // Build system instruction - add note about video control if tools not supported
        let systemText = currentOptions.systemInstruction || "Você é um professor amigável e didático. Seu objetivo é ensinar de forma clara e envolvente. Fale em português brasileiro.";
        if (!supportsToolCalling) {
          systemText += "\n\nNOTA: O controle de vídeo por voz não está disponível neste momento. Quando o aluno pedir para pausar, dar play ou reiniciar o vídeo, oriente-o a usar os botões na interface.";
        }

        // Send setup message
        // Using Kore voice - warm female voice
        // Note: For Gemini Live API with audio, only AUDIO modality is supported
        const setupMessage: Record<string, unknown> = {
          setup: {
            model: preferredModel,
            generationConfig: {
              temperature: 0.7,
              responseModalities: ["AUDIO"],
              speechConfig: {
                languageCode: "pt-BR",
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Kore"
                  }
                }
              }
            },
            systemInstruction: {
              parts: [{
                text: stripEmojis(systemText)
              }]
            },
          }
        };
        
        // Only add tools if model supports function calling
        if (tools) {
          setupMessage.setup.tools = tools;
        }
        
        logger.debug('[GeminiLive] Enviando setup:', JSON.stringify(setupMessage, null, 2).substring(0, 500));
        ws.send(JSON.stringify(setupMessage));
        
        updateStatus('connected');
      };
      
      ws.onmessage = async (event) => {
        try {
          // Handle binary data (Blob)
          let messageData = event.data;
          
          if (messageData instanceof Blob) {
            messageData = await messageData.text();
          }
          
          // Skip if not a string
          if (typeof messageData !== 'string') {
            logger.debug('[gemini:event] Received non-string data, skipping');
            return;
          }
          
          const data = JSON.parse(messageData);
          
          // Log ALL messages for complete debugging
          logger.debug('[GEMINI RAW]', JSON.stringify(data).substring(0, 500));
          
          // Check for tool calls in ALL possible locations
          const hasToolCallInParts = data.serverContent?.modelTurn?.parts?.some((p: any) => p.functionCall);
          const hasToolCallInCandidates = data.candidates?.[0]?.content?.parts?.some((p: any) => p.functionCall);
          const hasToolCallInToolCallField = !!data.toolCall;
          const hasDirectFunctionCall = !!data.functionCall;
          // New: check for tool_call (snake_case variant)
          const hasSnakeCaseToolCall = !!data.tool_call;
          // New: check serverContent.toolCall
          const hasServerContentToolCall = !!data.serverContent?.toolCall;
          
          const hasToolCall = hasToolCallInParts || hasToolCallInCandidates || 
                            hasToolCallInToolCallField || hasDirectFunctionCall || 
                            hasSnakeCaseToolCall || hasServerContentToolCall;
          
          if (hasToolCall) {
            logger.debug('*'.repeat(60));
            logger.debug('[GEMINI EVENT] TOOL CALL DETECTADO!');
            logger.debug('[GEMINI EVENT] hasToolCallInParts:', hasToolCallInParts);
            logger.debug('[GEMINI EVENT] hasToolCallInCandidates:', hasToolCallInCandidates);
            logger.debug('[GEMINI EVENT] hasToolCallInToolCallField:', hasToolCallInToolCallField);
            logger.debug('[GEMINI EVENT] hasDirectFunctionCall:', hasDirectFunctionCall);
            logger.debug('[GEMINI EVENT] hasSnakeCaseToolCall:', hasSnakeCaseToolCall);
            logger.debug('[GEMINI EVENT] hasServerContentToolCall:', hasServerContentToolCall);
            logger.debug('[GEMINI EVENT] Dados completos:', JSON.stringify(data, null, 2));
            logger.debug('*'.repeat(60));
          } else {
            // Log resumido para outros eventos
            const eventType = data.setupComplete ? 'SETUP' : 
                            data.serverContent?.modelTurn ? 'MODEL_TURN' : 
                            data.serverContent?.interrupted ? 'INTERRUPTED' : 
                            data.serverContent?.turnComplete ? 'TURN_COMPLETE' : 'OTHER';
            logger.debug('[GEMINI EVENT]', eventType);
          }
          
          // Handle audio response
          if (data.serverContent?.modelTurn?.parts) {
            logger.debug('[GEMINI EVENT] Processando modelTurn com', data.serverContent.modelTurn.parts.length, 'parts');
            for (const part of data.serverContent.modelTurn.parts) {
              if (part.inlineData?.data) {
                await playAudioChunk(part.inlineData.data);
              }
              if (part.text) {
                logger.debug('[GEMINI EVENT] Texto recebido:', part.text.substring(0, 100));
                optionsRef.current.onTranscript?.(part.text, 'assistant');
              }
              // Handle function calls in parts
              if (part.functionCall) {
                logger.debug('[GEMINI EVENT] functionCall encontrado em part!');
                logger.debug('[GEMINI EVENT] functionCall:', JSON.stringify(part.functionCall, null, 2));
                handleToolCall(part.functionCall);
              }
            }
          }
          
          // Handle tool calls in toolCall field (camelCase)
          if (data.toolCall?.functionCalls) {
            logger.debug('[GEMINI EVENT] functionCalls encontrado em toolCall!');
            for (const fc of data.toolCall.functionCalls) {
              handleToolCall(fc);
            }
          }
          
          // Handle tool calls in tool_call field (snake_case variant)
          if (data.tool_call?.function_calls) {
            logger.debug('[GEMINI EVENT] function_calls encontrado em tool_call!');
            for (const fc of data.tool_call.function_calls) {
              handleToolCall(fc);
            }
          }
          
          // Handle serverContent.toolCall
          if (data.serverContent?.toolCall?.functionCalls) {
            logger.debug('[GEMINI EVENT] functionCalls encontrado em serverContent.toolCall!');
            for (const fc of data.serverContent.toolCall.functionCalls) {
              handleToolCall(fc);
            }
          }
          
          // Handle tool calls directly on data
          if (data.functionCall) {
            logger.debug('[GEMINI EVENT] functionCall encontrado diretamente em data!');
            handleToolCall(data.functionCall);
          }
          
          // Handle function_call (snake_case variant)
          if (data.function_call) {
            logger.debug('[GEMINI EVENT] function_call (snake_case) encontrado!');
            handleToolCall(data.function_call);
          }
          
          // Handle tool calls in candidates format
          if (data.candidates?.[0]?.content?.parts) {
            for (const part of data.candidates[0].content.parts) {
              if (part.functionCall) {
                logger.debug('[GEMINI EVENT] functionCall encontrado em candidates!');
                handleToolCall(part.functionCall);
              }
            }
          }
          
          // Handle interruption
          if (data.serverContent?.interrupted) {
            logger.debug('[GEMINI EVENT] Interrupcao detectada');
            audioQueueRef.current = [];
            isPlayingRef.current = false;
            setIsSpeaking(false);
          }

          // Handle setup complete
          if (data.setupComplete) {
            logger.debug('[GEMINI EVENT] Setup completo - tools configuradas');
          }
        } catch (e) {
          // Only log if it's not a parse error from binary data
          if (e instanceof SyntaxError) {
            logger.debug('[gemini:event] Non-JSON message received, likely binary audio');
          } else {
            logger.error('Error processing message:', e);
          }
        }
      };
      
      ws.onerror = (error) => {
        logger.error('[GeminiLive] WebSocket error:', error);
        logger.error('[GeminiLive] WebSocket error details:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        updateStatus('error');
        optionsRef.current.onError?.('Erro de conexao com Gemini');
      };
      
       ws.onclose = (event) => {
        logger.debug('[GeminiLive] WebSocket closed');
        logger.debug('[GeminiLive] Close code:', event.code);
        logger.debug('[GeminiLive] Close reason:', event.reason || 'Nenhuma razao fornecida');
        logger.debug('[GeminiLive] Was clean:', event.wasClean);

        updateStatus('disconnected');
        stopListening();

        // Auto-reconnect for abnormal closures
        if (event.code !== 1000 && event.code !== 1001) {
          logger.warn('[GeminiLive] Fechamento anormal, tentando reconectar...');
          scheduleReconnect();
        }
      };
      
    } catch (error) {
      logger.error('[GeminiLive] Connection error:', error);
      updateStatus('error');
      optionsRef.current.onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [updateStatus, playAudioChunk, stopListening, handleToolCall]);

  // Register connect function for auto-reconnect
  useEffect(() => {
    setReconnectFn(connect);
  }, [connect, setReconnectFn]);

  const disconnect = useCallback(() => {
    markManualDisconnect();
    stopListening();

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    updateStatus('disconnected');
  }, [updateStatus, stopListening, markManualDisconnect]);

  /** Convert Int16 ArrayBuffer to base64 and send to Gemini */
  const sendGeminiAudio = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    wsRef.current.send(JSON.stringify({
      realtimeInput: {
        mediaChunks: [{ mimeType: "audio/pcm;rate=16000", data: btoa(binary) }]
      }
    }));
  }, []);

  /** Build audio filter chain: highpass -> lowpass -> compressor */
  const buildFilterChain = useCallback((ctx: AudioContext, source: MediaStreamAudioSourceNode) => {
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

    return compressor;
  }, []);

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      optionsRef.current.onError?.('Not connected');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // @ts-ignore - experimental features for better noise resistance
          suppressLocalAudioPlayback: true,
          voiceIsolation: true,
        }
      });

      mediaStreamRef.current = stream;
      const audioContext = new AudioContext({ sampleRate: 16000 });
      captureContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);
      const lastFilterNode = buildFilterChain(audioContext, source);

      // Try AudioWorklet first, fall back to ScriptProcessor
      const useWorklet = typeof audioContext.audioWorklet?.addModule === 'function';

      if (useWorklet) {
        try {
          await audioContext.audioWorklet.addModule('/audio-processor.worklet.js');
          const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
          processorRef.current = workletNode;

          workletNode.port.postMessage({ type: 'config', data: { vadEnabled: true, bufferSize: 4096 } });

          workletNode.port.onmessage = (event) => {
            if (event.data.type === 'audio') {
              sendGeminiAudio(event.data.buffer);
            } else if (event.data.type === 'vad') {
              setIsVoiceDetected(event.data.isVoice);
            }
          };

          lastFilterNode.connect(workletNode);
          workletNode.connect(audioContext.destination);
          logger.debug('[GeminiLive] Audio pipeline via AudioWorklet com VAD');
          setIsListening(true);
          return;
        } catch (workletErr) {
          logger.warn('[GeminiLive] AudioWorklet failed, falling back to ScriptProcessor:', workletErr);
        }
      }

      // Fallback: ScriptProcessor with inline VAD
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      const VAD_ENERGY_THRESHOLD = 0.008;
      const VAD_ZERO_CROSSING_MIN = 10;
      const VAD_ZERO_CROSSING_MAX = 800;
      let silentFrameCount = 0;
      const SILENT_FRAMES_BEFORE_MUTE = 3;
      let noiseFloor = 0.002;
      const NOISE_ADAPTATION_RATE = 0.05;

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);

        let sumSquares = 0;
        let zeroCrossings = 0;
        let prevSample = 0;
        for (let i = 0; i < inputData.length; i++) {
          sumSquares += inputData[i] * inputData[i];
          if ((prevSample >= 0 && inputData[i] < 0) || (prevSample < 0 && inputData[i] >= 0)) zeroCrossings++;
          prevSample = inputData[i];
        }

        const rmsEnergy = Math.sqrt(sumSquares / inputData.length);
        if (rmsEnergy < noiseFloor * 2) {
          noiseFloor = noiseFloor * (1 - NOISE_ADAPTATION_RATE) + rmsEnergy * NOISE_ADAPTATION_RATE;
        }
        const dynamicThreshold = Math.max(VAD_ENERGY_THRESHOLD, noiseFloor * 3);
        const detected = rmsEnergy > dynamicThreshold && zeroCrossings >= VAD_ZERO_CROSSING_MIN && zeroCrossings <= VAD_ZERO_CROSSING_MAX;
        setIsVoiceDetected(detected);

        if (!detected) {
          silentFrameCount++;
          if (silentFrameCount > SILENT_FRAMES_BEFORE_MUTE) return;
        } else {
          silentFrameCount = 0;
        }

        const gateMultiplier = rmsEnergy > dynamicThreshold ? 1.0 : Math.pow(rmsEnergy / dynamicThreshold, 2);
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * gateMultiplier * 32768));
        }
        sendGeminiAudio(int16Array.buffer);
      };

      lastFilterNode.connect(processor);
      processor.connect(audioContext.destination);
      setIsListening(true);
      logger.debug('[GeminiLive] Audio pipeline via ScriptProcessor (fallback) com VAD');

    } catch (error) {
      logger.error('Microphone error:', error);
      optionsRef.current.onError?.('Could not access microphone');
    }
  }, [sendGeminiAudio, buildFilterChain]);

  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      optionsRef.current.onError?.('Not connected');
      return;
    }

    const safeText = stripEmojis(text);

    wsRef.current.send(JSON.stringify({
      clientContent: {
        turns: [{
          role: "user",
          parts: [{ text: safeText }]
        }],
        turnComplete: true
      }
    }));

    optionsRef.current.onTranscript?.(safeText, 'user');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    status,
    isListening,
    isSpeaking,
    isVoiceDetected,
    reconnectStatus,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText
  };
}
