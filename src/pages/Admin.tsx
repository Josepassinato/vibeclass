import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, ArrowLeft, Video, Lock, Eye, EyeOff, FileText, Users, Clock, BookOpen, CheckCircle, Settings, Play, Pause, Target, Lightbulb, Loader2, Sparkles, HelpCircle, GripVertical, ArrowUp, ArrowDown, Unlock, ListOrdered, FolderOpen, Library, Download, Bot } from 'lucide-react';
import { ExportDataButton } from '@/components/ExportDataButton';
import { ExportTranscriptsPdf } from '@/components/ExportTranscriptsPdf';
import { QuizEditor } from '@/components/QuizEditor';
import { MissionsAdmin } from '@/components/MissionsAdmin';
import { ModulesAdmin } from '@/components/ModulesAdmin';
import { NarrativeLibrary } from '@/components/NarrativeLibrary';
import { WhiteLabelSettings } from '@/components/WhiteLabelSettings';
import { SchoolFactoryPanel } from '@/components/SchoolFactoryPanel';
import { CompositionAdminEditor } from '@/components/composition/CompositionAdminEditor';
import type { LessonComposition } from '@/lib/composition/types';
import { Switch } from '@/components/ui/switch';
import { useBranding } from '@/branding';

interface TeachingMoment {
  timestamp_seconds: number;
  topic: string;
  key_insight: string;
  questions_to_ask: string[];
  discussion_points: string[];
}

interface VideoLesson {
  id: string;
  youtube_id: string;
  title: string;
  transcript: string | null;
  analysis: string | null;
  thumbnail_url: string | null;
  created_at: string;
  lesson_order: number;
  description: string | null;
  duration_minutes: number | null;
  teaching_moments: TeachingMoment[] | null;
  is_configured: boolean;
  is_released: boolean;
  teacher_intro: string | null;
}

export default function Admin() {
  type AdminSection = 'lessons' | 'missions' | 'modules' | 'library' | 'branding' | 'factory';
  const navigate = useNavigate();
  const { isWhiteLabelProduct } = useBranding();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<VideoLesson | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [isGeneratingMoments, setIsGeneratingMoments] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [adminSection, setAdminSection] = useState<AdminSection>('lessons');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  
  // Form states for new lesson
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [newVideoType, setNewVideoType] = useState<'youtube' | 'direct' | 'external' | 'html_composition'>('youtube');
  const [newVideoTitle, setNewVideoTitle] = useState('');
  const [newVideoDescription, setNewVideoDescription] = useState('');
  const [newVideoDuration, setNewVideoDuration] = useState('');
  const [newVideoTranscript, setNewVideoTranscript] = useState('');
  const [newCompositionJson, setNewCompositionJson] = useState('');
  const [newCompositionValid, setNewCompositionValid] = useState<LessonComposition | null>(null);
  
  // Form states for editing
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editTranscript, setEditTranscript] = useState('');
  const [editAnalysis, setEditAnalysis] = useState('');
  const [editMoments, setEditMoments] = useState<TeachingMoment[]>([]);
  const [editTeacherIntro, setEditTeacherIntro] = useState('');

  useEffect(() => {
    if (!isWhiteLabelProduct && adminSection === 'branding') {
      setAdminSection('lessons');
    }
  }, [isWhiteLabelProduct, adminSection]);

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const handleLogin = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: { action: 'list', password }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setIsAuthenticated(true);
      setLessons(data.videos || []);
      toast.success('Login realizado com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao fazer login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadLessons = async () => {
    if (!isAuthenticated) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: { action: 'list', password }
      });

      if (error) throw error;
      setLessons(data.videos || []);
    } catch (err: any) {
      toast.error('Erro ao carregar aulas');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddLesson = async () => {
    let youtubeId: string | null = null;
    let videoUrl: string | null = null;
    let compositionPayload: LessonComposition | null = null;

    if (newVideoType === 'youtube') {
      youtubeId = extractYoutubeId(newVideoUrl);
      if (!youtubeId) {
        toast.error('URL do YouTube inválida');
        return;
      }
    } else if (newVideoType === 'html_composition') {
      if (!newCompositionValid) {
        toast.error('Composição JSON inválida — corrija os erros antes de salvar.');
        return;
      }
      compositionPayload = newCompositionValid;
    } else {
      if (!newVideoUrl.trim()) {
        toast.error('URL do vídeo é obrigatória');
        return;
      }
      videoUrl = newVideoUrl.trim();
    }

    if (!newVideoTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: {
          action: 'add',
          password,
          video: {
            youtube_id: youtubeId,
            video_url: videoUrl,
            video_type: newVideoType,
            title: newVideoTitle.trim(),
            description: newVideoDescription.trim() || null,
            duration_minutes: newVideoDuration ? parseInt(newVideoDuration) : null,
            transcript: newVideoTranscript.trim() || null,
            composition_json: compositionPayload,
            lesson_order: lessons.length + 1,
            is_configured: false,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Aula adicionada! Configure a transcrição e os momentos de ensino.');
      setIsAddDialogOpen(false);
      resetNewForm();
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao adicionar aula');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!selectedLesson) return;

    setIsLoading(true);
    try {
      const isFullyConfigured = !!(editTranscript.trim() && editMoments.length > 0);
      
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: {
          action: 'update',
          password,
          video: {
            id: selectedLesson.id,
            title: editTitle.trim(),
            description: editDescription.trim() || null,
            duration_minutes: editDuration ? parseInt(editDuration) : null,
            transcript: editTranscript.trim() || null,
            analysis: editAnalysis.trim() || null,
            teaching_moments: editMoments,
            is_configured: isFullyConfigured,
            teacher_intro: editTeacherIntro.trim() || null,
          }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Aula atualizada com sucesso!');
      setIsEditDialogOpen(false);
      setSelectedLesson(null);
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar aula');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: {
          action: 'delete',
          password,
          video: { id: lessonId }
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      toast.success('Aula excluída com sucesso!');
      loadLessons();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao excluir aula');
    } finally {
      setIsLoading(false);
    }
  };

  const generateTeachingMoments = async () => {
    if (!editTranscript.trim()) {
      toast.error('Adicione a transcrição primeiro para gerar os momentos de ensino');
      return;
    }

    setIsGeneratingMoments(true);
    try {
      const { data, error } = await supabase.functions.invoke('content-manager', {
        body: {
          transcript: editTranscript,
          videoTitle: editTitle,
          analysis: editAnalysis,
        }
      });

      if (error) throw error;
      if (data.teaching_moments) {
        setEditMoments(data.teaching_moments);
        toast.success(`${data.teaching_moments.length} momentos de ensino gerados!`);
      }
    } catch (err: any) {
      toast.error('Erro ao gerar momentos de ensino');
      console.error(err);
    } finally {
      setIsGeneratingMoments(false);
    }
  };

  const openEditDialog = (lesson: VideoLesson) => {
    setSelectedLesson(lesson);
    setEditTitle(lesson.title);
    setEditDescription(lesson.description || '');
    setEditDuration(lesson.duration_minutes?.toString() || '');
    setEditTranscript(lesson.transcript || '');
    setEditAnalysis(lesson.analysis || '');
    setEditMoments(lesson.teaching_moments || []);
    setEditTeacherIntro(lesson.teacher_intro || '');
    setActiveTab('info');
    setIsEditDialogOpen(true);
  };

  const resetNewForm = () => {
    setNewVideoUrl('');
    setNewVideoType('youtube');
    setNewVideoTitle('');
    setNewVideoDescription('');
    setNewVideoDuration('');
    setNewVideoTranscript('');
    setNewCompositionJson('');
    setNewCompositionValid(null);
  };

  const addEmptyMoment = () => {
    setEditMoments([...editMoments, {
      timestamp_seconds: 0,
      topic: '',
      key_insight: '',
      questions_to_ask: [''],
      discussion_points: [''],
    }]);
  };

  const updateMoment = (index: number, field: keyof TeachingMoment, value: any) => {
    const updated = [...editMoments];
    updated[index] = { ...updated[index], [field]: value };
    setEditMoments(updated);
  };

  const removeMoment = (index: number) => {
    setEditMoments(editMoments.filter((_, i) => i !== index));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Move lesson up in order
  const moveLessonUp = (index: number) => {
    if (index === 0) return;
    const updated = [...lessons];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    // Update lesson_order for both
    updated[index - 1].lesson_order = index;
    updated[index].lesson_order = index + 1;
    setLessons(updated);
  };

  // Move lesson down in order
  const moveLessonDown = (index: number) => {
    if (index === lessons.length - 1) return;
    const updated = [...lessons];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    // Update lesson_order for both
    updated[index].lesson_order = index + 1;
    updated[index + 1].lesson_order = index + 2;
    setLessons(updated);
  };

  // Toggle lesson release status
  const toggleLessonRelease = async (lessonId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('admin-videos', {
        body: {
          action: 'update',
          password,
          video: {
            id: lessonId,
            is_released: !currentStatus
          }
        }
      });

      if (error) throw error;

      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, is_released: !currentStatus } : l
      ));
      toast.success(!currentStatus ? 'Aula liberada!' : 'Aula bloqueada');
    } catch (err: any) {
      toast.error('Erro ao alterar status da aula');
    }
  };

  // Save new lesson order
  const saveNewOrder = async () => {
    setIsSavingOrder(true);
    try {
      const orderedVideos = lessons.map((lesson, index) => ({
        id: lesson.id,
        lesson_order: index + 1
      }));

      for (const video of orderedVideos) {
        const { error } = await supabase.functions.invoke('admin-videos', {
          body: {
            action: 'update',
            password,
            video: {
              id: video.id,
              lesson_order: video.lesson_order
            }
          }
        });
        if (error) throw error;
      }

      toast.success('Ordem das aulas atualizada!');
      setIsOrderDialogOpen(false);
      loadLessons();
    } catch (err: any) {
      toast.error('Erro ao salvar ordem');
    } finally {
      setIsSavingOrder(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Lock className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
            <CardTitle>Painel do Administrador</CardTitle>
            <CardDescription>Gerencie as aulas do curso</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                placeholder="Senha de administrador"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
              {isLoading ? 'Entrando...' : 'Entrar'}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')} className="w-full">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg gradient-primary">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Painel Administrativo</h1>
              <p className="text-xs text-muted-foreground">
                {adminSection === 'lessons'
                  ? `${lessons.length} aulas`
                  : adminSection === 'missions'
                  ? 'Gerenciar missões'
                  : adminSection === 'modules'
                  ? 'Gerenciar módulos'
                  : adminSection === 'factory'
                  ? 'Operação autônoma da escola'
                  : adminSection === 'library'
                  ? 'Biblioteca pedagógica'
                  : isWhiteLabelProduct
                  ? 'Configuração white-label'
                  : 'Administração de conteúdo'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {adminSection === 'lessons' && (
              <>
                <Button variant="outline" onClick={() => setIsOrderDialogOpen(true)}>
                  <ListOrdered className="h-4 w-4 mr-2" />
                  Organizar Aulas
                </Button>
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Aula
                </Button>
              </>
            )}
            <ExportDataButton password={password} />
            <ExportTranscriptsPdf password={password} />
            <Button variant="outline" onClick={() => navigate('/aluno')}>
              <Users className="h-4 w-4 mr-2" />
              Painel do Aluno
            </Button>
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </div>
        </div>
        
        {/* Section Tabs */}
        <div className="container mx-auto px-4 border-t">
          <div className="flex gap-1">
            <Button
              variant={adminSection === 'lessons' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none rounded-t-lg mt-1"
              onClick={() => setAdminSection('lessons')}
            >
              <Video className="h-4 w-4 mr-2" />
              Aulas
            </Button>
            <Button
              variant={adminSection === 'missions' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none rounded-t-lg mt-1"
              onClick={() => setAdminSection('missions')}
            >
              <Target className="h-4 w-4 mr-2" />
              Missões
            </Button>
            <Button
              variant={adminSection === 'modules' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none rounded-t-lg mt-1"
              onClick={() => setAdminSection('modules')}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Módulos
            </Button>
            {isWhiteLabelProduct && (
              <Button
                variant={adminSection === 'branding' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-none rounded-t-lg mt-1"
                onClick={() => setAdminSection('branding')}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                White-label
              </Button>
            )}
            <Button
              variant={adminSection === 'factory' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none rounded-t-lg mt-1"
              onClick={() => setAdminSection('factory')}
            >
              <Bot className="h-4 w-4 mr-2" />
              Fábrica IA
            </Button>
            <Button
              variant={adminSection === 'library' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none rounded-t-lg mt-1"
              onClick={() => setAdminSection('library')}
            >
              <Library className="h-4 w-4 mr-2" />
              Biblioteca
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        {adminSection === 'missions' ? (
          <MissionsAdmin />
        ) : adminSection === 'modules' ? (
          <ModulesAdmin password={password} />
        ) : adminSection === 'factory' ? (
          <SchoolFactoryPanel password={password} />
        ) : adminSection === 'branding' && isWhiteLabelProduct ? (
          <WhiteLabelSettings />
        ) : adminSection === 'library' ? (
          <NarrativeLibrary password={password} />
        ) : (
          <>
            {lessons.length === 0 ? (
          <Card className="p-12 text-center">
            <Video className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
            <h2 className="text-xl font-semibold mb-2">Nenhuma aula cadastrada</h2>
            <p className="text-muted-foreground mb-4">Comece adicionando sua primeira aula ao curso</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Primeira Aula
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {lessons.map((lesson) => (
              <Card 
                key={lesson.id} 
                className={`overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-primary/50 ${
                  lesson.is_configured ? 'border-green-500/30' : 'border-yellow-500/30'
                }`}
                onClick={() => openEditDialog(lesson)}
              >
                <div className="relative">
                  <img
                    src={lesson.thumbnail_url || `https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
                    alt={lesson.title}
                    className="w-full aspect-video object-cover"
                  />
                  <div className="absolute top-2 left-2 flex gap-1">
                    <Badge variant="secondary" className="font-bold">
                      Aula {lesson.lesson_order}
                    </Badge>
                    {lesson.is_released ? (
                      <Badge className="bg-blue-500">
                        <Unlock className="h-3 w-3 mr-1" />
                        Liberada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-500/20 border-red-500 text-red-600">
                        <Lock className="h-3 w-3 mr-1" />
                        Bloqueada
                      </Badge>
                    )}
                  </div>
                  <div className="absolute top-2 right-2">
                    {lesson.is_configured ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Configurada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/20 border-yellow-500">
                        <Settings className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                  {lesson.duration_minutes && (
                    <div className="absolute bottom-2 right-2">
                      <Badge variant="secondary" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {lesson.duration_minutes} min
                      </Badge>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <h3 className="font-semibold line-clamp-2 mb-1">{lesson.title}</h3>
                  {lesson.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{lesson.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1 text-[10px]">
                    {lesson.transcript ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <FileText className="h-2.5 w-2.5 mr-0.5" />
                        Transcrição
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <FileText className="h-2.5 w-2.5 mr-0.5" />
                        Sem transcrição
                      </Badge>
                    )}
                    {lesson.teaching_moments && lesson.teaching_moments.length > 0 ? (
                      <Badge variant="outline" className="text-green-600 border-green-600">
                        <Target className="h-2.5 w-2.5 mr-0.5" />
                        {lesson.teaching_moments.length} momentos
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        <Target className="h-2.5 w-2.5 mr-0.5" />
                        Sem momentos
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </>
        )}
      </main>

      {/* Add Lesson Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Adicionar Nova Aula
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Video Type Selection */}
            <div className="space-y-2">
              <Label>Tipo de Mídia *</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={newVideoType === 'youtube' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVideoType('youtube')}
                >
                  YouTube
                </Button>
                <Button
                  type="button"
                  variant={newVideoType === 'external' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVideoType('external')}
                >
                  HeyGen / Externo
                </Button>
                <Button
                  type="button"
                  variant={newVideoType === 'direct' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVideoType('direct')}
                >
                  Link Direto (MP4)
                </Button>
                <Button
                  type="button"
                  variant={newVideoType === 'html_composition' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setNewVideoType('html_composition')}
                >
                  HTML Composition
                </Button>
              </div>
            </div>
            {newVideoType === 'html_composition' ? (
              <CompositionAdminEditor
                value={newCompositionJson}
                onChange={setNewCompositionJson}
                onValidChange={setNewCompositionValid}
              />
            ) : (
              <div className="space-y-2">
                <Label>{newVideoType === 'youtube' ? 'URL do YouTube *' : 'URL do Vídeo *'}</Label>
                <Input
                  placeholder={newVideoType === 'youtube'
                    ? 'https://www.youtube.com/watch?v=...'
                    : newVideoType === 'external'
                    ? 'https://app.heygen.com/share/...'
                    : 'https://storage.example.com/video.mp4'
                  }
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                />
                {newVideoType !== 'youtube' && (
                  <p className="text-xs text-muted-foreground">
                    Cole a URL completa do vídeo. Para HeyGen, use o link de compartilhamento.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>Título da Aula *</Label>
              <Input
                placeholder="Ex: Introdução ao React Hooks"
                value={newVideoTitle}
                onChange={(e) => setNewVideoTitle(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  placeholder="O que será ensinado"
                  value={newVideoDescription}
                  onChange={(e) => setNewVideoDescription(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Duração (min)</Label>
                <Input
                  type="number"
                  placeholder="15"
                  value={newVideoDuration}
                  onChange={(e) => setNewVideoDuration(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Transcrição (pode adicionar depois)</Label>
              <Textarea
                placeholder="Cole a transcrição do vídeo aqui..."
                value={newVideoTranscript}
                onChange={(e) => setNewVideoTranscript(e.target.value)}
                rows={4}
                className="font-mono text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddLesson} disabled={isLoading}>
              {isLoading ? 'Adicionando...' : 'Adicionar Aula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Edit className="h-5 w-5" />
                Configurar Aula {selectedLesson?.lesson_order}
              </span>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir aula?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação não pode ser desfeita. A aula será permanentemente removida.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => selectedLesson && handleDeleteLesson(selectedLesson.id)}>
                      Excluir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DialogTitle>
          </DialogHeader>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info" className="flex items-center gap-1">
                <Video className="h-3.5 w-3.5" />
                Info
              </TabsTrigger>
              <TabsTrigger value="transcript" className="flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                Transcrição
              </TabsTrigger>
              <TabsTrigger value="moments" className="flex items-center gap-1">
                <Target className="h-3.5 w-3.5" />
                Momentos
              </TabsTrigger>
              <TabsTrigger value="quizzes" className="flex items-center gap-1">
                <HelpCircle className="h-3.5 w-3.5" />
                Quizzes
              </TabsTrigger>
            </TabsList>
            
            <ScrollArea className="flex-1 mt-4">
              <TabsContent value="info" className="m-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Título da Aula</Label>
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (minutos)</Label>
                    <Input
                      type="number"
                      value={editDuration}
                      onChange={(e) => setEditDuration(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="O que o aluno vai aprender nesta aula"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Resumo/Análise (opcional)</Label>
                  <Textarea
                    value={editAnalysis}
                    onChange={(e) => setEditAnalysis(e.target.value)}
                    placeholder="Pontos principais da aula..."
                    rows={3}
                  />
                </div>
                
                {/* Teacher Intro - NEW FIELD */}
                <div className="space-y-2 p-4 bg-primary/5 rounded-lg border border-primary/20">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    Introdução do Professor IA
                  </Label>
                  <p className="text-xs text-muted-foreground mb-2">
                    Personalize como o professor IA deve apresentar esta aula. Deixe em branco para usar a introdução padrão.
                  </p>
                  <Textarea
                    value={editTeacherIntro}
                    onChange={(e) => setEditTeacherIntro(e.target.value)}
                    placeholder={`Exemplo: "Fala galera! Hoje vamos aprender sobre ${editTitle || 'um tema incrível'}! Preparem-se porque essa aula vai mudar a forma como vocês programam..."`}
                    rows={4}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    💡 Dica: Escreva como se fosse o professor falando diretamente com o aluno. Seja animado e acolhedor!
                  </p>
                </div>
                
                {/* Preview */}
                {selectedLesson && (
                  <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Pré-visualização</h4>
                    <div className="aspect-video bg-black rounded overflow-hidden">
                      <iframe
                        src={`https://www.youtube.com/embed/${selectedLesson.youtube_id}`}
                        className="w-full h-full"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="transcript" className="m-0 space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Transcrição do Vídeo
                  </h4>
                  <p className="text-xs text-muted-foreground mb-3">
                    A transcrição é essencial para que o Professor IA entenda o conteúdo e ensine corretamente.
                    Use ferramentas como YouTube Transcript ou Whisper para extrair o texto.
                  </p>
                  <Textarea
                    value={editTranscript}
                    onChange={(e) => setEditTranscript(e.target.value)}
                    placeholder="Cole a transcrição completa do vídeo aqui..."
                    rows={15}
                    className="font-mono text-sm"
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="moments" className="m-0 space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Momentos de Ensino
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        Configure os momentos em que o professor deve pausar o vídeo para interagir com o aluno
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={generateTeachingMoments}
                        disabled={isGeneratingMoments || !editTranscript.trim()}
                      >
                        {isGeneratingMoments ? (
                          <>
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                            Gerando...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                            Gerar com IA
                          </>
                        )}
                      </Button>
                      <Button variant="outline" size="sm" onClick={addEmptyMoment}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" />
                        Adicionar
                      </Button>
                    </div>
                  </div>
                  
                  {editMoments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Lightbulb className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Nenhum momento de ensino configurado</p>
                      <p className="text-xs">Use o botão "Gerar com IA" ou adicione manualmente</p>
                    </div>
                  ) : (
                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                      {editMoments.map((moment, index) => (
                        <Card key={index} className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <Badge variant="secondary">
                              {formatTime(moment.timestamp_seconds)}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-destructive"
                              onClick={() => removeMoment(index)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs">Tempo (segundos)</Label>
                                <Input
                                  type="number"
                                  value={moment.timestamp_seconds}
                                  onChange={(e) => updateMoment(index, 'timestamp_seconds', parseInt(e.target.value) || 0)}
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Tópico</Label>
                                <Input
                                  value={moment.topic}
                                  onChange={(e) => updateMoment(index, 'topic', e.target.value)}
                                  placeholder="Nome do conceito"
                                  className="h-8"
                                />
                              </div>
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Insight Principal</Label>
                              <Input
                                value={moment.key_insight}
                                onChange={(e) => updateMoment(index, 'key_insight', e.target.value)}
                                placeholder="O que o aluno deve entender"
                              />
                            </div>
                            
                            <div className="space-y-1">
                              <Label className="text-xs">Perguntas para o aluno</Label>
                              <Textarea
                                value={moment.questions_to_ask.join('\n')}
                                onChange={(e) => updateMoment(index, 'questions_to_ask', e.target.value.split('\n').filter(q => q.trim()))}
                                placeholder="Uma pergunta por linha"
                                rows={2}
                                className="text-sm"
                              />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="quizzes" className="m-0">
                {selectedLesson && (
                  <QuizEditor 
                    videoId={selectedLesson.id} 
                    password={password}
                    transcript={editTranscript}
                    title={editTitle}
                    videoDurationMinutes={editDuration ? parseInt(editDuration) : undefined}
                    teachingMoments={editMoments}
                  />
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
          
          <DialogFooter className="mt-4">
            <div className="flex items-center gap-2 mr-auto text-xs text-muted-foreground">
              {editTranscript && editMoments.length > 0 ? (
                <span className="flex items-center gap-1 text-green-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Aula pronta para os alunos
                </span>
              ) : (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Settings className="h-3.5 w-3.5" />
                  Complete a transcrição e momentos
                </span>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateLesson} disabled={isLoading}>
              {isLoading ? 'Salvando...' : 'Salvar Aula'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Lessons Dialog */}
      <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ListOrdered className="h-5 w-5" />
              Organizar Sequência e Liberação de Aulas
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-hidden">
            <p className="text-sm text-muted-foreground mb-4">
              Arraste as aulas para reorganizar a ordem. Use o toggle para liberar ou bloquear aulas para os alunos.
            </p>
            
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-2">
                {lessons.map((lesson, index) => (
                  <Card key={lesson.id} className="p-3">
                    <div className="flex items-center gap-3">
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveLessonUp(index)}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => moveLessonDown(index)}
                          disabled={index === lessons.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      
                      {/* Order number */}
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary">
                        {index + 1}
                      </div>
                      
                      {/* Thumbnail */}
                      <img
                        src={lesson.thumbnail_url || `https://img.youtube.com/vi/${lesson.youtube_id}/mqdefault.jpg`}
                        alt={lesson.title}
                        className="w-20 aspect-video object-cover rounded"
                      />
                      
                      {/* Title and status */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{lesson.title}</h4>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {lesson.is_configured ? (
                            <span className="text-green-600 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Configurada
                            </span>
                          ) : (
                            <span className="text-yellow-600 flex items-center gap-1">
                              <Settings className="h-3 w-3" />
                              Pendente
                            </span>
                          )}
                          {lesson.duration_minutes && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.duration_minutes} min
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Release toggle */}
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-medium ${lesson.is_released ? 'text-green-600' : 'text-red-500'}`}>
                          {lesson.is_released ? 'Liberada' : 'Bloqueada'}
                        </span>
                        <Switch
                          checked={lesson.is_released}
                          onCheckedChange={() => toggleLessonRelease(lesson.id, lesson.is_released)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <DialogFooter className="mt-4">
            <div className="mr-auto text-xs text-muted-foreground">
              {lessons.filter(l => l.is_released).length} de {lessons.length} aulas liberadas
            </div>
            <Button variant="outline" onClick={() => setIsOrderDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveNewOrder} disabled={isSavingOrder}>
              {isSavingOrder ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Ordem'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
