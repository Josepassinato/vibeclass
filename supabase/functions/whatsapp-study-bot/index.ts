import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// ── Types ──────────────────────────────────────────────────────────────────

interface StudentProfile {
  id: string;
  name: string;
  phone: string;
  xp: number;
  streak: number;
}

interface LessonProgress {
  lesson_id: string;
  module_id: string;
  completed: boolean;
  completed_at: string | null;
  lesson_title: string;
  module_title: string;
}

interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
}

// ── Grok helper ────────────────────────────────────────────────────────────

async function callGrok(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("XAI_API_KEY");
  if (!apiKey) throw new Error("XAI_API_KEY not configured");

  const response = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "grok-3-mini-fast",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Grok API error ${response.status}: ${errorBody}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "Desculpe, nao consegui gerar uma resposta.";
}

// ── TwiML helper ───────────────────────────────────────────────────────────

function twiml(message: string): Response {
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>${escapeXml(message)}</Message>
</Response>`;

  return new Response(xml, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/xml; charset=utf-8",
    },
  });
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ── Command handlers ───────────────────────────────────────────────────────

async function handleResumo(
  supabase: ReturnType<typeof createClient>,
  student: StudentProfile
): Promise<string> {
  // Fetch last completed lesson
  const { data: progress, error } = await supabase
    .from("lesson_progress")
    .select("lesson_id, module_id, completed_at, lessons(title, content), modules(title)")
    .eq("student_id", student.id)
    .eq("completed", true)
    .order("completed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !progress) {
    return "Voce ainda nao completou nenhuma aula. Comece sua primeira aula na plataforma! 🚀";
  }

  const lessonTitle = progress.lessons?.title ?? "Aula";
  const moduleTitle = progress.modules?.title ?? "Modulo";
  const lessonContent = progress.lessons?.content ?? "";

  // Use Grok to summarize
  const summary = await callGrok(
    "Voce e um tutor educacional da plataforma Vibe Class. Faca um resumo curto (max 300 caracteres) da ultima aula do aluno. Seja amigavel e use emojis. Responda em portugues.",
    `Aula: "${lessonTitle}" do modulo "${moduleTitle}". Conteudo: ${lessonContent.substring(0, 500)}`
  );

  return `📚 *Resumo da sua ultima aula*\n\n🎯 ${lessonTitle} (${moduleTitle})\n\n${summary}`;
}

async function handleQuiz(
  supabase: ReturnType<typeof createClient>,
  student: StudentProfile
): Promise<string> {
  // Fetch current module progress
  const { data: currentLesson } = await supabase
    .from("lesson_progress")
    .select("module_id, modules(title)")
    .eq("student_id", student.id)
    .eq("completed", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const moduleTitle = currentLesson?.modules?.title ?? "Programacao";

  // Generate quiz via Grok
  const quizResponse = await callGrok(
    `Voce e um tutor da Vibe Class. Crie UMA pergunta de quiz rapida sobre "${moduleTitle}".
Formato EXATO (sem markdown):
PERGUNTA: [pergunta aqui]
A) [opcao A]
B) [opcao B]
C) [opcao C]
D) [opcao D]
RESPOSTA: [letra correta]
Responda em portugues. Seja breve e educativo.`,
    `Crie uma pergunta de quiz sobre o modulo "${moduleTitle}" para testar o conhecimento do aluno.`
  );

  return `🧠 *Quiz Rapido*\n\n${quizResponse}\n\n_Responda com a letra (A, B, C ou D)!_`;
}

async function handleStreak(
  supabase: ReturnType<typeof createClient>,
  student: StudentProfile
): Promise<string> {
  // Fetch XP and streak from student profile
  const { data: stats } = await supabase
    .from("student_stats")
    .select("total_xp, current_streak, lessons_completed, quizzes_completed")
    .eq("student_id", student.id)
    .maybeSingle();

  const xp = stats?.total_xp ?? student.xp ?? 0;
  const streak = stats?.current_streak ?? student.streak ?? 0;
  const lessonsCompleted = stats?.lessons_completed ?? 0;
  const quizzesCompleted = stats?.quizzes_completed ?? 0;

  // Streak emojis
  const fire = streak >= 7 ? "🔥🔥🔥" : streak >= 3 ? "🔥🔥" : streak >= 1 ? "🔥" : "❄️";

  return `📊 *Seu Progresso*\n\n${fire} Streak: *${streak} dias*\n⭐ XP Total: *${xp} XP*\n📚 Aulas completas: *${lessonsCompleted}*\n🧠 Quizzes feitos: *${quizzesCompleted}*\n\n${streak >= 7 ? "Incrivel! Voce esta arrasando! 💪" : streak >= 3 ? "Muito bem, continue assim! 🎯" : streak >= 1 ? "Bom inicio! Mantenha o ritmo! 🚀" : "Comece uma aula hoje para iniciar seu streak! 📖"}`;
}

async function handleProxima(
  supabase: ReturnType<typeof createClient>,
  student: StudentProfile
): Promise<string> {
  // Find next incomplete lesson
  const { data: nextLesson } = await supabase
    .from("lesson_progress")
    .select("lesson_id, lessons(title, order_index), module_id, modules(title)")
    .eq("student_id", student.id)
    .eq("completed", false)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!nextLesson) {
    // Check if there are any lessons they haven't started
    const { data: availableLesson } = await supabase
      .from("lessons")
      .select("id, title, module_id, modules(title)")
      .not("id", "in", `(SELECT lesson_id FROM lesson_progress WHERE student_id = '${student.id}')`)
      .order("order_index", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (availableLesson) {
      return `📖 *Proxima Aula*\n\n🎯 ${availableLesson.title}\n📂 Modulo: ${availableLesson.modules?.title ?? "Geral"}\n\nAcesse a plataforma para comecar! 🚀\nhttps://escola.12brain.org`;
    }

    return "🎉 *Parabens!* Voce completou todas as aulas disponiveis! Fique de olho, novos conteudos estao chegando!";
  }

  const lessonTitle = nextLesson.lessons?.title ?? "Proxima aula";
  const moduleTitle = nextLesson.modules?.title ?? "Modulo";

  return `📖 *Proxima Aula*\n\n🎯 ${lessonTitle}\n📂 Modulo: ${moduleTitle}\n\nAcesse a plataforma para continuar! 🚀\nhttps://escola.12brain.org`;
}

function handleAjuda(): string {
  return `🤖 *Comandos disponiveis:*\n
📚 *resumo* — Resumo da sua ultima aula
🧠 *quiz* — Pergunta rapida do seu modulo atual
📊 *streak* — Seu streak e XP atuais
📖 *proxima* — Qual aula assistir agora
❓ *ajuda* — Lista de comandos\n
_Envie qualquer comando para comecar!_`;
}

// ── Parse Twilio WhatsApp body ─────────────────────────────────────────────

function parseTwilioBody(body: string): { from: string; message: string } {
  const params = new URLSearchParams(body);
  const from = params.get("From") ?? "";
  const message = params.get("Body")?.trim().toLowerCase() ?? "";

  // Twilio WhatsApp format: "whatsapp:+5511999999999"
  const phone = from.replace("whatsapp:", "").replace("+", "");

  return { from: phone, message };
}

// ── Lookup student by phone ────────────────────────────────────────────────

async function findStudentByPhone(
  supabase: ReturnType<typeof createClient>,
  phone: string
): Promise<StudentProfile | null> {
  // Try multiple phone formats
  const phoneVariants = [
    phone,
    `+${phone}`,
    phone.startsWith("55") ? phone.substring(2) : `55${phone}`,
  ];

  for (const variant of phoneVariants) {
    const { data } = await supabase
      .from("profiles")
      .select("id, name, phone, xp, streak")
      .or(`phone.eq.${variant},phone.eq.+${variant}`)
      .maybeSingle();

    if (data) return data as StudentProfile;
  }

  return null;
}

// ── Main handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  // Handle CORS preflight
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  // Only accept POST (Twilio sends POST for webhooks)
  if (req.method !== "POST") {
    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse incoming Twilio webhook (application/x-www-form-urlencoded)
    const rawBody = await req.text();
    const { from, message } = parseTwilioBody(rawBody);

    if (!from || !message) {
      return twiml("Nao consegui entender sua mensagem. Digite *ajuda* para ver os comandos.");
    }

    // Find student by phone number
    const student = await findStudentByPhone(supabase, from);

    if (!student) {
      return twiml(
        "Nao encontrei seu cadastro. Acesse https://escola.12brain.org para se registrar com seu numero de WhatsApp. 📱"
      );
    }

    // Normalize command (remove accents for matching)
    const command = message
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();

    // Route commands
    let responseText: string;

    switch (command) {
      case "resumo":
        responseText = await handleResumo(supabase, student);
        break;

      case "quiz":
        responseText = await handleQuiz(supabase, student);
        break;

      case "streak":
        responseText = await handleStreak(supabase, student);
        break;

      case "proxima":
      case "próxima":
        responseText = await handleProxima(supabase, student);
        break;

      case "ajuda":
      case "help":
      case "oi":
      case "ola":
      case "menu":
        responseText = handleAjuda();
        break;

      default:
        // For unknown commands, use Grok to generate a helpful response
        responseText = await callGrok(
          `Voce e o bot de estudos da Vibe Class no WhatsApp. O aluno "${student.name}" enviou uma mensagem que nao e um comando conhecido. Responda de forma amigavel e breve (max 200 caracteres) e lembre-o dos comandos: resumo, quiz, streak, proxima, ajuda. Responda em portugues.`,
          message
        );
        break;
    }

    return twiml(responseText);
  } catch (error) {
    console.error("WhatsApp Study Bot error:", error);
    const errorMsg =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Detail:", errorMsg);

    return twiml(
      "Ops, tive um probleminha tecnico. 😅 Tente novamente em alguns instantes."
    );
  }
});
