import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, RotateCcw, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface OpenQuestionInputProps {
  quizId: string;
  videoId: string;
  studentId: string;
  question: string;
  rubric?: string | null;
  /** If provided, this is a rewrite attempt */
  previousAnswer?: string;
  onComplete?: (score: number, passed: boolean) => void;
}

interface EvalResult {
  score: number;
  feedback: string;
  strengths: string;
  improvements: string;
}

export function OpenQuestionInput({
  quizId, videoId, studentId, question, rubric, previousAnswer, onComplete,
}: OpenQuestionInputProps) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [evalResult, setEvalResult] = useState<EvalResult | null>(null);
  const [canRewrite, setCanRewrite] = useState(false);
  const [isRewriting, setIsRewriting] = useState(false);
  const attemptNumber = previousAnswer ? 2 : 1;

  const handleSubmit = async () => {
    if (answer.length < 20) {
      toast.error('Resposta muito curta. Escreva pelo menos 20 caracteres.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Call agent-evaluator
      const { data, error } = await supabase.functions.invoke('agent-evaluator', {
        body: {
          type: 'open_question',
          question,
          rubric: rubric || '',
          studentAnswer: answer,
          attemptNumber,
        },
      });

      if (error || !data) {
        toast.error('Erro ao avaliar resposta. Tente novamente.');
        return;
      }

      const result: EvalResult = {
        score: data.score ?? 0,
        feedback: data.feedback || 'Avaliacao concluida.',
        strengths: data.strengths || '',
        improvements: data.improvements || '',
      };

      // Save to database
      await supabase.from('student_open_answers').insert({
        student_id: studentId,
        video_id: videoId,
        quiz_id: quizId,
        answer_text: answer,
        attempt_number: attemptNumber,
        score: result.score,
        ai_feedback: result.feedback,
        strengths: result.strengths,
        improvements: result.improvements,
        evaluated_at: new Date().toISOString(),
      });

      setEvalResult(result);
      // Allow rewrite only on first attempt and if score < 7
      setCanRewrite(attemptNumber === 1 && result.score < 7);
      onComplete?.(result.score, result.score >= 7);
    } catch {
      toast.error('Erro inesperado na avaliacao.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRewrite = () => {
    setIsRewriting(true);
    setEvalResult(null);
    setAnswer('');
    setCanRewrite(false);
  };

  return (
    <Card className="border-primary/20">
      <CardContent className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="text-xs">Pergunta aberta</Badge>
          {attemptNumber > 1 && (
            <Badge variant="outline" className="text-xs">2a tentativa</Badge>
          )}
        </div>

        <p className="text-sm font-medium leading-relaxed">{question}</p>

        {!evalResult ? (
          <>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Escreva sua resposta aqui (minimo 20 caracteres)..."
              className="min-h-[100px] resize-none"
              maxLength={500}
              disabled={isSubmitting}
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{answer.length}/500</span>
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={answer.length < 20 || isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 mr-1 animate-spin" />Avaliando...</>
                ) : (
                  <><Send className="h-4 w-4 mr-1" />Enviar</>
                )}
              </Button>
            </div>
          </>
        ) : (
          <div className="space-y-3">
            {/* Score */}
            <div className="flex items-center gap-3">
              <div className={`text-2xl font-bold ${evalResult.score >= 7 ? 'text-green-600' : 'text-orange-500'}`}>
                {evalResult.score}/10
              </div>
              {evalResult.score >= 7 && <CheckCircle className="h-5 w-5 text-green-600" />}
            </div>

            {/* Feedback */}
            <div className="p-3 bg-muted rounded-lg text-sm space-y-2">
              <p>{evalResult.feedback}</p>
              {evalResult.strengths && (
                <p className="text-green-600 dark:text-green-400">Pontos fortes: {evalResult.strengths}</p>
              )}
              {evalResult.improvements && (
                <p className="text-orange-600 dark:text-orange-400">A melhorar: {evalResult.improvements}</p>
              )}
            </div>

            {/* Rewrite button */}
            {canRewrite && !isRewriting && (
              <Button variant="outline" size="sm" onClick={handleRewrite}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reescrever resposta
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
