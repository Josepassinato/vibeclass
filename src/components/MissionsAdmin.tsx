import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Target, Star, Clock, FileText, Code, Link as LinkIcon, Image, Save, X, Loader2 } from 'lucide-react';
import { logger } from '@/lib/logger';

interface Mission {
  id: string;
  video_id: string | null;
  title: string;
  description: string;
  instructions: string;
  evidence_type: 'text' | 'screenshot' | 'code' | 'link' | 'file';
  difficulty_level: 'básico' | 'intermediário' | 'avançado';
  points_reward: number;
  time_limit_minutes: number | null;
  evaluation_criteria: string[];
  is_active: boolean;
  mission_order: number | null;
}

interface Video {
  id: string;
  title: string;
  lesson_order: number | null;
}

const EVIDENCE_TYPES = [
  { value: 'text', label: 'Texto', icon: FileText },
  { value: 'code', label: 'Código', icon: Code },
  { value: 'link', label: 'Link', icon: LinkIcon },
  { value: 'screenshot', label: 'Screenshot', icon: Image },
  { value: 'file', label: 'Arquivo', icon: FileText },
];

const DIFFICULTY_LEVELS = [
  { value: 'básico', label: 'Básico', color: 'bg-green-500/20 text-green-400' },
  { value: 'intermediário', label: 'Intermediário', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'avançado', label: 'Avançado', color: 'bg-red-500/20 text-red-400' },
];

export function MissionsAdmin() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMission, setEditingMission] = useState<Mission | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [filterVideoId, setFilterVideoId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    video_id: '' as string | null,
    title: '',
    description: '',
    instructions: '',
    evidence_type: 'text' as Mission['evidence_type'],
    difficulty_level: 'intermediário' as Mission['difficulty_level'],
    points_reward: 10,
    time_limit_minutes: null as number | null,
    evaluation_criteria: [''],
    is_active: true,
  });

  const loadMissions = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('missions')
        .select('*')
        .order('mission_order');

      if (error) throw error;

      const parsed: Mission[] = (data || []).map(m => ({
        id: m.id,
        video_id: m.video_id,
        title: m.title,
        description: m.description,
        instructions: m.instructions,
        evidence_type: m.evidence_type as Mission['evidence_type'],
        difficulty_level: m.difficulty_level as Mission['difficulty_level'],
        points_reward: m.points_reward,
        time_limit_minutes: m.time_limit_minutes,
        evaluation_criteria: Array.isArray(m.evaluation_criteria) ? m.evaluation_criteria as string[] : [],
        is_active: m.is_active,
        mission_order: m.mission_order,
      }));

      setMissions(parsed);
    } catch (error) {
      logger.error('Failed to load missions:', error);
      toast.error('Erro ao carregar missões');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadVideos = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, lesson_order')
        .order('lesson_order');

      if (error) throw error;
      setVideos(data || []);
    } catch (error) {
      logger.error('Failed to load videos:', error);
    }
  }, []);

  useEffect(() => {
    loadMissions();
    loadVideos();
  }, [loadMissions, loadVideos]);

  const resetForm = () => {
    setFormData({
      video_id: null,
      title: '',
      description: '',
      instructions: '',
      evidence_type: 'text',
      difficulty_level: 'intermediário',
      points_reward: 10,
      time_limit_minutes: null,
      evaluation_criteria: [''],
      is_active: true,
    });
    setEditingMission(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (mission: Mission) => {
    setEditingMission(mission);
    setFormData({
      video_id: mission.video_id,
      title: mission.title,
      description: mission.description,
      instructions: mission.instructions,
      evidence_type: mission.evidence_type,
      difficulty_level: mission.difficulty_level,
      points_reward: mission.points_reward,
      time_limit_minutes: mission.time_limit_minutes,
      evaluation_criteria: mission.evaluation_criteria.length > 0 ? mission.evaluation_criteria : [''],
      is_active: mission.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim() || !formData.description.trim() || !formData.instructions.trim()) {
      toast.error('Preencha título, descrição e instruções');
      return;
    }

    const validCriteria = formData.evaluation_criteria.filter(c => c.trim());
    if (validCriteria.length === 0) {
      toast.error('Adicione pelo menos um critério de avaliação');
      return;
    }

    setIsSaving(true);
    try {
      const missionData = {
        video_id: formData.video_id || null,
        title: formData.title.trim(),
        description: formData.description.trim(),
        instructions: formData.instructions.trim(),
        evidence_type: formData.evidence_type,
        difficulty_level: formData.difficulty_level,
        points_reward: formData.points_reward,
        time_limit_minutes: formData.time_limit_minutes,
        evaluation_criteria: validCriteria,
        is_active: formData.is_active,
        mission_order: editingMission?.mission_order ?? missions.length + 1,
      };

      if (editingMission) {
        const { error } = await supabase
          .from('missions')
          .update(missionData)
          .eq('id', editingMission.id);

        if (error) throw error;
        toast.success('Missão atualizada!');
      } else {
        const { error } = await supabase
          .from('missions')
          .insert(missionData);

        if (error) throw error;
        toast.success('Missão criada!');
      }

      setIsDialogOpen(false);
      resetForm();
      loadMissions();
    } catch (error) {
      logger.error('Failed to save mission:', error);
      toast.error('Erro ao salvar missão');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (missionId: string) => {
    try {
      const { error } = await supabase
        .from('missions')
        .delete()
        .eq('id', missionId);

      if (error) throw error;
      toast.success('Missão excluída');
      loadMissions();
    } catch (error) {
      logger.error('Failed to delete mission:', error);
      toast.error('Erro ao excluir missão');
    }
  };

  const toggleMissionActive = async (mission: Mission) => {
    try {
      const { error } = await supabase
        .from('missions')
        .update({ is_active: !mission.is_active })
        .eq('id', mission.id);

      if (error) throw error;
      
      setMissions(missions.map(m => 
        m.id === mission.id ? { ...m, is_active: !m.is_active } : m
      ));
      toast.success(mission.is_active ? 'Missão desativada' : 'Missão ativada');
    } catch (error) {
      logger.error('Failed to toggle mission:', error);
      toast.error('Erro ao alterar status');
    }
  };

  const addCriterion = () => {
    setFormData(prev => ({
      ...prev,
      evaluation_criteria: [...prev.evaluation_criteria, '']
    }));
  };

  const updateCriterion = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.map((c, i) => i === index ? value : c)
    }));
  };

  const removeCriterion = (index: number) => {
    if (formData.evaluation_criteria.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      evaluation_criteria: prev.evaluation_criteria.filter((_, i) => i !== index)
    }));
  };

  const getVideoTitle = (videoId: string | null) => {
    if (!videoId) return 'Geral';
    const video = videos.find(v => v.id === videoId);
    return video ? `Aula ${video.lesson_order}: ${video.title}` : 'Vídeo não encontrado';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Gerenciar Missões
          </h2>
          <p className="text-muted-foreground">{missions.length} missões cadastradas</p>
        </div>
        <div className="flex items-center gap-2">
          <Select 
            value={filterVideoId || 'all'} 
            onValueChange={(val) => setFilterVideoId(val === 'all' ? null : val)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por aula" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as aulas</SelectItem>
              <SelectItem value="general">Geral (sem vídeo)</SelectItem>
              {videos.map(video => (
                <SelectItem key={video.id} value={video.id}>
                  Aula {video.lesson_order}: {video.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Nova Missão
          </Button>
        </div>
      </div>

      {/* Missions Grid */}
      {(() => {
        const filteredMissions = missions.filter(m => {
          if (!filterVideoId) return true;
          if (filterVideoId === 'general') return !m.video_id;
          return m.video_id === filterVideoId;
        });
        
        return filteredMissions.length === 0 ? (
        <Card className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h3 className="text-xl font-semibold mb-2">Nenhuma missão cadastrada</h3>
          <p className="text-muted-foreground mb-4">Crie missões práticas para os estudantes</p>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Missão
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMissions.map((mission) => {
            const diffConfig = DIFFICULTY_LEVELS.find(d => d.value === mission.difficulty_level);
            const EvidenceIcon = EVIDENCE_TYPES.find(e => e.value === mission.evidence_type)?.icon || FileText;

            return (
              <Card 
                key={mission.id} 
                className={`relative transition-all ${!mission.is_active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <CardTitle className="text-base line-clamp-1">{mission.title}</CardTitle>
                      <CardDescription className="text-xs mt-1 line-clamp-2">
                        {mission.description}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-medium">{mission.points_reward}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className={diffConfig?.color}>
                      {mission.difficulty_level}
                    </Badge>
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <EvidenceIcon className="w-3 h-3" />
                      {EVIDENCE_TYPES.find(e => e.value === mission.evidence_type)?.label}
                    </Badge>
                    {mission.time_limit_minutes && (
                      <Badge variant="secondary" className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {mission.time_limit_minutes}min
                      </Badge>
                    )}
                  </div>

                  {/* Video Link */}
                  <p className="text-xs text-muted-foreground">
                    📹 {getVideoTitle(mission.video_id)}
                  </p>

                  {/* Criteria count */}
                  <p className="text-xs text-muted-foreground">
                    ✅ {mission.evaluation_criteria.length} critérios de avaliação
                  </p>

                  {/* Actions */}
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <Switch 
                        checked={mission.is_active}
                        onCheckedChange={() => toggleMissionActive(mission)}
                      />
                      <span className="text-xs text-muted-foreground">
                        {mission.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => openEditDialog(mission)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="icon" variant="ghost" className="text-destructive">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir missão?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta ação não pode ser desfeita. A missão "{mission.title}" será permanentemente excluída.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(mission.id)}>
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        );
      })()}

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingMission ? 'Editar Missão' : 'Nova Missão'}
            </DialogTitle>
            <DialogDescription>
              Configure os detalhes da missão prática para os estudantes
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              {/* Video selection */}
              <div className="space-y-2">
                <Label>Vincular a Vídeo (opcional)</Label>
                <Select 
                  value={formData.video_id || 'general'} 
                  onValueChange={(val) => setFormData(prev => ({ ...prev, video_id: val === 'general' ? null : val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um vídeo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">Geral (sem vídeo específico)</SelectItem>
                    {videos.map(video => (
                      <SelectItem key={video.id} value={video.id}>
                        Aula {video.lesson_order}: {video.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label>Título da Missão *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Ex: Criar um componente React"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Breve descrição do que o estudante deve fazer"
                  rows={2}
                />
              </div>

              {/* Instructions */}
              <div className="space-y-2">
                <Label>Instruções Detalhadas *</Label>
                <Textarea
                  value={formData.instructions}
                  onChange={(e) => setFormData(prev => ({ ...prev, instructions: e.target.value }))}
                  placeholder="Passo a passo detalhado de como completar a missão..."
                  rows={4}
                />
              </div>

              {/* Evidence Type & Difficulty */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Evidência</Label>
                  <Select 
                    value={formData.evidence_type} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, evidence_type: val as Mission['evidence_type'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EVIDENCE_TYPES.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className="w-4 h-4" />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Nível de Dificuldade</Label>
                  <Select 
                    value={formData.difficulty_level} 
                    onValueChange={(val) => setFormData(prev => ({ ...prev, difficulty_level: val as Mission['difficulty_level'] }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DIFFICULTY_LEVELS.map(level => (
                        <SelectItem key={level.value} value={level.value}>
                          {level.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Points & Time */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Pontos de Recompensa</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={formData.points_reward}
                    onChange={(e) => setFormData(prev => ({ ...prev, points_reward: parseInt(e.target.value) || 10 }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tempo Limite (minutos, opcional)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.time_limit_minutes || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, time_limit_minutes: e.target.value ? parseInt(e.target.value) : null }))}
                    placeholder="Sem limite"
                  />
                </div>
              </div>

              {/* Evaluation Criteria */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Critérios de Avaliação *</Label>
                  <Button type="button" size="sm" variant="outline" onClick={addCriterion}>
                    <Plus className="w-3 h-3 mr-1" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.evaluation_criteria.map((criterion, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={criterion}
                        onChange={(e) => updateCriterion(index, e.target.value)}
                        placeholder={`Critério ${index + 1}`}
                      />
                      {formData.evaluation_criteria.length > 1 && (
                        <Button 
                          type="button" 
                          size="icon" 
                          variant="ghost"
                          onClick={() => removeCriterion(index)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  A IA usará estes critérios para avaliar as submissões dos estudantes
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div>
                  <Label>Missão Ativa</Label>
                  <p className="text-xs text-muted-foreground">Missões inativas não aparecem para estudantes</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {editingMission ? 'Atualizar' : 'Criar'} Missão
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
