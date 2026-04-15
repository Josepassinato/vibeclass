import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  FileText, 
  Save, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  BookOpen,
  Copy,
  Video,
  Sparkles,
  FolderOpen
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  transcript: string | null;
  lesson_order: number | null;
  module_id: string | null;
  is_configured: boolean | null;
}

interface Module {
  id: string;
  title: string;
  module_order: number;
}

interface NarrativeLibraryProps {
  password: string;
}

export function NarrativeLibrary({ password }: NarrativeLibraryProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [editingNarrative, setEditingNarrative] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modulesRes, lessonsRes] = await Promise.all([
        supabase.from('modules').select('id, title, module_order').order('module_order'),
        supabase.from('videos').select('id, title, description, transcript, lesson_order, module_id, is_configured').order('lesson_order')
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      setModules(modulesRes.data || []);
      setLessons(lessonsRes.data || []);
    } catch (err) {
      console.error('[NarrativeLibrary] Error loading data:', err);
      toast.error('Erro ao carregar dados');
    } finally {
      setIsLoading(false);
    }
  };

  const openNarrativeEditor = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setEditingNarrative(lesson.transcript || '');
    setIsDialogOpen(true);
  };

  const saveNarrative = async () => {
    if (!selectedLesson) return;

    setIsSaving(true);
    try {
      const { error } = await supabase.functions.invoke('admin-videos', {
        body: {
          action: 'update',
          password,
          video: {
            id: selectedLesson.id,
            transcript: editingNarrative.trim() || null,
          }
        }
      });

      if (error) throw error;

      // Update local state
      setLessons(lessons.map(l => 
        l.id === selectedLesson.id 
          ? { ...l, transcript: editingNarrative.trim() || null }
          : l
      ));

      toast.success('Narrativa salva com sucesso!');
      setIsDialogOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar narrativa');
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Narrativa copiada!');
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const getLessonsForModule = (moduleId: string) => {
    return lessons
      .filter(l => l.module_id === moduleId)
      .sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0));
  };

  const getUnassignedLessons = () => {
    return lessons.filter(l => !l.module_id);
  };

  // ~150 palavras/minuto, ~6 chars/palavra = ~900 chars/minuto
  // 5 minutos = ~4500 caracteres mínimo
  const MIN_CHARS_5MIN = 4500;
  const CHARS_PER_MINUTE = 900;

  const estimateDuration = (text: string | null) => {
    if (!text) return 0;
    const words = text.trim().split(/\s+/).length;
    return Math.round(words / 150); // minutos baseado em 150 palavras/min
  };

  const getCharProgress = (text: string | null) => {
    if (!text) return 0;
    return Math.min(100, Math.round((text.length / MIN_CHARS_5MIN) * 100));
  };

  const getLessonStatus = (lesson: Lesson) => {
    const charCount = lesson.transcript?.length || 0;
    const duration = estimateDuration(lesson.transcript);
    
    if (charCount >= MIN_CHARS_5MIN) {
      return { status: 'complete', label: `~${duration} min`, color: 'bg-green-500' };
    }
    if (charCount > 500) {
      return { status: 'partial', label: `~${duration} min (mín. 5)`, color: 'bg-yellow-500' };
    }
    return { status: 'empty', label: 'Pendente', color: 'bg-destructive/60' };
  };

  const stats = {
    total: lessons.length,
    complete: lessons.filter(l => (l.transcript?.length || 0) >= MIN_CHARS_5MIN).length,
    partial: lessons.filter(l => l.transcript && l.transcript.length > 0 && l.transcript.length < MIN_CHARS_5MIN).length,
    empty: lessons.filter(l => !l.transcript).length,
  };

  const currentDuration = estimateDuration(editingNarrative);
  const currentProgress = getCharProgress(editingNarrative);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Aulas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.complete}</p>
              <p className="text-xs text-muted-foreground">Narrativas Prontas</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-yellow-500/10">
              <FileText className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.partial}</p>
              <p className="text-xs text-muted-foreground">Rascunhos</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.empty}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div>
            <p className="font-medium">Base de Conhecimento do Tutor IA</p>
            <p className="text-sm text-muted-foreground">
              As narrativas aqui servem como roteiro para criação dos vídeos com avatar e também como 
              base de conhecimento para o tutor IA responder dúvidas dos alunos sobre cada aula.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modules Accordion */}
      <Accordion type="multiple" defaultValue={modules.map(m => m.id)} className="space-y-2">
        {modules.map((module) => {
          const moduleLessons = getLessonsForModule(module.id);
          const moduleComplete = moduleLessons.filter(l => l.transcript && l.transcript.length > 100).length;
          
          return (
            <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FolderOpen className="h-4 w-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold">Módulo {module.module_order}: {module.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {moduleComplete}/{moduleLessons.length} narrativas completas
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="grid gap-2 py-2">
                  {moduleLessons.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      Nenhuma aula neste módulo
                    </p>
                  ) : (
                    moduleLessons.map((lesson) => {
                      const status = getLessonStatus(lesson);
                      return (
                        <Card 
                          key={lesson.id}
                          className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                          onClick={() => openNarrativeEditor(lesson)}
                        >
                          <CardContent className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded bg-muted">
                                <Video className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <p className="font-medium text-sm">
                                  Aula {lesson.lesson_order}: {lesson.title}
                                </p>
                                {lesson.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {lesson.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <Badge className={status.color}>
                              {status.label}
                            </Badge>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}

        {/* Unassigned Lessons */}
        {getUnassignedLessons().length > 0 && (
          <AccordionItem value="unassigned" className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="text-left">
                  <p className="font-semibold">Aulas sem Módulo</p>
                  <p className="text-xs text-muted-foreground">
                    {getUnassignedLessons().length} aulas
                  </p>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid gap-2 py-2">
                {getUnassignedLessons().map((lesson) => {
                  const status = getLessonStatus(lesson);
                  return (
                    <Card 
                      key={lesson.id}
                      className="cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all"
                      onClick={() => openNarrativeEditor(lesson)}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded bg-muted">
                            <Video className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{lesson.title}</p>
                          </div>
                        </div>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      {/* Edit Narrative Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Narrativa da Aula
            </DialogTitle>
            <DialogDescription>
              {selectedLesson?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Duration Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  ⏱️ Duração estimada: ~{currentDuration} min
                  {currentDuration >= 5 ? (
                    <Badge className="bg-green-500 text-xs">✓ Mínimo atingido</Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">
                      Mínimo: 5 min
                    </Badge>
                  )}
                </span>
                <span className="text-muted-foreground text-xs">
                  {editingNarrative.length.toLocaleString()} / {MIN_CHARS_5MIN.toLocaleString()} caracteres
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${currentProgress >= 100 ? 'bg-green-500' : 'bg-amber-500'}`}
                  style={{ width: `${currentProgress}%` }}
                />
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium mb-1">💡 Dicas para a narrativa:</p>
              <ul className="text-muted-foreground space-y-1 text-xs">
                <li>• Escreva como se fosse o roteiro que o avatar vai falar</li>
                <li>• Mínimo ~750 palavras para gerar 5 minutos de vídeo</li>
                <li>• Inclua saudações, transições e despedidas naturais</li>
                <li>• Seja detalhado - esta será a base de conhecimento do tutor IA</li>
              </ul>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium">Narrativa / Roteiro</label>
                <span className="text-xs text-muted-foreground">
                  ~{editingNarrative.trim().split(/\s+/).filter(Boolean).length} palavras
                </span>
              </div>
              <Textarea
                value={editingNarrative}
                onChange={(e) => setEditingNarrative(e.target.value)}
                placeholder="Cole aqui a narrativa/roteiro completo da aula que será usado para criar o vídeo com avatar. Mínimo de ~750 palavras para 5 minutos de vídeo..."
                className="min-h-[350px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {editingNarrative && (
              <Button 
                variant="outline" 
                onClick={() => copyToClipboard(editingNarrative)}
                className="sm:mr-auto"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={saveNarrative} 
              disabled={isSaving || editingNarrative.length < MIN_CHARS_5MIN}
              title={editingNarrative.length < MIN_CHARS_5MIN ? `Mínimo de ${MIN_CHARS_5MIN.toLocaleString()} caracteres para 5 minutos de vídeo` : ''}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {editingNarrative.length < MIN_CHARS_5MIN 
                ? `Faltam ${(MIN_CHARS_5MIN - editingNarrative.length).toLocaleString()} chars`
                : 'Salvar Narrativa'
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
