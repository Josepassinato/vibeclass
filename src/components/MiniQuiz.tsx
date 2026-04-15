import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, HelpCircle, Clock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useContextualFeedback } from '@/hooks/useContextualFeedback';

export interface MiniQuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface MiniQuizProps {
  question: MiniQuizQuestion;
  onComplete: (selectedIndex: number, isCorrect: boolean) => void;
  revealDelay?: number; // seconds before revealing answer
  autoAdvanceDelay?: number; // seconds after reveal before calling onComplete
  videoContext?: string; // transcript/context for contextual feedback
}

export const MiniQuiz = ({
  question,
  onComplete,
  revealDelay = 8,
  autoAdvanceDelay = 5,
  videoContext,
}: MiniQuizProps) => {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [countdown, setCountdown] = useState(revealDelay);
  const { fetchFeedback, getFeedback } = useContextualFeedback();

  // Countdown timer
  useEffect(() => {
    if (revealed) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setRevealed(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [revealed]);

  // Fetch contextual feedback when wrong answer revealed
  useEffect(() => {
    if (!revealed || selectedIndex === null || selectedIndex === question.correctIndex) return;
    fetchFeedback({
      question: question.question,
      selectedOption: question.options[selectedIndex],
      correctOption: question.options[question.correctIndex],
      videoContext,
    });
  }, [revealed, selectedIndex, question, fetchFeedback, videoContext]);

  // Auto advance after reveal
  useEffect(() => {
    if (!revealed) return;

    const timer = setTimeout(() => {
      const finalSelection = selectedIndex ?? -1;
      const isCorrect = finalSelection === question.correctIndex;
      onComplete(finalSelection, isCorrect);
    }, autoAdvanceDelay * 1000);

    return () => clearTimeout(timer);
  }, [revealed, selectedIndex, question.correctIndex, onComplete, autoAdvanceDelay]);

  const handleSelect = (index: number) => {
    if (revealed) return;
    setSelectedIndex(index);
  };

  const getOptionStyle = (index: number) => {
    if (!revealed) {
      return selectedIndex === index
        ? 'border-primary bg-primary/10 ring-2 ring-primary'
        : 'border-border hover:border-primary/50 hover:bg-accent cursor-pointer';
    }

    // Revealed state
    const isCorrect = index === question.correctIndex;
    const isSelected = index === selectedIndex;

    if (isCorrect) {
      return 'border-green-500 bg-green-500/20 ring-2 ring-green-500';
    }
    if (isSelected && !isCorrect) {
      return 'border-red-500 bg-red-500/20';
    }
    return 'border-border opacity-50';
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="border-2 border-primary/50 bg-card/95 backdrop-blur-sm shadow-xl">
        <CardContent className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Badge variant="secondary" className="flex items-center gap-1.5">
              <HelpCircle className="h-3.5 w-3.5" />
              Mini Quiz
            </Badge>
            {!revealed && (
              <Badge variant="outline" className="flex items-center gap-1.5 animate-pulse">
                <Clock className="h-3.5 w-3.5" />
                {countdown}s
              </Badge>
            )}
            {revealed && (
              <Badge 
                variant={selectedIndex === question.correctIndex ? "default" : "destructive"}
                className="flex items-center gap-1.5"
              >
                {selectedIndex === question.correctIndex ? (
                  <>
                    <CheckCircle className="h-3.5 w-3.5" />
                    Correto!
                  </>
                ) : selectedIndex !== null ? (
                  <>
                    <XCircle className="h-3.5 w-3.5" />
                    Incorreto
                  </>
                ) : (
                  <>
                    <Clock className="h-3.5 w-3.5" />
                    Tempo esgotado
                  </>
                )}
              </Badge>
            )}
          </div>

          {/* Question */}
          <p className="font-medium text-sm leading-relaxed">{question.question}</p>

          {/* Options */}
          <div className="space-y-2">
            {question.options.map((option, index) => (
              <motion.button
                key={index}
                onClick={() => handleSelect(index)}
                disabled={revealed}
                className={cn(
                  "w-full p-3 text-left text-sm rounded-lg border transition-all",
                  getOptionStyle(index)
                )}
                whileHover={!revealed ? { scale: 1.01 } : {}}
                whileTap={!revealed ? { scale: 0.99 } : {}}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                    revealed && index === question.correctIndex
                      ? "bg-green-500 text-white"
                      : revealed && selectedIndex === index
                        ? "bg-red-500 text-white"
                        : selectedIndex === index
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                  )}>
                    {revealed && index === question.correctIndex ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : revealed && selectedIndex === index ? (
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

          {/* Contextual feedback or explanation after reveal */}
          <AnimatePresence>
            {revealed && (() => {
              const isWrong = selectedIndex !== null && selectedIndex !== question.correctIndex;
              const fb = isWrong ? getFeedback(question.question, question.options[selectedIndex]) : null;

              if (isWrong && fb) {
                return (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm"
                  >
                    {fb.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gerando feedback personalizado...</span>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-orange-600 dark:text-orange-400 mb-1">Por que essa opcao esta incorreta:</p>
                        <p className="text-muted-foreground">{fb.feedback}</p>
                      </>
                    )}
                  </motion.div>
                );
              }

              if (question.explanation) {
                return (
                  <motion.div
                    key="explanation"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 bg-muted rounded-lg text-sm"
                  >
                    <p className="font-medium text-primary mb-1">Explicacao:</p>
                    <p className="text-muted-foreground">{question.explanation}</p>
                  </motion.div>
                );
              }
              return null;
            })()}
          </AnimatePresence>

          {/* Progress indicator */}
          {!revealed && (
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: revealDelay, ease: 'linear' }}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
