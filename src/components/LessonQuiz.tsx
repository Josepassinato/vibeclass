import { useState } from 'react';
import { useQuiz, QuizQuestion } from '@/hooks/useQuiz';
import { useContextualFeedback } from '@/hooks/useContextualFeedback';
import { OpenQuestionInput } from './OpenQuestionInput';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  CheckCircle, 
  XCircle, 
  ChevronLeft, 
  ChevronRight, 
  Trophy, 
  RotateCcw,
  ClipboardCheck,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LessonQuizProps {
  videoId: string;
  studentId: string;
  onQuizComplete: (passed: boolean) => void;
  passingScore?: number;
}

export const LessonQuiz = ({ 
  videoId, 
  studentId, 
  onQuizComplete,
  passingScore = 70 
}: LessonQuizProps) => {
  const {
    questions,
    currentQuestion,
    currentQuestionIndex,
    answers,
    showResults,
    result,
    existingResult,
    isLoading,
    isSubmitting,
    hasQuiz,
    hasPassed,
    selectAnswer,
    goToNextQuestion,
    goToPreviousQuestion,
    submitQuiz,
    resetQuiz,
    isQuestionAnswered,
    allQuestionsAnswered,
  } = useQuiz({ videoId, studentId, passingScore });

  const [showExplanation, setShowExplanation] = useState<string | null>(null);
  const { fetchFeedback, getFeedback } = useContextualFeedback();

  if (isLoading) {
    return (
      <Card className="border-primary/20">
        <CardContent className="py-6">
          <div className="animate-pulse space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="h-5 bg-muted rounded w-40" />
            </div>
            <div className="h-5 bg-muted rounded w-full" />
            <div className="space-y-2 mt-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-10 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!hasQuiz) {
    return (
      <Card className="border-muted">
        <CardContent className="py-6 text-center">
          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground text-sm">
            Nenhum quiz disponível para esta aula
          </p>
          <Button 
            className="mt-4" 
            size="sm"
            onClick={() => onQuizComplete(true)}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            Marcar como Concluída
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Show previous result if passed
  if (hasPassed && !showResults) {
    const displayResult = result || existingResult;
    return (
      <Card className="border-green-500/50 bg-green-500/5">
        <CardContent className="py-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/20 mb-4">
            <Trophy className="h-8 w-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-green-600 mb-2">Quiz Concluído!</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Você já passou neste quiz com {displayResult?.score_percentage}% de acerto
          </p>
          <Badge variant="secondary" className="mb-4">
            {displayResult?.correct_answers}/{displayResult?.total_questions} respostas corretas
          </Badge>
          <div className="flex justify-center gap-2">
            <Button variant="outline" size="sm" onClick={resetQuiz}>
              <RotateCcw className="h-4 w-4 mr-1" />
              Refazer Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show results
  if (showResults && result) {
    return (
      <Card className={cn(
        "border-2",
        result.passed ? "border-green-500/50 bg-green-500/5" : "border-red-500/50 bg-red-500/5"
      )}>
        <CardContent className="py-6 text-center">
          <div className={cn(
            "inline-flex items-center justify-center w-16 h-16 rounded-full mb-4",
            result.passed ? "bg-green-500/20" : "bg-red-500/20"
          )}>
            {result.passed ? (
              <Trophy className="h-8 w-8 text-green-600" />
            ) : (
              <XCircle className="h-8 w-8 text-red-600" />
            )}
          </div>
          
          <h3 className={cn(
            "text-lg font-semibold mb-2",
            result.passed ? "text-green-600" : "text-red-600"
          )}>
            {result.passed ? 'Parabéns!' : 'Não foi desta vez...'}
          </h3>
          
          <p className="text-2xl font-bold mb-2">{result.score_percentage}%</p>
          
          <p className="text-sm text-muted-foreground mb-4">
            {result.correct_answers} de {result.total_questions} respostas corretas
            {!result.passed && ` (mínimo: ${passingScore}%)`}
          </p>

          <Progress 
            value={result.score_percentage} 
            className={cn("h-2 mb-4", result.passed ? "" : "")}
          />

          <div className="flex justify-center gap-2">
            {result.passed ? (
              <Button onClick={() => onQuizComplete(true)}>
                <CheckCircle className="h-4 w-4 mr-1" />
                Concluir Aula
              </Button>
            ) : (
              <Button onClick={resetQuiz}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Tentar Novamente
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show quiz question
  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Quiz da Aula</CardTitle>
          </div>
          <Badge variant="outline">
            {currentQuestionIndex + 1}/{questions.length}
          </Badge>
        </div>
        <Progress 
          value={((currentQuestionIndex + 1) / questions.length) * 100} 
          className="h-1.5 mt-2" 
        />
      </CardHeader>

      <CardContent className="space-y-4">
        {currentQuestion && (currentQuestion as any).question_type === 'open' ? (
          <OpenQuestionInput
            quizId={currentQuestion.id}
            videoId={videoId}
            studentId={studentId}
            question={currentQuestion.question}
            rubric={(currentQuestion as any).rubric}
            onComplete={(score, passed) => {
              if (passed) onQuizComplete(true);
            }}
          />
        ) : currentQuestion && (
          <>
            <CardDescription className="text-foreground font-medium text-sm leading-relaxed">
              {currentQuestion.question}
            </CardDescription>

            <div className="space-y-2">
              {currentQuestion.options.map((option, index) => {
                const isSelected = answers[currentQuestion.id] === index;
                const showCorrect = showExplanation === currentQuestion.id;
                const isCorrect = index === currentQuestion.correct_option_index;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      selectAnswer(currentQuestion.id, index);
                      setShowExplanation(currentQuestion.id);
                      // Fetch contextual feedback for wrong answers
                      if (index !== currentQuestion.correct_option_index) {
                        fetchFeedback({
                          question: currentQuestion.question,
                          selectedOption: currentQuestion.options[index],
                          correctOption: currentQuestion.options[currentQuestion.correct_option_index],
                        });
                      }
                    }}
                    className={cn(
                      "w-full p-3 text-left text-sm rounded-lg border transition-all",
                      isSelected 
                        ? "border-primary bg-primary/10 ring-1 ring-primary" 
                        : "border-border hover:border-primary/50 hover:bg-accent",
                      showCorrect && isCorrect && "border-green-500 bg-green-500/10",
                      showCorrect && isSelected && !isCorrect && "border-red-500 bg-red-500/10"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium",
                        isSelected 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showCorrect && isCorrect && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {showCorrect && isSelected && !isCorrect && <XCircle className="h-4 w-4 text-red-600" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Explanation / Contextual Feedback */}
            {showExplanation === currentQuestion.id && (() => {
              const selectedIdx = answers[currentQuestion.id];
              const isWrong = selectedIdx !== undefined && selectedIdx !== currentQuestion.correct_option_index;
              const fb = isWrong
                ? getFeedback(currentQuestion.question, currentQuestion.options[selectedIdx])
                : null;

              if (isWrong && fb) {
                return (
                  <div className="p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg text-sm">
                    {fb.isLoading ? (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Gerando feedback...</span>
                      </div>
                    ) : (
                      <>
                        <p className="font-medium text-orange-600 dark:text-orange-400 mb-1">Por que essa opcao esta incorreta:</p>
                        <p className="text-muted-foreground">{fb.feedback}</p>
                      </>
                    )}
                  </div>
                );
              }

              if (currentQuestion.explanation) {
                return (
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    <p className="font-medium mb-1">Explicacao:</p>
                    <p className="text-muted-foreground">{currentQuestion.explanation}</p>
                  </div>
                );
              }
              return null;
            })()}
          </>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={goToPreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Anterior
          </Button>

          <div className="flex gap-1">
            {questions.map((q, idx) => (
              <div
                key={q.id}
                className={cn(
                  "w-2 h-2 rounded-full",
                  idx === currentQuestionIndex 
                    ? "bg-primary" 
                    : isQuestionAnswered(q.id) 
                      ? "bg-primary/50" 
                      : "bg-muted"
                )}
              />
            ))}
          </div>

          {currentQuestionIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={goToNextQuestion}
              disabled={!isQuestionAnswered(currentQuestion?.id || '')}
            >
              Próxima
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={submitQuiz}
              disabled={!allQuestionsAnswered || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-1" />
              )}
              Enviar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
