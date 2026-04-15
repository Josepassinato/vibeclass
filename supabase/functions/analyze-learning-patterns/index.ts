import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * ANALYZE LEARNING PATTERNS
 *
 * Runs after each tutoring session. Analyzes student data to generate
 * learning insights, update concept mastery, and identify risks.
 * Uses Grok for intelligent analysis.
 */

interface AnalysisRequest {
  student_id: string;
  video_id?: string;
  session_id?: string;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { student_id, video_id, session_id }: AnalysisRequest = await req.json();

    if (!student_id) {
      return new Response(
        JSON.stringify({ error: "student_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) throw new Error("XAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[analyze-patterns] Starting analysis for student ${student_id}`);

    // Gather all student data
    const [profileRes, quizRes, observationsRes, conversationsRes, existingInsightsRes] = await Promise.all([
      supabase.from("student_profiles").select("*").eq("student_id", student_id).maybeSingle(),
      supabase.from("student_quiz_results").select("*").eq("student_id", student_id).order("completed_at", { ascending: false }).limit(20),
      supabase.from("student_observations").select("*").eq("student_id", student_id).order("created_at", { ascending: false }).limit(30),
      supabase.from("tutor_conversations").select("*").eq("student_id", student_id).order("created_at", { ascending: false }).limit(20),
      supabase.from("learning_insights").select("*").eq("student_id", student_id).eq("is_active", true),
    ]);

    const profile = profileRes.data;
    const quizResults = quizRes.data || [];
    const observations = observationsRes.data || [];
    const conversations = conversationsRes.data || [];
    const existingInsights = existingInsightsRes.data || [];

    // Build analysis prompt
    const analysisData = {
      profile: profile ? {
        name: profile.name,
        learning_style: profile.learning_style,
        strengths: profile.strengths,
        areas_to_improve: profile.areas_to_improve,
        interaction_count: profile.interaction_count,
        total_study_time_minutes: profile.total_study_time_minutes,
      } : null,
      quiz_performance: quizResults.map(q => ({
        score: q.score_percentage,
        passed: q.passed,
        total_questions: q.total_questions,
        correct: q.correct_answers,
        date: q.completed_at,
      })),
      emotional_observations: observations
        .filter(o => o.emotional_state)
        .map(o => ({
          emotion: o.emotional_state,
          context: o.context,
          confidence: o.confidence_level,
          date: o.created_at,
        })),
      recent_conversations: conversations.slice(0, 10).map(c => ({
        role: c.role,
        content: c.content?.substring(0, 200),
      })),
      existing_insights: existingInsights.map(i => ({
        type: i.insight_type,
        title: i.title,
        content: i.content,
      })),
    };

    const systemPrompt = `Você é um ANALISTA PEDAGÓGICO especializado em educação personalizada.
Analise os dados do aluno e gere insights acionáveis.

REGRAS:
1. Seja específico — não diga "o aluno precisa melhorar", diga exatamente O QUÊ
2. Identifique PADRÕES, não eventos isolados
3. Considere insights existentes — atualize ou invalide se necessário
4. Gere no máximo 5 insights novos por análise
5. Identifique conceitos específicos que o aluno domina ou não

Retorne JSON no formato:
{
  "insights": [
    {
      "type": "strength|weakness|pattern|recommendation|milestone|risk|emotional_pattern",
      "category": "quiz_performance|engagement|comprehension|emotional|study_habits",
      "title": "Título curto",
      "content": "Descrição detalhada do insight",
      "confidence": 0.0-1.0
    }
  ],
  "concepts": [
    {
      "name": "nome do conceito",
      "mastery_estimate": 0.0-1.0,
      "evidence": "por que esse nível"
    }
  ],
  "profile_updates": {
    "learning_style": "visual|auditivo|cinestésico|leitura|misto" or null,
    "strengths": ["..."] or null,
    "areas_to_improve": ["..."] or null,
    "personality_notes": "..." or null
  },
  "invalidated_insights": ["título do insight que não é mais válido"]
}`;

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
          { role: "user", content: `DADOS DO ALUNO:\n${JSON.stringify(analysisData, null, 2)}` },
        ],
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[analyze-patterns] Grok error:", response.status, err);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    let analysis;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("No JSON in response");
      analysis = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error("[analyze-patterns] Parse error:", parseErr);
      console.error("[analyze-patterns] Content:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse analysis", partial: content.substring(0, 500) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Apply results
    const results = { insights_created: 0, concepts_updated: 0, profile_updated: false, insights_invalidated: 0 };

    // 1. Save new insights
    if (analysis.insights?.length > 0) {
      const insightRows = analysis.insights.map((i: any) => ({
        student_id,
        insight_type: i.type || "pattern",
        category: i.category || null,
        title: i.title,
        content: i.content,
        confidence: Math.min(1, Math.max(0, i.confidence || 0.5)),
        is_active: true,
      }));

      const { error: insErr } = await supabase.from("learning_insights").insert(insightRows);
      if (insErr) console.error("[analyze-patterns] Insert insights error:", insErr);
      else results.insights_created = insightRows.length;
    }

    // 2. Update concept mastery
    if (analysis.concepts?.length > 0) {
      for (const concept of analysis.concepts) {
        const { error: cmErr } = await supabase.from("concept_mastery").upsert(
          {
            student_id,
            concept: concept.name,
            mastery_level: Math.min(1, Math.max(0, concept.mastery_estimate || 0)),
            last_assessed_at: new Date().toISOString(),
            metadata: { evidence: concept.evidence },
            updated_at: new Date().toISOString(),
          },
          { onConflict: "student_id,concept" }
        );
        if (cmErr) console.error("[analyze-patterns] Upsert concept error:", cmErr);
        else results.concepts_updated++;
      }
    }

    // 3. Update profile
    if (analysis.profile_updates && profile) {
      const updates: Record<string, any> = {};
      if (analysis.profile_updates.learning_style) updates.learning_style = analysis.profile_updates.learning_style;
      if (analysis.profile_updates.strengths) updates.strengths = analysis.profile_updates.strengths;
      if (analysis.profile_updates.areas_to_improve) updates.areas_to_improve = analysis.profile_updates.areas_to_improve;
      if (analysis.profile_updates.personality_notes) updates.personality_notes = analysis.profile_updates.personality_notes;

      if (Object.keys(updates).length > 0) {
        const { error: upErr } = await supabase
          .from("student_profiles")
          .update(updates)
          .eq("id", profile.id);
        if (upErr) console.error("[analyze-patterns] Update profile error:", upErr);
        else results.profile_updated = true;
      }
    }

    // 4. Invalidate outdated insights
    if (analysis.invalidated_insights?.length > 0) {
      for (const title of analysis.invalidated_insights) {
        const { error: invErr } = await supabase
          .from("learning_insights")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("student_id", student_id)
          .eq("title", title)
          .eq("is_active", true);
        if (invErr) console.error("[analyze-patterns] Invalidate insight error:", invErr);
        else results.insights_invalidated++;
      }
    }

    console.log(`[analyze-patterns] Completed for ${student_id}:`, results);

    return new Response(
      JSON.stringify({ ok: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[analyze-patterns] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
