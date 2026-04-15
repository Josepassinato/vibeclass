import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2, Clock, HelpCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correct_option_index: number;
  explanation: string | null;
  timestamp_seconds: number | null;
  question_order: number | null;
}

interface TeachingMoment {
  timestamp_seconds: number;
  topic: string;
  key_insight: string;
}

interface QuizEditorProps {
  videoId: string;
  password: string;
  transcript?: string;
  title?: string;
  videoDurationMinutes?: number;
  teachingMoments?: TeachingMoment[];
}

export function QuizEditor({ videoId, password, transcript, title, videoDurationMinutes, teachingMoments }: QuizEditorProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // New quiz form
  const [newQuestion, setNewQuestion] = useState('');
  const [newOptions, setNewOptions] = useState(['', '', '', '']);
  const [newCorrectIndex, setNewCorrectIndex] = useState(0);
  const [newExplanation, setNewExplanation] = useState('');
  const [newTimestamp, setNewTimestamp] = useState('');

  useEffect(() => {
    loadQuizzes();
  }, [videoId]);

  const loadQuizzes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('video_quizzes')
        .select('*')
        .eq('video_id', videoId)
        .order('question_order', { ascending: true });

      if (error) throw error;
      const mapped = (data || []).map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : [],
      }));
      setQuizzes(mapped);
    } catch (err) {
      logger.error('Error loading quizzes:', err);
      toast.error('Erro ao carregar quizzes');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number | null): string => {
    if (seconds === null) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const parseTime = (timeStr: string): number | null => {
    if (!timeStr.trim()) return null;
    const parts = timeStr.split(':');
    if (parts.length === 2) {
      const mins = parseInt(parts[0], 10);
      const secs = parseInt(parts[1], 10);
      if (!isNaN(mins) && !isNaN(secs)) {
        return mins * 60 + secs;
      }
    }
    const secs = parseInt(timeStr, 10);
    if (!isNaN(secs)) return secs;
    return null;
  };

  const handleAddQuiz = async () => {
    if (!newQuestion.trim() || newOptions.filter(o => o.trim()).length < 2) {
      toast.error('Preencha a pergunta e pelo menos 2 opções');
      return;
    }

    setIsSaving(true);
    try {
      const filteredOptions = newOptions.filter(o => o.trim());
      const { error } = await supabase.from('video_quizzes').insert({
        video_id: videoId,
        question: newQuestion,
        options: filteredOptions,
        correct_option_index: newCorrectIndex,
        explanation: newExplanation || null,
        timestamp_seconds: parseTime(newTimestamp),
        question_order: quizzes.length,
      });

      if (error) throw error;

      toast.success('Quiz adicionado!');
      setNewQuestion('');
      setNewOptions(['', '', '', '']);
      setNewCorrectIndex(0);
      setNewExplanation('');
      setNewTimestamp('');
      loadQuizzes();
    } catch (err) {
      logger.error('Error adding quiz:', err);
      toast.error('Erro ao adicionar quiz');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    try {
      const { error } = await supabase
        .from('video_quizzes')
        .delete()
        .eq('id', quizId);

      if (error) throw error;

      toast.success('Quiz removido!');
      loadQuizzes();
    } catch (err) {
      logger.error('Error deleting quiz:', err);
      toast.error('Erro ao remover quiz');
    }
  };

  const handleUpdateOption = (index: number, value: string) => {
    const updated = [...newOptions];
    updated[index] = value;
    setNewOptions(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const generateQuizzes = async () => {
    if (!transcript?.trim()) {
      toast.error('Adicione a transcrição primeiro para gerar quizzes automaticamente');
      return;
    }

    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('quiz-generator', {
        body: {
          transcript,
          title: title || 'Aula',
          videoDurationMinutes,
          numberOfQuestions: 5,
          teachingMoments,
        }
      });

      if (error) throw error;
      
      if (data.quizzes && data.quizzes.length > 0) {
        // Insert generated quizzes into database
        const currentCount = quizzes.length;
        for (let i = 0; i < data.quizzes.length; i++) {
          const quiz = data.quizzes[i];
          await supabase.from('video_quizzes').insert({
            video_id: videoId,
            question: quiz.question,
            options: quiz.options,
            correct_option_index: quiz.correct_option_index,
            explanation: quiz.explanation,
            timestamp_seconds: quiz.timestamp_seconds,
            question_order: currentCount + i,
          });
        }
        
        toast.success(`${data.quizzes.length} quizzes gerados com sucesso!`);
        loadQuizzes();
      } else {
        toast.error('Não foi possível gerar quizzes');
      }
    } catch (err: any) {
      logger.error('Error generating quizzes:', err);
      toast.error(err.message || 'Erro ao gerar quizzes');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Auto-generate section */}
      {transcript && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Geração Automática de Quizzes
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Use IA para criar perguntas baseadas no conteúdo da aula
                </p>
              </div>
              <Button 
                onClick={generateQuizzes} 
                disabled={isGenerating}
                variant="default"
                size="sm"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar 5 Quizzes
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Quizzes */}
      <div className="space-y-3">
        <h3 className="font-medium flex items-center gap-2">
          <HelpCircle className="h-4 w-4" />
          Quizzes da Aula ({quizzes.length})
        </h3>

        {quizzes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum quiz cadastrado ainda. {transcript ? 'Use o botão acima para gerar automaticamente!' : 'Adicione a transcrição para gerar automaticamente.'}</p>
        ) : (
          <div className="space-y-2">
            {quizzes.map((quiz, idx) => (
              <Card key={quiz.id} className="bg-muted/30">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          #{idx + 1}
                        </Badge>
                        {quiz.timestamp_seconds !== null && (
                          <Badge variant="secondary" className="text-xs">
                            <Clock className="h-2.5 w-2.5 mr-1" />
                            {formatTime(quiz.timestamp_seconds)}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium">{quiz.question}</p>
                      <div className="mt-1 space-y-0.5">
                        {(quiz.options as string[]).map((opt, i) => (
                          <p key={i} className={`text-xs ${i === quiz.correct_option_index ? 'text-green-600 font-medium' : 'text-muted-foreground'}`}>
                            {String.fromCharCode(65 + i)}) {opt} {i === quiz.correct_option_index && '✓'}
                          </p>
                        ))}
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDeleteQuiz(quiz.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add New Quiz */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Novo Quiz
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Pergunta *</Label>
            <Textarea
              placeholder="Ex: Qual é a principal vantagem de usar Hooks no React?"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Timestamp (opcional)</Label>
              <Input
                placeholder="Ex: 2:30 ou 150"
                value={newTimestamp}
                onChange={(e) => setNewTimestamp(e.target.value)}
              />
              <p className="text-[10px] text-muted-foreground">
                Quando definido, o quiz aparece neste momento do vídeo
              </p>
            </div>
            <div className="space-y-2">
              <Label>Explicação (opcional)</Label>
              <Input
                placeholder="Por que essa é a resposta correta"
                value={newExplanation}
                onChange={(e) => setNewExplanation(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Opções (marque a correta)</Label>
            <div className="space-y-2">
              {newOptions.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="icon"
                    variant={newCorrectIndex === index ? "default" : "outline"}
                    className="h-8 w-8 flex-shrink-0"
                    onClick={() => setNewCorrectIndex(index)}
                  >
                    {newCorrectIndex === index ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </Button>
                  <Input
                    placeholder={`Opção ${String.fromCharCode(65 + index)}`}
                    value={option}
                    onChange={(e) => handleUpdateOption(index, e.target.value)}
                  />
                </div>
              ))}
            </div>
          </div>

          <Button onClick={handleAddQuiz} disabled={isSaving} className="w-full">
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Adicionar Quiz
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
