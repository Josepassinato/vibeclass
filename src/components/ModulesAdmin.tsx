import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, FolderOpen, ChevronDown, ChevronRight, GripVertical, ArrowUp, ArrowDown, Unlock, Lock, Video, BookOpen, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Module {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  thumbnail_url: string | null;
  is_released: boolean | null;
  created_at: string;
}

interface VideoLesson {
  id: string;
  title: string;
  module_id: string | null;
  lesson_order: number | null;
  is_released: boolean | null;
  thumbnail_url: string | null;
  youtube_id: string | null;
}

interface ModulesAdminProps {
  password: string;
}

export function ModulesAdmin({ password }: ModulesAdminProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<VideoLesson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(new Set());
  
  // Dialog states
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  
  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formThumbnail, setFormThumbnail] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [modulesRes, lessonsRes] = await Promise.all([
        supabase.from('modules').select('*').order('module_order'),
        supabase.from('videos').select('id, title, module_id, lesson_order, is_released, thumbnail_url, youtube_id').order('lesson_order')
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      setModules(modulesRes.data || []);
      setLessons(lessonsRes.data || []);
    } catch (err) {
      toast.error('Erro ao carregar dados');
      logger.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddModule = async () => {
    if (!formTitle.trim()) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      const { error } = await supabase.from('modules').insert({
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        thumbnail_url: formThumbnail.trim() || null,
        module_order: modules.length + 1,
        is_released: false,
      });

      if (error) throw error;

      toast.success('Módulo criado!');
      setIsAddDialogOpen(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Erro ao criar módulo');
      logger.error(err);
    }
  };

  const handleUpdateModule = async () => {
    if (!selectedModule || !formTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('modules')
        .update({
          title: formTitle.trim(),
          description: formDescription.trim() || null,
          thumbnail_url: formThumbnail.trim() || null,
        })
        .eq('id', selectedModule.id);

      if (error) throw error;

      toast.success('Módulo atualizado!');
      setIsEditDialogOpen(false);
      setSelectedModule(null);
      resetForm();
      loadData();
    } catch (err) {
      toast.error('Erro ao atualizar módulo');
      logger.error(err);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!confirm('Remover este módulo? As aulas serão desvinculadas mas não excluídas.')) return;

    try {
      // First unlink lessons from this module
      await supabase
        .from('videos')
        .update({ module_id: null })
        .eq('module_id', moduleId);

      const { error } = await supabase
        .from('modules')
        .delete()
        .eq('id', moduleId);

      if (error) throw error;

      toast.success('Módulo removido!');
      loadData();
    } catch (err) {
      toast.error('Erro ao remover módulo');
      logger.error(err);
    }
  };

  const toggleModuleRelease = async (moduleId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('modules')
        .update({ is_released: !currentStatus })
        .eq('id', moduleId);

      if (error) throw error;

      setModules(modules.map(m => 
        m.id === moduleId ? { ...m, is_released: !currentStatus } : m
      ));
      toast.success(!currentStatus ? 'Módulo liberado!' : 'Módulo bloqueado');
    } catch (err) {
      toast.error('Erro ao alterar status');
    }
  };

  const moveModuleUp = async (index: number) => {
    if (index === 0) return;
    const updated = [...modules];
    [updated[index - 1], updated[index]] = [updated[index], updated[index - 1]];
    
    try {
      await Promise.all([
        supabase.from('modules').update({ module_order: index }).eq('id', updated[index - 1].id),
        supabase.from('modules').update({ module_order: index + 1 }).eq('id', updated[index].id),
      ]);
      setModules(updated.map((m, i) => ({ ...m, module_order: i + 1 })));
    } catch (err) {
      toast.error('Erro ao reordenar');
    }
  };

  const moveModuleDown = async (index: number) => {
    if (index === modules.length - 1) return;
    const updated = [...modules];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    
    try {
      await Promise.all([
        supabase.from('modules').update({ module_order: index + 1 }).eq('id', updated[index].id),
        supabase.from('modules').update({ module_order: index + 2 }).eq('id', updated[index + 1].id),
      ]);
      setModules(updated.map((m, i) => ({ ...m, module_order: i + 1 })));
    } catch (err) {
      toast.error('Erro ao reordenar');
    }
  };

  const assignLessonToModule = async (lessonId: string, moduleId: string | null) => {
    try {
      const { error } = await supabase
        .from('videos')
        .update({ module_id: moduleId === 'none' ? null : moduleId })
        .eq('id', lessonId);

      if (error) throw error;

      setLessons(lessons.map(l => 
        l.id === lessonId ? { ...l, module_id: moduleId === 'none' ? null : moduleId } : l
      ));
      toast.success('Aula atribuída!');
    } catch (err) {
      toast.error('Erro ao atribuir aula');
    }
  };

  const openEditDialog = (module: Module) => {
    setSelectedModule(module);
    setFormTitle(module.title);
    setFormDescription(module.description || '');
    setFormThumbnail(module.thumbnail_url || '');
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDescription('');
    setFormThumbnail('');
  };

  const toggleExpanded = (moduleId: string) => {
    const next = new Set(expandedModules);
    if (next.has(moduleId)) {
      next.delete(moduleId);
    } else {
      next.add(moduleId);
    }
    setExpandedModules(next);
  };

  const getLessonsForModule = (moduleId: string) => 
    lessons.filter(l => l.module_id === moduleId);

  const unassignedLessons = lessons.filter(l => !l.module_id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6 text-primary" />
            Módulos do Curso
          </h2>
          <p className="text-muted-foreground text-sm">
            Organize suas aulas em módulos temáticos com pré-requisitos
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Módulo
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <BookOpen className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-primary">Sistema de Pré-requisitos</p>
              <p className="text-muted-foreground">
                Para desbloquear um módulo, o aluno deve completar <strong>todas as aulas</strong> do módulo anterior 
                (passar no quiz + concluir missão de cada aula).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modules List */}
      {modules.length === 0 ? (
        <Card className="p-12 text-center">
          <FolderOpen className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Nenhum módulo criado</h3>
          <p className="text-muted-foreground mb-4">Crie módulos para organizar suas aulas em trilhas de aprendizado</p>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Primeiro Módulo
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {modules.map((module, index) => {
            const moduleLessons = getLessonsForModule(module.id);
            const isExpanded = expandedModules.has(module.id);

            return (
              <Card key={module.id} className={`${module.is_released ? 'border-green-500/30' : 'border-muted'}`}>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(module.id)}>
                  <div className="p-4 flex items-center gap-4">
                    {/* Reorder buttons */}
                    <div className="flex flex-col gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveModuleUp(index)}
                        disabled={index === 0}
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => moveModuleDown(index)}
                        disabled={index === modules.length - 1}
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                    </div>

                    {/* Expand trigger */}
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </CollapsibleTrigger>

                    {/* Module info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">Módulo {index + 1}</Badge>
                        <h3 className="font-semibold truncate">{module.title}</h3>
                        {module.is_released ? (
                          <Badge className="bg-green-500">
                            <Unlock className="h-3 w-3 mr-1" />
                            Liberado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            <Lock className="h-3 w-3 mr-1" />
                            Bloqueado
                          </Badge>
                        )}
                      </div>
                      {module.description && (
                        <p className="text-sm text-muted-foreground truncate">{module.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {moduleLessons.length} aulas neste módulo
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={module.is_released ?? false}
                        onCheckedChange={() => toggleModuleRelease(module.id, module.is_released ?? false)}
                      />
                      <Button variant="outline" size="icon" onClick={() => openEditDialog(module)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteModule(module.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <CollapsibleContent>
                    <div className="border-t px-4 py-3 bg-muted/30">
                      <h4 className="text-sm font-medium mb-3">Aulas deste módulo</h4>
                      {moduleLessons.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Nenhuma aula atribuída a este módulo.</p>
                      ) : (
                        <div className="space-y-2">
                          {moduleLessons.map((lesson) => (
                            <div key={lesson.id} className="flex items-center gap-3 p-2 bg-background rounded-lg">
                              <img
                                src={lesson.thumbnail_url || (lesson.youtube_id ? `https://img.youtube.com/vi/${lesson.youtube_id}/default.jpg` : '/placeholder.svg')}
                                alt={lesson.title}
                                className="w-16 h-10 object-cover rounded"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{lesson.title}</p>
                                <p className="text-xs text-muted-foreground">Aula {lesson.lesson_order}</p>
                              </div>
                              <Select
                                value={lesson.module_id || 'none'}
                                onValueChange={(value) => assignLessonToModule(lesson.id, value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Sem módulo</SelectItem>
                                  {modules.map((m) => (
                                    <SelectItem key={m.id} value={m.id}>
                                      Módulo {m.module_order}: {m.title.slice(0, 20)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Unassigned Lessons */}
      {unassignedLessons.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Video className="h-5 w-5 text-muted-foreground" />
              Aulas sem módulo ({unassignedLessons.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {unassignedLessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center gap-3 p-2 bg-muted/30 rounded-lg">
                  <img
                    src={lesson.thumbnail_url || (lesson.youtube_id ? `https://img.youtube.com/vi/${lesson.youtube_id}/default.jpg` : '/placeholder.svg')}
                    alt={lesson.title}
                    className="w-16 h-10 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{lesson.title}</p>
                    <p className="text-xs text-muted-foreground">Aula {lesson.lesson_order}</p>
                  </div>
                  <Select
                    value="none"
                    onValueChange={(value) => assignLessonToModule(lesson.id, value)}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Atribuir módulo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem módulo</SelectItem>
                      {modules.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          Módulo {m.module_order}: {m.title.slice(0, 20)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Module Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Módulo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Fundamentos de React"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o conteúdo deste módulo..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL da Thumbnail</Label>
              <Input
                placeholder="https://..."
                value={formThumbnail}
                onChange={(e) => setFormThumbnail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleAddModule}>Criar Módulo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Module Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Módulo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input
                placeholder="Ex: Fundamentos de React"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Descreva o conteúdo deste módulo..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>URL da Thumbnail</Label>
              <Input
                placeholder="https://..."
                value={formThumbnail}
                onChange={(e) => setFormThumbnail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleUpdateModule}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
