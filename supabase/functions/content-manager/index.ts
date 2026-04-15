import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

interface TeachingMoment {
  timestamp_seconds: number;
  topic: string;
  key_insight: string;
  questions_to_ask: string[];
  discussion_points: string[];
  teaching_approach: string;
  difficulty_level: 'básico' | 'intermediário' | 'avançado';
  estimated_discussion_minutes: number;
}

interface ContentAnalysis {
  teaching_moments: TeachingMoment[];
  summary: string;
  lesson_objectives: string[];
  prerequisites: string[];
  total_estimated_pauses: number;
  recommended_pace: 'lento' | 'moderado' | 'rápido';
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const body = await req.json();
    const { action } = body;

    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    // ── RAG Conversational Answer (Grok) ──────────────────────
    if (action === 'rag_answer') {
      const { query, context, system_prompt } = body;
      const ragResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "grok-3-mini-fast",
          messages: [
            { role: "system", content: system_prompt || "Você é um tutor educacional. Responda usando os trechos fornecidos." },
            { role: "user", content: `Pergunta do aluno: ${query}\n\nTrechos das aulas:\n${context}` },
          ],
          temperature: 0.7,
          max_tokens: 800,
        }),
      });
      const ragData = await ragResponse.json();
      const answer = ragData.choices?.[0]?.message?.content || "Não consegui gerar uma resposta.";
      return new Response(
        JSON.stringify({ answer }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Translation (Grok) ────────────────────────────────────
    if (action === 'translate') {
      const { text, targetLanguage } = body;
      const langMap: Record<string, string> = { 'en': 'English', 'es': 'Spanish', 'pt-BR': 'Brazilian Portuguese' };
      const targetLang = langMap[targetLanguage] || targetLanguage;
      const translateResponse = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${XAI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "grok-3-mini-fast",
          messages: [
            { role: "system", content: `Translate the following text to ${targetLang}. Return ONLY the translated text, no explanations.` },
            { role: "user", content: text },
          ],
          temperature: 0.3,
          max_tokens: 500,
        }),
      });
      const transData = await translateResponse.json();
      const translated = transData.choices?.[0]?.message?.content || text;
      return new Response(
        JSON.stringify({ translated }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Original: Teaching Moments Analysis ───────────────────
    const { transcript, title, analysis, videoDurationMinutes } = body;

    if (!transcript && !analysis) {
      return new Response(
        JSON.stringify({ error: "Transcript or analysis is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const contentToAnalyze = transcript || analysis;
    const estimatedDuration = videoDurationMinutes || 10; // default 10 min

    const systemPrompt = `Você é o AGENTE DE CONTEÚDO PEDAGÓGICO - um especialista em design instrucional e análise de conteúdo educacional.

🎯 SUA MISSÃO:
Analisar profundamente o conteúdo de vídeo-aulas e criar um PLANO DE PAUSAS ESTRATÉGICAS para maximizar o aprendizado. Você instrui o AGENTE PROFESSOR sobre QUANDO pausar e COMO abordar cada momento.

📚 METODOLOGIA DE ANÁLISE:

1. **MAPEAMENTO DE CONCEITOS**
   - Identifique os conceitos-chave apresentados
   - Detecte a hierarquia: conceitos fundamentais → derivados → aplicações
   - Note dependências entre conceitos (A precisa de B para fazer sentido)

2. **IDENTIFICAÇÃO DE PONTOS CRÍTICOS**
   Busque momentos onde:
   - Um conceito NOVO e FUNDAMENTAL é introduzido
   - Há uma TRANSIÇÃO entre tópicos importantes
   - Um EXEMPLO PRÁTICO ilustra a teoria
   - Surge uma CONEXÃO não-óbvia entre ideias
   - O conteúdo apresenta COMPLEXIDADE que merece reflexão
   - Há risco de CONFUSÃO ou SOBRECARGA cognitiva

3. **TIMING ESTRATÉGICO**
   - Distribua pausas de forma equilibrada (não muitas seguidas)
   - Primeira pausa: entre 30s-90s (após estabelecer contexto)
   - Pausas subsequentes: espaçadas em 60-120s dependendo da densidade
   - Última pausa: antes da conclusão para consolidar

4. **INSTRUÇÕES PARA O PROFESSOR**
   Para cada pausa, defina:
   - O QUE verificar (compreensão do aluno)
   - COMO abordar (tom, técnica pedagógica)
   - PERGUNTAS específicas e relevantes ao conteúdo
   - CONEXÕES a fazer com conhecimento prévio

🎯 REGRAS DE QUALIDADE:
- Cada pergunta deve ser ESPECÍFICA ao conteúdo (não genérica)
- Insights devem capturar a ESSÊNCIA do momento
- Abordagem deve ser PRÁTICA e ACIONÁVEL para o professor
- Considere o nível de dificuldade de cada momento`;

    const userPrompt = `ANALISE ESTA VÍDEO-AULA E CRIE UM PLANO DE PAUSAS ESTRATÉGICAS:

📹 TÍTULO: "${title || 'Aula sem título'}"
⏱️ DURAÇÃO ESTIMADA: ${estimatedDuration} minutos

📝 CONTEÚDO/TRANSCRIÇÃO:
${contentToAnalyze}

---

GERE UM PLANO DETALHADO DE PAUSAS. Retorne APENAS JSON válido:

{
  "teaching_moments": [
    {
      "timestamp_seconds": [número - quando pausar em segundos],
      "topic": "[tópico específico sendo abordado neste momento]",
      "key_insight": "[a ideia central que o aluno PRECISA entender aqui]",
      "questions_to_ask": [
        "[pergunta 1 - específica ao conteúdo, não genérica]",
        "[pergunta 2 - que verifica compreensão real]"
      ],
      "discussion_points": [
        "[ponto de discussão que expande o entendimento]",
        "[conexão prática ou exemplo adicional]"
      ],
      "teaching_approach": "[instrução clara para o professor: como abordar este momento, tom a usar, técnica pedagógica recomendada]",
      "difficulty_level": "[básico|intermediário|avançado]",
      "estimated_discussion_minutes": [1-3 minutos sugeridos para esta pausa]
    }
  ],
  "summary": "[resumo do conteúdo principal da aula em 2-3 frases]",
  "lesson_objectives": ["[objetivo 1]", "[objetivo 2]"],
  "prerequisites": ["[conhecimento prévio necessário]"],
  "total_estimated_pauses": [número total de pausas],
  "recommended_pace": "[lento|moderado|rápido - baseado na complexidade do conteúdo]"
}

IMPORTANTE:
- Crie 3-5 momentos de pausa estratégicos
- Timestamps devem estar bem distribuídos ao longo do vídeo
- Cada pausa deve ter PROPÓSITO CLARO e ESPECÍFICO
- Perguntas devem ser IMPOSSÍVEIS de responder sem ter assistido o conteúdo`;

    console.log("[content-manager] Analyzing content for:", title, "Duration:", estimatedDuration, "min");
    
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
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[content-manager] AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error("AI gateway error");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";
    
    console.log("[content-manager] AI response received, length:", content.length);

    // Parse the JSON from the response
    let teachingData: ContentAnalysis;
    try {
      if (!content || content.trim() === "") {
        throw new Error("Empty AI response");
      }
      
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        teachingData = JSON.parse(jsonMatch[0]);
        console.log("[content-manager] Successfully parsed", teachingData.teaching_moments?.length || 0, "teaching moments");
        
        // Validate and enrich the data
        if (teachingData.teaching_moments) {
          teachingData.teaching_moments = teachingData.teaching_moments.map((moment, index) => ({
            ...moment,
            // Ensure all fields exist
            teaching_approach: moment.teaching_approach || "Aborde com calma e verifique compreensão antes de prosseguir.",
            difficulty_level: moment.difficulty_level || 'intermediário',
            estimated_discussion_minutes: moment.estimated_discussion_minutes || 2,
            // Ensure arrays exist
            questions_to_ask: moment.questions_to_ask || ["O que você entendeu sobre este ponto?"],
            discussion_points: moment.discussion_points || ["Reflexão sobre o conceito apresentado"],
          }));
          
          // Sort by timestamp
          teachingData.teaching_moments.sort((a, b) => a.timestamp_seconds - b.timestamp_seconds);
        }
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("[content-manager] Failed to parse AI response:", parseError);
      console.error("[content-manager] Content preview:", content.substring(0, 500));
      
      // Return intelligent fallback based on estimated duration
      const pauseInterval = Math.floor((estimatedDuration * 60) / 4); // 4 pauses distributed
      
      teachingData = {
        teaching_moments: [
          {
            timestamp_seconds: Math.min(45, pauseInterval),
            topic: "Contextualização inicial",
            key_insight: "Compreender o contexto e objetivo principal da aula",
            questions_to_ask: [
              "O que você entendeu como objetivo desta aula?",
              "Como isso se conecta com o que você já sabe?"
            ],
            discussion_points: [
              "Expectativas para o aprendizado",
              "Conexões com experiências anteriores"
            ],
            teaching_approach: "Comece de forma acolhedora, verificando o nível de conhecimento prévio do aluno. Use perguntas abertas.",
            difficulty_level: 'básico',
            estimated_discussion_minutes: 2
          },
          {
            timestamp_seconds: pauseInterval * 2,
            topic: "Conceito central",
            key_insight: "Consolidar o entendimento do tópico principal",
            questions_to_ask: [
              "Pode explicar o conceito principal com suas próprias palavras?",
              "Onde você aplicaria isso na prática?"
            ],
            discussion_points: [
              "Exemplos práticos de aplicação",
              "Desafios comuns ao aplicar o conceito"
            ],
            teaching_approach: "Verifique compreensão profunda. Se houver confusão, use analogias e exemplos do dia a dia.",
            difficulty_level: 'intermediário',
            estimated_discussion_minutes: 3
          },
          {
            timestamp_seconds: pauseInterval * 3,
            topic: "Aplicação e síntese",
            key_insight: "Integrar os conceitos aprendidos e preparar para aplicação",
            questions_to_ask: [
              "Qual foi o ponto mais importante para você?",
              "Que dúvidas ainda restam?"
            ],
            discussion_points: [
              "Próximos passos no aprendizado",
              "Como praticar o que foi aprendido"
            ],
            teaching_approach: "Encoraje reflexão sobre o aprendizado. Celebre o progresso e esclareça dúvidas finais.",
            difficulty_level: 'intermediário',
            estimated_discussion_minutes: 2
          }
        ],
        summary: "Momentos de pausa gerados automaticamente para aprofundamento do aprendizado.",
        lesson_objectives: ["Compreender os conceitos principais", "Aplicar o conhecimento na prática"],
        prerequisites: [],
        total_estimated_pauses: 3,
        recommended_pace: 'moderado'
      };
    }

    // Ensure required fields exist
    teachingData.total_estimated_pauses = teachingData.teaching_moments?.length || 0;
    teachingData.recommended_pace = teachingData.recommended_pace || 'moderado';
    teachingData.lesson_objectives = teachingData.lesson_objectives || [];
    teachingData.prerequisites = teachingData.prerequisites || [];

    console.log("[content-manager] Returning", teachingData.total_estimated_pauses, "teaching moments for", title);

    return new Response(
      JSON.stringify(teachingData),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Content manager error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
