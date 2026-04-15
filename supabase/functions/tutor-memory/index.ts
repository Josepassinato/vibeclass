import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * TUTOR MEMORY — Consolidates student memory context for the voice tutor.
 *
 * Actions:
 * - get_context: Returns consolidated memory (profile + conversations + insights + mastery)
 * - save_message: Persists a tutor conversation message
 * - end_session: Triggers learning pattern analysis at session end
 */

interface MemoryRequest {
  action: "get_context" | "save_message" | "save_messages_batch" | "end_session";
  student_id: string;
  video_id?: string;
  session_id?: string;
  // For save_message
  role?: "user" | "assistant";
  content?: string;
  video_timestamp_seconds?: number;
  // For save_messages_batch
  messages?: Array<{
    role: "user" | "assistant";
    content: string;
    video_timestamp_seconds?: number;
  }>;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const request: MemoryRequest = await req.json();
    const { action, student_id, video_id, session_id } = request;

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: "student_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    switch (action) {
      case "get_context": {
        // Call the SQL function that consolidates all memory
        const { data, error } = await supabase.rpc("get_student_memory_context", {
          p_student_id: student_id,
          p_video_id: video_id || null,
        });

        if (error) throw error;

        // Build a compact text context for the system instruction
        const memoryContext = buildTextContext(data);

        return new Response(
          JSON.stringify({ context: memoryContext, raw: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "save_message": {
        if (!request.role || !request.content) {
          return new Response(
            JSON.stringify({ error: "role and content are required" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error } = await supabase.from("tutor_conversations").insert({
          student_id,
          session_id: session_id || crypto.randomUUID(),
          role: request.role,
          content: request.content,
          video_id: video_id || null,
          video_timestamp_seconds: request.video_timestamp_seconds || null,
        });

        if (error) throw error;

        return new Response(
          JSON.stringify({ ok: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "save_messages_batch": {
        if (!request.messages || request.messages.length === 0) {
          return new Response(
            JSON.stringify({ ok: true, saved: 0 }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const sid = session_id || crypto.randomUUID();
        const rows = request.messages.map((m) => ({
          student_id,
          session_id: sid,
          role: m.role,
          content: m.content,
          video_id: video_id || null,
          video_timestamp_seconds: m.video_timestamp_seconds || null,
        }));

        const { error } = await supabase.from("tutor_conversations").insert(rows);
        if (error) throw error;

        console.log(`[tutor-memory] Saved ${rows.length} messages for student ${student_id}`);

        return new Response(
          JSON.stringify({ ok: true, saved: rows.length }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "end_session": {
        // Trigger learning pattern analysis
        // This calls analyze-learning-patterns asynchronously
        const analyzeUrl = `${supabaseUrl}/functions/v1/analyze-learning-patterns`;

        // Fire and forget — don't await
        fetch(analyzeUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ student_id, video_id, session_id }),
        }).catch((err) => {
          console.error("[tutor-memory] Failed to trigger analysis:", err);
        });

        return new Response(
          JSON.stringify({ ok: true, message: "Session ended, analysis triggered" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("[tutor-memory] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

/**
 * Converts raw memory data into a compact text string for the tutor's system instruction.
 * Keeps it under ~1500 chars to not bloat the prompt.
 */
function buildTextContext(data: any): string {
  if (!data) return "";

  const parts: string[] = [];
  const profile = data.profile;

  // Profile summary
  if (profile && profile.student_id) {
    parts.push("=== MEMÓRIA DO ALUNO (PERSISTENTE) ===");
    if (profile.name) parts.push(`Nome: ${profile.name}`);
    if (profile.learning_style) parts.push(`Estilo: ${profile.learning_style}`);
    if (profile.interaction_count > 1) parts.push(`Sessões anteriores: ${profile.interaction_count}`);
    if (profile.total_study_time_minutes > 0) parts.push(`Tempo total de estudo: ${profile.total_study_time_minutes} min`);
    if (profile.strengths?.length) parts.push(`Pontos fortes: ${profile.strengths.join(", ")}`);
    if (profile.areas_to_improve?.length) parts.push(`Áreas a melhorar: ${profile.areas_to_improve.join(", ")}`);
    if (profile.personality_notes) parts.push(`Notas: ${profile.personality_notes}`);
  }

  // Learning insights
  const insights = data.insights || [];
  if (insights.length > 0) {
    parts.push("\n=== INSIGHTS DE APRENDIZAGEM ===");
    for (const i of insights.slice(0, 5)) {
      const prefix = i.insight_type === "strength" ? "+"
        : i.insight_type === "weakness" ? "!"
        : i.insight_type === "recommendation" ? "→"
        : i.insight_type === "risk" ? "⚠"
        : "-";
      parts.push(`${prefix} ${i.title}: ${i.content}`);
    }
  }

  // Weak concepts
  const weakConcepts = data.weak_concepts || [];
  if (weakConcepts.length > 0) {
    parts.push("\n=== CONCEITOS QUE PRECISA REFORÇAR ===");
    for (const c of weakConcepts.slice(0, 5)) {
      const pct = Math.round((c.mastery_level || 0) * 100);
      parts.push(`- ${c.concept} (${pct}% domínio, ${c.total_attempts} tentativas)`);
    }
  }

  // Quiz stats
  const quiz = data.quiz_stats;
  if (quiz && quiz.total_quizzes > 0) {
    parts.push(`\n=== DESEMPENHO EM QUIZZES ===`);
    parts.push(`Média: ${quiz.avg_score}% | Aprovação: ${quiz.pass_rate}% | Total: ${quiz.total_quizzes} quizzes`);
    if (quiz.recent_scores?.length > 0) {
      parts.push(`Últimas notas: ${quiz.recent_scores.join("%, ")}%`);
    }
  }

  // Recent conversation summary (last 3 messages only)
  const convos = data.recent_conversations || [];
  if (convos.length > 0) {
    parts.push("\n=== ÚLTIMAS INTERAÇÕES ===");
    for (const c of convos.slice(0, 3)) {
      const who = c.role === "user" ? "Aluno" : "Tutor";
      const text = c.content.length > 100 ? c.content.substring(0, 100) + "..." : c.content;
      parts.push(`${who}: ${text}`);
    }
  }

  // Emotional patterns from observations
  const observations = data.recent_observations || [];
  const emotionalObs = observations.filter((o: any) => o.emotional_state);
  if (emotionalObs.length > 0) {
    parts.push("\n=== PADRÕES EMOCIONAIS RECENTES ===");
    for (const o of emotionalObs.slice(0, 3)) {
      parts.push(`- ${o.emotional_state}: ${o.context || JSON.stringify(o.observation_data)}`);
    }
  }

  return parts.join("\n");
}
