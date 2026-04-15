import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    if (!GOOGLE_API_KEY) {
      throw new Error("GOOGLE_API_KEY is not configured");
    }

    const { systemInstruction } = await req.json().catch(() => ({}));

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Discover a Live-compatible model dynamically.
    // The WS endpoint (BidiGenerateContent) requires models that include "bidiGenerateContent"
    // in supportedGenerationMethods.
    let chosenModel: string | null = null;
    let supportsToolCalling = true;

    try {
      const listResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${GOOGLE_API_KEY}`,
        { method: "GET" },
      );

      if (listResp.ok) {
        const listJson = await listResp.json();
        const models: Array<{ name?: string; supportedGenerationMethods?: string[] }> =
          Array.isArray(listJson?.models) ? listJson.models : [];

        // Filter for bidiGenerateContent support
        const allBidiModels = models
          .filter((m) => (m.supportedGenerationMethods || []).includes("bidiGenerateContent"))
          .map((m) => m.name)
          .filter((n): n is string => typeof n === "string" && n.length > 0);

        console.log("[gemini-token] All bidi models available:", allBidiModels);

        // Filter out models that don't support function calling
        // - native-audio models: no function calling support
        // - image-generation models: not suitable for audio conversation
        const toolCompatibleModels = allBidiModels.filter(
          (m) =>
            !m.includes("native-audio") &&
            !m.includes("native_audio") &&
            !m.includes("image-generation") &&
            !m.includes("image_generation")
        );

        console.log("[gemini-token] Tool-compatible bidi models:", toolCompatibleModels);

        // Prefer historically common IDs first if they exist for this key.
        // These are known to support both bidiGenerateContent AND function calling.
        const preferred = [
          "models/gemini-2.0-flash-exp",
          "models/gemini-2.0-flash-live-preview-04-09",
          "models/gemini-2.0-flash-live-preview",
          "models/gemini-live-2.5-flash-preview",
        ];

        // Try to find a tool-compatible model first
        chosenModel =
          preferred.find((p) => toolCompatibleModels.includes(p)) ??
          toolCompatibleModels.find((m) => m.includes("flash") && m.includes("live")) ??
          toolCompatibleModels.find((m) => m.includes("flash")) ??
          toolCompatibleModels[0] ??
          null;

        // If no tool-compatible model found, fall back to native-audio (without tools)
        if (!chosenModel && allBidiModels.length > 0) {
          console.log("[gemini-token] No tool-compatible model found, falling back to native-audio");
          // Prefer native-audio-latest or any native-audio model
          chosenModel = 
            allBidiModels.find((m) => m.includes("native-audio") && m.includes("latest")) ??
            allBidiModels.find((m) => m.includes("native-audio")) ??
            allBidiModels[0];
          supportsToolCalling = false;
        }

        console.log(
          "[gemini-token] Final selection - model:",
          chosenModel,
          "supportsToolCalling:",
          supportsToolCalling,
        );
      } else {
        const t = await listResp.text();
        console.warn("[gemini-token] ListModels failed:", listResp.status, t);
      }
    } catch (e) {
      console.warn("[gemini-token] ListModels error:", e);
    }

    if (!chosenModel) {
      throw new Error(
        "Nenhum modelo compatível com bidiGenerateContent foi encontrado. " +
        "Verifique se a API Live/Realtime está habilitada para a chave e tente novamente.",
      );
    }

    console.log("[gemini-token] Returning token with model:", chosenModel);
    
    return new Response(
      JSON.stringify({ 
        token: GOOGLE_API_KEY,
        expiresAt: expireTime,
        model: chosenModel,
        supportsToolCalling,
        systemInstruction: systemInstruction || "Você é um professor amigável e didático. Seu objetivo é ensinar de forma clara e envolvente. Quando o aluno mencionar um vídeo ou conteúdo, analise e explique os pontos principais de forma acessível. Fale em português brasileiro.",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
