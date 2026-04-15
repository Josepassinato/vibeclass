import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * AGENTE AVALIADOR DE MISSÕES
 *
 * Especialista em avaliar evidências de estudantes contra critérios de missões.
 * Retorna: aprovado, revisão necessária, ou rejeitado + score numérico.
 */

interface EvaluationRequest {
  missionTitle: string;
  missionDescription: string;
  missionInstructions: string;
  evaluationCriteria: string[];
  evidenceType: string;
  evidenceText?: string;
  evidenceUrl?: string;
  difficultyLevel: string;
}

interface EvaluationResult {
  status: 'approved' | 'needs_revision' | 'rejected';
  score: number; // 0-100
  criteriaResults: {
    criterion: string;
    met: boolean;
    notes: string;
  }[];
  summary: string;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const request: EvaluationRequest = await req.json();
    
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const systemPrompt = `Você é o AGENTE AVALIADOR - um especialista em avaliação pedagógica de evidências de aprendizado.

🎯 SUA MISSÃO ÚNICA:
Avaliar se a evidência submetida pelo estudante atende aos critérios da missão.

📋 CRITÉRIOS DE AVALIAÇÃO:
1. COMPLETUDE: A evidência cobre todos os pontos solicitados?
2. QUALIDADE: O trabalho demonstra compreensão do conteúdo?
3. ESFORÇO: Há evidência de dedicação e reflexão?
4. APLICAÇÃO: O estudante aplicou corretamente os conceitos?

🏆 CLASSIFICAÇÃO:
- APPROVED (80-100): Atende ou supera os critérios
- NEEDS_REVISION (50-79): Parcialmente atende, precisa de melhorias específicas
- REJECTED (0-49): Não atende aos critérios mínimos

⚠️ REGRAS:
- Seja objetivo e justo
- Considere o nível de dificuldade da missão
- Avalie apenas o que foi pedido, não extrapole
- Forneça notas específicas para cada critério`;

    const userPrompt = `AVALIE ESTA SUBMISSÃO:

📝 MISSÃO: ${request.missionTitle}
📖 DESCRIÇÃO: ${request.missionDescription}
📋 INSTRUÇÕES: ${request.missionInstructions}
📊 NÍVEL: ${request.difficultyLevel}
📎 TIPO DE EVIDÊNCIA: ${request.evidenceType}

✅ CRITÉRIOS A AVALIAR:
${request.evaluationCriteria.map((c, i) => `${i + 1}. ${c}`).join('\n')}

📤 EVIDÊNCIA SUBMETIDA:
${request.evidenceText || request.evidenceUrl || 'Nenhuma evidência textual fornecida'}

---

Retorne APENAS JSON válido no formato:
{
  "status": "approved" | "needs_revision" | "rejected",
  "score": [0-100],
  "criteriaResults": [
    {
      "criterion": "[critério avaliado]",
      "met": true/false,
      "notes": "[observação específica sobre este critério]"
    }
  ],
  "summary": "[resumo da avaliação em 1-2 frases]"
}`;

    console.log("[agent-evaluator] Evaluating submission for:", request.missionTitle);

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
        temperature: 0.3, // Low temperature for consistent evaluation
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[agent-evaluator] AI error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI evaluation failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content || "";

    let result: EvaluationResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON in response");
      }
    } catch {
      console.error("[agent-evaluator] Failed to parse:", content);
      // Fallback evaluation
      result = {
        status: 'needs_revision',
        score: 60,
        criteriaResults: request.evaluationCriteria.map(c => ({
          criterion: c,
          met: false,
          notes: "Avaliação automática indisponível - revise manualmente"
        })),
        summary: "Não foi possível avaliar automaticamente. Revisão manual necessária."
      };
    }

    console.log("[agent-evaluator] Result:", result.status, "Score:", result.score);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[agent-evaluator] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
