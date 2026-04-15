import { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useOpenAIRealtime, VideoControls, ConnectionStep } from '@/hooks/useOpenAIRealtime';
import { useContentManager, TeachingMoment } from '@/hooks/useContentManager';
import { useTimestampQuizzes, TimestampQuiz } from '@/hooks/useTimestampQuizzes';

import { useMissions, Mission } from '@/hooks/useMissions';
import { useStudentMemory, StudentProfile } from '@/hooks/useStudentMemory';
import { useTutorMemory } from '@/hooks/useTutorMemory';
import { VideoPlayer, VideoPlayerRef } from './VideoPlayer';
import { DirectVideoPlayer, DirectVideoPlayerRef } from './DirectVideoPlayer';
import { VoiceIndicator } from './VoiceIndicator';
import { ProcessingIndicator } from './ProcessingIndicator';
import { MiniQuiz } from './MiniQuiz';
import { LessonEndScreen } from './LessonEndScreen';
import { LiveCaptionsOverlay, CaptionsToggle, useCaptions } from './LiveCaptions';
import { useContextualIntervention } from '@/hooks/useContextualIntervention';
import { Phone, PhoneOff, Send, AlertCircle, Bug, Play, Pause, RotateCcw, BookOpen, Target, Lightbulb, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';
import { logger } from '@/lib/logger';

interface Message {
  id: string;
  text: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface VoiceChatProps {
  videoContext?: string;
  videoId?: string | null; // YouTube ID
  videoUrl?: string | null; // Direct video URL
  videoType?: string | null; // 'youtube' | 'direct' | 'external'
  videoDbId?: string; // UUID for database queries (quizzes, progress)
  videoTitle?: string;
  moduleTitle?: string;
  videoTranscript?: string | null;
  preConfiguredMoments?: TeachingMoment[] | null;
  teacherIntro?: string | null;
  isStudentMode?: boolean;
  onContentPlanReady?: (moments: TeachingMoment[]) => void;
  onOpenMissions?: () => void;
  onVideoEnded?: () => void;
  onVideoStarted?: () => void;
}

export function VoiceChat({ videoContext, videoId, videoUrl, videoType, videoDbId, videoTitle, moduleTitle, videoTranscript, preConfiguredMoments, teacherIntro, onContentPlanReady, onOpenMissions, onVideoEnded, onVideoStarted }: VoiceChatProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showDebug, setShowDebug] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [debugInfo, setDebugInfo] = useState({ playerReady: false, lastAction: '' });
  const [activeMoment, setActiveMoment] = useState<TeachingMoment | null>(null);
  const [showContentPlan, setShowContentPlan] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<TimestampQuiz | null>(null);
  const [agentMode, setAgentMode] = useState<'idle' | 'intro' | 'teaching' | 'playing' | 'ended'>('idle');
  const [isVideoExpanded, setIsVideoExpanded] = useState(false);
  const [pendingReconnect, setPendingReconnect] = useState<{type: 'moment' | 'quiz', data: any} | null>(null);
  const [currentVideoTime, setCurrentVideoTime] = useState(0);
  const [nextPauseInfo, setNextPauseInfo] = useState<{time: number; type: 'quiz' | 'moment'; topic?: string} | null>(null);
  const [lessonEndData, setLessonEndData] = useState<{ weeklyTask?: string; summaryPoints?: string[]; mission?: Mission }>({});
  const [connectionStep, setConnectionStep] = useState<'idle' | 'fetching_key' | 'connecting_ws' | 'configuring' | 'ready'>('idle');
  const [captionText, setCaptionText] = useState('');
  const { captionsEnabled, toggleCaptions } = useCaptions();
  const { buildInterventionPrompt } = useContextualIntervention();
  const videoPlayerRef = useRef<VideoPlayerRef | DirectVideoPlayerRef>(null);
  const timeCheckIntervalRef = useRef<number | null>(null);
  const lastCheckedMomentRef = useRef<number>(-1);
  const analyzedVideoRef = useRef<string | null>(null);
  const introCompletedRef = useRef<boolean>(false);
  const isCapturingEndDataRef = useRef<boolean>(false);
  const endMessageBufferRef = useRef<string>('');
  const lastContextUpdateTimeRef = useRef<number>(0);
  
  // Generate student ID
  const [studentId] = useState(() => {
    const stored = localStorage.getItem('studentId');
    if (stored) return stored;
    const newId = `student_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    localStorage.setItem('studentId', newId);
    return newId;
  });
  
  // Refs for callbacks that need access to sendText/status
  const sendTextRef = useRef<((text: string) => void) | null>(null);
  const statusRef = useRef<string>('disconnected');


  // Content Manager for teaching moments
  const {
    isLoading: isAnalyzingContent,
    contentPlan,
    analyzeContent,
    checkForTeachingMoment,
    generateTeacherInstructions,
  } = useContentManager({
    onPlanReady: (plan) => {
      logger.debug('[ContentManager] Plan ready:', plan);
      // Notify parent component when teaching moments are ready
      if (plan.teaching_moments.length > 0 && onContentPlanReady) {
        onContentPlanReady(plan.teaching_moments);
      }
    },
    onError: (error) => {
      logger.error('[ContentManager] Error:', error);
    },
  });

  // Timestamp-based quizzes - use videoDbId (UUID) for database queries
  const {
    quizzes: timestampQuizzes,
    loadQuizzes,
    getQuizForTimestamp,
    markQuizTriggered,
    recordAttempt,
  } = useTimestampQuizzes({ videoId: videoDbId, studentId });

  // Missions for this lesson
  const {
    missions: lessonMissions,
    loadMissions,
  } = useMissions(studentId);

  // Student Memory - long-term memory for name, emotional patterns, learning style
  const {
    profile: studentProfile,
    updateProfile: updateStudentProfile,
    recordObservation,
    buildMemoryContext,
  } = useStudentMemory();

  // Ref for memory context to avoid stale closures
  const studentProfileRef = useRef<StudentProfile | null>(null);
  useEffect(() => {
    studentProfileRef.current = studentProfile;
  }, [studentProfile]);

  // Tutor Memory — long-term memory + conversation persistence + mid-session updates
  const {
    memoryContext: tutorMemoryContext,
    fetchMemoryContext: fetchTutorMemory,
    addMessage: addTutorMessage,
    endSession: endTutorSession,
  } = useTutorMemory({
    studentId: studentProfile?.student_id || null,
    videoDbId,
  });

  // Fetch memory context on mount / when student profile loads
  const tutorMemoryFetchedRef = useRef(false);
  useEffect(() => {
    if (studentProfile?.student_id && !tutorMemoryFetchedRef.current) {
      tutorMemoryFetchedRef.current = true;
      fetchTutorMemory();
    }
  }, [studentProfile?.student_id, fetchTutorMemory]);

  // Load missions when videoDbId changes
  useEffect(() => {
    if (videoDbId) {
      loadMissions(videoDbId);
    }
  }, [videoDbId, loadMissions]);


  // Determine if we have a video to display
  const hasVideo = videoId || videoUrl;
  const isDirectVideo = videoType === 'direct' || videoType === 'external';

  // Load pre-configured moments or analyze content when video changes
  useEffect(() => {
    const videoKey = videoId || videoUrl;
    if (videoKey && analyzedVideoRef.current !== videoKey) {
      analyzedVideoRef.current = videoKey;
      // Use pre-configured moments if available, otherwise analyze and auto-save
      // Pass videoDbId for auto-save, and duration (default 10 min)
      analyzeContent(
        videoTranscript || null, 
        videoTitle || '', 
        videoContext, 
        preConfiguredMoments,
        undefined, // videoDurationMinutes - will use default
        videoDbId, // Pass database ID for auto-saving
        true // autoSave enabled
      );
      lastCheckedMomentRef.current = -1;
      setActiveMoment(null);
      setActiveQuiz(null);
    }
  }, [videoId, videoUrl, videoDbId, videoTranscript, videoContext, videoTitle, preConfiguredMoments, analyzeContent]);

  // Load timestamp quizzes when videoDbId changes
  useEffect(() => {
    if (videoDbId) {
      loadQuizzes();
    }
  }, [videoDbId, loadQuizzes]);

  // Build system instruction with video context, content plan, and student memory
  const buildSystemInstruction = useCallback(() => {
    
    let instruction = `Você é o Professor Vibe - um tutor expressivo, didático e apaixonado por ensinar VIBE CODING!

=== REGRA #1: TURN-TAKING (NÃO INTERROMPER) ===
Esta é a regra MAIS IMPORTANTE. Você DEVE segui-la SEMPRE:
1. NUNCA interrompa o aluno enquanto ele está falando
2. Quando o aluno parar de falar, espere 1-2 segundos antes de responder
3. Responda de forma CURTA e CLARA: 2-6 frases no máximo, a menos que peçam detalhamento
4. Faça NO MÁXIMO 1 pergunta por vez e ESPERE a resposta em SILÊNCIO ABSOLUTO
5. Quando a pergunta do aluno estiver vaga, faça 1 pergunta de clarificação (apenas 1)
6. Quando o aluno pedir "resumo", entregue em bullets com 3-5 itens

=== SUA PERSONALIDADE ===
- Entusiasmado mas CONCISO - energia alta em poucas palavras
- Use interjeições naturais: "Uau!", "Olha só!", "Opa!", "Caramba!"
- Celebre acertos: "Isso aí! Mandou bem!"
- Erros são oportunidades: "Quase lá! Olha a pegadinha..."
- Tom: amigável, direto, prático. Sem enrolação.
- Fale como amigo experiente, não professor formal

=== PROIBIÇÕES ABSOLUTAS ===
- Jamais use emojis, pictogramas ou símbolos gráficos
- NUNCA mencione o ÁUDIO do vídeo (não diga "no áudio", "a voz do vídeo")
- Trate o vídeo apenas como conteúdo visual/teórico
- Você NÃO tem acesso a câmera ou entrada visual do aluno
- Nunca descreva aparência, expressões ou linguagem corporal
- Nunca diga "eu vi", "estou vendo", "percebo pela sua cara"
=== CONTROLE DO VIDEO ===
Você tem funções para controlar o vídeo. SEMPRE use quando o aluno pedir:
1. play_video: "da play", "continua", "roda", "pode ir"
2. pause_video: "pausa", "para", "espera", "segura"  
3. restart_video: "reinicia", "do início", "de novo"
4. seek_backward: "volta", "volte X segundos", "repete essa parte"
5. seek_forward: "avança", "pula", "adianta X segundos"

CHAME a função correspondente - não apenas responda verbalmente!`;

    // Contexto da aula atual
    instruction += `

=== CONTEXTO EM TEMPO REAL ===
Aula: "${videoTitle || 'Sem título'}"${moduleTitle ? `\nMódulo: "${moduleTitle}"` : ''}
Tempo atual do vídeo: ${Math.floor(currentVideoTime / 60)}:${Math.floor(currentVideoTime % 60).toString().padStart(2, '0')}

IMPORTANTE: Sempre que possível, referencie o momento da aula. Ex: "Nesse ponto do vídeo..." ou "O conceito que acabou de ser apresentado..."`;

    if (videoTranscript) {
      const MAX_TRANSCRIPT_CHARS = 8000;
      const truncatedTranscript = videoTranscript.length > MAX_TRANSCRIPT_CHARS
        ? videoTranscript.substring(0, MAX_TRANSCRIPT_CHARS) + '\n[... transcrição truncada ...]'
        : videoTranscript;
      
      instruction += `

=== CONTEÚDO DA AULA ===
${truncatedTranscript}

Suas explicações devem ser baseadas EXCLUSIVAMENTE neste conteúdo. Não invente tópicos que não estão aqui.`;
    } else if (videoContext) {
      instruction += `

=== CONTEXTO DA AULA ===
${videoContext}

Use este contexto para guiar suas explicações.`;
    }
    // Plano de ensino
    if (contentPlan) {
      instruction += `

=== MOMENTOS DE APROFUNDAMENTO ===
${contentPlan.teaching_moments.map((m, i) => 
  `${i + 1}. [${Math.floor(m.timestamp_seconds / 60)}:${(m.timestamp_seconds % 60).toString().padStart(2, '0')}] ${m.topic} - ${m.key_insight}`
).join('\n')}

Quando receber "MOMENTO DE APROFUNDAMENTO":
1. Explique o insight principal em 2-3 frases
2. Faça APENAS UMA pergunta e PARE DE FALAR COMPLETAMENTE
3. ESPERE em silêncio absoluto a resposta do aluno - NÃO FALE até ele responder
4. Tenha PACIÊNCIA - o aluno pode levar até 10 segundos para formular uma resposta
5. Só depois que o aluno responder, continue a conversa
6. NUNCA faça múltiplas perguntas consecutivas - isso confunde o aluno
7. NUNCA interrompa o aluno enquanto ele está falando`;
    }

    // Quizzes
    if (timestampQuizzes.length > 0) {
      instruction += `

=== MINI QUIZZES ===
Quando receber "MINI QUIZ!":
1. Leia a pergunta claramente
2. Leia cada opção (A, B, C, D)
3. Aguarde a resposta
4. Após o resultado do sistema:
   - Acertou: celebre brevemente
   - Errou: explique e encoraje`;
    }

    // Encerramento da aula
    instruction += `

=== ENCERRAMENTO DA AULA ===
Quando o vídeo terminar (você receberá a mensagem "O vídeo terminou"):
1. Diga "Aula concluída!" para sinalizar o encerramento
2. Faça um breve resumo dos principais pontos aprendidos (máximo 3-4 pontos), começando cada ponto com "PONTO:"
3. Celebre o progresso do aluno: "Mandou muito bem hoje!"
4. Proponha uma TAREFA DA SEMANA iniciando com "TAREFA DA SEMANA:" seguido da descrição:
   - Deve ser prática e aplicável
   - Algo que o aluno possa fazer usando o que aprendeu
   - Ex: "TAREFA DA SEMANA: criar um projeto simples usando X" ou "TAREFA DA SEMANA: Pratique Y fazendo Z"
5. Despeça-se de forma motivadora e informal`;

    // Student Memory Context — injected from tutor-memory edge function (long-term memory)
    const profile = studentProfileRef.current;

    // Dynamic memory context from DB (includes profile, insights, weak concepts, quiz stats, recent conversations)
    if (tutorMemoryContext) {
      instruction += `\n\n${tutorMemoryContext}`;
    } else {
      // Fallback to basic profile data if edge function hasn't responded yet
      instruction += `\n\n=== MEMÓRIA DO ALUNO ===`;
      if (profile?.name) instruction += `\nNome: ${profile.name}`;
      if (profile?.interaction_count) instruction += `\nSessões anteriores: ${profile.interaction_count}`;
      if (profile?.learning_style) instruction += `\nEstilo: ${profile.learning_style}`;
    }

    instruction += `\n
=== INSTRUÇÕES DE MEMÓRIA ===
${!profile?.name ? `
NOME DESCONHECIDO! Na sua PRIMEIRA fala, pergunte o nome naturalmente:
- "E aí! Como posso te chamar?"
ASSIM QUE o aluno disser o nome, chame save_student_name IMEDIATAMENTE!
` : `
Você JÁ CONHECE o aluno: "${profile.name}". Use o nome naturalmente.
`}

=== FUNÇÕES DE MEMÓRIA ===
1. save_student_name({ name: "..." }) — OBRIGATÓRIO quando o aluno disser o nome
2. save_emotional_observation({ emotion: "...", context: "..." }) — Registra estados emocionais

=== PERSONALIZAÇÃO BASEADA EM DADOS ===
Use os dados de memória acima para:
- Referenciar conceitos que o aluno tem DIFICULDADE (seção "conceitos a reforçar")
- Adaptar explicações ao ESTILO DE APRENDIZAGEM do aluno
- Celebrar PROGRESSOS comparando com sessões anteriores
- Evitar repetir explicações que já funcionaram (conversas recentes)
- Se houver INSIGHTS de aprendizagem, use-os para ajustar seu tom e abordagem`;

    // Emotional Perception
    instruction += `

=== PERCEPÇÃO EMOCIONAL ===
Fique ATENTO aos sinais emocionais do aluno:
- TOM DE VOZ: entusiasmo, hesitação, frustração, confusão
- PALAVRAS: "não entendi", "difícil", "legal!", "uau"
- PAUSAS: silêncios longos = confusão ou desengajamento

COMO RESPONDER:
- EMPOLGADO: "Isso aí! Adoro essa energia!"
- CONFUSO: "Opa, deixa eu explicar de outro jeito..."
- FRUSTRADO: "Ei, eu entendo! Isso é desafiador mesmo."
- CANSADO: "Que tal uma pausinha de 2 minutos?"

Quando detectar emoção marcante, USE save_emotional_observation para registrar!`;


    return instruction;
  }, [videoContext, videoTitle, moduleTitle, videoTranscript, contentPlan, timestampQuizzes.length, studentProfile, currentVideoTime, tutorMemoryContext]);

  const systemInstruction = buildSystemInstruction();

  // Check player ref status periodically for debug panel
  useEffect(() => {
    if (!showDebug) return;
    const interval = setInterval(() => {
      setDebugInfo(prev => ({
        ...prev,
        playerReady: videoPlayerRef.current !== null
      }));
    }, 500);
    return () => clearInterval(interval);
  }, [showDebug]);

  // Controls are always available when a video exists; the VideoPlayer will queue commands until ready.
  // Using a getter pattern to always access the current ref value
  const videoControls: VideoControls | null = useMemo(() => {
    if (!hasVideo) return null;

    return {
      play: () => {
        logger.debug('[VoiceChat] play called, ref:', videoPlayerRef.current ? 'EXISTS' : 'NULL');
        setDebugInfo(prev => ({ ...prev, lastAction: 'play @ ' + new Date().toLocaleTimeString() }));
        videoPlayerRef.current?.play();
      },
      pause: () => {
        logger.debug('[VoiceChat] pause called, ref:', videoPlayerRef.current ? 'EXISTS' : 'NULL');
        setDebugInfo(prev => ({ ...prev, lastAction: 'pause @ ' + new Date().toLocaleTimeString() }));
        videoPlayerRef.current?.pause();
      },
      restart: () => {
        logger.debug('[VoiceChat] restart called, ref:', videoPlayerRef.current ? 'EXISTS' : 'NULL');
        setDebugInfo(prev => ({ ...prev, lastAction: 'restart @ ' + new Date().toLocaleTimeString() }));
        videoPlayerRef.current?.restart();
      },
      seekTo: (seconds: number) => {
        logger.debug('[VoiceChat] seekTo called:', seconds, 'ref:', videoPlayerRef.current ? 'EXISTS' : 'NULL');
        setDebugInfo(prev => ({ ...prev, lastAction: `seekTo(${seconds}) @ ` + new Date().toLocaleTimeString() }));
        videoPlayerRef.current?.seekTo(seconds);
      },
      getCurrentTime: () => videoPlayerRef.current?.getCurrentTime() || 0,
      isPaused: () => videoPlayerRef.current?.isPaused() ?? true,
    };
  }, [hasVideo]);

  // Memory callbacks for agent tool calls
  const handleSaveStudentName = useCallback((name: string) => {
    logger.debug('[VoiceChat] Salvando nome do aluno:', name);
    updateStudentProfile({ name });
  }, [updateStudentProfile]);

  const handleSaveEmotionalObservation = useCallback((emotion: string, context: string) => {
    logger.debug('[VoiceChat] Registrando observação emocional:', emotion, context);
    recordObservation({
      observation_type: 'engagement',
      observation_data: { 
        emotion, 
        context,
        detected_at: new Date().toISOString(),
        video_title: videoTitle,
      },
      context: `Emoção: ${emotion} - ${context}`,
      video_id: videoDbId,
    });
  }, [recordObservation, videoTitle, videoDbId]);

  const {
    status,
    isListening,
    isSpeaking,
    isVoiceDetected,
    connect,
    disconnect: rawDisconnect,
    startListening,
    stopListening,
    sendText,
  } = useOpenAIRealtime({
    systemInstruction,
    videoControls,
    videoDbId,
    onDisengagement: () => buildInterventionPrompt({
      currentTime: currentVideoTime,
      transcript: videoTranscript,
      videoTitle,
      teachingMoments: contentPlan?.teaching_moments,
    }),
    onSaveStudentName: handleSaveStudentName,
    onSaveEmotionalObservation: handleSaveEmotionalObservation,
    onTranscript: (text, role) => {
      logger.debug(`📝 [VOICECHAT TRANSCRIPT] ${role}: ${text.substring(0, 100)}...`);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        text,
        role,
        timestamp: new Date()
      }]);

      // Persist conversation to long-term memory
      addTutorMessage(role, text, Math.floor(currentVideoTime));

      // Update live captions for assistant speech
      if (role === 'assistant') {
        setCaptionText(text);
      }
      
      // Capture end-of-lesson data from assistant messages
      if (role === 'assistant' && isCapturingEndDataRef.current) {
        endMessageBufferRef.current += ' ' + text;
        
        // Extract weekly task if present
        const taskMatch = endMessageBufferRef.current.match(/TAREFA DA SEMANA[:\s]+(.+?)(?=PONTO:|$)/i);
        if (taskMatch) {
          setLessonEndData(prev => ({ ...prev, weeklyTask: taskMatch[1].trim() }));
        }
        
        // Extract summary points (lines starting with PONTO:)
        const bulletPoints = endMessageBufferRef.current.match(/PONTO:\s*[^P]+/gi);
        if (bulletPoints && bulletPoints.length > 0) {
          const points = bulletPoints.map(p => p.replace(/^PONTO:\s*/i, '').trim()).filter(p => p.length > 0);
          setLessonEndData(prev => ({ ...prev, summaryPoints: points }));
        }
      }
    },
    onError: (error) => {
      logger.error('🚨 [VOICECHAT ERROR] Erro recebido:', error);
      toast.error(error);
    },
    onStatusChange: (newStatus) => {
      logger.debug(`🔄 [VOICECHAT STATUS] Status mudou para: ${newStatus}`);
      logger.debug(`🔄 [VOICECHAT STATUS] agentMode atual: ${agentMode}`);
      if (newStatus === 'disconnected') {
        setConnectionStep('idle');
      }
    },
    onConnectionStepChange: (step) => {
      logger.debug(`🔄 [VOICECHAT STEP] Etapa de conexão: ${step}`);
      setConnectionStep(step);
    }
  });

  // Wrapped disconnect — end tutor memory session before disconnecting
  const disconnect = useCallback(() => {
    endTutorSession();
    rawDisconnect();
  }, [endTutorSession, rawDisconnect]);

  // Handle agent connection events - process pending actions
  useEffect(() => {
    let introTimeout: ReturnType<typeof setTimeout> | null = null;
    
    logger.debug(`🎬 [VOICECHAT EFFECT] Status changed effect - status: ${status}, agentMode: ${agentMode}`);
    
    if (status === 'connected') {
      logger.debug('🎬 [VOICECHAT EFFECT] ✅ Conectado! isListening:', isListening);
      
      // Start microphone when connected
      if (!isListening) {
        logger.debug('🎤 [VOICECHAT EFFECT] Iniciando microfone...');
        startListening();
      }
      
      // Process any pending reconnect actions
      if (pendingReconnect) {
        logger.debug('🎬 [VOICECHAT EFFECT] Processando pendingReconnect:', pendingReconnect.type);
        const { type, data } = pendingReconnect;
        setPendingReconnect(null);
        
        if (type === 'moment') {
          logger.debug('🎬 [VOICECHAT EFFECT] Configurando teaching moment:', data.topic);
          setActiveMoment(data);
          const instruction = generateTeacherInstructions(data);
          setTimeout(() => sendText(instruction), 500);
          toast.info(`🎯 Momento de aprofundamento: ${data.topic}`, { duration: 5000 });
        } else if (type === 'quiz') {
          setActiveQuiz(data);
          const quizInstruction = `MINI QUIZ! Hora de testar o conhecimento do aluno.
          
Pergunta: "${data.question}"

Opções:
${data.options.map((opt: string, i: number) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}

INSTRUÇÕES:
1. Leia a pergunta de forma clara e pausada
2. Leia cada opção (A, B, C, D)
3. Diga "Você tem alguns segundos para pensar"
4. Aguarde; o sistema vai revelar a resposta automaticamente na tela`;
          setTimeout(() => sendText(quizInstruction), 500);
          toast.info('📝 Mini Quiz!', { duration: 3000 });
        }
      }
      
      // Handle intro mode - agent starts class only if custom intro is configured
      if (agentMode === 'intro' && !introCompletedRef.current) {
        logger.debug('🎬 [VOICECHAT EFFECT] Modo intro detectado, configurando...');
        introCompletedRef.current = true;
        
        // Only send intro if admin configured a custom teacher intro
        const customIntro = teacherIntro?.trim();
        logger.debug('🎬 [VOICECHAT EFFECT] Custom intro:', customIntro ? 'SIM' : 'NÃO');
        
        if (customIntro) {
          const introInstruction = `[SISTEMA] Você acabou de se conectar com o aluno para começar uma nova aula.

INTRODUÇÃO PERSONALIZADA (USE EXATAMENTE ESTE TEXTO COMO BASE):
"${customIntro}"

INSTRUÇÕES:
1. Use a introdução personalizada acima como guia para seu tom e estilo
2. Adapte naturalmente, mas mantenha a essência do texto
3. Após a introdução, pergunte se o aluno está pronto para começar
4. Seja breve - máximo 30 segundos`;
          
          setTimeout(() => {
            if (statusRef.current === 'connected' && sendTextRef.current) {
              sendTextRef.current(introInstruction);
            }
          }, 1000);
        }
        // If no custom intro, agent stays silent and waits for user interaction
      }
    }
    
    // Always return cleanup function to avoid hooks order issues
    return () => {
      if (introTimeout) {
        clearTimeout(introTimeout);
      }
    };
  }, [status, pendingReconnect, agentMode, isListening, startListening, sendText, generateTeacherInstructions, disconnect]);

  // Monitor video time for teaching moments and quizzes (works even when disconnected)
  useEffect(() => {
    if (!videoId) {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
        timeCheckIntervalRef.current = null;
      }
      return;
    }

    timeCheckIntervalRef.current = window.setInterval(() => {
      const currentTime = videoPlayerRef.current?.getCurrentTime() || 0;
      const isPaused = videoPlayerRef.current?.isPaused() ?? true;
      
      // Update current time for timer display
      setCurrentVideoTime(currentTime);

      // Send periodic context update to tutor (every 30s) so it knows the current video position
      if (statusRef.current === 'connected' && !isPaused && sendTextRef.current) {
        const timeSinceLastUpdate = currentTime - lastContextUpdateTimeRef.current;
        if (timeSinceLastUpdate >= 30 || lastContextUpdateTimeRef.current === 0) {
          lastContextUpdateTimeRef.current = currentTime;
          const mins = Math.floor(currentTime / 60);
          const secs = Math.floor(currentTime % 60).toString().padStart(2, '0');
          sendTextRef.current(`[CONTEXTO] Tempo atual do vídeo: ${mins}:${secs}`);
        }
      }

      // Calculate next pause (quiz or teaching moment)
      const allPauses: {time: number; type: 'quiz' | 'moment'; topic?: string}[] = [];
      
      // Add upcoming quizzes
      timestampQuizzes.forEach(q => {
        if (q.timestampSeconds && q.timestampSeconds > currentTime) {
          allPauses.push({ time: q.timestampSeconds, type: 'quiz', topic: 'Quiz' });
        }
      });
      
      // Add upcoming teaching moments
      if (contentPlan) {
        contentPlan.teaching_moments.forEach(m => {
          if (m.timestamp_seconds > currentTime) {
            allPauses.push({ time: m.timestamp_seconds, type: 'moment', topic: m.topic });
          }
        });
      }
      
      // Sort and get the next one
      allPauses.sort((a, b) => a.time - b.time);
      setNextPauseInfo(allPauses[0] || null);

      // Pre-warm WebSocket connection 15s before next pause if disconnected
      if (allPauses[0] && status === 'disconnected' && !isPaused) {
        const timeUntilPause = allPauses[0].time - currentTime;
        if (timeUntilPause > 0 && timeUntilPause <= 15) {
          logger.debug('[VoiceChat] Pre-warming connection, next pause in', Math.round(timeUntilPause), 's');
          connect();
        }
      }

      // Only check when video is playing and no quiz is active
      // NOTE: Do not gate by agentMode: the student may start playback manually (e.g. during intro)
      // and pauses still must trigger reliably.
      if (!isPaused && !activeQuiz) {
        // Check for timestamp quizzes first
        const quiz = getQuizForTimestamp(currentTime);
        if (quiz) {
          markQuizTriggered(quiz.id);
          videoPlayerRef.current?.pause();
          setAgentMode('teaching');
          setIsVideoExpanded(false); // Collapse video for quiz interaction
          
          // If agent is connected, send instruction. Otherwise, reconnect first.
          if (status === 'connected') {
            setActiveQuiz(quiz);
            const quizInstruction = `MINI QUIZ! Hora de testar o conhecimento do aluno.
            
Pergunta: "${quiz.question}"

Opções:
${quiz.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join('\n')}

INSTRUÇÕES:
1. Leia a pergunta de forma clara e pausada
2. Leia cada opção (A, B, C, D)
3. Diga "Você tem alguns segundos para pensar"
4. Aguarde; o sistema vai revelar a resposta automaticamente na tela`;
            sendText(quizInstruction);
            toast.info('📝 Mini Quiz!', { duration: 3000 });
          } else {
            // Queue the quiz and reconnect
            setPendingReconnect({ type: 'quiz', data: quiz });
            connect();
          }
          return;
        }

        // Check for teaching moments
        if (contentPlan) {
          const moment = checkForTeachingMoment(currentTime);
          
          if (moment && lastCheckedMomentRef.current !== contentPlan.teaching_moments.indexOf(moment)) {
            lastCheckedMomentRef.current = contentPlan.teaching_moments.indexOf(moment);
            videoPlayerRef.current?.pause();
            setAgentMode('teaching');
            setIsVideoExpanded(false); // Collapse video for teaching moment
            
            // If agent is connected, send instruction. Otherwise, reconnect first.
            if (status === 'connected') {
              setActiveMoment(moment);
              const instruction = generateTeacherInstructions(moment);
              sendText(instruction);
              toast.info(`🎯 Momento de aprofundamento: ${moment.topic}`, { duration: 5000 });
            } else {
              // Queue the moment and reconnect
              setPendingReconnect({ type: 'moment', data: moment });
              connect();
            }
          }
        }
      }
    }, 1000);

    return () => {
      if (timeCheckIntervalRef.current) {
        clearInterval(timeCheckIntervalRef.current);
        timeCheckIntervalRef.current = null;
      }
    };
  }, [status, contentPlan, videoId, activeQuiz, checkForTeachingMoment, generateTeacherInstructions, sendText, getQuizForTimestamp, markQuizTriggered, connect, timestampQuizzes]);

  // Resume video helper with retry logic
  const resumeVideo = useCallback(() => {
    logger.debug('[VoiceChat] resumeVideo called');
    
    if (!videoPlayerRef.current) {
      logger.error('[VoiceChat] videoPlayerRef.current is null');
      return;
    }
    
    // Call play directly - the VideoPlayer queues the action if not ready
    logger.debug('[VoiceChat] Calling videoPlayerRef.current.play()');
    videoPlayerRef.current.play();
    
    // Check after a delay if video started, retry if needed
    const checkAndRetry = (attempt: number) => {
      setTimeout(() => {
        if (!videoPlayerRef.current) return;
        
        const isPaused = videoPlayerRef.current.isPaused();
        logger.debug(`[VoiceChat] Check attempt ${attempt}: isPaused=${isPaused}`);
        
        if (isPaused && attempt < 3) {
          logger.debug('[VoiceChat] Video still paused, retrying play()...');
          videoPlayerRef.current.play();
          checkAndRetry(attempt + 1);
        } else if (isPaused) {
          logger.error('[VoiceChat] Failed to start video after 3 attempts');
          toast.error('Não foi possível iniciar o vídeo. Clique no play manualmente.');
        } else {
          logger.debug('[VoiceChat] Video is playing!');
        }
      }, 800); // Give more time for YouTube player to respond
    };
    
    checkAndRetry(1);
  }, []);

  // Handle video ended - trigger class wrap-up
  const handleVideoEnded = useCallback(() => {
    logger.debug('[VoiceChat] Video ended, triggering class wrap-up');
    
    // Notify parent that video ended (for progress tracking)
    onVideoEnded?.();
    
    // Get the first mission for this lesson (if any)
    const lessonMission = lessonMissions.length > 0 ? lessonMissions[0] : null;
    
    // Start capturing end data
    isCapturingEndDataRef.current = true;
    endMessageBufferRef.current = '';
    setLessonEndData({ mission: lessonMission || undefined });
    
    // Collapse video
    setIsVideoExpanded(false);
    setAgentMode('ended');
    
    // If there's a mission, open the missions panel so student can see it while professor explains
    if (lessonMission && onOpenMissions) {
      onOpenMissions();
    }
    
    // Build wrap-up prompt with mission info - professor explains what's on screen
    let wrapUpPrompt = '[SISTEMA] O vídeo terminou. ';
    wrapUpPrompt += 'Diga "Parabéns, você concluiu a aula!" de forma animada. ';
    wrapUpPrompt += 'Faça um resumo BREVE (máximo 3 pontos) do que foi aprendido. ';
    
    if (lessonMission) {
      wrapUpPrompt += `Agora o painel de MISSÕES está aberto na tela do aluno. `;
      wrapUpPrompt += `Apresente a missão "${lessonMission.title}" que ele está vendo. `;
      wrapUpPrompt += `Explique: ${lessonMission.description}. `;
      wrapUpPrompt += 'Encoraje-o a completar a missão para ganhar pontos e desbloquear a próxima aula!';
    } else {
      wrapUpPrompt += 'Proponha uma TAREFA prática para a semana e despeça-se de forma encorajadora.';
    }
    
    // If agent is connected, send the wrap-up instruction
    if (statusRef.current === 'connected' && sendTextRef.current) {
      sendTextRef.current(wrapUpPrompt);
    } else {
      // Reconnect to deliver wrap-up
      setPendingReconnect({ type: 'moment', data: { topic: 'Encerramento da aula' } as any });
      connect();
    }
  }, [connect, lessonMissions, onOpenMissions, onVideoEnded]);
  
  // Cleanup wrap-up state when agent finishes speaking
  const wrapUpSpeechEndedRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // When professor finishes speaking during end screen, cleanup capture state
    if (isCapturingEndDataRef.current && !isSpeaking && agentMode === 'ended') {
      if (wrapUpSpeechEndedRef.current) {
        clearTimeout(wrapUpSpeechEndedRef.current);
      }
      
      wrapUpSpeechEndedRef.current = setTimeout(() => {
        if (isCapturingEndDataRef.current && !isSpeaking) {
          logger.debug('[VoiceChat] Professor terminou explicação da missão');
          isCapturingEndDataRef.current = false;
        }
      }, 2000);
    }
    
    return () => {
      if (wrapUpSpeechEndedRef.current) {
        clearTimeout(wrapUpSpeechEndedRef.current);
      }
    };
  }, [isSpeaking, agentMode]);

  // Handle quiz completion
  const handleQuizComplete = useCallback((selectedIndex: number, isCorrect: boolean) => {
    if (!activeQuiz) return;
    
    // Record the attempt
    recordAttempt(activeQuiz.id, selectedIndex, isCorrect);
    
    // Tell the agent the result
    const resultText = isCorrect 
      ? `[SISTEMA] O aluno acertou o quiz! A resposta correta era "${activeQuiz.options[activeQuiz.correctIndex]}". Parabenize brevemente e depois diga "Vamos continuar!".`
      : selectedIndex === -1
        ? `[SISTEMA] O tempo do quiz acabou sem resposta. A resposta correta era "${activeQuiz.options[activeQuiz.correctIndex]}". Explique em uma frase e depois diga "Continuando o vídeo!".`
        : `[SISTEMA] O aluno errou o quiz. A correta era "${activeQuiz.options[activeQuiz.correctIndex]}". Explique brevemente de forma encorajadora e depois diga "Vamos seguir!".`;
    
    if (status === 'connected') {
      sendText(resultText);
    }
    setActiveQuiz(null);
    
    // Resume video after brief delay for agent to respond
    setTimeout(() => {
      logger.debug('[VoiceChat] Quiz complete, resuming video');
      resumeVideo();
      setAgentMode('playing');
      // Keep connection alive for voice interaction during video
    }, 2000);
  }, [activeQuiz, recordAttempt, sendText, status, resumeVideo]);

  const handleSendText = () => {
    if (!textInput.trim()) return;
    sendText(textInput);
    setTextInput('');
  };

  const handleStartClass = useCallback(() => {
    // One-click student flow: use this user gesture to unlock YouTube programmatic playback
    videoPlayerRef.current?.unlockPlayback?.();
    introCompletedRef.current = false;
    setAgentMode('intro');
    connect();
  }, [connect]);

  // Called when student confirms they're ready to start the video
  const handleStartVideo = useCallback(() => {
    if (status === 'connected') {
      sendText('[SISTEMA] O aluno confirmou que está pronto. Diga algo breve como "Vamos lá! Começando o vídeo..." e prepare-se para voltar nos momentos de pausa. Fique em silêncio durante o vídeo, mas responda imediatamente se o aluno falar com você.');
      setTimeout(() => {
        logger.debug('[VoiceChat] Starting video after intro');
        resumeVideo();
        setAgentMode('playing');
        setIsVideoExpanded(true); // Expand video when playing
        onVideoStarted?.();
        // Keep connection alive so student can interact by voice during video
        // The tutor stays silent but listens for student commands like "pause", "volta", etc.
      }, 2000);
    }
  }, [status, sendText, resumeVideo, onVideoStarted]);

  // Handle dismissing teaching moment - resume video and disconnect
  const handleDismissMoment = useCallback(() => {
    logger.debug('[VoiceChat] handleDismissMoment called');
    setActiveMoment(null);
    if (status === 'connected') {
      sendText('[SISTEMA] O aluno quer continuar o vídeo. Diga algo breve como "Vamos lá!" e fique em silêncio durante o vídeo. Responda imediatamente se o aluno falar com você.');
      setTimeout(() => {
        logger.debug('[VoiceChat] Moment dismissed, resuming video');
        resumeVideo();
        setAgentMode('playing');
        setIsVideoExpanded(true);
        onVideoStarted?.();
        // Keep connection alive for voice interaction during video
      }, 1500);
    } else {
      logger.debug('[VoiceChat] Moment dismissed (not connected), resuming video directly');
      resumeVideo();
      setAgentMode('playing');
      setIsVideoExpanded(true);
      onVideoStarted?.();
    }
  }, [sendText, status, resumeVideo, onVideoStarted]);

  const dismissActiveMoment = () => {
    handleDismissMoment();
  };

  // Notify tutor when student manually interacts with the video player
  const handleManualPlay = useCallback(() => {
    if (statusRef.current === 'connected' && sendTextRef.current && agentMode !== 'intro') {
      const mins = Math.floor(currentVideoTime / 60);
      const secs = Math.floor(currentVideoTime % 60).toString().padStart(2, '0');
      sendTextRef.current(`[CONTEXTO] O aluno deu play no vídeo manualmente em ${mins}:${secs}. Fique em silêncio e acompanhe.`);
    }
  }, [agentMode, currentVideoTime]);

  const handleManualPause = useCallback(() => {
    if (statusRef.current === 'connected' && sendTextRef.current && agentMode === 'playing') {
      const mins = Math.floor(currentVideoTime / 60);
      const secs = Math.floor(currentVideoTime % 60).toString().padStart(2, '0');
      sendTextRef.current(`[CONTEXTO] O aluno pausou o vídeo manualmente em ${mins}:${secs}. Pergunte brevemente se ele tem alguma dúvida sobre o que acabou de ver.`);
    }
  }, [agentMode, currentVideoTime]);

  const handleManualSeek = useCallback((seconds: number) => {
    if (statusRef.current === 'connected' && sendTextRef.current) {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60).toString().padStart(2, '0');
      sendTextRef.current(`[CONTEXTO] O aluno pulou para ${mins}:${secs} no vídeo.`);
    }
  }, []);

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate time remaining until next pause
  const timeUntilNextPause = nextPauseInfo ? Math.max(0, nextPauseInfo.time - currentVideoTime) : null;

  const statusColor = useMemo(() => {
    if (agentMode === 'playing' && status === 'disconnected') return 'bg-primary/60';
    if (status === 'connected') {
      if (isSpeaking) return 'bg-primary';
      if (isVoiceDetected) return 'bg-accent';
      return 'bg-accent/60';
    }
    switch (status) {
      case 'connecting': return 'bg-muted-foreground';
      case 'error': return 'bg-destructive';
      default: return 'bg-muted';
    }
  }, [status, agentMode, isSpeaking, isVoiceDetected]);

  // Clear mic state indicator for the tutor panel
  const micStateText = useMemo(() => {
    if (status !== 'connected') {
      if (agentMode === 'playing' && status === 'disconnected') return 'Assistindo';
      if (status === 'connecting') return 'Conectando…';
      return 'Aguardando';
    }
    if (isSpeaking) return 'Falando…';
    if (isVoiceDetected) return 'Ouvindo você…';
    if (isListening) return 'Escutando…';
    return 'Pronto';
  }, [status, agentMode, isSpeaking, isVoiceDetected, isListening]);

  const statusText = useMemo(() => {
    if (agentMode === 'playing' && status === 'disconnected') return 'Assistindo';
    if (agentMode === 'intro') return 'Introdução';
    if (agentMode === 'teaching') return 'Ensinando';
    switch (status) {
      case 'connected': return micStateText;
      case 'connecting': return 'Conectando…';
      case 'error': return 'Erro';
      default: return 'Aguardando';
    }
  }, [status, agentMode, micStateText]);

  // Detailed connection step text for better UX
  const connectionStepText = useMemo(() => {
    switch (connectionStep) {
      case 'fetching_key': return 'Buscando credenciais...';
      case 'connecting_ws': return 'Conectando ao tutor...';
      case 'configuring': return 'Configurando sessão...';
      case 'ready': return 'Pronto!';
      default: return 'Conectando...';
    }
  }, [connectionStep]);

  return (
    <>
    <Card className={`flex flex-col border-0 shadow-none bg-transparent transition-all duration-500 ${
      isVideoExpanded 
        ? 'h-[90vh] fixed inset-x-0 top-0 z-50 rounded-none bg-background' 
        : 'h-full min-h-[400px] sm:min-h-0'
    }`}>
      {/* Collapsed Header when video is expanded */}
      {isVideoExpanded ? (
        <CardHeader className="py-2 px-3 sm:px-6 flex-shrink-0 bg-card/95 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${statusColor}`} />
              <span className="text-sm font-medium truncate max-w-[200px]">{videoTitle}</span>
            </div>
            <div className="flex items-center gap-2">
              {agentMode === 'playing' && nextPauseInfo && timeUntilNextPause !== null && timeUntilNextPause > 0 && (
                <div className="flex items-center gap-1.5 text-xs">
                  <Target className="h-3 w-3 text-accent" />
                  <span className="font-mono text-accent">{formatTime(timeUntilNextPause)}</span>
                </div>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsVideoExpanded(false)}
                className="h-7 px-2 text-xs"
              >
                Minimizar
              </Button>
            </div>
          </div>
        </CardHeader>
      ) : null}
      
      <CardContent className={`flex-1 flex flex-col overflow-hidden p-0 ${
        isVideoExpanded ? 'pt-0' : ''
      }`}>
        {/* Desktop: 2-column grid (video | chat). Mobile: single column */}
        <div className="flex-1 flex flex-col lg:grid lg:grid-cols-[85fr_15fr] overflow-hidden">
        {/* ===== LEFT: Video Stage (85% of screen) ===== */}
        <div className="flex flex-col overflow-hidden p-1 sm:p-2 lg:p-3">
        {hasVideo && (
          <div className={`relative transition-all duration-500 ${
            isVideoExpanded
              ? 'flex-1 min-h-0'
              : 'h-[calc(85vh-54px)]'
          }`}>
            <div className="h-full">
              {isDirectVideo && videoUrl ? (
                <DirectVideoPlayer
                  ref={videoPlayerRef as React.RefObject<DirectVideoPlayerRef>}
                  videoUrl={videoUrl}
                  title={videoTitle}
                  expanded={isVideoExpanded}
                  onEnded={handleVideoEnded}
                  onPlay={handleManualPlay}
                  onPause={handleManualPause}
                  onSeek={handleManualSeek}
                />
              ) : videoId ? (
                <VideoPlayer
                  ref={videoPlayerRef as React.RefObject<VideoPlayerRef>}
                  videoId={videoId}
                  title={videoTitle}
                  expanded={isVideoExpanded}
                  onEnded={handleVideoEnded}
                  onPlay={handleManualPlay}
                  onPause={handleManualPause}
                  onSeek={handleManualSeek}
                />
              ) : null}
            </div>
            
            {/* Live Captions Overlay */}
            <LiveCaptionsOverlay
              text={captionText}
              isActive={isSpeaking}
              enabled={captionsEnabled}
            />

            {/* Next Pause Timer - Discrete overlay at bottom of video */}
            {agentMode === 'playing' && nextPauseInfo && timeUntilNextPause !== null && timeUntilNextPause > 0 && (
              <div className="absolute bottom-2 right-2 z-10">
                <div className="bg-black/70 backdrop-blur-sm text-white px-2 py-1 rounded-md text-xs flex items-center gap-1.5 animate-fade-in">
                  <Target className="h-3 w-3 text-google-yellow" />
                  <span className="text-muted-foreground/80">Próxima pausa:</span>
                  <span className="font-mono font-medium text-google-yellow">{formatTime(timeUntilNextPause)}</span>
                  {nextPauseInfo.type === 'quiz' && (
                    <Badge variant="outline" className="text-[8px] h-4 px-1 border-google-blue text-google-blue">Quiz</Badge>
                  )}
                </div>
              </div>
            )}
            
            {/* Mini Quiz Overlay */}
            <AnimatePresence>
              {activeQuiz && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm z-20 p-4">
                  <div className="w-full max-w-md">
                    <MiniQuiz
                      question={{
                        id: activeQuiz.id,
                        question: activeQuiz.question,
                        options: activeQuiz.options,
                        correctIndex: activeQuiz.correctIndex,
                        explanation: activeQuiz.explanation,
                      }}
                      onComplete={handleQuizComplete}
                      revealDelay={10}
                      autoAdvanceDelay={5}
                    />
                  </div>
                </div>
              )}
            </AnimatePresence>
            
            {/* Pause Times List */}
            {((contentPlan?.teaching_moments?.length ?? 0) > 0 || timestampQuizzes.length > 0) && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[9px] text-muted-foreground">
                <span className="font-medium">Pausas:</span>
                {[
                  ...timestampQuizzes
                    .filter(q => q.timestampSeconds)
                    .map(q => ({ time: q.timestampSeconds!, type: 'quiz' as const })),
                  ...(contentPlan?.teaching_moments || [])
                    .map(m => ({ time: m.timestamp_seconds, type: 'moment' as const }))
                ]
                  .sort((a, b) => a.time - b.time)
                  .map((pause, i) => (
                    <span 
                      key={i} 
                      className={`font-mono px-1 py-0.5 rounded ${
                        pause.type === 'quiz' 
                          ? 'bg-google-blue/20 text-google-blue' 
                          : 'bg-google-yellow/20 text-google-yellow'
                      }`}
                    >
                      {formatTime(pause.time)}
                    </span>
                  ))
                }
              </div>
            )}
            
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] sm:text-xs text-muted-foreground">
                💡 Diga "dê play", "pause" ou "reinicie o vídeo"
              </p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDebug(!showDebug)}
                className="h-5 sm:h-6 px-1.5 sm:px-2"
              >
                <Bug className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Debug Panel */}
            {showDebug && (
              <div className="mt-2 p-2 bg-muted/50 rounded text-xs space-y-2 border">
                <div className="font-medium">🔧 Debug Panel</div>
                <div className="grid grid-cols-2 gap-1">
                  <span className="text-muted-foreground">Status:</span>
                  <span className={status === 'connected' ? 'text-green-600' : 'text-yellow-600'}>{status}</span>
                  
                  <span className="text-muted-foreground">Player Ref:</span>
                  <span className={debugInfo.playerReady ? 'text-green-600' : 'text-red-600'}>
                    {debugInfo.playerReady ? '✓ Conectado' : '✗ NULL'}
                  </span>
                  
                  <span className="text-muted-foreground">Última ação:</span>
                  <span>{debugInfo.lastAction || 'Nenhuma'}</span>
                </div>
                
                {/* Manual Test Buttons */}
                <div className="flex gap-1 pt-1 border-t">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      logger.debug('[Debug] Manual play test');
                      toast.info('Testando Play...');
                      videoPlayerRef.current?.play();
                      setDebugInfo(prev => ({ ...prev, lastAction: 'MANUAL play @ ' + new Date().toLocaleTimeString() }));
                    }}
                  >
                    <Play className="h-3 w-3 mr-1" /> Test Play
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      logger.debug('[Debug] Manual pause test');
                      toast.info('Testando Pause...');
                      videoPlayerRef.current?.pause();
                      setDebugInfo(prev => ({ ...prev, lastAction: 'MANUAL pause @ ' + new Date().toLocaleTimeString() }));
                    }}
                  >
                    <Pause className="h-3 w-3 mr-1" /> Test Pause
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-xs"
                    onClick={() => {
                      logger.debug('[Debug] Manual restart test');
                      toast.info('Testando Restart...');
                      videoPlayerRef.current?.restart();
                      setDebugInfo(prev => ({ ...prev, lastAction: 'MANUAL restart @ ' + new Date().toLocaleTimeString() }));
                    }}
                  >
                    <RotateCcw className="h-3 w-3 mr-1" /> Test Restart
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
        {/* ===== END LEFT: Video Stage ===== */}

        {/* ===== RIGHT: Tutor Chat Panel ===== */}
        <aside className="flex flex-col border-t lg:border-t-0 lg:border-l border-border bg-card/30 lg:h-[calc(100vh-56px)] lg:sticky lg:top-[56px] overflow-hidden">
          {/* Tutor header with clear state indicator */}
          <div className="p-3 lg:p-4 border-b border-border flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors duration-300 ${statusColor} ${
                  (isSpeaking || isVoiceDetected) && status === 'connected' ? 'animate-pulse' : ''
                }`} />
                <span className="text-sm font-medium">Tutor IA</span>
                {status === 'connected' && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    isSpeaking 
                      ? 'bg-primary/15 text-primary' 
                      : isVoiceDetected 
                        ? 'bg-accent/15 text-accent' 
                        : 'bg-muted text-muted-foreground'
                  }`}>
                    {micStateText}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {contentPlan && (
                  <Button
                    size="sm"
                    variant={showContentPlan ? "secondary" : "ghost"}
                    onClick={() => setShowContentPlan(!showContentPlan)}
                    className="h-6 px-2 text-xs"
                  >
                    <BookOpen className="h-3 w-3 mr-1" />
                    {contentPlan.teaching_moments.length}
                  </Button>
                )}
                {isAnalyzingContent && (
                  <span className="text-xs text-muted-foreground animate-pulse">…</span>
                )}
                {status !== 'connected' && (
                  <span className="text-[10px] text-muted-foreground">{statusText}</span>
                )}
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* Content Plan Panel */}
        {showContentPlan && contentPlan && (
          <div className="bg-muted/30 rounded-lg p-3 border space-y-2 max-h-48 overflow-y-auto">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Target className="h-4 w-4 text-primary" />
              Plano de Ensino
            </div>
            {contentPlan.teaching_moments.map((moment, index) => (
              <div 
                key={index}
                className={`p-2 rounded text-xs border ${
                  activeMoment === moment ? 'bg-primary/10 border-primary' : 'bg-background'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="text-[10px]">
                    {Math.floor(moment.timestamp_seconds / 60)}:{(moment.timestamp_seconds % 60).toString().padStart(2, '0')}
                  </Badge>
                  <span className="font-medium">{moment.topic}</span>
                </div>
                <p className="text-muted-foreground">{moment.key_insight}</p>
              </div>
            ))}
          </div>
        )}

        {/* Active Teaching Moment Alert */}
        {activeMoment && (
          <div className="bg-primary/10 border border-primary rounded-lg p-3 flex-shrink-0 animate-pulse">
            <div className="flex items-start gap-2">
              <Lightbulb className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-sm">{activeMoment.topic}</span>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 px-2 text-xs"
                    onClick={dismissActiveMoment}
                  >
                    ✓ Entendi
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{activeMoment.key_insight}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Chat Section - always visible on desktop, collapsible on mobile */}
        <div className="border rounded-lg overflow-hidden bg-card/50">
          <button
            onClick={() => setShowChat(!showChat)}
            className="w-full flex items-center justify-between p-2.5 hover:bg-muted/30 transition-colors lg:hidden"
          >
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <MessageSquare className="h-3.5 w-3.5" />
              <span>Chat</span>
              {messages.length > 0 && (
                <span className="text-[10px] tabular-nums">({messages.length})</span>
              )}
            </div>
            {showChat ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          
          {(showChat || true) && ( /* Always show on desktop via CSS, toggle on mobile */
            <div className={`p-2 sm:p-3 border-t space-y-2 ${!showChat ? 'hidden lg:block' : ''}`}>
              {/* Messages */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground p-3">
                    <p className="text-xs">Nenhuma mensagem ainda</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div 
                      key={msg.id}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[90%] sm:max-w-[85%] rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm ${
                          msg.role === 'user' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              {/* Text input - only when connected */}
              {status === 'connected' && (
                <div className="flex gap-2 pt-2 border-t">
                  <Input
                    placeholder="Pergunte algo sobre esta aula…"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendText()}
                    className="h-8 text-xs border-0 bg-muted/50 focus-visible:ring-1"
                  />
                  <Button onClick={handleSendText} size="icon" variant="ghost" className="h-8 w-8">
                    <Send className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Voice indicators - mobile only (desktop has them in fixed bottom) */}
        {status === 'connected' && (
          <div className="flex justify-center gap-6 py-1.5 lg:hidden">
            {isListening && (
              <div className="text-center">
                <VoiceIndicator isActive={isListening} type="listening" isVoiceDetected={isVoiceDetected} />
                <p className={`text-[10px] sm:text-xs mt-0.5 sm:mt-1 transition-colors ${isVoiceDetected ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}>
                  {isVoiceDetected ? 'Voz detectada' : 'Ouvindo...'}
                </p>
              </div>
            )}
            {isSpeaking && (
              <div className="text-center">
                <VoiceIndicator isActive={isSpeaking} type="speaking" />
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1">Falando...</p>
              </div>
            )}
          </div>
        )}
        


        
        {/* Controls - mobile only (desktop has them in fixed bottom) */}
        <div className="space-y-2 pt-2 border-t flex-shrink-0 lg:hidden">
          <div className="flex gap-2">
            {status === 'disconnected' && agentMode !== 'playing' ? (
              <Button onClick={handleStartClass} className="flex-1 h-12 sm:h-11 text-sm sm:text-base">
                <Phone className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                Iniciar Aula
              </Button>
            ) : status === 'connecting' ? (
              <Button disabled className="flex-1 h-12 sm:h-11 text-sm sm:text-base gap-2">
                <div className="flex flex-col items-center gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {(['fetching_key', 'connecting_ws', 'configuring', 'ready'] as const).map((step, i) => {
                      const steps = ['fetching_key', 'connecting_ws', 'configuring', 'ready'] as const;
                      const currentIdx = steps.indexOf(connectionStep as typeof steps[number]);
                      return (
                        <div key={step} className={`w-2 h-2 rounded-full transition-colors ${
                          connectionStep === step ? 'bg-primary-foreground animate-pulse' :
                          currentIdx > i ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                        }`} />
                      );
                    })}
                  </div>
                  <span className="text-xs">{connectionStepText}</span>
                </div>
              </Button>
            ) : agentMode === 'intro' && status === 'connected' ? (
              <>
                {/* Intro mode - show "Start Video" button */}
                <div className="flex-1 flex items-center justify-center gap-2 h-10 sm:h-11 bg-primary/10 rounded-md px-3">
                  {isListening ? (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-sm text-primary">Professor apresentando...</span>
                    </>
                  ) : isSpeaking ? (
                    <>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                      <span className="text-sm text-primary">Ouvindo introdução...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      <span className="text-sm text-muted-foreground">Preparando aula...</span>
                    </>
                  )}
                </div>
                <Button 
                  onClick={handleStartVideo} 
                  className="h-10 sm:h-11 px-4 bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Play className="h-4 w-4 mr-2" />
                  <span>Começar Vídeo</span>
                </Button>
              </>
            ) : agentMode === 'playing' && status === 'disconnected' ? (
              <>
                {/* Video playing mode - agent disconnected */}
                <div className="flex-1 flex items-center justify-center gap-2 h-10 sm:h-11 bg-blue-500/10 rounded-md px-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <span className="text-sm text-blue-600 dark:text-blue-400">▶️ Vídeo em andamento...</span>
                </div>
              </>
            ) : status === 'connected' ? (
              <>
                {/* Connected and teaching */}
                <div className="flex-1 flex items-center justify-center gap-2 h-12 sm:h-11 bg-primary/10 rounded-md px-3">
                  {isListening ? (
                    isSpeaking ? (
                      <>
                        <div className="w-2 h-2 bg-google-blue rounded-full animate-pulse" />
                        <span className="text-sm text-primary">Professor falando...</span>
                        <VoiceIndicator isActive={true} type="speaking" />
                      </>
                    ) : isVoiceDetected ? (
                      <>
                        <div className="w-2 h-2 bg-google-green rounded-full animate-pulse" />
                        <span className="text-sm text-google-green">Voz detectada</span>
                        <VoiceIndicator isActive={true} type="listening" isVoiceDetected={true} />
                      </>
                    ) : (
                      <>
                        <ProcessingIndicator size="sm" />
                        <span className="text-sm text-google-yellow">Processando...</span>
                      </>
                    )
                  ) : isSpeaking ? (
                    <>
                      <div className="w-2 h-2 bg-google-blue rounded-full animate-pulse" />
                      <span className="text-sm text-primary">Professor falando...</span>
                      <VoiceIndicator isActive={true} type="speaking" />
                    </>
                  ) : (
                    <>
                      <div className="w-2 h-2 bg-google-green rounded-full" />
                      <span className="text-sm text-muted-foreground">Momento de aprendizado</span>
                    </>
                  )}
                </div>
                <Button onClick={disconnect} variant="destructive" className="h-12 sm:h-11 px-4">
                  <PhoneOff className="h-5 w-5 sm:h-4 sm:w-4 mr-2" />
                  <span className="hidden sm:inline">Encerrar</span>
                </Button>
              </>
            ) : (
              <Button onClick={handleStartClass} className="flex-1 h-10 sm:h-11 text-sm sm:text-base">
                <Phone className="h-4 w-4 mr-2" />
                Iniciar Aula
              </Button>
            )}
          </div>
          
        </div>

          </div>
          {/* End scrollable content */}

          {/* Fixed bottom controls */}
          <div className="p-3 border-t border-border flex-shrink-0">
            {/* Voice indicators */}
            {status === 'connected' && (
              <div className="flex justify-center gap-6 py-1.5 mb-2">
                {isListening && (
                  <div className="text-center">
                    <VoiceIndicator isActive={isListening} type="listening" isVoiceDetected={isVoiceDetected} />
                    <p className={`text-[10px] mt-0.5 transition-colors ${isVoiceDetected ? 'text-accent font-medium' : 'text-muted-foreground'}`}>
                      {isVoiceDetected ? 'Voz detectada' : 'Ouvindo...'}
                    </p>
                  </div>
                )}
                {isSpeaking && (
                  <div className="text-center">
                    <VoiceIndicator isActive={isSpeaking} type="speaking" />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Falando...</p>
                  </div>
                )}
              </div>
            )}
            
            {/* Start/Stop button */}
            <div className="flex gap-2">
              {status === 'disconnected' && agentMode !== 'playing' ? (
                <Button onClick={handleStartClass} className="flex-1 h-10 text-sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Iniciar Aula
                </Button>
              ) : status === 'connecting' ? (
                <Button disabled className="flex-1 h-10 text-sm gap-2">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      {(['fetching_key', 'connecting_ws', 'configuring', 'ready'] as const).map((step, i) => {
                        const steps = ['fetching_key', 'connecting_ws', 'configuring', 'ready'] as const;
                        const currentIdx = steps.indexOf(connectionStep as typeof steps[number]);
                        return (
                          <div key={step} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                            connectionStep === step ? 'bg-primary-foreground animate-pulse' :
                            currentIdx > i ? 'bg-primary-foreground' : 'bg-primary-foreground/30'
                          }`} />
                        );
                      })}
                    </div>
                    <span>{connectionStepText}</span>
                  </div>
                </Button>
              ) : status === 'connected' ? (
                <>
                  <CaptionsToggle enabled={captionsEnabled} onToggle={toggleCaptions} />
                  <Button onClick={disconnect} variant="destructive" className="flex-1 h-10 text-sm">
                    <PhoneOff className="h-4 w-4 mr-2" />
                    Encerrar
                  </Button>
                </>
              ) : (
                <Button onClick={handleStartClass} className="flex-1 h-10 text-sm">
                  <Phone className="h-4 w-4 mr-2" />
                  Iniciar Aula
                </Button>
              )}
            </div>
          </div>
        </aside>

        </div>
        {/* End grid wrapper */}
      </CardContent>
    </Card>
    
    {/* Lesson End Screen */}
    <LessonEndScreen
      isVisible={agentMode === 'ended'}
      videoTitle={videoTitle}
      weeklyTask={lessonEndData.weeklyTask}
      summaryPoints={lessonEndData.summaryPoints}
      mission={lessonEndData.mission}
      isProfessorSpeaking={isSpeaking}
      onGoHome={() => navigate('/aluno/dashboard')}
      onRestartLesson={() => {
        setAgentMode('idle');
        setLessonEndData({});
        introCompletedRef.current = false;
        lastCheckedMomentRef.current = -1;
        videoPlayerRef.current?.restart();
      }}
      onStartMission={() => {
        setAgentMode('idle');
        onOpenMissions?.();
      }}
    />
    


    </>
  );
}
