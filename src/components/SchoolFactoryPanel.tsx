import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Bot, CircleDollarSign, Clock3, Loader2, PlayCircle, RefreshCw, ShieldCheck, UserRoundCheck, Wand2 } from 'lucide-react';

type ProjectMode = 'create_zero' | 'takeover';

interface SchoolFactoryPanelProps {
  password: string;
}

interface FactoryProjectSummary {
  id: string;
  name: string;
  status: string;
  organization_id?: string | null;
  organization?: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  initial_capital: number | null;
  budget_limit_usd: number | null;
  budget_spent_usd: number | null;
  qa_min_score: number | null;
  master_plan?: {
    executive_summary?: string;
  } | null;
  metrics?: {
    pending: number;
    running: number;
    completed: number;
    blocked: number;
    failed: number;
    handoffs_open: number;
  };
  sla?: {
    overdue_tasks: number;
    overdue_handoffs: number;
  };
}

interface FactoryTask {
  id: string;
  title: string;
  task_type: string;
  status: string;
  assigned_agent: string;
  assignee_name: string | null;
  assignee_whatsapp: string | null;
  assignee_email: string | null;
  handoff_summary: string | null;
  last_response: string | null;
  next_follow_up_at: string | null;
}

interface TutorPackVersion {
  version: number;
  created_at: string;
  notes?: string | null;
}

interface StatusPayload {
  project: FactoryProjectSummary;
  tasks: FactoryTask[];
  handoffs_open: FactoryTask[];
  domain_store?: {
    mode: string;
    mongo_enabled: boolean;
    mongo_configured: boolean;
    mongo_collections?: {
      projects?: string;
      tasks?: string;
    };
  };
  video_compliance?: {
    total: number;
    ready: number;
    pending: number;
    failed: number;
    over_limit: number;
    unverified_duration: number;
    blockers: string[];
  };
  sla: {
    overdue_tasks: number;
    overdue_handoffs: number;
    avg_execution_by_agent: Array<{
      agent: string;
      avg_minutes: number;
      completed_tasks: number;
    }>;
  };
  costs: {
    budget_limit_usd: number;
    budget_spent_usd: number;
    budget_remaining_usd: number;
    hard_stop: boolean;
  };
  tutor_pack_versions: TutorPackVersion[];
  saas?: {
    organization: {
      id: string;
      name: string;
      slug: string;
      status: string;
    };
    subscription: {
      id: string;
      plan_code: string;
      status: string;
      provider: string;
      trial_ends_at: string | null;
      current_period_end: string | null;
    };
    plan: {
      plan_code: string;
      plan_name: string;
      max_projects: number;
      max_members: number;
      max_videos_per_month: number;
      max_tasks_per_month: number;
      monthly_spend_limit_usd: number;
      supports_white_label: boolean;
    };
    usage: {
      reference_month: string;
      projects_created: number;
      tasks_executed: number;
      videos_generated: number;
      spend_usd: number;
      members_added: number;
    };
    limits: {
      remaining_projects: number;
      remaining_tasks: number;
      remaining_videos: number;
      remaining_spend_usd: number;
    };
  } | null;
}

interface PdfJsTextItem {
  str?: string;
}

interface PdfJsTextContent {
  items: PdfJsTextItem[];
}

interface PdfJsPageProxy {
  getTextContent: () => Promise<PdfJsTextContent>;
}

interface PdfJsDocProxy {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfJsPageProxy>;
}

interface PdfJsModule {
  version: string;
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: Uint8Array }) => { promise: Promise<PdfJsDocProxy> };
}

const projectStatusVariant: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'outline',
  planning: 'secondary',
  ready_for_approval: 'secondary',
  in_production: 'default',
  ready_to_publish: 'default',
  published: 'default',
  blocked: 'destructive',
  failed: 'destructive',
};

const sanitizeFileName = (name: string) =>
  name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9._-]/g, '');

export function SchoolFactoryPanel({ password }: SchoolFactoryPanelProps) {
  const [isBusy, setIsBusy] = useState(false);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [projects, setProjects] = useState<FactoryProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusData, setStatusData] = useState<StatusPayload | null>(null);
  const [handoffResponses, setHandoffResponses] = useState<Record<string, string>>({});
  const [nextFollowUpHours, setNextFollowUpHours] = useState<Record<string, string>>({});

  const [mode, setMode] = useState<ProjectMode>('create_zero');
  const [schoolName, setSchoolName] = useState('');
  const [niche, setNiche] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [organizationSlug, setOrganizationSlug] = useState('');
  const [ownerUserId, setOwnerUserId] = useState('');
  const [planCode, setPlanCode] = useState('starter');
  const [targetAudience, setTargetAudience] = useState('');
  const [initialCapital, setInitialCapital] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('300');
  const [qaMinScore, setQaMinScore] = useState('75');
  const [videoProviderStrategy, setVideoProviderStrategy] = useState('cheapest');
  const [videoPreferredProvider, setVideoPreferredProvider] = useState('');
  const [videoFallbackProvider, setVideoFallbackProvider] = useState('');
  const [heygenAvatarId, setHeygenAvatarId] = useState('');
  const [heygenVoiceId, setHeygenVoiceId] = useState('');
  const [tavusReplicaId, setTavusReplicaId] = useState('');
  const [objective, setObjective] = useState('');
  const [documentText, setDocumentText] = useState('');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [subscriptionPlan, setSubscriptionPlan] = useState('growth');
  const [subscriptionStatus, setSubscriptionStatus] = useState('active');

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === selectedProjectId) || statusData?.project || null,
    [projects, selectedProjectId, statusData],
  );

  const callFactory = useCallback(async (body: Record<string, unknown>) => {
    const { data, error } = await supabase.functions.invoke('school-factory', {
      body: { ...body, password },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  }, [password]);

  const extractPdfText = useCallback(async (file: File) => {
    const moduleUnknown = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdfjs = moduleUnknown as unknown as PdfJsModule;
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    const loadingTask = pdfjs.getDocument({ data: bytes });
    const pdf = await loadingTask.promise;

    const pages: string[] = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str || '').join(' ');
      if (pageText.trim()) {
        pages.push(pageText.trim());
      }
    }

    return pages.join('\n\n');
  }, []);

  const loadProjects = useCallback(async () => {
    setIsLoadingProjects(true);
    try {
      const data = await callFactory({ action: 'list_projects' });
      const list = (data.projects || []) as FactoryProjectSummary[];
      setProjects(list);
      if (!selectedProjectId && list.length > 0) {
        setSelectedProjectId(list[0].id);
      }
    } catch (error) {
      console.error(error);
      toast.error('Falha ao carregar projetos da fábrica');
    } finally {
      setIsLoadingProjects(false);
    }
  }, [callFactory, selectedProjectId]);

  const loadProjectStatus = useCallback(async (projectId?: string) => {
    const target = projectId || selectedProjectId;
    if (!target) return;
    try {
      const data = await callFactory({ action: 'project_status', project_id: target });
      setStatusData(data as StatusPayload);
    } catch (error) {
      console.error(error);
      toast.error('Falha ao carregar status do projeto');
    }
  }, [callFactory, selectedProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    if (selectedProjectId) {
      loadProjectStatus(selectedProjectId);
    }
  }, [selectedProjectId, loadProjectStatus]);

  const handleCreateProject = async () => {
    if (!schoolName.trim()) {
      toast.error('Informe o nome da escola');
      return;
    }

    setIsBusy(true);
    try {
      const textDocuments = documentText.trim()
        ? [
            {
              source_type: 'text',
              title: 'Base de conteúdo inicial',
              content: documentText.trim(),
              metadata: { created_from: 'admin_panel' },
            },
          ]
        : [];

      const data = await callFactory({
        action: 'create_project',
        project: {
          name: schoolName.trim(),
          organization_name: organizationName.trim() || schoolName.trim(),
          organization_slug: organizationSlug.trim() || null,
          owner_user_id: ownerUserId.trim() || null,
          plan_code: planCode.trim() || 'starter',
          mode,
          niche: niche.trim() || null,
          target_audience: targetAudience.trim() || null,
          objective: objective.trim() || null,
          initial_capital: initialCapital ? Number(initialCapital) : null,
          budget_limit_usd: budgetLimit ? Number(budgetLimit) : null,
          qa_min_score: qaMinScore ? Number(qaMinScore) : 75,
          video_provider_strategy: videoProviderStrategy.trim() || 'cheapest',
          video_preferred_provider: videoPreferredProvider.trim() || null,
          video_fallback_provider: videoFallbackProvider.trim() || null,
          heygen_avatar_id: heygenAvatarId.trim() || null,
          heygen_voice_id: heygenVoiceId.trim() || null,
          tavus_replica_id: tavusReplicaId.trim() || null,
          documents: textDocuments,
          business_context: { source: 'admin_factory_panel' },
        },
      });

      const projectId = String(data?.project?.id || '');
      if (!projectId) {
        throw new Error('Projeto criado sem id retornado');
      }

      if (pdfFiles.length > 0) {
        const extractedDocs: Array<Record<string, unknown>> = [];
        for (const file of pdfFiles) {
          const sign = await callFactory({
            action: 'sign_upload_url',
            project_id: projectId,
            file_name: file.name,
          });
          const path = String(sign?.path || '');
          const token = String(sign?.token || '');
          if (!path || !token) throw new Error('Falha ao assinar URL de upload do PDF');

          const { error: uploadError } = await supabase
            .storage
            .from('school-factory-docs')
            .uploadToSignedUrl(path, token, file, { contentType: 'application/pdf' });
          if (uploadError) throw uploadError;

          const extractedText = await extractPdfText(file);
          extractedDocs.push({
            source_type: 'pdf',
            title: file.name,
            source_url: path,
            content: extractedText,
            metadata: {
              original_name: file.name,
              size: file.size,
              storage_path: path,
              extracted_by: 'pdfjs-dist',
            },
          });
        }

        if (extractedDocs.length > 0) {
          await callFactory({
            action: 'attach_documents',
            project_id: projectId,
            documents: extractedDocs,
          });
        }
      }

      setSelectedProjectId(projectId);
      toast.success('Projeto criado e documentos processados.');
      await loadProjects();
      await loadProjectStatus(projectId);
      setPdfFiles([]);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Falha ao criar projeto';
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleAction = async (action: string, options: Record<string, unknown> = {}) => {
    if (!selectedProjectId) {
      toast.error('Selecione um projeto');
      return;
    }

    setIsBusy(true);
    try {
      const data = await callFactory({ action, project_id: selectedProjectId, ...options });
      const defaultMessage =
        action === 'generate_master_plan'
          ? 'Plano mestre gerado.'
          : action === 'enqueue_pipeline'
          ? 'Pipeline criado com sucesso.'
          : action === 'run_next_task'
          ? 'Tarefa executada.'
          : action === 'sync_video_status'
          ? 'Status de vídeo sincronizado.'
          : action === 'run_cron'
          ? 'Runner automático executado.'
          : action === 'publish_project'
          ? 'Projeto publicado.'
          : action === 'rollback_tutor_pack'
          ? 'Tutor pack revertido.'
          : 'Ação concluída.';
      toast.success((data?.message as string) || defaultMessage);
      await Promise.all([loadProjects(), loadProjectStatus(selectedProjectId)]);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao executar ação';
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const updateHandoff = async (taskId: string) => {
    const response = handoffResponses[taskId]?.trim();
    if (!response) {
      toast.error('Escreva a última resposta do humano');
      return;
    }

    const nextHours = Number(nextFollowUpHours[taskId] || '8');
    const nextFollowUp = new Date(Date.now() + Math.max(1, nextHours) * 60 * 60 * 1000).toISOString();

    setIsBusy(true);
    try {
      await callFactory({
        action: 'record_handoff_update',
        task_id: taskId,
        status: 'blocked',
        last_response: response,
        next_follow_up_at: nextFollowUp,
      });
      toast.success('Handoff atualizado');
      setHandoffResponses((prev) => ({ ...prev, [taskId]: '' }));
      await loadProjectStatus(selectedProjectId);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar handoff';
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  const updateSubscription = async () => {
    const organizationId = statusData?.saas?.organization?.id || selectedProject?.organization_id || '';
    if (!organizationId) {
      toast.error('Organização não encontrada para este projeto');
      return;
    }

    setIsBusy(true);
    try {
      await callFactory({
        action: 'update_subscription',
        organization_id: organizationId,
        plan_code: subscriptionPlan.trim().toLowerCase(),
        status: subscriptionStatus.trim().toLowerCase(),
        provider: 'manual',
      });
      toast.success('Assinatura atualizada');
      await Promise.all([loadProjects(), loadProjectStatus(selectedProjectId)]);
    } catch (error) {
      console.error(error);
      const message = error instanceof Error ? error.message : 'Erro ao atualizar assinatura';
      toast.error(message);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Fábrica Autônoma de Escolas
          </CardTitle>
          <CardDescription>
            Plano mestre, grade, roteiro, vídeo, tutor, QA e publicação com governança operacional.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-3">
            <Input
              placeholder="Nome da escola (ex.: Escola Chef Pro)"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === 'create_zero' ? 'default' : 'outline'}
                onClick={() => setMode('create_zero')}
                className="flex-1"
              >
                Modo 1: Do Zero
              </Button>
              <Button
                type="button"
                variant={mode === 'takeover' ? 'default' : 'outline'}
                onClick={() => setMode('takeover')}
                className="flex-1"
              >
                Modo 2: Assumir Negócio
              </Button>
            </div>
            <Input
              placeholder="Nicho (ex.: culinária, inglês, programação)"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            />
            <Input
              placeholder="Organização SaaS (tenant) - ex.: Escola Chef Pro"
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="Slug da organização (opcional)"
                value={organizationSlug}
                onChange={(e) => setOrganizationSlug(e.target.value)}
              />
              <Input
                placeholder="Owner user_id (opcional)"
                value={ownerUserId}
                onChange={(e) => setOwnerUserId(e.target.value)}
              />
              <Input
                placeholder="Plano (starter|growth|scale)"
                value={planCode}
                onChange={(e) => setPlanCode(e.target.value)}
              />
            </div>
            <Input
              placeholder="Público-alvo"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
            />
            <Input
              type="number"
              placeholder="Capital inicial (USD)"
              value={initialCapital}
              onChange={(e) => setInitialCapital(e.target.value)}
            />
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Limite de orçamento (USD)"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
              />
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="QA mínimo (0-100)"
                value={qaMinScore}
                onChange={(e) => setQaMinScore(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <Input
                placeholder="Estratégia vídeo (cheapest|tavus_first|heygen_first)"
                value={videoProviderStrategy}
                onChange={(e) => setVideoProviderStrategy(e.target.value)}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Provedor preferido (heygen|tavus)"
                  value={videoPreferredProvider}
                  onChange={(e) => setVideoPreferredProvider(e.target.value)}
                />
                <Input
                  placeholder="Fallback (heygen|tavus)"
                  value={videoFallbackProvider}
                  onChange={(e) => setVideoFallbackProvider(e.target.value)}
                />
              </div>
              <Input
                placeholder="HEYGEN_AVATAR_ID (opcional por projeto)"
                value={heygenAvatarId}
                onChange={(e) => setHeygenAvatarId(e.target.value)}
              />
              <Input
                placeholder="HEYGEN_VOICE_ID (opcional por projeto)"
                value={heygenVoiceId}
                onChange={(e) => setHeygenVoiceId(e.target.value)}
              />
              <Input
                placeholder="TAVUS_REPLICA_ID (opcional por projeto)"
                value={tavusReplicaId}
                onChange={(e) => setTavusReplicaId(e.target.value)}
              />
            </div>
            <Textarea
              placeholder="Objetivo principal do negócio"
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <Textarea
              placeholder="Cole contexto de negócio e conteúdo base (texto)"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              rows={6}
            />
            <div className="space-y-1">
              <label className="text-sm font-medium">Upload de PDF (extração automática)</label>
              <Input
                type="file"
                accept="application/pdf"
                multiple
                onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  setPdfFiles(files);
                }}
              />
              {pdfFiles.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {pdfFiles.length} arquivo(s) selecionado(s): {pdfFiles.map((file) => file.name).join(', ')}
                </p>
              )}
            </div>
            <Button onClick={handleCreateProject} disabled={isBusy || !password}>
              {isBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Bot className="h-4 w-4 mr-2" />}
              Criar Projeto da Escola
            </Button>
            {!password && <p className="text-xs text-destructive">Faça login no painel admin para habilitar as ações.</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Projetos da Fábrica</CardTitle>
            <CardDescription>Selecione um projeto para executar os agentes</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadProjects} disabled={isLoadingProjects || isBusy}>
            {isLoadingProjects ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {projects.length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto criado ainda.</p>}
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setSelectedProjectId(project.id)}
              className={`w-full text-left rounded-lg border p-3 transition ${
                selectedProjectId === project.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{project.name}</p>
                <Badge variant={projectStatusVariant[project.status] || 'outline'}>{project.status}</Badge>
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <Badge variant="outline">pendentes: {project.metrics?.pending ?? 0}</Badge>
                <Badge variant="outline">rodando: {project.metrics?.running ?? 0}</Badge>
                <Badge variant="outline">ok: {project.metrics?.completed ?? 0}</Badge>
                <Badge variant="outline">bloqueadas: {project.metrics?.blocked ?? 0}</Badge>
                <Badge variant="outline">handoffs: {project.metrics?.handoffs_open ?? 0}</Badge>
                <Badge variant="outline">atrasadas: {project.sla?.overdue_tasks ?? 0}</Badge>
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <CardTitle>{selectedProject.name}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-4">
              <span className="flex items-center gap-1.5">
                <CircleDollarSign className="h-4 w-4" />
                Capital inicial: {selectedProject.initial_capital ? `$${selectedProject.initial_capital}` : 'não informado'}
              </span>
              <span className="flex items-center gap-1.5">
                <Bot className="h-4 w-4" />
                Tenant: {statusData?.saas?.organization?.name || selectedProject.organization?.name || 'não definido'}
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4" />
                QA mínimo: {selectedProject.qa_min_score ?? 75}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleAction('generate_master_plan')} disabled={isBusy}>
                <Bot className="h-4 w-4 mr-2" />
                Gerar Plano Mestre
              </Button>
              <Button variant="outline" onClick={() => handleAction('enqueue_pipeline')} disabled={isBusy}>
                <PlayCircle className="h-4 w-4 mr-2" />
                Criar Pipeline
              </Button>
              <Button variant="outline" onClick={() => handleAction('run_next_task')} disabled={isBusy}>
                <Bot className="h-4 w-4 mr-2" />
                Rodar Próxima Tarefa
              </Button>
              <Button variant="outline" onClick={() => handleAction('sync_video_status', { max_tasks: 20 })} disabled={isBusy}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar Vídeos
              </Button>
              <Button variant="outline" onClick={() => handleAction('run_cron', { max_tasks: 5 })} disabled={isBusy}>
                <Clock3 className="h-4 w-4 mr-2" />
                Runner Automático (5)
              </Button>
              <Button variant="outline" onClick={() => handleAction('publish_project')} disabled={isBusy}>
                <ShieldCheck className="h-4 w-4 mr-2" />
                Publicar Projeto
              </Button>
              <Button variant="ghost" onClick={() => loadProjectStatus(selectedProject.id)} disabled={isBusy}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Atualizar Status
              </Button>
            </div>

            {statusData?.project?.master_plan && (
              <div className="rounded-lg border p-3 bg-muted/30">
                <p className="font-medium mb-1">Resumo do plano mestre</p>
                <p className="text-sm text-muted-foreground">
                  {statusData.project.master_plan?.executive_summary || 'Plano gerado sem resumo textual'}
                </p>
              </div>
            )}

            {statusData?.costs && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">Controle de Custo (hard stop)</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                  <span>Limite: ${statusData.costs.budget_limit_usd.toFixed(2)}</span>
                  <span>Gasto: ${statusData.costs.budget_spent_usd.toFixed(2)}</span>
                  <span>Saldo: ${statusData.costs.budget_remaining_usd.toFixed(2)}</span>
                </div>
              </div>
            )}

            {statusData?.saas && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">SaaS Tenant + Billing</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <span>Organização: {statusData.saas.organization.name}</span>
                  <span>Slug: {statusData.saas.organization.slug}</span>
                  <span>Assinatura: {statusData.saas.subscription.status}</span>
                  <span>Plano: {statusData.saas.plan.plan_name} ({statusData.saas.plan.plan_code})</span>
                  <span>Limite mensal SaaS: ${Number(statusData.saas.plan.monthly_spend_limit_usd || 0).toFixed(2)}</span>
                  <span>Gasto mensal SaaS: ${Number(statusData.saas.usage.spend_usd || 0).toFixed(2)}</span>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-1 md:grid-cols-4 gap-2">
                  <span>Projetos restantes: {statusData.saas.limits.remaining_projects}</span>
                  <span>Tarefas restantes: {statusData.saas.limits.remaining_tasks}</span>
                  <span>Vídeos restantes: {statusData.saas.limits.remaining_videos}</span>
                  <span>Saldo mensal SaaS: ${Number(statusData.saas.limits.remaining_spend_usd || 0).toFixed(2)}</span>
                </div>
                <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    placeholder="Plano (starter|growth|scale)"
                    value={subscriptionPlan}
                    onChange={(e) => setSubscriptionPlan(e.target.value)}
                  />
                  <Input
                    placeholder="Status (trialing|active|past_due|paused|canceled)"
                    value={subscriptionStatus}
                    onChange={(e) => setSubscriptionStatus(e.target.value)}
                  />
                  <Button variant="outline" onClick={updateSubscription} disabled={isBusy}>
                    Atualizar assinatura
                  </Button>
                </div>
              </div>
            )}

            {statusData?.domain_store && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">Backend de Domínio</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2">
                  <span>Modo: {statusData.domain_store.mode}</span>
                  <span>Mongo habilitado: {statusData.domain_store.mongo_enabled ? 'sim' : 'não'}</span>
                  <span>Mongo configurado: {statusData.domain_store.mongo_configured ? 'sim' : 'não'}</span>
                </div>
              </div>
            )}

            {statusData?.sla && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">Painel Operacional (SLA)</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2 mb-3">
                  <span>Tarefas atrasadas: {statusData.sla.overdue_tasks}</span>
                  <span>Handoffs vencidos: {statusData.sla.overdue_handoffs}</span>
                  <span>Métricas por agente: {statusData.sla.avg_execution_by_agent.length}</span>
                </div>
                <div className="space-y-1">
                  {statusData.sla.avg_execution_by_agent.map((agentRow) => (
                    <p key={agentRow.agent} className="text-xs text-muted-foreground">
                      {agentRow.agent}: média {agentRow.avg_minutes} min ({agentRow.completed_tasks} tarefas)
                    </p>
                  ))}
                </div>
              </div>
            )}

            {statusData?.video_compliance && (
              <div className="rounded-lg border p-3">
                <p className="font-medium mb-2">Compliance de Vídeo (máx. 4 min)</p>
                <div className="text-sm grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
                  <span>Prontos: {statusData.video_compliance.ready}/{statusData.video_compliance.total}</span>
                  <span>Pendentes: {statusData.video_compliance.pending}</span>
                  <span>Falhas: {statusData.video_compliance.failed}</span>
                  <span>Acima do limite: {statusData.video_compliance.over_limit}</span>
                  <span>Duração não verificada: {statusData.video_compliance.unverified_duration}</span>
                </div>
                {statusData.video_compliance.blockers.length > 0 && (
                  <div className="space-y-1">
                    {statusData.video_compliance.blockers.slice(0, 6).map((item) => (
                      <p key={item} className="text-xs text-destructive">{item}</p>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="rounded-lg border p-3">
              <p className="font-medium mb-2">Tarefas do pipeline</p>
              <div className="space-y-2 max-h-80 overflow-auto pr-1">
                {(statusData?.tasks || []).map((task) => (
                  <div key={task.id} className="flex items-start justify-between gap-3 rounded-md border p-2">
                    <div>
                      <p className="text-sm font-medium">{task.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {task.task_type} • agente: {task.assigned_agent}
                      </p>
                    </div>
                    <Badge variant={task.status === 'completed' ? 'default' : task.status === 'blocked' ? 'destructive' : 'outline'}>
                      {task.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-medium mb-2">Versionamento do Tutor Pack</p>
              {(statusData?.tutor_pack_versions || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Ainda sem versões registradas.</p>
              ) : (
                <div className="space-y-2">
                  {statusData.tutor_pack_versions.map((version) => (
                    <div key={version.version} className="flex items-center justify-between rounded-md border p-2">
                      <div className="text-sm">
                        <p className="font-medium">Versão {version.version}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(version.created_at).toLocaleString()} {version.notes ? `• ${version.notes}` : ''}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAction('rollback_tutor_pack', { version: version.version })}
                        disabled={isBusy}
                      >
                        Reverter
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-lg border p-3">
              <p className="font-medium mb-2 flex items-center gap-2">
                <UserRoundCheck className="h-4 w-4" />
                Handoffs humanos em aberto
              </p>
              {(statusData?.handoffs_open || []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhum handoff humano aberto.</p>
              ) : (
                <div className="space-y-3">
                  {statusData.handoffs_open.map((handoff) => (
                    <div key={handoff.id} className="rounded-md border p-3 bg-muted/20 space-y-2">
                      <p className="font-medium text-sm">{handoff.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {handoff.assignee_name} • WhatsApp: {handoff.assignee_whatsapp} • {handoff.assignee_email}
                      </p>
                      <p className="text-xs">{handoff.handoff_summary || 'Sem resumo'}</p>
                      <div className="text-xs text-muted-foreground">
                        <p>Última resposta: {handoff.last_response || 'Sem retorno ainda'}</p>
                        <p>Próxima cobrança: {handoff.next_follow_up_at ? new Date(handoff.next_follow_up_at).toLocaleString() : 'Não definida'}</p>
                      </div>
                      <Textarea
                        rows={2}
                        placeholder="Registrar última resposta do humano"
                        value={handoffResponses[handoff.id] || ''}
                        onChange={(e) => setHandoffResponses((prev) => ({ ...prev, [handoff.id]: e.target.value }))}
                      />
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min={1}
                          value={nextFollowUpHours[handoff.id] || '8'}
                          onChange={(e) => setNextFollowUpHours((prev) => ({ ...prev, [handoff.id]: e.target.value }))}
                          placeholder="Horas para próxima cobrança"
                        />
                        <Button onClick={() => updateHandoff(handoff.id)} disabled={isBusy}>
                          Atualizar cobrança
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
