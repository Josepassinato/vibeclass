import { useCallback, useRef } from 'react';

export type InterventionType = 'question' | 'analogy' | 'curiosity' | 'challenge';

const INTERVENTION_TYPES: InterventionType[] = ['question', 'analogy', 'curiosity', 'challenge'];

const INTERVENTION_TEMPLATES: Record<InterventionType, string> = {
  question: 'Faca uma PERGUNTA sobre o conteudo para re-engajar o aluno. Ex: "Voce entendeu por que..."',
  analogy: 'Use uma ANALOGIA do dia a dia para explicar o conceito de forma mais acessivel.',
  curiosity: 'Compartilhe uma CURIOSIDADE relacionada ao topico para despertar interesse.',
  challenge: 'Proponha um DESAFIO RAPIDO (10 segundos) para o aluno pensar sobre o conceito.',
};

interface TranscriptContext {
  /** Current video timestamp in seconds */
  currentTime: number;
  /** Full transcript (will be sliced around currentTime) */
  transcript?: string | null;
  /** Video title */
  videoTitle?: string;
  /** Teaching moments with timestamps */
  teachingMoments?: Array<{ timestamp_seconds: number; topic: string; key_insight: string }>;
}

/**
 * Hook that generates contextual intervention prompts when student disengages.
 * Varies intervention types to avoid repetition.
 */
export function useContextualIntervention() {
  const lastTypeIndexRef = useRef(0);

  const buildInterventionPrompt = useCallback((ctx: TranscriptContext): string => {
    const { currentTime, transcript, videoTitle, teachingMoments } = ctx;

    // Cycle through intervention types (never repeat consecutively)
    lastTypeIndexRef.current = (lastTypeIndexRef.current + 1) % INTERVENTION_TYPES.length;
    const interventionType = INTERVENTION_TYPES[lastTypeIndexRef.current];
    const template = INTERVENTION_TEMPLATES[interventionType];

    // Find the transcript chunk around the current time (~30s window)
    let contextChunk = '';
    if (transcript) {
      // Rough estimate: 2.5 words/sec in speech
      const wordsPerSec = 2.5;
      const words = transcript.split(/\s+/);
      const estimatedWordIndex = Math.floor(currentTime * wordsPerSec);
      const windowWords = Math.floor(30 * wordsPerSec); // 30 seconds window
      const start = Math.max(0, estimatedWordIndex - windowWords);
      const end = Math.min(words.length, estimatedWordIndex + windowWords);
      contextChunk = words.slice(start, end).join(' ');
    }

    // Find nearest teaching moment
    let nearestTopic = '';
    if (teachingMoments?.length) {
      const sorted = [...teachingMoments].sort(
        (a, b) => Math.abs(a.timestamp_seconds - currentTime) - Math.abs(b.timestamp_seconds - currentTime)
      );
      const nearest = sorted[0];
      if (Math.abs(nearest.timestamp_seconds - currentTime) < 120) {
        nearestTopic = `${nearest.topic}: ${nearest.key_insight}`;
      }
    }

    const timeFormatted = `${Math.floor(currentTime / 60)}:${Math.floor(currentTime % 60).toString().padStart(2, '0')}`;

    return `[SISTEMA: O aluno parece desengajado. Intervencao contextual necessaria.]

CONTEXTO DO MOMENTO DO VIDEO:
- Tempo: ${timeFormatted}
- Aula: "${videoTitle || 'Sem titulo'}"
${nearestTopic ? `- Topico atual: ${nearestTopic}` : ''}
${contextChunk ? `- Trecho da transcricao: "${contextChunk.substring(0, 500)}"` : ''}

TIPO DE INTERVENCAO: ${interventionType.toUpperCase()}
${template}

REGRAS:
- Seja BREVE (2-3 frases no maximo)
- Referencie o conteudo ESPECIFICO que estava sendo ensinado
- Tom amigavel e encorajador
- Faca apenas 1 pergunta e ESPERE a resposta`;
  }, []);

  return { buildInterventionPrompt };
}
