import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { VideoControls } from '@/types/video';
import { logger } from '@/lib/logger';
import { useWebSocketReconnect, ReconnectStatus } from './useWebSocketReconnect';

export type { VideoControls };

export type ConnectionStep = 'idle' | 'fetching_key' | 'connecting_ws' | 'configuring' | 'ready';

interface UseOpenAIRealtimeOptions {
  systemInstruction?: string;
  onTranscript?: (text: string, role: 'user' | 'assistant') => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
  onConnectionStepChange?: (step: ConnectionStep) => void;
  videoControls?: VideoControls | null;
  /** Database UUID of the current video (for RAG search) */
  videoDbId?: string;
  /** Called when silence timeout expires — return a custom prompt or undefined to use default */
  onDisengagement?: () => string | undefined;
  // Memory callbacks
  onSaveStudentName?: (name: string) => void;
  onSaveEmotionalObservation?: (emotion: string, context: string) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

// Silence timeout configuration (ms) — increased to reduce false triggers
const SILENCE_TIMEOUT_MS = 15000;

// Proactive prompts to encourage student engagement
const PROACTIVE_PROMPTS = [
  "Ei, está tudo bem aí? Quer que eu explique de outro jeito?",
  "E aí, ficou alguma dúvida? Pode perguntar!",
  "Está acompanhando? Posso repetir se quiser.",
  "Opa, está me ouvindo? Quer continuar?",
  "Alguma pergunta até aqui? Estou aqui pra ajudar!",
  "Tá difícil? Posso explicar de forma mais simples se preferir.",
];

export function useOpenAIRealtime(options: UseOpenAIRealtimeOptions = {}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [reconnectStatus, setReconnectStatus] = useState<ReconnectStatus>('idle');

  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const compressorNodeRef = useRef<DynamicsCompressorNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | AudioWorkletNode | null>(null);
  const captureContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const videoControlsRef = useRef<VideoControls | null>(null);
  const processedCallIdsRef = useRef<Set<string>>(new Set());
  // Track whether the model is currently generating a response (prevents silence prompt collisions)
  const isRespondingRef = useRef(false);
  // Track recent assistant transcripts to prevent deduplication
  const recentTranscriptsRef = useRef<string[]>([]);

  // Silence detection refs
  const silenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastAgentSpeechEndRef = useRef<number | null>(null);
  const proactivePromptIndexRef = useRef(0);
  
  // Store callbacks in refs to avoid dependency issues
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  });

  // Keep videoControls ref updated
  useEffect(() => {
    videoControlsRef.current = options.videoControls || null;
  }, [options.videoControls]);

  // Helper: returns true when video is actively playing (not paused)
  const isVideoPlaying = useCallback(() => {
    const vc = videoControlsRef.current;
    return vc ? !vc.isPaused() : false;
  }, []);

  // WebSocket reconnect with exponential backoff
  const {
    scheduleReconnect,
    markManualDisconnect,
    setReconnectFn,
    reset: resetReconnect,
    getReconnectStatus,
  } = useWebSocketReconnect({
    maxAttempts: 5,
    initialDelayMs: 1000,
    maxDelayMs: 30000,
    onReconnectAttempt: (attempt, max) => {
      setReconnectStatus('reconnecting');
      toast.info(`Reconectando ao tutor... (${attempt}/${max})`, { duration: 3000 });
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

  // Clear silence timeout
  const clearSilenceTimeout = useCallback(() => {
    if (silenceTimeoutRef.current) {
      clearTimeout(silenceTimeoutRef.current);
      silenceTimeoutRef.current = null;
      logger.debug('[SILENCE] Timer cancelado');
    }
  }, []);

  // Send proactive message to encourage student
  const sendProactivePrompt = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      logger.debug('[SILENCE] WebSocket não conectado, ignorando prompt proativo');
      return;
    }
    
    // Don't interrupt if agent is speaking or model is generating a response
    if (isPlayingRef.current || audioQueueRef.current.length > 0 || isRespondingRef.current) {
      logger.debug('[SILENCE] Agente ainda falando/respondendo, adiando prompt proativo');
      silenceTimeoutRef.current = setTimeout(sendProactivePrompt, 2000);
      return;
    }

    // Try contextual intervention first, fallback to generic prompts
    const customPrompt = optionsRef.current.onDisengagement?.();
    const prompt = customPrompt || (() => {
      const p = PROACTIVE_PROMPTS[proactivePromptIndexRef.current % PROACTIVE_PROMPTS.length];
      proactivePromptIndexRef.current++;
      return `[SISTEMA: O aluno está em silêncio há alguns segundos. Tome a iniciativa e incentive-o a participar. Use uma abordagem amigável como: "${p}"]`;
    })();

    logger.debug('[SILENCE] Professor tomando iniciativa com prompt contextual');

    wsRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: prompt
        }]
      }
    }));
    
    // Request a response
    wsRef.current.send(JSON.stringify({
      type: "response.create"
    }));
  }, []);

  // Start silence timeout after agent finishes speaking (only if video is paused)
  const startSilenceTimeout = useCallback(() => {
    // Only start silence timer if video is paused - student won't talk while watching
    if (videoControlsRef.current && !videoControlsRef.current.isPaused()) {
      logger.debug('[SILENCE] Video está rodando, não inicia timer de silêncio');
      return;
    }
    
    clearSilenceTimeout();
    
    logger.debug('[SILENCE] Video pausado - Iniciando timer de', SILENCE_TIMEOUT_MS / 1000, 'segundos');
    lastAgentSpeechEndRef.current = Date.now();
    
    silenceTimeoutRef.current = setTimeout(() => {
      // Double-check video is still paused before prompting
      if (videoControlsRef.current && !videoControlsRef.current.isPaused()) {
        logger.debug('[SILENCE] Timer expirou mas video voltou a rodar, ignorando');
        return;
      }
      logger.debug('[SILENCE] ⏰ Timer expirou! Aluno não respondeu em', SILENCE_TIMEOUT_MS / 1000, 'segundos');
      sendProactivePrompt();
    }, SILENCE_TIMEOUT_MS);
  }, [clearSilenceTimeout, sendProactivePrompt]);

  const playQueue = useCallback(async (ctx: AudioContext) => {
    // Audio chain: source -> gain -> compressor -> destination
    // Reduced gain to prevent crackling/distortion
    if (!compressorNodeRef.current) {
      const compressor = ctx.createDynamicsCompressor();
      compressor.threshold.value = -12; // Higher threshold (less aggressive)
      compressor.knee.value = 20;
      compressor.ratio.value = 4; // Lower ratio for more natural sound
      compressor.attack.value = 0.01; // Slower attack to avoid pumping
      compressor.release.value = 0.15;
      compressor.connect(ctx.destination);
      compressorNodeRef.current = compressor;
    }

    if (!gainNodeRef.current) {
      const gain = ctx.createGain();
      gain.gain.value = 2.0; // Reduced from 8.0 to prevent distortion
      gain.connect(compressorNodeRef.current);
      gainNodeRef.current = gain;
    }
    
    // Collect all queued samples into one buffer for smoother playback
    const allSamples: Float32Array[] = [];
    while (audioQueueRef.current.length > 0) {
      allSamples.push(audioQueueRef.current.shift()!);
    }
    
    if (allSamples.length === 0) {
      isPlayingRef.current = false;
      setIsSpeaking(false);
      return;
    }
    
    // Merge all samples into one continuous buffer
    const totalLength = allSamples.reduce((acc, arr) => acc + arr.length, 0);
    const mergedSamples = new Float32Array(totalLength);
    let offset = 0;
    for (const samples of allSamples) {
      mergedSamples.set(samples, offset);
      offset += samples.length;
    }
    
    const buffer = ctx.createBuffer(1, mergedSamples.length, 24000);
    const channelData = buffer.getChannelData(0);
    channelData.set(mergedSamples);
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(gainNodeRef.current!);
    source.start();
    
    await new Promise(resolve => {
      source.onended = resolve;
    });
    
    // Check if more audio arrived while playing
    if (audioQueueRef.current.length > 0) {
      playQueue(ctx);
    } else {
      isPlayingRef.current = false;
      setIsSpeaking(false);
    }
  }, []);

  const playAudioChunk = useCallback(async (base64Audio: string) => {
    // Mute tutor while video is playing — discard audio chunks
    if (isVideoPlaying()) {
      return;
    }

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

  const connect = useCallback(async () => {
    logger.debug('🔌 [OPENAI CONNECT] Iniciando conexão...');
    logger.debug('🔌 [OPENAI CONNECT] Status atual antes de conectar:', status);
    
    try {
      updateStatus('connecting');
      optionsRef.current.onConnectionStepChange?.('fetching_key');
      logger.debug('🔌 [OPENAI CONNECT] Status atualizado para: connecting');
      
      const currentOptions = optionsRef.current;
      
      // Try Grok first, fallback to OpenAI
      logger.debug('🔌 [VOICE CONNECT] Buscando token (tentando Grok primeiro)...');
      let { data, error } = await supabase.functions.invoke('openai-realtime-token', {
        body: { systemInstruction: currentOptions.systemInstruction, provider: 'grok' }
      });

      // Fallback to OpenAI if Grok fails
      if (error || (!data?.clientSecret && !data?.apiKey)) {
        logger.warn('🔌 [VOICE CONNECT] Grok falhou, tentando OpenAI como fallback...');
        const fallback = await supabase.functions.invoke('openai-realtime-token', {
          body: { systemInstruction: currentOptions.systemInstruction, provider: 'openai' }
        });
        data = fallback.data;
        error = fallback.error;
      }

      if (error || (!data?.clientSecret && !data?.apiKey)) {
        logger.error('🔌 [VOICE CONNECT] ❌ Nenhum provider disponível:', error);
        optionsRef.current.onConnectionStepChange?.('idle');
        throw new Error(error?.message || 'Failed to get voice token');
      }

      const activeVoiceProvider = data.provider || 'grok';
      logger.debug(`🔌 [VOICE CONNECT] ✅ Usando provider: ${activeVoiceProvider}`);
      optionsRef.current.onConnectionStepChange?.('connecting_ws');

      // Connect via WebSocket — different auth per provider
      let ws: WebSocket;
      if (activeVoiceProvider === 'grok') {
        const wsUrl = data.wsUrl || 'wss://api.x.ai/v1/realtime';
        logger.debug('🔌 [VOICE CONNECT] Grok URL:', wsUrl);
        ws = new WebSocket(wsUrl, [
          `xai-client-secret.${data.clientSecret}`,
        ]);
      } else {
        const wsUrl = `wss://api.openai.com/v1/realtime?model=${data.model}`;
        logger.debug('🔌 [VOICE CONNECT] OpenAI URL:', wsUrl);
        ws = new WebSocket(wsUrl, [
          "realtime",
          `openai-insecure-api-key.${data.apiKey}`,
          "openai-beta.realtime-v1",
        ]);
      }
      wsRef.current = ws;
      logger.debug('🔌 [OPENAI CONNECT] WebSocket criado');

      // Connection timeout - 15 seconds
      const connectionTimeout = setTimeout(() => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) {
          logger.error('🔌 [OPENAI CONNECT] ❌ Connection timeout after 15s');
          wsRef.current?.close();
          updateStatus('error');
          optionsRef.current.onConnectionStepChange?.('idle');
          toast.error('Não foi possível conectar ao tutor. Tente novamente.', { duration: 5000 });
        }
      }, 15000);

      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        logger.debug('WebSocket connected to Grok Voice Agent');
        processedCallIdsRef.current.clear();
        isRespondingRef.current = false;
        recentTranscriptsRef.current = [];
        optionsRef.current.onConnectionStepChange?.('configuring');
        
        // Define tools for video control and memory - use detailed descriptions for better understanding
        const tools = [
          {
            type: "function",
            name: "play_video",
            description: "OBRIGATORIO: Chame esta funcao para iniciar ou retomar o video. Gatilhos: 'play', 'da play', 'inicia', 'comeca', 'continua', 'roda', 'reproduz', 'volta a tocar', 'pode continuar'. Sempre que o aluno quiser que o video volte a rodar, use esta funcao.",
            parameters: { type: "object", properties: {}, required: [] }
          },
          {
            type: "function",
            name: "pause_video",
            description: "OBRIGATORIO: Chame esta funcao para pausar o video. Gatilhos: 'pausa', 'para', 'pause', 'espera', 'segura', 'para ai', 'um momento', 'calma', 'interrompe'. Sempre que o aluno quiser parar o video temporariamente, use esta funcao.",
            parameters: { type: "object", properties: {}, required: [] }
          },
          {
            type: "function",
            name: "restart_video",
            description: "OBRIGATORIO: Chame esta funcao para reiniciar o video do inicio. Gatilhos: 'reinicia', 'recomeca', 'volta pro inicio', 'do zero', 'desde o comeco', 'de novo', 'novamente'. Sempre que o aluno quiser ver o video desde o principio, use esta funcao.",
            parameters: { type: "object", properties: {}, required: [] }
          },
          {
            type: "function",
            name: "seek_video",
            description: "Pula para um momento especifico do video em segundos. Use quando o aluno mencionar um tempo especifico como 'vai para 30 segundos' ou 'pula pro minuto 2'.",
            parameters: {
              type: "object",
              properties: {
                seconds: { type: "number", description: "O tempo em segundos para pular" }
              },
              required: ["seconds"]
            }
          },
          {
            type: "function",
            name: "seek_backward",
            description: "OBRIGATORIO: Volta o video alguns segundos. Gatilhos: 'volta', 'volte', 'retrocede', 'volta X segundos', 'volta um pouco', 'repete essa parte', 'nao entendi volta'. Quando o aluno pedir para voltar sem especificar quanto, use 10 segundos como padrao.",
            parameters: {
              type: "object",
              properties: {
                seconds: { type: "number", description: "Quantos segundos voltar. Padrao: 10 segundos" }
              },
              required: []
            }
          },
          {
            type: "function",
            name: "seek_forward",
            description: "OBRIGATORIO: Avanca o video alguns segundos. Gatilhos: 'avanca', 'adianta', 'pula', 'pula X segundos', 'avanca um pouco', 'vai pra frente', 'skip'. Quando o aluno pedir para avancar sem especificar quanto, use 10 segundos como padrao.",
            parameters: {
              type: "object",
              properties: {
                seconds: { type: "number", description: "Quantos segundos avancar. Padrao: 10 segundos" }
              },
              required: []
            }
          },
          // Memory tools
          {
            type: "function",
            name: "save_student_name",
            description: "MUITO IMPORTANTE: Salva o nome do aluno na memoria de longo prazo. SEMPRE chame esta funcao quando o aluno disser o nome dele. Exemplo: se o aluno disser 'Meu nome é João' ou 'Pode me chamar de Maria', extraia o nome e salve.",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "O nome do aluno extraido da conversa" }
              },
              required: ["name"]
            }
          },
          {
            type: "function",
            name: "save_emotional_observation",
            description: "Registra uma observacao sobre o estado emocional do aluno. Use quando perceber estados emocionais marcantes como: empolgado, confuso, frustrado, cansado, entediado, curioso, feliz, ansioso. Isso ajuda a personalizar futuras interacoes.",
            parameters: {
              type: "object",
              properties: {
                emotion: { 
                  type: "string", 
                  description: "O estado emocional detectado: empolgado, confuso, frustrado, cansado, entediado, curioso, feliz, ansioso, neutro" 
                },
                context: { 
                  type: "string", 
                  description: "Contexto breve de quando/porque o estado foi detectado. Ex: 'Ficou empolgado ao entender o conceito de variaveis'" 
                }
              },
              required: ["emotion", "context"]
            }
          },
          // RAG: search transcript for precise answers
          {
            type: "function",
            name: "search_transcript",
            description: "Busca trechos relevantes da transcricao do video para responder perguntas do aluno com precisao. Use SEMPRE que o aluno fizer uma pergunta sobre o conteudo da aula. Isso retorna trechos exatos do video.",
            parameters: {
              type: "object",
              properties: {
                query: { type: "string", description: "A pergunta ou topico para buscar na transcricao" }
              },
              required: ["query"]
            }
          }
        ];

        // Send session update — format varies per provider
        const baseInstruction = currentOptions.systemInstruction || "Você é um professor jovem, descontraído e didático. Fale de forma natural como um amigo mais experiente que quer ajudar. Use gírias leves e seja animado. Fale em português brasileiro.";

        if (activeVoiceProvider === 'grok') {
          // Grok voices: Eve (energetic), Ara (warm/friendly), Rex (confident), Sal (balanced), Leo (authoritative)
          ws.send(JSON.stringify({
            type: "session.update",
            session: {
              voice: data.voice || "Ara",
              instructions: baseInstruction,
              turn_detection: { type: "server_vad" },
              audio: {
                input: { format: { type: "audio/pcm", rate: 24000 } },
                output: { format: { type: "audio/pcm", rate: 24000 } },
              },
              tools: tools,
            }
          }));
        } else {
          // OpenAI voices: echo, coral, nova, alloy, onyx
          ws.send(JSON.stringify({
            type: "session.update",
            session: {
              modalities: ["text", "audio"],
              instructions: baseInstruction,
              voice: data.voice || "echo",
              input_audio_format: "pcm16",
              output_audio_format: "pcm16",
              input_audio_transcription: { model: "whisper-1" },
              turn_detection: {
                type: "server_vad",
                threshold: 0.6,
                prefix_padding_ms: 400,
                silence_duration_ms: 1800,
              },
              tools: tools,
              tool_choice: "auto",
            }
          }));
        }
        
        updateStatus('connected');
        optionsRef.current.onConnectionStepChange?.('ready');
      };
      
      ws.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);

          // Lightweight debug to confirm which event types we are receiving
          if (typeof data?.type === 'string') {
            logger.debug('[realtime:event]', data.type);
          }

          // Handle audio response (OpenAI: response.audio.delta, Grok: response.output_audio.delta)
          if ((data.type === "response.audio.delta" || data.type === "response.output_audio.delta") && data.delta) {
            await playAudioChunk(data.delta);
          }

          // Track when the model starts generating a response
          if (data.type === "response.created") {
            isRespondingRef.current = true;
            clearSilenceTimeout();
          }

          // Handle text transcript from assistant — with deduplication + video mute guard
          if ((data.type === "response.audio_transcript.done" || data.type === "response.text.done") && data.transcript) {
            // Suppress tutor transcripts while video is playing
            if (isVideoPlaying()) {
              logger.debug('[MUTE] Video rodando, transcript do tutor suprimido');
            } else {
              const transcript = data.transcript.trim();
              // Deduplicate: skip if this exact transcript was just emitted
              const recent = recentTranscriptsRef.current;
              if (transcript && !recent.includes(transcript)) {
                recent.push(transcript);
                // Keep only last 5 transcripts for comparison
                if (recent.length > 5) recent.shift();
                optionsRef.current.onTranscript?.(transcript, 'assistant');
              } else {
                logger.debug('[DEDUP] Transcript duplicado ignorado:', transcript.slice(0, 50));
              }
            }
          }

          // Handle user transcript
          if (data.type === "conversation.item.input_audio_transcription.completed" && data.transcript) {
            logger.debug('[SILENCE] Aluno falou! Cancelando timer de silêncio');
            clearSilenceTimeout();
            optionsRef.current.onTranscript?.(data.transcript, 'user');
          }
          
          // Also cancel silence timeout when user starts speaking (speech detected)
          if (data.type === "input_audio_buffer.speech_started") {
            logger.debug('[SILENCE] Aluno começou a falar! Cancelando timer de silêncio');
            clearSilenceTimeout();
          }

          // Helper to wait for agent to finish speaking before playing video
          const waitForSpeechToEnd = (): Promise<void> => {
            return new Promise((resolve) => {
              const checkSpeech = () => {
                const queueLength = audioQueueRef.current.length;
                const isPlaying = isPlayingRef.current;
                logger.debug('[OPENAI] Aguardando fala terminar - queue:', queueLength, 'isPlaying:', isPlaying);
                
                if (queueLength === 0 && !isPlaying) {
                  logger.debug('[OPENAI] Fala terminou, aguardando 2 segundos...');
                  // 2 second buffer after speech ends
                  setTimeout(resolve, 2000);
                } else {
                  setTimeout(checkSpeech, 100);
                }
              };
              checkSpeech();
            });
          };

          const runFunctionCall = async (name: string, callId: string, argsJson?: string) => {
            // Detailed debug logging
            logger.debug('='.repeat(60));
            logger.debug('[OPENAI TOOL CALL] Recebido');
            logger.debug('[OPENAI TOOL CALL] Funcao:', name);
            logger.debug('[OPENAI TOOL CALL] Call ID:', callId);
            logger.debug('[OPENAI TOOL CALL] Args JSON:', argsJson);
            logger.debug('[OPENAI TOOL CALL] Audio Queue:', audioQueueRef.current.length, 'isPlaying:', isPlayingRef.current);
            
            if (!callId) {
              logger.error('[OPENAI TOOL CALL] ERRO: callId esta vazio/undefined');
              logger.debug('='.repeat(60));
              return;
            }
            
            if (processedCallIdsRef.current.has(callId)) {
              logger.debug('[OPENAI TOOL CALL] IGNORADO - Call ID ja processado:', callId);
              logger.debug('='.repeat(60));
              return;
            }
            processedCallIdsRef.current.add(callId);
            logger.debug('[OPENAI TOOL CALL] Call ID adicionado ao set de processados');

            let args: Record<string, unknown> = {};
            try {
              args = argsJson ? JSON.parse(argsJson) : {};
              logger.debug('[OPENAI TOOL CALL] Args parseados:', JSON.stringify(args, null, 2));
            } catch (e) {
              logger.warn('[OPENAI TOOL CALL] Erro ao parsear args, usando {}:', e);
              args = {};
            }

            logger.debug('[OPENAI TOOL CALL] Video Controls:', videoControlsRef.current ? 'DISPONIVEL' : 'INDISPONIVEL');
            
            if (videoControlsRef.current) {
              logger.debug('[OPENAI TOOL CALL] Video Status - isPaused:', videoControlsRef.current.isPaused());
              logger.debug('[OPENAI TOOL CALL] Video Status - currentTime:', videoControlsRef.current.getCurrentTime());
            }

            let result: { ok: boolean; message?: string } = { ok: true };

            if (videoControlsRef.current) {
              const beforePaused = videoControlsRef.current.isPaused();
              const beforeTime = videoControlsRef.current.getCurrentTime();
              
              switch (name) {
                case "play_video":
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: play_video');
                  logger.debug('[OPENAI TOOL CALL] Estado antes: isPaused =', beforePaused);
                  logger.debug('[OPENAI TOOL CALL] Aguardando agente terminar de falar antes de dar play...');
                  toast.info('Aguardando professor terminar de falar...', { duration: 2000 });
                  await waitForSpeechToEnd();
                  logger.debug('[OPENAI TOOL CALL] Agente terminou de falar, dando play agora!');
                  toast.success('Dando play no video...', { duration: 2000 });
                  videoControlsRef.current.play();
                  // Verify play actually worked with retry
                  await new Promise(r => setTimeout(r, 500));
                  if (videoControlsRef.current?.isPaused()) {
                    logger.debug('[OPENAI TOOL CALL] Play falhou, tentando novamente...');
                    videoControlsRef.current.play();
                    await new Promise(r => setTimeout(r, 800));
                    const stillPaused = videoControlsRef.current?.isPaused();
                    result = stillPaused
                      ? { ok: false, message: "Play falhou. O aluno precisa clicar no player para habilitar a reprodução." }
                      : { ok: true, message: "Video iniciado após retry" };
                  } else {
                    result = { ok: true, message: "Video iniciado" };
                  }
                  logger.debug('[OPENAI TOOL CALL] Estado depois: isPaused =', videoControlsRef.current?.isPaused());
                  break;
                case "pause_video":
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: pause_video');
                  logger.debug('[OPENAI TOOL CALL] Estado antes: isPaused =', beforePaused);
                  toast.success('Pausando video...', { duration: 2000 });
                  videoControlsRef.current.pause();
                  setTimeout(() => {
                    logger.debug('[OPENAI TOOL CALL] Estado depois: isPaused =', videoControlsRef.current?.isPaused());
                  }, 100);
                  result = { ok: true, message: "Video pausado" };
                  break;
                case "restart_video":
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: restart_video');
                  logger.debug('[OPENAI TOOL CALL] Tempo antes:', beforeTime);
                  logger.debug('[OPENAI TOOL CALL] Aguardando agente terminar de falar antes de reiniciar...');
                  toast.info('Aguardando professor terminar de falar...', { duration: 2000 });
                  await waitForSpeechToEnd();
                  logger.debug('[OPENAI TOOL CALL] Agente terminou de falar, reiniciando agora!');
                  toast.success('Reiniciando video...', { duration: 2000 });
                  videoControlsRef.current.restart();
                  // Verify restart worked
                  await new Promise(r => setTimeout(r, 500));
                  if (videoControlsRef.current?.isPaused()) {
                    videoControlsRef.current.play();
                    await new Promise(r => setTimeout(r, 800));
                    const stillPaused = videoControlsRef.current?.isPaused();
                    result = stillPaused
                      ? { ok: false, message: "Restart falhou. O aluno precisa clicar no player." }
                      : { ok: true, message: "Video reiniciado após retry" };
                  } else {
                    result = { ok: true, message: "Video reiniciado" };
                  }
                  logger.debug('[OPENAI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
                  break;
                case "seek_video":
                  const targetSeconds = Number(args.seconds) || 0;
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: seek_video');
                  logger.debug('[OPENAI TOOL CALL] Tempo antes:', beforeTime, '-> Destino:', targetSeconds);
                  toast.success(`Pulando para ${targetSeconds}s...`, { duration: 2000 });
                  videoControlsRef.current.seekTo(targetSeconds);
                  setTimeout(() => {
                    logger.debug('[OPENAI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
                  }, 100);
                  result = { ok: true, message: `Video pulou para ${targetSeconds} segundos` };
                  break;
                case "seek_backward":
                  const backwardSeconds = Number(args.seconds) || 10;
                  const newTimeBack = Math.max(0, beforeTime - backwardSeconds);
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: seek_backward');
                  logger.debug('[OPENAI TOOL CALL] Tempo antes:', beforeTime, '-> Voltando:', backwardSeconds, 's -> Novo tempo:', newTimeBack);
                  toast.success(`Voltando ${backwardSeconds} segundos...`, { duration: 2000 });
                  videoControlsRef.current.seekTo(newTimeBack);
                  setTimeout(() => {
                    logger.debug('[OPENAI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
                  }, 100);
                  result = { ok: true, message: `Video voltou ${backwardSeconds} segundos para ${newTimeBack}s` };
                  break;
                case "seek_forward":
                  const forwardSeconds = Number(args.seconds) || 10;
                  const newTimeForward = beforeTime + forwardSeconds;
                  logger.debug('[OPENAI TOOL CALL] EXECUTANDO: seek_forward');
                  logger.debug('[OPENAI TOOL CALL] Tempo antes:', beforeTime, '-> Avancando:', forwardSeconds, 's -> Novo tempo:', newTimeForward);
                  toast.success(`Avançando ${forwardSeconds} segundos...`, { duration: 2000 });
                  videoControlsRef.current.seekTo(newTimeForward);
                  setTimeout(() => {
                    logger.debug('[OPENAI TOOL CALL] Tempo depois:', videoControlsRef.current?.getCurrentTime());
                  }, 100);
                  result = { ok: true, message: `Video avancou ${forwardSeconds} segundos para ${newTimeForward}s` };
                  break;
                default:
                  logger.warn('[OPENAI TOOL CALL] ERRO: Funcao desconhecida:', name);
                  result = { ok: false, message: `Funcao desconhecida: ${name}` };
              }
            } 
            // Handle memory functions (don't require video controls)
            else if (name === "save_student_name") {
              const studentName = args.name as string;
              logger.debug('[OPENAI TOOL CALL] EXECUTANDO: save_student_name');
              logger.debug('[OPENAI TOOL CALL] Nome do aluno:', studentName);
              if (studentName && optionsRef.current.onSaveStudentName) {
                optionsRef.current.onSaveStudentName(studentName);
                toast.success(`Nome salvo: ${studentName}`, { duration: 2000 });
                result = { ok: true, message: `Nome "${studentName}" salvo na memoria` };
              } else {
                result = { ok: false, message: "Nao foi possivel salvar o nome" };
              }
            } 
            else if (name === "save_emotional_observation") {
              const emotion = args.emotion as string;
              const context = args.context as string;
              logger.debug('[OPENAI TOOL CALL] EXECUTANDO: save_emotional_observation');
              logger.debug('[OPENAI TOOL CALL] Emocao:', emotion, 'Contexto:', context);
              if (emotion && context && optionsRef.current.onSaveEmotionalObservation) {
                optionsRef.current.onSaveEmotionalObservation(emotion, context);
                result = { ok: true, message: `Observacao emocional registrada: ${emotion}` };
              } else {
                result = { ok: false, message: "Nao foi possivel registrar a observacao" };
              }
            }
            else if (name === "search_transcript") {
              const query = args.query as string;
              logger.debug('[OPENAI TOOL CALL] EXECUTANDO: search_transcript');
              logger.debug('[OPENAI TOOL CALL] Query:', query);
              try {
                const { data, error } = await supabase.functions.invoke('search-transcript', {
                  body: { query, video_id: optionsRef.current.videoDbId || '' },
                });
                if (error || !data?.chunks?.length) {
                  result = { ok: false, message: "Nenhum trecho relevante encontrado na transcricao" };
                } else {
                  const contextText = data.chunks
                    .map((c: any) => c.chunk_text)
                    .join('\n\n---\n\n');
                  result = { ok: true, message: `Trechos encontrados na transcricao:\n\n${contextText}` };
                }
              } catch (err) {
                logger.error('[OPENAI TOOL CALL] search_transcript error:', err);
                result = { ok: false, message: "Erro ao buscar na transcricao" };
              }
            }
            else {
              logger.error('[OPENAI TOOL CALL] ERRO: videoControlsRef.current e NULL para funcao de video');
              logger.error('[OPENAI TOOL CALL] Nao foi possivel executar:', name);
              toast.error('Nenhum video carregado');
              result = { ok: false, message: "Nenhum video carregado" };
            }

            logger.debug('[OPENAI TOOL CALL] Resultado:', JSON.stringify(result));

            // Provide function call output back to the model
            const outputMessage = {
              type: "conversation.item.create",
              item: {
                type: "function_call_output",
                call_id: callId,
                output: JSON.stringify(result),
              },
            };
            logger.debug('[OPENAI TOOL CALL] Enviando output:', JSON.stringify(outputMessage, null, 2));
            ws.send(JSON.stringify(outputMessage));

            // Request a response after function call
            logger.debug('[OPENAI TOOL CALL] Solicitando response.create');
            ws.send(JSON.stringify({ type: "response.create" }));
            logger.debug('[OPENAI TOOL CALL] Resposta enviada com sucesso');
            logger.debug('='.repeat(60));
          };

          const tryHandleFunctionCallItem = async (item: Record<string, unknown> | undefined, source: string) => {
            if (!item) return;
            logger.debug(`[OPENAI EVENT] tryHandleFunctionCallItem de ${source}:`, item?.type);
            
            // Shapes we may see:
            // - { type:'function_call', name, call_id, arguments }
            // - { type:'function_call', function:{ name, arguments }, call_id }
            if (item.type !== 'function_call') {
              logger.debug(`[OPENAI EVENT] Item ignorado - tipo ${item.type} != 'function_call'`);
              return;
            }

            const name = item.name ?? item.function?.name;
            const callId = item.call_id ?? item.callId;
            const args = item.arguments ?? item.function?.arguments;

            logger.debug(`[OPENAI EVENT] Extraido de ${source}: name=${name}, callId=${callId}, args=${args}`);

            if (typeof name === 'string' && typeof callId === 'string') {
              logger.debug(`[OPENAI EVENT] Chamando runFunctionCall de ${source}`);
              await runFunctionCall(name, callId, args);
            } else {
              logger.warn(`[OPENAI EVENT] Dados invalidos de ${source}: name=${typeof name}, callId=${typeof callId}`);
            }
          };

          // Function calls (standalone event)
          if (data.type === "response.function_call_arguments.done") {
            logger.debug('[OPENAI EVENT] response.function_call_arguments.done detectado!');
            logger.debug('[OPENAI EVENT] name:', data.name, 'call_id:', data.call_id);
            await runFunctionCall(data.name, data.call_id, data.arguments);
          }

          // Function calls delivered as output_item events (some SDK variants)
          if (data.type === "response.output_item.added" || data.type === "response.output_item.done") {
            logger.debug('[OPENAI EVENT]', data.type, 'detectado!');
            await tryHandleFunctionCallItem(data.item, `${data.type}.item`);
            await tryHandleFunctionCallItem(data.output_item, `${data.type}.output_item`);
          }

          // Function calls delivered as conversation item events (another common variant)
          if (data.type === "conversation.item.created" || data.type === "conversation.item.updated") {
            logger.debug('[OPENAI EVENT]', data.type, 'detectado!');
            await tryHandleFunctionCallItem(data.item, data.type);
          }

          // Canonical: embedded in response.done
          if (data.type === "response.done") {
            isRespondingRef.current = false;
            logger.debug('[OPENAI EVENT] response.done detectado!');
            const outputs = data.response?.output;
            if (Array.isArray(outputs)) {
              logger.debug('[OPENAI EVENT] Processando', outputs.length, 'outputs');
              for (const item of outputs) {
                await tryHandleFunctionCallItem(item, 'response.done');
              }
            }

            // Don't clear audio here; let playback finish naturally to avoid cutting the last word
            logger.debug('[OPENAI EVENT] Response done, audio queue length:', audioQueueRef.current.length);
            
            // Start silence timeout when agent finishes speaking
            // Wait for audio to finish before starting the timer
            const checkAndStartSilenceTimer = () => {
              if (audioQueueRef.current.length === 0 && !isPlayingRef.current) {
                logger.debug('[SILENCE] Agente terminou de falar, iniciando timer de silêncio');
                startSilenceTimeout();
              } else {
                setTimeout(checkAndStartSilenceTimer, 200);
              }
            };
            setTimeout(checkAndStartSilenceTimer, 500);
          }

          // Handle errors
          if (data.type === "error") {
            logger.error('🚨 [OPENAI ERROR] Erro recebido do OpenAI:', data.error);
            logger.error('🚨 [OPENAI ERROR] Código:', data.error?.code);
            logger.error('🚨 [OPENAI ERROR] Mensagem:', data.error?.message);
            logger.error('🚨 [OPENAI ERROR] Detalhes:', JSON.stringify(data.error, null, 2));
            optionsRef.current.onError?.(data.error?.message || 'Unknown error');
          }
          
          // Handle session created/updated
          if (data.type === "session.created" || data.type === "session.updated") {
            logger.debug('🔌 [OPENAI SESSION]', data.type);
          }
        } catch (e) {
          logger.error('🚨 [OPENAI ERROR] Erro ao processar mensagem:', e);
        }
      };

      
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        logger.error('🚨 [WEBSOCKET ERROR] Erro no WebSocket:', error);
        logger.error('🚨 [WEBSOCKET ERROR] Detalhes:', JSON.stringify(error, null, 2));
        updateStatus('error');
        optionsRef.current.onError?.('Connection error');
      };

      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        logger.debug('🔌 [WEBSOCKET CLOSE] WebSocket fechado');
        logger.debug('🔌 [WEBSOCKET CLOSE] Código:', event.code);
        logger.debug('🔌 [WEBSOCKET CLOSE] Motivo:', event.reason || '(sem motivo)');
        logger.debug('🔌 [WEBSOCKET CLOSE] wasClean:', event.wasClean);

        updateStatus('disconnected');
        stopListening();

        // Auto-reconnect for abnormal closures (not user-initiated)
        // 1000 = normal, 1001 = going away (nav), 1006 = abnormal, 1011 = server error
        if (event.code !== 1000 && event.code !== 1001) {
          logger.warn('🔌 [WEBSOCKET CLOSE] Fechamento anormal, tentando reconectar...');
          scheduleReconnect();
        }
      };
      
    } catch (error) {
      logger.error('🚨 [OPENAI CONNECT] Erro na conexão:', error);
      updateStatus('error');
      optionsRef.current.onError?.(error instanceof Error ? error.message : 'Connection failed');
    }
  }, [updateStatus, playAudioChunk, stopListening, startSilenceTimeout, clearSilenceTimeout]);

  // Register connect function for auto-reconnect
  useEffect(() => {
    setReconnectFn(connect);
  }, [connect, setReconnectFn]);

  const disconnect = useCallback(() => {
    logger.debug('🔌 [OPENAI DISCONNECT] Desconectando manualmente...');
    logger.debug('🔌 [OPENAI DISCONNECT] Stack trace:', new Error().stack);

    // Mark as manual disconnect to prevent auto-reconnect
    markManualDisconnect();

    // Clear silence timeout
    clearSilenceTimeout();
    
    stopListening();
    
    if (wsRef.current) {
      logger.debug('🔌 [OPENAI DISCONNECT] Fechando WebSocket (readyState:', wsRef.current.readyState, ')');
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    } else {
      logger.debug('🔌 [OPENAI DISCONNECT] WebSocket já era null');
    }
    
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    setIsSpeaking(false);
    updateStatus('disconnected');
    logger.debug('🔌 [OPENAI DISCONNECT] Desconexão completa');
  }, [updateStatus, stopListening, clearSilenceTimeout]);

  /** Convert Int16 ArrayBuffer to base64 and send to OpenAI */
  const sendAudioBuffer = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return;
    // Don't send mic audio while video is playing — prevents model from hearing video audio
    if (isVideoPlaying()) return;
    const uint8Array = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    wsRef.current.send(JSON.stringify({
      type: "input_audio_buffer.append",
      audio: btoa(binary),
    }));
  }, []);

  const startListening = useCallback(async () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      optionsRef.current.onError?.('Not connected');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 24000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      mediaStreamRef.current = stream;

      const audioContext = new AudioContext({ sampleRate: 24000 });
      captureContextRef.current = audioContext;
      const source = audioContext.createMediaStreamSource(stream);

      // Try AudioWorklet first, fall back to ScriptProcessor
      const useWorklet = typeof audioContext.audioWorklet?.addModule === 'function';

      if (useWorklet) {
        try {
          await audioContext.audioWorklet.addModule('/audio-processor.worklet.js');
          const workletNode = new AudioWorkletNode(audioContext, 'audio-capture-processor');
          processorRef.current = workletNode;

          workletNode.port.postMessage({ type: 'config', data: { vadEnabled: false, bufferSize: 4096 } });

          workletNode.port.onmessage = (event) => {
            if (event.data.type === 'audio') {
              sendAudioBuffer(event.data.buffer);
            }
          };

          source.connect(workletNode);
          workletNode.connect(audioContext.destination);
          logger.debug('[OpenAI] Audio capture via AudioWorklet');
          setIsListening(true);
          return;
        } catch (workletErr) {
          logger.warn('[OpenAI] AudioWorklet failed, falling back to ScriptProcessor:', workletErr);
        }
      }

      // Fallback: ScriptProcessor (deprecated but widely supported)
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (wsRef.current?.readyState !== WebSocket.OPEN) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          int16Array[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
        }
        sendAudioBuffer(int16Array.buffer);
      };

      source.connect(processor);
      processor.connect(audioContext.destination);
      logger.debug('[OpenAI] Audio capture via ScriptProcessor (fallback)');
      setIsListening(true);

    } catch (error) {
      logger.error('Microphone error:', error);
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        toast.error('Permissão de microfone negada. O tutor precisa do microfone para conversar com você. Habilite nas configurações do navegador.', { duration: 8000 });
        optionsRef.current.onError?.('Microphone permission denied');
      } else {
        toast.error('Erro ao acessar microfone. Verifique se outro aplicativo está usando.', { duration: 5000 });
        optionsRef.current.onError?.('Could not access microphone');
      }
    }
  }, [sendAudioBuffer]);

  const sendText = useCallback((text: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      optionsRef.current.onError?.('Not connected');
      return;
    }
    
    // Create a conversation item with user message
    wsRef.current.send(JSON.stringify({
      type: "conversation.item.create",
      item: {
        type: "message",
        role: "user",
        content: [{
          type: "input_text",
          text: text
        }]
      }
    }));
    
    // Request a response
    wsRef.current.send(JSON.stringify({
      type: "response.create"
    }));
    
    optionsRef.current.onTranscript?.(text, 'user');
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
    isVoiceDetected: isListening,
    reconnectStatus,
    connect,
    disconnect,
    startListening,
    stopListening,
    sendText,
  };
}
