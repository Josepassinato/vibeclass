import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Brain, Sparkles, CheckCircle2, XCircle, Trophy, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGamification } from '@/hooks/useGamification';
import { useAuth } from '@/hooks/useAuth';

interface QuizQuestion {
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string;
  difficulty: string;
  timestamp_seconds: number;
}

interface DynamicQuizProps {
  videoId: string;
  videoTitle: string;
  transcript: string | null;
}

type QuizState = 'idle' | 'loading' | 'playing' | 'finished';

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: 'bg-green-500/20 text-green-400 border-green-500/30',
  medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  hard: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const DIFFICULTY_LABELS: Record<string, string> = {
  easy: 'Facil',
  medium: 'Medio',
  hard: 'Dificil',
};

const XP_PER_CORRECT = 20;

export function DynamicQuiz({ videoId, videoTitle, transcript }: DynamicQuizProps) {
  const { user } = useAuth();
  const { addXp } = useGamification(user?.id ?? '');

  const [state, setState] = useState<QuizState>('idle');
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const currentQuestion = questions[currentIndex] ?? null;
  const totalQuestions = questions.length;
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const generateQuiz = useCallback(async () => {
    setState('loading');
    setError(null);
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('quiz-generator', {
        body: { transcript, title: videoTitle, num_questions: 5 },
      });

      if (fnError) throw fnError;

      if (!data?.questions?.length) {
        throw new Error('Nenhuma pergunta gerada');
      }

      setQuestions(data.questions);
      setState('playing');
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar quiz');
      setState('idle');
    }
  }, [transcript, videoTitle]);

  const handleSelectOption = (index: number) => {
    if (answered) return;
    setSelectedOption(index);
  };

  const handleConfirm = async () => {
    if (selectedOption === null || !currentQuestion) return;
    setAnswered(true);

    const isCorrect = selectedOption === currentQuestion.correct_option_index;
    if (isCorrect) {
      setScore((prev) => prev + 1);
      await addXp(XP_PER_CORRECT);
    }
  };

  const handleNext = () => {
    if (isLastQuestion) {
      setState('finished');
      return;
    }
    setCurrentIndex((prev) => prev + 1);
    setSelectedOption(null);
    setAnswered(false);
  };

  const handleRestart = () => {
    setState('idle');
    setQuestions([]);
    setCurrentIndex(0);
    setScore(0);
    setSelectedOption(null);
    setAnswered(false);
  };

  const getOptionStyle = (index: number) => {
    if (!answered) {
      return selectedOption === index
        ? 'border-primary bg-primary/10 ring-2 ring-primary'
        : 'border-border hover:border-primary/50 hover:bg-accent cursor-pointer';
    }
    const isCorrect = index === currentQuestion?.correct_option_index;
    const isSelected = index === selectedOption;
    if (isCorrect) return 'border-green-500 bg-green-500/20 ring-2 ring-green-500';
    if (isSelected && !isCorrect) return 'border-red-500 bg-red-500/20';
    return 'border-border opacity-50';
  };

  // --- IDLE STATE ---
  if (state === 'idle') {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="py-8 flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
            <Brain className="h-8 w-8 text-white" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Quiz Dinamico com IA</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gere perguntas personalizadas sobre esta aula
            </p>
          </div>
          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
          <Button onClick={generateQuiz} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Gerar Quiz com IA
          </Button>
        </CardContent>
      </Card>
    );
  }

  // --- LOADING STATE ---
  if (state === 'loading') {
    return (
      <Card className="border-primary/20 bg-card">
        <CardContent className="py-6 space-y-4">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <Brain className="h-5 w-5 text-primary" />
            </motion.div>
            <span className="text-sm font-medium">Gerando perguntas com IA...</span>
          </div>
          {[1, 2, 3, 4, 5].map((i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
            >
              <div className="animate-pulse space-y-2 p-4 rounded-lg border border-border">
                <div className="h-4 bg-muted rounded w-3/4" />
                <div className="space-y-1.5 mt-3">
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                  <div className="h-3 bg-muted rounded w-4/6" />
                  <div className="h-3 bg-muted rounded w-5/6" />
                </div>
              </div>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    );
  }

  // --- FINISHED STATE ---
  if (state === 'finished') {
    const pct = Math.round((score / totalQuestions) * 100);
    const xpEarned = score * XP_PER_CORRECT;
    const isPerfect = score === totalQuestions;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Card className={cn(
          'border-2',
          isPerfect ? 'border-yellow-500/50 bg-yellow-500/5' : pct >= 60 ? 'border-green-500/50 bg-green-500/5' : 'border-red-500/50 bg-red-500/5',
        )}>
          <CardContent className="py-8 flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
              className={cn(
                'w-20 h-20 rounded-full flex items-center justify-center',
                isPerfect ? 'bg-yellow-500/20' : pct >= 60 ? 'bg-green-500/20' : 'bg-red-500/20',
              )}
            >
              <Trophy className={cn(
                'h-10 w-10',
                isPerfect ? 'text-yellow-500' : pct >= 60 ? 'text-green-500' : 'text-red-500',
              )} />
            </motion.div>

            <div className="text-center">
              <h3 className="text-xl font-bold">
                {isPerfect ? 'Perfeito!' : pct >= 60 ? 'Bom trabalho!' : 'Continue estudando!'}
              </h3>
              <p className="text-3xl font-bold mt-2">{pct}%</p>
              <p className="text-sm text-muted-foreground mt-1">
                {score} de {totalQuestions} respostas corretas
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">+{xpEarned} XP ganhos</span>
            </div>

            <Progress value={pct} className="h-2 w-48" />

            <div className="flex gap-3 mt-2">
              <Button variant="outline" onClick={handleRestart}>
                Novo Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // --- PLAYING STATE ---
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Quiz IA
          </CardTitle>
          <div className="flex items-center gap-2">
            {currentQuestion && (
              <Badge
                variant="outline"
                className={cn('text-xs', DIFFICULTY_COLORS[currentQuestion.difficulty] || '')}
              >
                {DIFFICULTY_LABELS[currentQuestion.difficulty] || currentQuestion.difficulty}
              </Badge>
            )}
            <Badge variant="outline">
              {currentIndex + 1}/{totalQuestions}
            </Badge>
          </div>
        </div>
        <Progress
          value={((currentIndex + 1) / totalQuestions) * 100}
          className="h-1.5 mt-2"
        />
      </CardHeader>

      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Question */}
              <p className="font-medium text-sm leading-relaxed">
                {currentQuestion.question}
              </p>

              {/* Options */}
              <div className="space-y-2">
                {currentQuestion.options.map((option, index) => (
                  <motion.button
                    key={index}
                    onClick={() => handleSelectOption(index)}
                    disabled={answered}
                    className={cn(
                      'w-full p-3 text-left text-sm rounded-lg border transition-all',
                      getOptionStyle(index),
                    )}
                    whileHover={!answered ? { scale: 1.01 } : {}}
                    whileTap={!answered ? { scale: 0.99 } : {}}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold',
                          answered && index === currentQuestion.correct_option_index
                            ? 'bg-green-500 text-white'
                            : answered && selectedOption === index
                              ? 'bg-red-500 text-white'
                              : selectedOption === index
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {answered && index === currentQuestion.correct_option_index ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : answered && selectedOption === index ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          String.fromCharCode(65 + index)
                        )}
                      </span>
                      <span className="flex-1">{option}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Explanation after answer */}
              <AnimatePresence>
                {answered && currentQuestion.explanation && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={cn(
                      'p-3 rounded-lg text-sm border',
                      selectedOption === currentQuestion.correct_option_index
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-orange-500/10 border-orange-500/30',
                    )}
                  >
                    <p className="font-medium mb-1">
                      {selectedOption === currentQuestion.correct_option_index
                        ? 'Correto!'
                        : 'Explicacao:'}
                    </p>
                    <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex justify-end gap-2 pt-2">
          {!answered ? (
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={selectedOption === null}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Confirmar
            </Button>
          ) : (
            <Button size="sm" onClick={handleNext}>
              {isLastQuestion ? (
                <>
                  <Trophy className="h-4 w-4 mr-1" />
                  Ver Resultado
                </>
              ) : (
                <>
                  Proxima
                  <Sparkles className="h-4 w-4 ml-1" />
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
