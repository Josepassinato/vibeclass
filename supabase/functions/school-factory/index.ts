import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

const ADMIN_PASSWORD = String(Deno.env.get("ADMIN_PASSWORD") || "").trim();
const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
const HEYGEN_AVATAR_ID = Deno.env.get("HEYGEN_AVATAR_ID") || "";
const HEYGEN_VOICE_ID = Deno.env.get("HEYGEN_VOICE_ID") || "";
const TAVUS_API_KEY = Deno.env.get("TAVUS_API_KEY");
const TAVUS_REPLICA_ID = Deno.env.get("TAVUS_REPLICA_ID") || "";
const TAVUS_BASE_URL = Deno.env.get("TAVUS_BASE_URL") || "https://tavusapi.com/v2";
const DOMAIN_DATA_BACKEND = String(Deno.env.get("DOMAIN_DATA_BACKEND") || "supabase").trim().toLowerCase();
const MONGO_DATA_API_BASE_URL = Deno.env.get("MONGO_DATA_API_BASE_URL") || "";
const MONGO_DATA_API_KEY = Deno.env.get("MONGO_DATA_API_KEY") || "";
const MONGO_DATA_SOURCE = Deno.env.get("MONGO_DATA_SOURCE") || "";
const MONGO_DATA_DATABASE = Deno.env.get("MONGO_DATA_DATABASE") || "";
const MONGO_PROJECTS_COLLECTION = Deno.env.get("MONGO_PROJECTS_COLLECTION") || "school_factory_projects";
const MONGO_TASKS_COLLECTION = Deno.env.get("MONGO_TASKS_COLLECTION") || "school_factory_tasks";
const MONGO_MIRROR_TIMEOUT_MS = Math.max(
  1500,
  Math.min(15000, Math.round(Number(Deno.env.get("MONGO_MIRROR_TIMEOUT_MS") || "5000"))),
);

const HUMAN_DEFAULT = {
  name: Deno.env.get("HUMAN_OPERATOR_NAME") || "Kaue",
  whatsapp: Deno.env.get("HUMAN_OPERATOR_WHATSAPP") || "+1 954 643 0749",
  email: Deno.env.get("HUMAN_OPERATOR_EMAIL") || "rejaskaue@gmail.com",
};

const DEFAULT_QA_MIN_SCORE = 75;
const DEFAULT_BUDGET_RATIO = 0.35;
const DEFAULT_BUDGET_LIMIT = 300;

const TASK_COSTS: Record<string, number> = {
  generate_master_plan: 0.08,
  script_generation: 0.05,
  tutor_training: 0.04,
  qa_review: 0.04,
  video_generation: 1.2,
};

const CRITICAL_TASK_TYPES = ["script_generation", "video_generation", "tutor_training", "qa_review"];

type JsonObject = Record<string, unknown>;
type VideoProvider = "tavus" | "heygen";

const ENV_VIDEO_COST_HEYGEN = Number(Deno.env.get("VIDEO_COST_HEYGEN_USD") || "1.2");
const ENV_VIDEO_COST_TAVUS = Number(Deno.env.get("VIDEO_COST_TAVUS_USD") || "0.9");
const VIDEO_PROVIDER_COSTS: Record<VideoProvider, number> = {
  heygen: Number.isFinite(ENV_VIDEO_COST_HEYGEN) && ENV_VIDEO_COST_HEYGEN > 0 ? ENV_VIDEO_COST_HEYGEN : 1.2,
  tavus: Number.isFinite(ENV_VIDEO_COST_TAVUS) && ENV_VIDEO_COST_TAVUS > 0 ? ENV_VIDEO_COST_TAVUS : 0.9,
};
const MAX_VIDEO_MINUTES = 4;
const MIN_VIDEO_MINUTES = 1;
const WORDS_PER_MINUTE_LIMIT = 120;

const CONTENT_BLOCK_PATTERNS: Array<{ label: string; regex: RegExp }> = [
  { label: "sexual_explicito", regex: /\b(porn|pornografia|xxx|onlyfans|nude|nudes|sexo explicito|erotico|erotica|orgi|fetiche)\b/i },
  { label: "abuso_infantil", regex: /\b(pedofil|sexualiza(?:r|cao)? menor|child sexual|csam)\b/i },
  { label: "violencia_grafica", regex: /\b(gore|decapita|tortura|massacre|snuff|estupro|rape)\b/i },
  { label: "odio_extremismo", regex: /\b(supremac|neonazi|nazismo|genocid|odio racial|hate crime)\b/i },
  { label: "drogas_ilicitas", regex: /\b(cocaina|heroina|metanfetamina|crack|fentanil|trafico de drogas)\b/i },
  { label: "autolesao", regex: /\b(auto ?mutila|suicid|self harm)\b/i },
];

const VIDEO_PENDING_STATUSES = ["pending", "queued", "processing", "rendering", "in_progress", "started", "created"];
const VIDEO_COMPLETED_STATUSES = ["completed", "done", "ready", "success", "finished"];
const VIDEO_FAILED_STATUSES = ["failed", "error", "rejected", "canceled", "cancelled", "blocked"];

type ProjectStatus =
  | "draft"
  | "planning"
  | "ready_for_approval"
  | "in_production"
  | "ready_to_publish"
  | "published"
  | "blocked"
  | "failed";

type TaskStatus = "pending" | "running" | "completed" | "blocked" | "failed";

interface FactoryProject {
  id: string;
  name: string;
  mode: "create_zero" | "takeover";
  status: ProjectStatus;
  initial_capital: number | null;
  niche: string | null;
  target_audience: string | null;
  objective: string | null;
  business_context: JsonObject;
  master_plan: JsonObject | null;
  tutor_pack: JsonObject | null;
  qa_report: JsonObject | null;
  budget_limit_usd: number | null;
  budget_spent_usd: number | null;
  budget_hard_stop: boolean | null;
  qa_min_score: number | null;
  video_config: JsonObject | null;
  published_at: string | null;
}

interface FactoryTask {
  id: string;
  project_id: string;
  task_type: string;
  status: TaskStatus;
  priority: number;
  assigned_agent: string;
  lesson_key: string | null;
  title: string;
  input: JsonObject;
  output: JsonObject;
  error_message: string | null;
  retry_count: number;
  started_at: string | null;
  completed_at: string | null;
  due_at: string | null;
  next_follow_up_at: string | null;
  assignee_name: string | null;
  assignee_whatsapp: string | null;
  assignee_email: string | null;
  handoff_summary: string | null;
  last_response: string | null;
  cost_estimate_usd: number | null;
}

interface FactoryDocumentInput {
  source_type?: string;
  title?: string;
  source_url?: string | null;
  content?: string | null;
  metadata?: JsonObject;
}

interface TaskRunSummary {
  task: FactoryTask | null;
  message: string;
  project_status?: ProjectStatus;
}

interface VideoProviderStatus {
  provider: VideoProvider;
  provider_video_id: string;
  state: "pending" | "completed" | "failed";
  status_raw: string;
  asset_url: string | null;
  download_url: string | null;
  duration_seconds: number | null;
  payload: JsonObject;
}

const nowIso = () => new Date().toISOString();

const toJsonResponse = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const toNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const normalizeProjectMode = (value: unknown): "create_zero" | "takeover" => {
  const normalized = String(value || "").trim().toLowerCase();
  if (
    normalized === "takeover" ||
    normalized === "existing_business" ||
    normalized === "assume_existing" ||
    normalized === "gestao_existente" ||
    normalized === "modo2"
  ) {
    return "takeover";
  }
  return "create_zero";
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const message = candidate.message;
    const details = candidate.details;
    if (typeof message === "string" && message.trim().length > 0) return message;
    if (typeof details === "string" && details.trim().length > 0) return details;
  }
  return "Erro desconhecido";
};

const getErrorStatus = (error: unknown) => {
  if (error && typeof error === "object") {
    const candidate = error as Record<string, unknown>;
    const statusRaw = candidate.status ?? candidate.statusCode;
    const status = Number(statusRaw);
    if (Number.isInteger(status) && status >= 400 && status <= 599) return status;
    const code = String(candidate.code || "");
    if (code.startsWith("22") || code.startsWith("23")) return 400;
  }
  return 500;
};

const asObject = (value: unknown): JsonObject => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as JsonObject;
  }
  return {};
};

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

const truncate = (value: string, max: number) => (value.length > max ? `${value.slice(0, max)}...` : value);

const isMongoMirrorEnabled = () => DOMAIN_DATA_BACKEND === "hybrid" || DOMAIN_DATA_BACKEND === "mongo";

const isMongoMirrorConfigured = () =>
  Boolean(MONGO_DATA_API_BASE_URL && MONGO_DATA_API_KEY && MONGO_DATA_SOURCE && MONGO_DATA_DATABASE);

const sanitizeMongoDoc = (value: unknown): JsonObject => {
  try {
    return JSON.parse(JSON.stringify(value || {})) as JsonObject;
  } catch {
    return {};
  }
};

const callMongoDataApi = async (action: string, body: JsonObject) => {
  const endpoint = MONGO_DATA_API_BASE_URL.replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), MONGO_MIRROR_TIMEOUT_MS);
  try {
    const response = await fetch(`${endpoint}/action/${action}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": MONGO_DATA_API_KEY,
      },
      body: JSON.stringify({
        dataSource: MONGO_DATA_SOURCE,
        database: MONGO_DATA_DATABASE,
        ...body,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mongo Data API ${action} falhou (${response.status}): ${truncate(errorText, 200)}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
};

const mirrorDocumentToMongo = async (
  collection: string,
  id: string,
  payload: JsonObject,
) => {
  if (!isMongoMirrorEnabled()) return;
  if (!isMongoMirrorConfigured()) return;
  const doc = {
    _id: id,
    ...sanitizeMongoDoc(payload),
    mirrored_at: nowIso(),
  };
  try {
    await callMongoDataApi("updateOne", {
      collection,
      filter: { _id: id },
      update: { $set: doc },
      upsert: true,
    });
  } catch (error) {
    console.warn("[school-factory] Mongo mirror warning:", error instanceof Error ? error.message : error);
  }
};

const mirrorProjectToMongo = async (project: unknown) => {
  const payload = asObject(project);
  const projectId = String(payload.id || "").trim();
  if (!projectId) return;
  await mirrorDocumentToMongo(MONGO_PROJECTS_COLLECTION, projectId, payload);
};

const mirrorTaskToMongo = async (task: unknown) => {
  const payload = asObject(task);
  const taskId = String(payload.id || "").trim();
  if (!taskId) return;
  await mirrorDocumentToMongo(MONGO_TASKS_COLLECTION, taskId, payload);
};

const getDomainStoreInfo = () => ({
  mode: isMongoMirrorEnabled() ? DOMAIN_DATA_BACKEND : "supabase",
  mongo_enabled: isMongoMirrorEnabled(),
  mongo_configured: isMongoMirrorConfigured(),
  mongo_collections: {
    projects: MONGO_PROJECTS_COLLECTION,
    tasks: MONGO_TASKS_COLLECTION,
  },
});

const normalizeSafetyText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const detectUnsafeContent = (parts: Array<unknown>) => {
  const raw = parts
    .map((part) => String(part || ""))
    .join("\n")
    .trim();
  if (!raw) return { flagged: false, labels: [] as string[] };
  const normalized = normalizeSafetyText(raw);
  const labels = CONTENT_BLOCK_PATTERNS
    .filter((rule) => rule.regex.test(normalized))
    .map((rule) => rule.label);
  return { flagged: labels.length > 0, labels };
};

const clampVideoDurationMinutes = (value: unknown) => {
  const parsed = Math.round(toNumber(value, MAX_VIDEO_MINUTES));
  if (!Number.isFinite(parsed)) return MAX_VIDEO_MINUTES;
  return Math.min(MAX_VIDEO_MINUTES, Math.max(MIN_VIDEO_MINUTES, parsed));
};

const countWords = (value: string) => {
  if (!value.trim()) return 0;
  return value.trim().split(/\s+/).filter(Boolean).length;
};

const limitTextToWords = (value: string, maxWords: number) => {
  const safeMax = Math.max(1, Math.floor(maxWords));
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length <= safeMax) return { text: value.trim(), truncated: false, words: words.length };
  return {
    text: words.slice(0, safeMax).join(" "),
    truncated: true,
    words: safeMax,
  };
};

const enforceNarrationDuration = (narration: string, durationMinutes: number) => {
  const maxWords = clampVideoDurationMinutes(durationMinutes) * WORDS_PER_MINUTE_LIMIT;
  const trimmed = limitTextToWords(narration, maxWords);
  return {
    narration: trimmed.text,
    truncated: trimmed.truncated,
    words: trimmed.words,
    max_words: maxWords,
  };
};

const normalizeScenesDuration = (scenesRaw: JsonObject[], maxSeconds: number) => {
  if (!scenesRaw.length) return [];
  const safeMaxSeconds = Math.max(30, Math.floor(maxSeconds));
  const fallbackPerScene = Math.max(8, Math.floor(safeMaxSeconds / scenesRaw.length));

  const normalized = scenesRaw.map((scene, index) => {
    const data = asObject(scene);
    return {
      ...data,
      order: index + 1,
      duration_seconds: Math.max(6, Math.round(toNumber(data.duration_seconds, fallbackPerScene))),
    };
  });

  const total = normalized.reduce((acc, scene) => acc + toNumber(scene.duration_seconds, 0), 0);
  if (total <= safeMaxSeconds) return normalized;

  const factor = safeMaxSeconds / Math.max(total, 1);
  return normalized.map((scene) => ({
    ...scene,
    duration_seconds: Math.max(5, Math.floor(toNumber(scene.duration_seconds, 0) * factor)),
  }));
};

const resolveProviderState = (
  rawStatus: unknown,
  hasAssetUrl = false,
): "pending" | "completed" | "failed" => {
  const normalized = String(rawStatus || "").trim().toLowerCase();
  if (!normalized) return hasAssetUrl ? "completed" : "pending";
  if (VIDEO_FAILED_STATUSES.some((token) => normalized.includes(token))) return "failed";
  if (VIDEO_COMPLETED_STATUSES.some((token) => normalized.includes(token))) return "completed";
  if (VIDEO_PENDING_STATUSES.some((token) => normalized.includes(token))) return "pending";
  return hasAssetUrl ? "completed" : "pending";
};

const pickFirstString = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = String(value || "").trim();
    if (parsed) return parsed;
  }
  return "";
};

const resolveDurationSeconds = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = toNumber(value, -1);
    if (!Number.isFinite(parsed) || parsed <= 0) continue;
    // Alguns provedores retornam milissegundos
    if (parsed > 2400) return Math.round(parsed / 1000);
    return Math.round(parsed);
  }
  return null;
};

const maxVideoSeconds = () => MAX_VIDEO_MINUTES * 60;

const evaluateVideoCompliance = (tasks: FactoryTask[]) => {
  const videoTasks = tasks.filter((task) => task.task_type === "video_generation");
  let ready = 0;
  let pending = 0;
  let failed = 0;
  let overLimit = 0;
  let unverified = 0;
  const blockers: string[] = [];

  for (const task of videoTasks) {
    const output = asObject(task.output);
    const duration = toNumber(output.duration_seconds, 0);
    const statusRaw = String(output.provider_status || "");
    const providerState = resolveProviderState(statusRaw, Boolean(output.provider_asset_url));

    if (task.status === "failed" || providerState === "failed") {
      failed += 1;
      blockers.push(`Vídeo falhou: ${task.title}`);
      continue;
    }

    if (task.status !== "completed") {
      pending += 1;
      blockers.push(`Vídeo não finalizado: ${task.title}`);
      continue;
    }

    if (duration <= 0) {
      unverified += 1;
      blockers.push(`Duração não verificada: ${task.title}`);
      continue;
    }

    if (duration > maxVideoSeconds()) {
      overLimit += 1;
      blockers.push(`Vídeo acima de ${MAX_VIDEO_MINUTES} min: ${task.title}`);
      continue;
    }

    ready += 1;
  }

  if (videoTasks.length === 0) {
    blockers.push("Nenhum vídeo foi gerado para validação.");
  }

  return {
    total: videoTasks.length,
    ready,
    pending,
    failed,
    over_limit: overLimit,
    unverified_duration: unverified,
    blockers,
  };
};

const parseJsonFromText = (content: string): JsonObject | null => {
  if (!content || !content.trim()) return null;
  try {
    return JSON.parse(content) as JsonObject;
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as JsonObject;
    } catch {
      return null;
    }
  }
};

const buildDocumentContext = (docs: Array<JsonObject>) => {
  if (!docs.length) return "Nenhum documento de referência enviado.";
  return docs
    .map((doc, index) => {
      const title = String(doc.title || `Documento ${index + 1}`);
      const content = String(doc.content || "");
      return `## ${title}\n${truncate(content, 4000)}`;
    })
    .join("\n\n");
};

const resolveBudgetLimit = (projectInput: JsonObject) => {
  const explicitLimit = toNumber(projectInput.budget_limit_usd, -1);
  if (explicitLimit >= 0) return explicitLimit;
  const initialCapital = toNumber(projectInput.initial_capital ?? projectInput.initial_capital_usd, 0);
  if (initialCapital > 0) {
    return Number((initialCapital * DEFAULT_BUDGET_RATIO).toFixed(2));
  }
  return DEFAULT_BUDGET_LIMIT;
};

const callGrokJson = async (
  systemPrompt: string,
  userPrompt: string,
  fallback: JsonObject,
) => {
  if (!XAI_API_KEY) {
    return { data: fallback, raw: "XAI_API_KEY not configured; using fallback" };
  }

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${XAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 2400,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("[school-factory] Grok error:", response.status, text);
    return { data: fallback, raw: text };
  }

  const ai = await response.json();
  const content = String(ai?.choices?.[0]?.message?.content || "");
  const parsed = parseJsonFromText(content);
  return { data: parsed || fallback, raw: content };
};

const fetchProject = async (supabase: ReturnType<typeof createClient>, projectId: string) => {
  const { data, error } = await supabase
    .from("school_factory_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (error) throw error;
  return data as FactoryProject;
};

const fetchTaskById = async (supabase: ReturnType<typeof createClient>, taskId: string) => {
  const { data, error } = await supabase
    .from("school_factory_tasks")
    .select("*")
    .eq("id", taskId)
    .single();
  if (error) throw error;
  return data as FactoryTask;
};

const updateProjectAndMirror = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  updates: JsonObject,
) => {
  const { data, error } = await supabase
    .from("school_factory_projects")
    .update(updates)
    .eq("id", projectId)
    .select("*")
    .single();
  if (error) throw error;
  await mirrorProjectToMongo(data);
  return data as FactoryProject;
};

const updateTaskAndMirror = async (
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  updates: JsonObject,
) => {
  const { data, error } = await supabase
    .from("school_factory_tasks")
    .update(updates)
    .eq("id", taskId)
    .select("*")
    .single();
  if (error) throw error;
  await mirrorTaskToMongo(data);
  return data as FactoryTask;
};

const fetchNextPendingTask = async (supabase: ReturnType<typeof createClient>, projectId: string) => {
  const { data, error } = await supabase
    .from("school_factory_tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true })
    .limit(1);

  if (error) throw error;
  return (data?.[0] as FactoryTask | undefined) || null;
};

const createHumanHandoffTask = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  title: string,
  summary: string,
  lessonKey?: string | null,
) => {
  const { data: existing, error: existingError } = await supabase
    .from("school_factory_tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("task_type", "human_handoff")
    .eq("status", "blocked")
    .eq("title", title)
    .limit(1);

  if (existingError) throw existingError;
  if (existing && existing.length > 0) {
    await mirrorTaskToMongo(existing[0]);
    return existing[0];
  }

  const nextFollowUp = new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from("school_factory_tasks")
    .insert({
      project_id: projectId,
      task_type: "human_handoff",
      status: "blocked",
      priority: 15,
      assigned_agent: "operations-agent",
      lesson_key: lessonKey || null,
      title,
      handoff_summary: summary,
      assignee_name: HUMAN_DEFAULT.name,
      assignee_whatsapp: HUMAN_DEFAULT.whatsapp,
      assignee_email: HUMAN_DEFAULT.email,
      next_follow_up_at: nextFollowUp,
      input: { channel: "human", assignee: HUMAN_DEFAULT },
      output: {},
      error_message: "Aguardando execução humana",
      due_at: nextFollowUp,
      sla_minutes: 8 * 60,
    })
    .select()
    .single();

  if (error) throw error;
  await mirrorTaskToMongo(data);
  return data;
};

const registerCost = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  taskId: string | null,
  provider: string,
  amountUsd: number,
  metadata: JsonObject = {},
) => {
  if (amountUsd <= 0) return;
  const project = await fetchProject(supabase, projectId);
  const newSpent = Number((toNumber(project.budget_spent_usd, 0) + amountUsd).toFixed(4));

  await updateProjectAndMirror(supabase, projectId, { budget_spent_usd: newSpent });

  const { error: costError } = await supabase
    .from("school_factory_cost_events")
    .insert({
      project_id: projectId,
      task_id: taskId,
      provider,
      amount_usd: Number(amountUsd.toFixed(4)),
      metadata,
    });
  if (costError) throw costError;
};

const budgetAllows = (
  project: FactoryProject,
  additionalCost: number,
) => {
  const limit = toNumber(project.budget_limit_usd, 0);
  const spent = toNumber(project.budget_spent_usd, 0);
  const hardStop = Boolean(project.budget_hard_stop ?? true);

  if (!hardStop || limit <= 0) {
    return { allowed: true, projected: spent + additionalCost, limit, spent };
  }

  const projected = spent + additionalCost;
  return { allowed: projected <= limit, projected, limit, spent };
};

const blockTaskWithBudgetReason = async (
  supabase: ReturnType<typeof createClient>,
  project: FactoryProject,
  task: FactoryTask,
  additionalCost: number,
) => {
  const budget = budgetAllows(project, additionalCost);
  const reason = `Orçamento excedido: gasto atual $${budget.spent.toFixed(2)}, tentativa +$${additionalCost.toFixed(2)}, limite $${budget.limit.toFixed(2)}.`;
  await updateTaskAndMirror(supabase, task.id, {
    status: "blocked",
    error_message: reason,
    output: { ...(task.output || {}), budget_guardrail: budget },
  });

  const context = asObject(project.business_context);
  await updateProjectAndMirror(supabase, project.id, {
    status: "blocked",
    business_context: {
      ...context,
      budget_stop_reason: reason,
      budget_stop_at: nowIso(),
    },
  });
};

const ensureCostBudget = async (
  supabase: ReturnType<typeof createClient>,
  project: FactoryProject,
  task: FactoryTask,
  actionKey: string,
) => {
  const cost = TASK_COSTS[actionKey] || 0;
  const budget = budgetAllows(project, cost);
  if (!budget.allowed) {
    await blockTaskWithBudgetReason(supabase, project, task, cost);
    return { ok: false, cost };
  }
  return { ok: true, cost };
};

const completeTask = async (
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  output: JsonObject,
) => {
  await updateTaskAndMirror(supabase, taskId, {
    status: "completed",
    output,
    completed_at: nowIso(),
    error_message: null,
  });
};

const blockTask = async (
  supabase: ReturnType<typeof createClient>,
  taskId: string,
  reason: string,
  output: JsonObject = {},
) => {
  await updateTaskAndMirror(supabase, taskId, {
    status: "blocked",
    output,
    error_message: reason,
  });
};

const failTask = async (
  supabase: ReturnType<typeof createClient>,
  task: FactoryTask,
  reason: string,
) => {
  await updateTaskAndMirror(supabase, task.id, {
    status: "failed",
    error_message: reason,
    retry_count: (task.retry_count || 0) + 1,
  });
};

const taskDueIso = (minutesFromNow: number) =>
  new Date(Date.now() + minutesFromNow * 60 * 1000).toISOString();

const hasBlockedCriticalTasks = (tasks: FactoryTask[]) =>
  tasks.some((task) => CRITICAL_TASK_TYPES.includes(task.task_type) && (task.status === "blocked" || task.status === "failed"));

const parseVideoProvider = (value: unknown): VideoProvider | null => {
  const normalized = String(value || "").trim().toLowerCase();
  if (normalized === "tavus" || normalized === "heygen") return normalized;
  return null;
};

const getVideoProviderCost = (provider: VideoProvider) => VIDEO_PROVIDER_COSTS[provider] || TASK_COSTS.video_generation;

const resolveVideoProviderOrder = (projectVideoConfig: JsonObject): VideoProvider[] => {
  const strategy = String(projectVideoConfig.provider_strategy || "cheapest").trim().toLowerCase();
  const preferred = parseVideoProvider(projectVideoConfig.preferred_provider);
  const fallback = parseVideoProvider(projectVideoConfig.fallback_provider);

  let ordered: VideoProvider[];
  if (strategy === "tavus_first") {
    ordered = ["tavus", "heygen"];
  } else if (strategy === "heygen_first") {
    ordered = ["heygen", "tavus"];
  } else {
    ordered = (["tavus", "heygen"] as VideoProvider[]).sort(
      (a, b) => getVideoProviderCost(a) - getVideoProviderCost(b),
    );
  }

  if (preferred) {
    ordered = [preferred, ...ordered.filter((provider) => provider !== preferred)];
  }

  if (fallback) {
    ordered = [...ordered.filter((provider) => provider !== fallback), fallback];
  }

  return ordered.filter((provider, index, arr) => arr.indexOf(provider) === index);
};

const requestHeygenVideo = async (
  narration: string,
  taskTitle: string,
  projectVideoConfig: JsonObject,
) => {
  const avatarId = String(projectVideoConfig.heygen_avatar_id || HEYGEN_AVATAR_ID || "");
  const voiceId = String(projectVideoConfig.heygen_voice_id || HEYGEN_VOICE_ID || "");
  if (!HEYGEN_API_KEY || !avatarId || !voiceId) {
    throw new Error("HEYGEN_API_KEY / HEYGEN_AVATAR_ID / HEYGEN_VOICE_ID não configurados");
  }

  const payload = {
    video_inputs: [
      {
        character: { type: "avatar", avatar_id: avatarId },
        voice: {
          type: "text",
          input_text: truncate(narration, 4500),
          voice_id: voiceId,
        },
      },
    ],
    dimension: { width: 1280, height: 720 },
    title: taskTitle,
  };

  const response = await fetch("https://api.heygen.com/v2/video/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Api-Key": HEYGEN_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen falhou (${response.status}): ${truncate(errorText, 500)}`);
  }

  const data = await response.json();
  const providerVideoId = String(data?.data?.video_id || data?.video_id || "");
  return {
    provider: "heygen" as const,
    provider_video_id: providerVideoId || null,
    provider_status: "pending",
    request_payload: payload,
    provider_raw: {
      video_id: providerVideoId || null,
    },
  };
};

const requestTavusVideo = async (
  narration: string,
  taskTitle: string,
  projectVideoConfig: JsonObject,
) => {
  const replicaId = String(projectVideoConfig.tavus_replica_id || TAVUS_REPLICA_ID || "");
  if (!TAVUS_API_KEY || !replicaId) {
    throw new Error("TAVUS_API_KEY / TAVUS_REPLICA_ID não configurados");
  }

  const payload: JsonObject = {
    replica_id: replicaId,
    script: truncate(narration, 4500),
    video_name: truncate(taskTitle, 100),
    fast: Boolean(projectVideoConfig.tavus_fast ?? true),
  };

  const backgroundUrl = String(projectVideoConfig.tavus_background_url || "");
  if (backgroundUrl) {
    payload.background_url = backgroundUrl;
  }

  const response = await fetch(`${TAVUS_BASE_URL}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": TAVUS_API_KEY,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavus falhou (${response.status}): ${truncate(errorText, 500)}`);
  }

  const data = await response.json();
  const providerVideoId = String(data?.video_id || data?.id || data?.data?.video_id || "");
  const hostedUrl = String(data?.hosted_url || data?.url || data?.data?.hosted_url || "");
  const status = String(data?.status || data?.data?.status || "queued");
  if (!providerVideoId && !hostedUrl) {
    throw new Error("Tavus retornou sucesso sem video_id/hosted_url");
  }

  return {
    provider: "tavus" as const,
    provider_video_id: providerVideoId || null,
    provider_status: status,
    provider_asset_url: hostedUrl || null,
    request_payload: payload,
    provider_raw: {
      video_id: providerVideoId || null,
      hosted_url: hostedUrl || null,
      status,
    },
  };
};

const fetchHeygenVideoStatus = async (providerVideoId: string): Promise<VideoProviderStatus> => {
  if (!HEYGEN_API_KEY) throw new Error("HEYGEN_API_KEY não configurada");
  if (!providerVideoId) throw new Error("provider_video_id do HeyGen ausente");

  const response = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${encodeURIComponent(providerVideoId)}`, {
    method: "GET",
    headers: {
      "X-Api-Key": HEYGEN_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`HeyGen status falhou (${response.status}): ${truncate(errorText, 500)}`);
  }

  const payload = await response.json();
  const data = asObject(payload?.data || payload);
  const statusRaw = pickFirstString(data.status, payload?.status, "pending");
  const assetUrl = pickFirstString(
    data.video_url,
    data.url,
    data.download_url,
    payload?.video_url,
    payload?.url,
  );
  const durationSeconds = resolveDurationSeconds(
    data.duration_seconds,
    data.duration,
    payload?.duration_seconds,
    payload?.duration,
  );

  return {
    provider: "heygen",
    provider_video_id: providerVideoId,
    state: resolveProviderState(statusRaw, Boolean(assetUrl)),
    status_raw: statusRaw || "pending",
    asset_url: assetUrl || null,
    download_url: pickFirstString(data.download_url, payload?.download_url) || null,
    duration_seconds: durationSeconds,
    payload: asObject(payload),
  };
};

const fetchTavusVideoStatus = async (providerVideoId: string): Promise<VideoProviderStatus> => {
  if (!TAVUS_API_KEY) throw new Error("TAVUS_API_KEY não configurada");
  if (!providerVideoId) throw new Error("provider_video_id do Tavus ausente");

  const response = await fetch(`${TAVUS_BASE_URL}/videos/${encodeURIComponent(providerVideoId)}`, {
    method: "GET",
    headers: {
      "x-api-key": TAVUS_API_KEY,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Tavus status falhou (${response.status}): ${truncate(errorText, 500)}`);
  }

  const payload = await response.json();
  const data = asObject(payload?.data || payload);
  const statusRaw = pickFirstString(data.status, payload?.status, "pending");
  const assetUrl = pickFirstString(
    data.hosted_url,
    data.video_url,
    data.url,
    payload?.hosted_url,
    payload?.video_url,
    payload?.url,
  );
  const downloadUrl = pickFirstString(
    data.download_url,
    data.mp4_url,
    payload?.download_url,
    payload?.mp4_url,
  );
  const durationSeconds = resolveDurationSeconds(
    data.duration_seconds,
    data.duration,
    data.video_duration_seconds,
    payload?.duration_seconds,
    payload?.duration,
  );

  return {
    provider: "tavus",
    provider_video_id: providerVideoId,
    state: resolveProviderState(statusRaw, Boolean(assetUrl)),
    status_raw: statusRaw || "pending",
    asset_url: assetUrl || null,
    download_url: downloadUrl || null,
    duration_seconds: durationSeconds,
    payload: asObject(payload),
  };
};

const fetchProviderVideoStatus = async (
  provider: VideoProvider,
  providerVideoId: string,
): Promise<VideoProviderStatus> => {
  if (provider === "tavus") return fetchTavusVideoStatus(providerVideoId);
  return fetchHeygenVideoStatus(providerVideoId);
};

const mergeVideoStatusOutput = (
  existingOutput: JsonObject,
  providerStatus: VideoProviderStatus,
): JsonObject => ({
  ...existingOutput,
  provider: providerStatus.provider,
  provider_video_id: providerStatus.provider_video_id,
  provider_status: providerStatus.status_raw,
  provider_state: providerStatus.state,
  provider_asset_url: providerStatus.asset_url || existingOutput.provider_asset_url || null,
  provider_download_url: providerStatus.download_url || existingOutput.provider_download_url || null,
  duration_seconds: providerStatus.duration_seconds ?? existingOutput.duration_seconds ?? null,
  provider_last_sync_at: nowIso(),
  provider_raw_status: providerStatus.payload,
  max_video_minutes: MAX_VIDEO_MINUTES,
});

const finalizeVideoTaskFromStatus = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  task: FactoryTask,
  mergedOutput: JsonObject,
): Promise<{ status: "completed" | "blocked"; reason: string }> => {
  const durationSeconds = toNumber(mergedOutput.duration_seconds, 0);
  if (durationSeconds <= 0) {
    const reason = "Vídeo pronto, mas sem duração final verificada pelo provedor.";
    await blockTask(supabase, task.id, reason, {
      ...mergedOutput,
      video_duration_validated: false,
    });
    await createHumanHandoffTask(
      supabase,
      projectId,
      `Validação manual de duração - ${task.title}`,
      `Validar duração final do vídeo "${task.title}" (provedor não retornou duration_seconds).`,
      task.lesson_key,
    );
    return { status: "blocked", reason };
  }

  if (durationSeconds > maxVideoSeconds()) {
    const reason = `Vídeo excedeu limite: ${durationSeconds}s > ${maxVideoSeconds()}s (${MAX_VIDEO_MINUTES} minutos).`;
    await blockTask(supabase, task.id, reason, {
      ...mergedOutput,
      video_duration_validated: false,
      duration_over_limit: true,
    });
    await createHumanHandoffTask(
      supabase,
      projectId,
      `Refazer vídeo acima do limite - ${task.title}`,
      `O vídeo "${task.title}" foi gerado com ${durationSeconds}s e ultrapassa o máximo de ${MAX_VIDEO_MINUTES} minutos. Refazer/editar.`,
      task.lesson_key,
    );
    return { status: "blocked", reason };
  }

  await completeTask(supabase, task.id, {
    ...mergedOutput,
    video_duration_validated: true,
    video_ready_at: nowIso(),
  });
  return { status: "completed", reason: "Vídeo validado e concluído" };
};

const syncProjectVideoTasks = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  options: { maxTasks?: number; onlyUnresolved?: boolean } = {},
) => {
  const maxTasks = Math.max(1, Math.min(50, Math.round(toNumber(options.maxTasks, 10))));
  const onlyUnresolved = options.onlyUnresolved ?? true;

  const { data: tasksRaw, error: tasksError } = await supabase
    .from("school_factory_tasks")
    .select("*")
    .eq("project_id", projectId)
    .eq("task_type", "video_generation")
    .in("status", ["pending", "running", "blocked", "completed"])
    .order("updated_at", { ascending: true })
    .limit(maxTasks);
  if (tasksError) throw tasksError;

  const tasks = asArray<FactoryTask>(tasksRaw);
  const report: JsonObject[] = [];

  for (const task of tasks) {
    const output = asObject(task.output);
    const provider = parseVideoProvider(output.provider);
    const providerVideoId = String(output.provider_video_id || "").trim();
    const hasAssetUrl = Boolean(String(output.provider_asset_url || "").trim());
    const providerState = resolveProviderState(output.provider_status, hasAssetUrl);
    const durationSeconds = toNumber(output.duration_seconds, 0);
    const unresolved = providerState !== "completed" ||
      task.status !== "completed" ||
      durationSeconds <= 0 ||
      durationSeconds > maxVideoSeconds();

    if (onlyUnresolved && !unresolved) continue;

    if (!provider || !providerVideoId) {
      report.push({
        task_id: task.id,
        task_title: task.title,
        status: "skipped",
        reason: "provider/provider_video_id ausentes",
      });
      continue;
    }

    try {
      const status = await fetchProviderVideoStatus(provider, providerVideoId);
      const mergedOutput = mergeVideoStatusOutput(output, status);

      if (status.state === "pending") {
        await blockTask(supabase, task.id, "Aguardando processamento do provedor de vídeo.", mergedOutput);
        report.push({
          task_id: task.id,
          task_title: task.title,
          provider,
          provider_status: status.status_raw,
          synced_status: "blocked",
        });
        continue;
      }

      if (status.state === "failed") {
        const reason = `Falha no provedor (${provider}): ${status.status_raw}`;
        await blockTask(supabase, task.id, reason, mergedOutput);
        await createHumanHandoffTask(
          supabase,
          projectId,
          `Produção manual de vídeo - ${task.title}`,
          `Provedor ${provider} retornou falha (${status.status_raw}) para "${task.title}". Produzir manualmente.`,
          task.lesson_key,
        );
        report.push({
          task_id: task.id,
          task_title: task.title,
          provider,
          provider_status: status.status_raw,
          synced_status: "blocked",
          reason,
        });
        continue;
      }

      const finalized = await finalizeVideoTaskFromStatus(supabase, projectId, task, mergedOutput);
      report.push({
        task_id: task.id,
        task_title: task.title,
        provider,
        provider_status: status.status_raw,
        synced_status: finalized.status,
        reason: finalized.reason,
        duration_seconds: mergedOutput.duration_seconds || null,
      });
    } catch (syncError) {
      const message = syncError instanceof Error ? syncError.message : "Erro na sincronização";
      report.push({
        task_id: task.id,
        task_title: task.title,
        status: "error",
        reason: truncate(message, 500),
      });
    }
  }

  return {
    project_id: projectId,
    scanned: tasks.length,
    updated: report.length,
    report,
  };
};

const executeNextTask = async (
  supabase: ReturnType<typeof createClient>,
  projectId: string,
  trigger: "manual" | "cron" = "manual",
): Promise<TaskRunSummary> => {
  const project = await fetchProject(supabase, projectId);
  const task = await fetchNextPendingTask(supabase, projectId);

  if (!task) {
    await updateProjectAndMirror(supabase, projectId, {
      last_runner_at: nowIso(),
      runner_heartbeat: { trigger, idle: true },
    });
    return { task: null, message: "Nenhuma tarefa pendente", project_status: project.status };
  }

  await updateTaskAndMirror(supabase, task.id, { status: "running", started_at: nowIso() });

  try {
    if (task.task_type === "curriculum_finalize") {
      await completeTask(supabase, task.id, {
        validated_at: nowIso(),
        modules: asArray<JsonObject>(project.master_plan?.curriculum).length,
        notes: "Grade curricular validada.",
      });
    } else if (task.task_type === "script_generation") {
      const budgetCheck = await ensureCostBudget(supabase, project, task, "script_generation");
      if (!budgetCheck.ok) {
        return { task: await fetchTaskById(supabase, task.id), message: "Tarefa bloqueada por orçamento", project_status: "blocked" };
      }

      const { data: docsRaw, error: docsError } = await supabase
        .from("school_factory_documents")
        .select("title, content")
        .eq("project_id", projectId)
        .limit(8);
      if (docsError) throw docsError;

      const docs = asArray<JsonObject>(docsRaw);
      const docsContext = buildDocumentContext(docs);
      const taskInput = asObject(task.input);
      const lessonTitle = String(taskInput.lesson_title || "Aula");
      const objective = String(taskInput.lesson_objective || "");
      const duration = clampVideoDurationMinutes(taskInput.duration_minutes);

      const scriptFallback: JsonObject = {
        script_title: lessonTitle,
        narration: `Nesta aula vamos trabalhar: ${objective}.`,
        scenes: [
          { order: 1, visual: "Abertura", narration: "Introdução da aula", duration_seconds: 30 },
          { order: 2, visual: "Demonstração", narration: "Aplicação prática", duration_seconds: 90 },
        ],
        quiz_seed: ["Qual conceito principal desta aula?", "Como aplicar isso na prática?"],
        mission_seed: "Execute uma tarefa prática e registre evidências.",
      };

      const { data: scriptData } = await callGrokJson(
        "Você é um roteirista pedagógico para vídeos curtos de ensino. Responda apenas JSON válido.",
        `Projeto: ${project.name}
Aula: ${lessonTitle}
Objetivo: ${objective}
Duração: ${duration} minutos
Contexto da escola: ${JSON.stringify(project.master_plan || {})}
Documentos:
${docsContext}

Regras obrigatórias:
- Conteúdo apropriado para ambiente educacional (sem conteúdo impróprio).
- Tempo máximo do vídeo: ${MAX_VIDEO_MINUTES} minutos.
- Narração objetiva e linguagem profissional.

Retorne:
{
  "script_title": "string",
  "narration": "string",
  "scenes": [{"order":1,"visual":"string","narration":"string","duration_seconds":30}],
  "quiz_seed": ["string"],
  "mission_seed": "string"
}`,
        scriptFallback,
      );

      await registerCost(supabase, projectId, task.id, "grok", budgetCheck.cost, {
        action: "script_generation",
      });

      const normalizedNarration = enforceNarrationDuration(String(scriptData.narration || scriptFallback.narration || ""), duration);
      const safeContentCheck = detectUnsafeContent([
        lessonTitle,
        objective,
        normalizedNarration.narration,
        JSON.stringify(scriptData.quiz_seed || []),
        scriptData.mission_seed || "",
      ]);
      if (safeContentCheck.flagged) {
        await blockTask(
          supabase,
          task.id,
          `Conteúdo impróprio detectado no roteiro: ${safeContentCheck.labels.join(", ")}`,
          {
            safety_labels: safeContentCheck.labels,
          },
        );
        return { task: await fetchTaskById(supabase, task.id), message: "Roteiro bloqueado por política de conteúdo", project_status: project.status };
      }

      const normalizedScenes = normalizeScenesDuration(asArray<JsonObject>(scriptData.scenes), duration * 60);
      const finalizedScript: JsonObject = {
        ...scriptData,
        narration: normalizedNarration.narration,
        scenes: normalizedScenes.length > 0 ? normalizedScenes : scriptFallback.scenes,
        duration_minutes: duration,
      };

      await completeTask(supabase, task.id, {
        ...finalizedScript,
        generated_at: nowIso(),
        compliance: {
          content_safe: true,
          max_video_minutes: MAX_VIDEO_MINUTES,
          narration_words: normalizedNarration.words,
          narration_truncated: normalizedNarration.truncated,
        },
      });

      const { data: linkedVideoTasks, error: linkedVideoError } = await supabase
        .from("school_factory_tasks")
        .select("id, input")
        .eq("project_id", projectId)
        .eq("task_type", "video_generation")
        .eq("lesson_key", task.lesson_key)
        .in("status", ["pending", "blocked"]);
      if (linkedVideoError) throw linkedVideoError;

      if (linkedVideoTasks && linkedVideoTasks.length > 0) {
        const videoTask = linkedVideoTasks[0] as { id: string; input: JsonObject };
        const currentInput = asObject(videoTask.input);
        const { error: updateVideoInputError } = await supabase
          .from("school_factory_tasks")
          .update({
            input: {
              ...currentInput,
              script_narration: normalizedNarration.narration,
              script_scenes: normalizedScenes.length > 0 ? normalizedScenes : scriptFallback.scenes,
              duration_minutes: duration,
            },
            status: "pending",
            error_message: null,
          })
          .eq("id", videoTask.id);
        if (updateVideoInputError) throw updateVideoInputError;
      }
    } else if (task.task_type === "video_generation") {
      const taskInput = asObject(task.input);
      const durationMinutes = clampVideoDurationMinutes(taskInput.duration_minutes);
      const rawNarration = String(taskInput.script_narration || "");
      if (!rawNarration) {
        await blockTask(supabase, task.id, "Roteiro ainda não disponível para esta aula");
        return { task: await fetchTaskById(supabase, task.id), message: "Roteiro pendente", project_status: project.status };
      }
      const narrationGuard = enforceNarrationDuration(rawNarration, durationMinutes);
      const narration = narrationGuard.narration;
      const videoContentSafety = detectUnsafeContent([
        String(taskInput.lesson_title || ""),
        narration,
      ]);
      if (videoContentSafety.flagged) {
        await blockTask(
          supabase,
          task.id,
          `Conteúdo impróprio detectado para vídeo: ${videoContentSafety.labels.join(", ")}`,
          {
            safety_labels: videoContentSafety.labels,
            max_video_minutes: MAX_VIDEO_MINUTES,
          },
        );
        return { task: await fetchTaskById(supabase, task.id), message: "Vídeo bloqueado por política de conteúdo", project_status: project.status };
      }
      const projectVideoConfig = asObject(project.video_config);
      const providerOrder = resolveVideoProviderOrder(projectVideoConfig);
      const attempts: JsonObject[] = [];
      let hasBudgetForAnyProvider = false;

      for (const provider of providerOrder) {
        const providerCost = getVideoProviderCost(provider);
        const budget = budgetAllows(project, providerCost);
        if (!budget.allowed) {
          attempts.push({
            provider,
            status: "skipped_budget",
            cost_estimate_usd: providerCost,
            budget,
          });
          continue;
        }
        hasBudgetForAnyProvider = true;

        try {
          const providerOutput = provider === "tavus"
            ? await requestTavusVideo(narration, task.title, projectVideoConfig)
            : await requestHeygenVideo(narration, task.title, projectVideoConfig);

          const successAttempts = [
            ...attempts,
            {
              provider,
              status: "completed",
              cost_estimate_usd: providerCost,
            },
          ];

          await registerCost(supabase, projectId, task.id, provider, providerCost, {
            action: "video_generation",
            provider_strategy: String(projectVideoConfig.provider_strategy || "cheapest"),
            provider_order: providerOrder,
            attempts: successAttempts,
          });

          const baseOutput: JsonObject = {
            ...providerOutput,
            provider_strategy: String(projectVideoConfig.provider_strategy || "cheapest"),
            provider_order: providerOrder,
            provider_attempts: successAttempts,
            estimated_cost_usd: providerCost,
            duration_minutes: durationMinutes,
            narration_words: countWords(narration),
            narration_truncated: narrationGuard.truncated,
            max_video_minutes: MAX_VIDEO_MINUTES,
            generated_at: nowIso(),
          };
          const providerOutputObj = asObject(providerOutput);
          const providerStatus: VideoProviderStatus = {
            provider,
            provider_video_id: String(providerOutputObj.provider_video_id || ""),
            state: resolveProviderState(providerOutputObj.provider_status, Boolean(providerOutputObj.provider_asset_url)),
            status_raw: String(providerOutputObj.provider_status || "pending"),
            asset_url: String(providerOutputObj.provider_asset_url || "") || null,
            download_url: String(providerOutputObj.provider_download_url || "") || null,
            duration_seconds: resolveDurationSeconds(providerOutputObj.duration_seconds, providerOutputObj.duration),
            payload: asObject(providerOutputObj.provider_raw),
          };
          const mergedOutput = mergeVideoStatusOutput(baseOutput, providerStatus);

          if (providerStatus.state === "pending") {
            await blockTask(supabase, task.id, "Aguardando processamento do provedor de vídeo.", {
              ...mergedOutput,
              video_duration_validated: false,
            });
            return {
              task: await fetchTaskById(supabase, task.id),
              message: `Vídeo solicitado com ${provider}; aguardando processamento`,
              project_status: (await fetchProject(supabase, projectId)).status,
            };
          }

          if (providerStatus.state === "failed") {
            const reason = `Falha no provedor (${provider}): ${providerStatus.status_raw}`;
            await blockTask(supabase, task.id, reason, mergedOutput);
            await createHumanHandoffTask(
              supabase,
              projectId,
              `Produção manual de vídeo - ${String(taskInput.lesson_title || "aula")}`,
              `Provedor ${provider} retornou falha (${providerStatus.status_raw}) para "${String(taskInput.lesson_title || "aula")}".`,
              task.lesson_key,
            );
            return {
              task: await fetchTaskById(supabase, task.id),
              message: "Falha no provedor de vídeo",
              project_status: (await fetchProject(supabase, projectId)).status,
            };
          }

          const finalized = await finalizeVideoTaskFromStatus(supabase, projectId, task, mergedOutput);
          return {
            task: await fetchTaskById(supabase, task.id),
            message: finalized.status === "completed" ? `Vídeo validado com ${provider}` : finalized.reason,
            project_status: (await fetchProject(supabase, projectId)).status,
          };
        } catch (providerError) {
          const message = providerError instanceof Error ? providerError.message : "Erro no provedor";
          attempts.push({
            provider,
            status: "failed",
            error: truncate(message, 500),
            cost_estimate_usd: providerCost,
          });
        }
      }

      if (!hasBudgetForAnyProvider) {
        const cheapest = Math.min(...providerOrder.map((provider) => getVideoProviderCost(provider)));
        await blockTaskWithBudgetReason(supabase, project, task, cheapest);
        return { task: await fetchTaskById(supabase, task.id), message: "Tarefa bloqueada por orçamento", project_status: "blocked" };
      }

      await blockTask(
        supabase,
        task.id,
        "Falha em todos os provedores de vídeo (Tavus/HeyGen)",
        {
          provider_order: providerOrder,
          provider_attempts: attempts,
        },
      );
      await createHumanHandoffTask(
        supabase,
        projectId,
        `Produção manual de vídeo - ${String(taskInput.lesson_title || "aula")}`,
        `Falha automática nos provedores de vídeo para "${String(taskInput.lesson_title || "aula")}". Gerar manualmente e retornar URL final.`,
        task.lesson_key,
      );
      return { task: await fetchTaskById(supabase, task.id), message: "Falha nos provedores automáticos", project_status: project.status };
    } else if (task.task_type === "tutor_training") {
      const budgetCheck = await ensureCostBudget(supabase, project, task, "tutor_training");
      if (!budgetCheck.ok) {
        return { task: await fetchTaskById(supabase, task.id), message: "Tarefa bloqueada por orçamento", project_status: "blocked" };
      }

      const fallbackTutorPack: JsonObject = {
        role: "Tutor executivo da escola",
        objectives: ["Explicar com clareza", "Guiar próxima ação", "Sinalizar risco quando necessário"],
        style_rules: ["Sem enrolação", "Propor hipótese + validação", "Trazer dados e métricas"],
        escalation_policy: [
          "Se faltar dado, pedir tempo para pesquisa",
          "Em tema legal/financeiro, recomendar validação profissional",
        ],
      };

      const { data: tutorPack } = await callGrokJson(
        "Você é especialista em treinamento de tutor IA para escolas digitais. Responda apenas JSON.",
        `Com base no plano:
${JSON.stringify(project.master_plan || {})}

Crie um tutor pack no formato:
{
  "role": "string",
  "objectives": ["string"],
  "style_rules": ["string"],
  "escalation_policy": ["string"],
  "memory_schema": {"key":"description"}
}`,
        fallbackTutorPack,
      );

      await registerCost(supabase, projectId, task.id, "grok", budgetCheck.cost, {
        action: "tutor_training",
      });

      const { data: latestVersionRows, error: latestVersionError } = await supabase
        .from("school_factory_tutor_pack_versions")
        .select("version")
        .eq("project_id", projectId)
        .order("version", { ascending: false })
        .limit(1);
      if (latestVersionError) throw latestVersionError;

      const latestVersion = latestVersionRows && latestVersionRows.length > 0
        ? toNumber((latestVersionRows[0] as { version: number }).version, 0)
        : 0;
      const nextVersion = latestVersion + 1;

      const { error: versionInsertError } = await supabase
        .from("school_factory_tutor_pack_versions")
        .insert({
          project_id: projectId,
          version: nextVersion,
          tutor_pack: tutorPack,
          created_by_task_id: task.id,
          notes: "Generated by tutor_training task",
        });
      if (versionInsertError) throw versionInsertError;

      await completeTask(supabase, task.id, {
        trained_at: nowIso(),
        tutor_pack: tutorPack,
        version: nextVersion,
      });

      await updateProjectAndMirror(supabase, projectId, { tutor_pack: tutorPack });
    } else if (task.task_type === "qa_review") {
      const budgetCheck = await ensureCostBudget(supabase, project, task, "qa_review");
      if (!budgetCheck.ok) {
        return { task: await fetchTaskById(supabase, task.id), message: "Tarefa bloqueada por orçamento", project_status: "blocked" };
      }

      const { data: completedTasksRaw, error: completedTasksError } = await supabase
        .from("school_factory_tasks")
        .select("task_type, status, output")
        .eq("project_id", projectId)
        .eq("status", "completed");
      if (completedTasksError) throw completedTasksError;
      const completedTasks = asArray<JsonObject>(completedTasksRaw);
      const scriptsCount = completedTasks.filter((entry) => String(entry.task_type) === "script_generation").length;

      const { data: videoTasksRaw, error: videoTasksError } = await supabase
        .from("school_factory_tasks")
        .select("*")
        .eq("project_id", projectId)
        .eq("task_type", "video_generation");
      if (videoTasksError) throw videoTasksError;
      const videoCompliance = evaluateVideoCompliance(asArray<FactoryTask>(videoTasksRaw));

      const qaFallback: JsonObject = {
        go_live_recommendation: videoCompliance.blockers.length === 0 && scriptsCount > 0 ? "go" : "hold",
        score: Math.max(40, Math.min(95, 45 + videoCompliance.ready * 8)),
        findings: [
          `Roteiros prontos: ${scriptsCount}`,
          `Vídeos prontos e validados: ${videoCompliance.ready}/${videoCompliance.total}`,
        ],
        missing_items: videoCompliance.blockers,
        risk_notes: videoCompliance.over_limit > 0 || videoCompliance.unverified_duration > 0
          ? ["Existem vídeos sem conformidade de duração."]
          : [],
      };

      const { data: qaReport } = await callGrokJson(
        "Você é o QA Agent da operação escolar. Responda apenas JSON.",
        `Projeto: ${project.name}
Plano: ${JSON.stringify(project.master_plan || {})}
Tarefas completas: ${JSON.stringify(completedTasks)}
Compliance de vídeo: ${JSON.stringify(videoCompliance)}

Retorne:
{
  "go_live_recommendation": "go|hold",
  "score": 0,
  "findings": ["string"],
  "missing_items": ["string"],
  "risk_notes": ["string"]
}`,
        qaFallback,
      );

      await registerCost(supabase, projectId, task.id, "grok", budgetCheck.cost, {
        action: "qa_review",
      });

      const score = toNumber(qaReport.score, 0);
      const minScore = toNumber(project.qa_min_score, DEFAULT_QA_MIN_SCORE);
      const recommendation = String(qaReport.go_live_recommendation || "hold");
      const canProceed = score >= minScore && recommendation === "go" && videoCompliance.blockers.length === 0;

      await completeTask(supabase, task.id, {
        qa_report: qaReport,
        video_compliance: videoCompliance,
        reviewed_at: nowIso(),
      });

      await updateProjectAndMirror(supabase, projectId, {
        qa_report: {
          ...asObject(qaReport),
          video_compliance: videoCompliance,
        },
        status: canProceed ? "ready_to_publish" : "blocked",
      });
    } else if (task.task_type === "publish_preparation") {
      const { data: allTasksRaw, error: allTasksError } = await supabase
        .from("school_factory_tasks")
        .select("*")
        .eq("project_id", projectId);
      if (allTasksError) throw allTasksError;
      const allTasks = asArray<FactoryTask>(allTasksRaw);
      const videoCompliance = evaluateVideoCompliance(allTasks);

      const blockedCritical = hasBlockedCriticalTasks(allTasks);
      const qaScore = toNumber(asObject(project.qa_report).score, 0);
      const qaMin = toNumber(project.qa_min_score, DEFAULT_QA_MIN_SCORE);
      const hasVideoBlockers = videoCompliance.blockers.length > 0;
      if (blockedCritical || qaScore < qaMin || hasVideoBlockers) {
        const reason = blockedCritical
          ? "Existem tarefas críticas bloqueadas."
          : qaScore < qaMin
          ? `QA insuficiente: ${qaScore} < ${qaMin}.`
          : `Compliance de vídeo pendente: ${videoCompliance.blockers.join(" | ")}`;
        await blockTask(supabase, task.id, reason, {
          qa_score: qaScore,
          qa_min_required: qaMin,
          blocked_critical: blockedCritical,
          video_compliance: videoCompliance,
        });
        return { task: await fetchTaskById(supabase, task.id), message: "Gate de qualidade bloqueou publicação", project_status: "blocked" };
      }

      await completeTask(supabase, task.id, {
        checklist: ["Currículo validado", "Roteiros gerados", "Tutor treinado", "QA aprovado"],
        video_compliance: videoCompliance,
        published_ready: true,
      });

      await updateProjectAndMirror(supabase, projectId, { status: "ready_to_publish" });
    } else if (task.task_type === "human_handoff") {
      await blockTask(supabase, task.id, "Aguardando resposta humana.");
    } else {
      await failTask(supabase, task, `task_type não suportado: ${task.task_type}`);
    }
  } catch (taskError) {
    const message = taskError instanceof Error ? taskError.message : "Erro desconhecido";
    await failTask(supabase, task, message);
  }

  const latestTask = await fetchTaskById(supabase, task.id);
  await mirrorTaskToMongo(latestTask);
  const latestProject = await updateProjectAndMirror(supabase, projectId, {
    last_runner_at: nowIso(),
    runner_heartbeat: {
      trigger,
      last_task_id: latestTask.id,
      last_task_status: latestTask.status,
    },
  });

  return {
    task: latestTask,
    message: "Execução de tarefa finalizada",
    project_status: latestProject.status,
  };
};

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    if (!ADMIN_PASSWORD) {
      return toJsonResponse(
        { error: "ADMIN_PASSWORD não configurada no ambiente da função." },
        503,
      );
    }

    const body = await req.json();
    const action = String(body.action || "");
    const password = String(body.password || "");

    if (!password) {
      return toJsonResponse({ error: "Senha obrigatória" }, 401);
    }
    if (password !== ADMIN_PASSWORD) {
      return toJsonResponse({ error: "Senha incorreta" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "create_project") {
      const projectInput = asObject(body.project);
      const name = String(projectInput.name || "").trim();
      if (!name) {
        return toJsonResponse({ error: "name é obrigatório" }, 400);
      }
      const initialDocuments = asArray<FactoryDocumentInput>(projectInput.documents);
      const projectSafety = detectUnsafeContent([
        name,
        projectInput.niche || "",
        projectInput.target_audience || "",
        projectInput.objective || "",
        JSON.stringify(projectInput.business_context || {}),
        ...initialDocuments.map((doc) => `${String(doc.title || "")}\n${truncate(String(doc.content || ""), 4000)}`),
      ]);
      if (projectSafety.flagged) {
        return toJsonResponse(
          {
            error: "Conteúdo impróprio detectado. Ajuste os dados para continuar.",
            safety_labels: projectSafety.labels,
          },
          400,
        );
      }

      const budgetLimit = resolveBudgetLimit(projectInput);
      const qaMin = Math.max(0, Math.min(100, Math.round(toNumber(projectInput.qa_min_score, DEFAULT_QA_MIN_SCORE))));
      const initialCapitalInput = projectInput.initial_capital ?? projectInput.initial_capital_usd;
      const initialCapital = initialCapitalInput == null || initialCapitalInput === ""
        ? null
        : toNumber(initialCapitalInput, 0);

      const { data: createdProjectRaw, error: projectError } = await supabase
        .from("school_factory_projects")
        .insert({
          owner_id: projectInput.owner_id || null,
          name,
          mode: normalizeProjectMode(projectInput.mode),
          initial_capital: initialCapital,
          niche: projectInput.niche || null,
          target_audience: projectInput.target_audience || null,
          objective: projectInput.objective || null,
          business_context: asObject(projectInput.business_context),
          status: "draft",
          budget_limit_usd: budgetLimit,
          budget_spent_usd: 0,
          budget_hard_stop: Boolean(projectInput.budget_hard_stop ?? true),
          qa_min_score: qaMin,
          video_config: {
            max_video_minutes: MAX_VIDEO_MINUTES,
            content_policy: "strict_safe",
            provider_strategy: String(projectInput.video_provider_strategy || "cheapest"),
            preferred_provider: parseVideoProvider(projectInput.video_preferred_provider),
            fallback_provider: parseVideoProvider(projectInput.video_fallback_provider),
            heygen_avatar_id: projectInput.heygen_avatar_id || null,
            heygen_voice_id: projectInput.heygen_voice_id || null,
            tavus_replica_id: projectInput.tavus_replica_id || null,
            tavus_fast: Boolean(projectInput.tavus_fast ?? true),
          },
        })
        .select()
        .single();
      if (projectError) throw projectError;

      const createdProject = createdProjectRaw as FactoryProject;
      await mirrorProjectToMongo(createdProject);
      if (initialDocuments.length > 0) {
        const rows = initialDocuments.map((doc, index) => ({
          project_id: createdProject.id,
          source_type: doc.source_type || "text",
          title: doc.title || `Documento ${index + 1}`,
          source_url: doc.source_url || null,
          content: doc.content || null,
          metadata: doc.metadata || {},
        }));
        const { error: docsError } = await supabase
          .from("school_factory_documents")
          .insert(rows);
        if (docsError) throw docsError;
      }

      return toJsonResponse({ project: createdProject, message: "Projeto da escola criado com sucesso" });
    }

    if (action === "attach_documents") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);
      const documents = asArray<FactoryDocumentInput>(body.documents);
      if (documents.length === 0) return toJsonResponse({ error: "documents é obrigatório" }, 400);
      const docsSafety = detectUnsafeContent(
        documents.map((doc) => `${String(doc.title || "")}\n${truncate(String(doc.content || ""), 4000)}`),
      );
      if (docsSafety.flagged) {
        return toJsonResponse(
          {
            error: "Conteúdo impróprio detectado nos documentos anexados.",
            safety_labels: docsSafety.labels,
          },
          400,
        );
      }

      const rows = documents.map((doc, index) => ({
        project_id: projectId,
        source_type: doc.source_type || "text",
        title: doc.title || `Documento ${index + 1}`,
        source_url: doc.source_url || null,
        content: doc.content || null,
        metadata: doc.metadata || {},
      }));
      const { data, error } = await supabase
        .from("school_factory_documents")
        .insert(rows)
        .select();
      if (error) throw error;
      return toJsonResponse({ documents: data || [], message: "Documentos anexados" });
    }

    if (action === "list_projects") {
      const { data: projectsRaw, error } = await supabase
        .from("school_factory_projects")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(40);
      if (error) throw error;

      const projects = asArray<FactoryProject>(projectsRaw);
      const enriched = await Promise.all(
        projects.map(async (project) => {
          const { data: tasksRaw, error: tasksError } = await supabase
            .from("school_factory_tasks")
            .select("status, task_type, assigned_agent, started_at, completed_at, due_at, next_follow_up_at")
            .eq("project_id", project.id);
          if (tasksError) throw tasksError;
          const tasks = asArray<FactoryTask>(tasksRaw);

          const metrics = { pending: 0, running: 0, completed: 0, blocked: 0, failed: 0, handoffs_open: 0 };
          const now = Date.now();
          let overdueTasks = 0;
          let overdueHandoffs = 0;

          tasks.forEach((task) => {
            if (task.status in metrics) {
              metrics[task.status as keyof typeof metrics] += 1;
            }
            if (task.task_type === "human_handoff" && (task.status === "blocked" || task.status === "pending")) {
              metrics.handoffs_open += 1;
              if (task.next_follow_up_at && new Date(task.next_follow_up_at).getTime() < now) {
                overdueHandoffs += 1;
              }
            }
            if (task.due_at && (task.status === "pending" || task.status === "running" || task.status === "blocked")) {
              if (new Date(task.due_at).getTime() < now) {
                overdueTasks += 1;
              }
            }
          });

          return {
            ...project,
            metrics,
            sla: {
              overdue_tasks: overdueTasks,
              overdue_handoffs: overdueHandoffs,
            },
          };
        }),
      );

      return toJsonResponse({ projects: enriched });
    }

    if (action === "generate_master_plan") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const project = await fetchProject(supabase, projectId);
      const fakeTask: FactoryTask = {
        id: crypto.randomUUID(),
        project_id: project.id,
        task_type: "generate_master_plan",
        status: "running",
        priority: 0,
        assigned_agent: "ceo-agent",
        lesson_key: null,
        title: "Generate master plan",
        input: {},
        output: {},
        error_message: null,
        retry_count: 0,
        started_at: nowIso(),
        completed_at: null,
        due_at: null,
        next_follow_up_at: null,
        assignee_name: null,
        assignee_whatsapp: null,
        assignee_email: null,
        handoff_summary: null,
        last_response: null,
        cost_estimate_usd: TASK_COSTS.generate_master_plan,
      };

      const budgetCheck = await ensureCostBudget(supabase, project, fakeTask, "generate_master_plan");
      if (!budgetCheck.ok) {
        return toJsonResponse({ error: "Orçamento insuficiente para gerar plano mestre." }, 400);
      }

      const { data: docsRaw, error: docsError } = await supabase
        .from("school_factory_documents")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: true });
      if (docsError) throw docsError;

      const docs = asArray<JsonObject>(docsRaw);
      const documentsContext = buildDocumentContext(docs);
      const systemPrompt = "Você é o CEO Agent + Head Acadêmico. Gere plano mestre de escola digital. Responda APENAS JSON válido.";
      const userPrompt = `
Projeto: ${project.name}
Modo: ${project.mode}
Capital inicial: ${project.initial_capital || "não informado"}
Nicho: ${project.niche || "não informado"}
Público: ${project.target_audience || "não informado"}
Objetivo: ${project.objective || "não informado"}
Contexto adicional: ${JSON.stringify(project.business_context || {})}

Documentos de referência:
${documentsContext}

Regras obrigatórias:
- Não incluir conteúdo impróprio, adulto, violento explícito ou ilegal.
- Cada aula em vídeo deve ter duração máxima de ${MAX_VIDEO_MINUTES} minutos.

Retorne JSON no formato:
{
  "executive_summary": "string",
  "value_proposition": "string",
  "business_model": {
    "pricing_strategy": "string",
    "acquisition_channels": ["string"],
    "cost_structure": ["string"]
  },
  "curriculum": [
    {
      "module_title": "string",
      "module_goal": "string",
      "lessons": [
        {
          "title": "string",
          "objective": "string",
          "duration_minutes": 4,
          "format": "video"
        }
      ]
    }
  ],
  "tutor_training": {
    "persona": "string",
    "teaching_principles": ["string"],
    "escalation_rules": ["string"]
  },
  "launch_plan": [
    {"phase": "string", "deliverables": ["string"], "timeline_days": 7}
  ],
  "budget_estimate": {
    "video_generation": 0,
    "operations": 0,
    "tools": 0,
    "total_estimated": 0
  },
  "risks": ["string"],
  "kpis": ["string"]
}`;

      const fallbackPlan: JsonObject = {
        executive_summary: "Plano inicial gerado em modo fallback.",
        value_proposition: "Treinamento prático focado em resultado real.",
        business_model: {
          pricing_strategy: "Assinatura mensal com trilhas premium.",
          acquisition_channels: ["Conteúdo orgânico", "Parcerias", "Anúncios pagos"],
          cost_structure: ["Plataforma", "Geração de vídeo", "Suporte"],
        },
        curriculum: [
          {
            module_title: "Fundamentos",
            module_goal: "Levar do zero ao primeiro resultado",
            lessons: [
              { title: "Introdução", objective: "Visão geral", duration_minutes: 4, format: "video" },
              { title: "Primeira prática", objective: "Aplicação imediata", duration_minutes: 4, format: "video" },
            ],
          },
        ],
        tutor_training: {
          persona: "Tutor consultivo orientado a ação",
          teaching_principles: ["Clareza", "Passos curtos", "Feedback rápido"],
          escalation_rules: ["Sem dados suficientes", "Risco legal", "Bloqueio operacional"],
        },
        launch_plan: [{ phase: "MVP", deliverables: ["10 aulas", "Tutor ativo"], timeline_days: 14 }],
        budget_estimate: { video_generation: 500, operations: 200, tools: 150, total_estimated: 850 },
        risks: ["Baixa adesão inicial", "Custo de mídia", "Dependência de APIs externas"],
        kpis: ["CAC", "LTV", "Taxa de conclusão", "NPS"],
      };

      const { data: plan, raw } = await callGrokJson(systemPrompt, userPrompt, fallbackPlan);
      await registerCost(supabase, projectId, null, "grok", budgetCheck.cost, { action: "generate_master_plan" });

      const context = asObject(project.business_context);
      await updateProjectAndMirror(supabase, projectId, {
        status: "ready_for_approval",
        master_plan: plan,
        business_context: {
          ...context,
          master_plan_raw_preview: truncate(String(raw || ""), 1200),
        },
      });

      return toJsonResponse({
        project_id: projectId,
        master_plan: plan,
        message: "Plano mestre gerado",
      });
    }

    if (action === "enqueue_pipeline") {
      const projectId = String(body.project_id || "");
      const forceRebuild = Boolean(body.force_rebuild);
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const project = await fetchProject(supabase, projectId);
      if (!project.master_plan) {
        return toJsonResponse({ error: "Gere o plano mestre antes de criar o pipeline" }, 400);
      }

      const { count, error: countError } = await supabase
        .from("school_factory_tasks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId);
      if (countError) throw countError;

      if ((count || 0) > 0 && !forceRebuild) {
        return toJsonResponse({ error: "Pipeline já existe. Use force_rebuild=true para recriar." }, 400);
      }

      if (forceRebuild) {
        const { error: clearError } = await supabase
          .from("school_factory_tasks")
          .delete()
          .eq("project_id", projectId);
        if (clearError) throw clearError;
      }

      const curriculum = asArray<JsonObject>(asObject(project.master_plan).curriculum);
      const tasks: JsonObject[] = [];

      tasks.push({
        project_id: projectId,
        task_type: "curriculum_finalize",
        status: "pending",
        priority: 10,
        assigned_agent: "curriculum-agent",
        title: "Validar grade curricular final",
        input: { curriculum_count: curriculum.length },
        due_at: taskDueIso(60),
        sla_minutes: 60,
        cost_estimate_usd: 0,
      });

      let lessonCounter = 0;
      curriculum.forEach((module, moduleIndex) => {
        const moduleData = asObject(module);
        const lessons = asArray<JsonObject>(moduleData.lessons);
        lessons.forEach((lesson, lessonIndex) => {
          const lessonData = asObject(lesson);
          lessonCounter += 1;
          const lessonKey = `m${moduleIndex + 1}-l${lessonIndex + 1}`;
          tasks.push({
            project_id: projectId,
            task_type: "script_generation",
            status: "pending",
            priority: 20 + lessonCounter * 2,
            assigned_agent: "content-agent",
            lesson_key: lessonKey,
            title: `Gerar roteiro: ${String(lessonData.title || lessonKey)}`,
            input: {
              module_title: String(moduleData.module_title || `Módulo ${moduleIndex + 1}`),
              lesson_title: String(lessonData.title || `Aula ${lessonCounter}`),
              lesson_objective: String(lessonData.objective || ""),
              duration_minutes: clampVideoDurationMinutes(lessonData.duration_minutes),
            },
            due_at: taskDueIso(6 * 60),
            sla_minutes: 6 * 60,
            cost_estimate_usd: TASK_COSTS.script_generation,
          });
          tasks.push({
            project_id: projectId,
            task_type: "video_generation",
            status: "pending",
            priority: 21 + lessonCounter * 2,
            assigned_agent: "video-agent",
            lesson_key: lessonKey,
            title: `Gerar vídeo: ${String(lessonData.title || lessonKey)}`,
            input: {
              module_title: String(moduleData.module_title || `Módulo ${moduleIndex + 1}`),
              lesson_title: String(lessonData.title || `Aula ${lessonCounter}`),
              duration_minutes: clampVideoDurationMinutes(lessonData.duration_minutes),
            },
            due_at: taskDueIso(12 * 60),
            sla_minutes: 12 * 60,
            cost_estimate_usd: TASK_COSTS.video_generation,
          });
        });
      });

      tasks.push({
        project_id: projectId,
        task_type: "tutor_training",
        status: "pending",
        priority: 500,
        assigned_agent: "tutor-agent",
        title: "Treinar tutor com base na escola",
        input: {},
        due_at: taskDueIso(10 * 60),
        sla_minutes: 10 * 60,
        cost_estimate_usd: TASK_COSTS.tutor_training,
      });

      tasks.push({
        project_id: projectId,
        task_type: "qa_review",
        status: "pending",
        priority: 700,
        assigned_agent: "qa-agent",
        title: "Executar revisão de qualidade e riscos",
        input: {},
        due_at: taskDueIso(14 * 60),
        sla_minutes: 14 * 60,
        cost_estimate_usd: TASK_COSTS.qa_review,
      });

      tasks.push({
        project_id: projectId,
        task_type: "publish_preparation",
        status: "pending",
        priority: 900,
        assigned_agent: "publisher-agent",
        title: "Preparar publicação final da escola",
        input: {},
        due_at: taskDueIso(16 * 60),
        sla_minutes: 16 * 60,
        cost_estimate_usd: 0,
      });

      const { data: insertedTasksRaw, error: insertError } = await supabase
        .from("school_factory_tasks")
        .insert(tasks)
        .select("*");
      if (insertError) throw insertError;
      const insertedTasks = asArray<JsonObject>(insertedTasksRaw);
      for (const insertedTask of insertedTasks) {
        await mirrorTaskToMongo(insertedTask);
      }

      await updateProjectAndMirror(supabase, projectId, { status: "in_production" });

      return toJsonResponse({
        project_id: projectId,
        tasks_created: tasks.length,
        lessons: lessonCounter,
        message: "Pipeline de agentes criado",
      });
    }

    if (action === "run_next_task") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);
      const syncBeforeRun = await syncProjectVideoTasks(supabase, projectId, {
        maxTasks: Math.max(1, Math.min(20, Math.round(toNumber(body.sync_max_tasks, 8)))),
        onlyUnresolved: true,
      });
      const result = await executeNextTask(supabase, projectId, "manual");
      return toJsonResponse({
        ...result,
        video_sync: syncBeforeRun,
      });
    }

    if (action === "sync_video_status") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const syncResult = await syncProjectVideoTasks(supabase, projectId, {
        maxTasks: Math.max(1, Math.min(50, Math.round(toNumber(body.max_tasks, 20)))),
        onlyUnresolved: body.only_unresolved === undefined ? true : Boolean(body.only_unresolved),
      });
      return toJsonResponse({
        message: "Sincronização de vídeo concluída",
        ...syncResult,
      });
    }

    if (action === "run_cron") {
      const maxTasks = Math.max(1, Math.min(20, Math.round(toNumber(body.max_tasks, 5))));
      const { data: activeProjectsRaw, error: activeProjectsError } = await supabase
        .from("school_factory_projects")
        .select("id, status")
        .in("status", ["in_production", "ready_to_publish"])
        .order("updated_at", { ascending: true })
        .limit(30);
      if (activeProjectsError) throw activeProjectsError;

      const activeProjects = asArray<{ id: string; status: ProjectStatus }>(activeProjectsRaw);
      const runs: Array<JsonObject> = [];
      let executed = 0;

      for (const project of activeProjects) {
        if (executed >= maxTasks) break;
        const syncResult = await syncProjectVideoTasks(supabase, project.id, {
          maxTasks: 8,
          onlyUnresolved: true,
        });
        const result = await executeNextTask(supabase, project.id, "cron");
        runs.push({
          project_id: project.id,
          message: result.message,
          task_id: result.task?.id || null,
          task_status: result.task?.status || null,
          project_status: result.project_status || project.status,
          video_sync_updated: syncResult.updated,
        });
        if (result.task) executed += 1;
      }

      return toJsonResponse({
        message: "Runner executado",
        executed_tasks: executed,
        scanned_projects: activeProjects.length,
        runs,
      });
    }

    if (action === "create_handoff") {
      const projectId = String(body.project_id || "");
      const title = String(body.title || "Tarefa humana necessária");
      const summary = String(body.summary || "Executar tarefa operacional externa");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const handoff = await createHumanHandoffTask(supabase, projectId, title, summary, body.lesson_key || null);
      return toJsonResponse({ handoff, message: "Handoff humano criado" });
    }

    if (action === "record_handoff_update") {
      const taskId = String(body.task_id || "");
      if (!taskId) return toJsonResponse({ error: "task_id é obrigatório" }, 400);

      const status = String(body.status || "blocked");
      const nextFollowUpAt = String(body.next_follow_up_at || taskDueIso(12 * 60));
      const updates: JsonObject = {
        last_response: body.last_response || null,
        next_follow_up_at: status === "completed" ? null : nextFollowUpAt,
        status,
      };

      if (status === "completed") {
        updates.completed_at = nowIso();
      }

      const data = await updateTaskAndMirror(supabase, taskId, updates);

      return toJsonResponse({ task: data, message: "Atualização do handoff registrada" });
    }

    if (action === "publish_project") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const project = await fetchProject(supabase, projectId);
      const { data: tasksRaw, error: tasksError } = await supabase
        .from("school_factory_tasks")
        .select("*")
        .eq("project_id", projectId);
      if (tasksError) throw tasksError;
      const tasks = asArray<FactoryTask>(tasksRaw);

      if (hasBlockedCriticalTasks(tasks)) {
        return toJsonResponse({ error: "Existem tarefas críticas bloqueadas. Publicação negada." }, 400);
      }

      const videoCompliance = evaluateVideoCompliance(tasks);
      if (videoCompliance.blockers.length > 0) {
        return toJsonResponse({
          error: `Compliance de vídeo pendente: ${videoCompliance.blockers.join(" | ")}`,
          video_compliance: videoCompliance,
        }, 400);
      }

      const qaScore = toNumber(asObject(project.qa_report).score, 0);
      const qaMin = toNumber(project.qa_min_score, DEFAULT_QA_MIN_SCORE);
      if (qaScore < qaMin) {
        return toJsonResponse({ error: `QA insuficiente (${qaScore}). Mínimo exigido: ${qaMin}.` }, 400);
      }

      await updateProjectAndMirror(supabase, projectId, {
        status: "published",
        published_at: nowIso(),
      });

      return toJsonResponse({ message: "Projeto publicado com sucesso." });
    }

    if (action === "list_tutor_pack_versions") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const { data, error } = await supabase
        .from("school_factory_tutor_pack_versions")
        .select("*")
        .eq("project_id", projectId)
        .order("version", { ascending: false });
      if (error) throw error;

      return toJsonResponse({ versions: data || [] });
    }

    if (action === "rollback_tutor_pack") {
      const projectId = String(body.project_id || "");
      const versionNumber = toNumber(body.version, -1);
      if (!projectId || versionNumber < 0) {
        return toJsonResponse({ error: "project_id e version são obrigatórios" }, 400);
      }

      const { data: row, error: rowError } = await supabase
        .from("school_factory_tutor_pack_versions")
        .select("*")
        .eq("project_id", projectId)
        .eq("version", versionNumber)
        .single();
      if (rowError) throw rowError;

      const versionRow = row as { tutor_pack: JsonObject };
      const tutorPack = asObject(versionRow.tutor_pack);

      await updateProjectAndMirror(supabase, projectId, { tutor_pack: tutorPack });

      return toJsonResponse({
        message: `Tutor pack revertido para a versão ${versionNumber}`,
        tutor_pack: tutorPack,
      });
    }

    if (action === "project_status") {
      const projectId = String(body.project_id || "");
      if (!projectId) return toJsonResponse({ error: "project_id é obrigatório" }, 400);

      const project = await fetchProject(supabase, projectId);
      const { data: tasksRaw, error: tasksError } = await supabase
        .from("school_factory_tasks")
        .select("*")
        .eq("project_id", projectId)
        .order("priority", { ascending: true })
        .order("created_at", { ascending: true });
      if (tasksError) throw tasksError;

      const tasks = asArray<FactoryTask>(tasksRaw);
      const metrics = { pending: 0, running: 0, completed: 0, blocked: 0, failed: 0 };
      const now = Date.now();
      let overdueTasks = 0;
      let overdueHandoffs = 0;

      const agentDurations: Record<string, { sumMinutes: number; count: number }> = {};
      tasks.forEach((task) => {
        if (task.status in metrics) {
          metrics[task.status as keyof typeof metrics] += 1;
        }

        if (task.due_at && (task.status === "pending" || task.status === "running" || task.status === "blocked")) {
          if (new Date(task.due_at).getTime() < now) {
            overdueTasks += 1;
          }
        }

        if (task.task_type === "human_handoff" && (task.status === "blocked" || task.status === "pending")) {
          if (task.next_follow_up_at && new Date(task.next_follow_up_at).getTime() < now) {
            overdueHandoffs += 1;
          }
        }

        if (task.started_at && task.completed_at && task.assigned_agent) {
          const durationMinutes = (new Date(task.completed_at).getTime() - new Date(task.started_at).getTime()) / 60000;
          if (durationMinutes >= 0) {
            if (!agentDurations[task.assigned_agent]) {
              agentDurations[task.assigned_agent] = { sumMinutes: 0, count: 0 };
            }
            agentDurations[task.assigned_agent].sumMinutes += durationMinutes;
            agentDurations[task.assigned_agent].count += 1;
          }
        }
      });

      const handoffsOpen = tasks.filter(
        (task) => task.task_type === "human_handoff" && (task.status === "blocked" || task.status === "pending"),
      );
      const videoCompliance = evaluateVideoCompliance(tasks);

      const avgExecutionByAgent = Object.entries(agentDurations).map(([agent, data]) => ({
        agent,
        avg_minutes: Number((data.sumMinutes / Math.max(1, data.count)).toFixed(2)),
        completed_tasks: data.count,
      }));

      const { data: versionsRaw, error: versionsError } = await supabase
        .from("school_factory_tutor_pack_versions")
        .select("version, created_at, notes")
        .eq("project_id", projectId)
        .order("version", { ascending: false })
        .limit(20);
      if (versionsError) throw versionsError;

      return toJsonResponse({
        project,
        metrics,
        tasks,
        handoffs_open: handoffsOpen,
        domain_store: getDomainStoreInfo(),
        sla: {
          overdue_tasks: overdueTasks,
          overdue_handoffs: overdueHandoffs,
          avg_execution_by_agent: avgExecutionByAgent,
        },
        video_compliance: videoCompliance,
        costs: {
          budget_limit_usd: toNumber(project.budget_limit_usd, 0),
          budget_spent_usd: toNumber(project.budget_spent_usd, 0),
          budget_remaining_usd: Number((toNumber(project.budget_limit_usd, 0) - toNumber(project.budget_spent_usd, 0)).toFixed(2)),
          hard_stop: Boolean(project.budget_hard_stop ?? true),
        },
        tutor_pack_versions: versionsRaw || [],
      });
    }

    if (action === "domain_store_status") {
      return toJsonResponse({
        domain_store: getDomainStoreInfo(),
        message: "Status do backend de domínio",
      });
    }

    return toJsonResponse({ error: "Ação inválida" }, 400);
  } catch (error) {
    console.error("[school-factory] Error:", error);
    return toJsonResponse({ error: getErrorMessage(error) }, getErrorStatus(error));
  }
});
