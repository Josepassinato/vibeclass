import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * VOICE REALTIME TOKEN
 *
 * Returns credentials for the voice tutor.
 * Primary: Grok Voice Agent API (xAI) via ephemeral client secret.
 * Fallback: OpenAI Realtime API via API key passthrough.
 */

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { systemInstruction, provider = "grok" } = await req.json().catch(() => ({}));

    // --- Grok (primary) ---
    if (provider === "grok") {
      const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
      if (!XAI_API_KEY) {
        throw new Error("XAI_API_KEY is not configured");
      }

      console.log("[voice-token] Requesting Grok ephemeral client secret...");

      const tokenResponse = await fetch("https://api.x.ai/v1/realtime/client_secrets", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        console.error("[voice-token] Grok token request failed:", tokenResponse.status, errorText);
        throw new Error(`Grok token failed: ${tokenResponse.status}`);
      }

      const tokenData = await tokenResponse.json();
      const clientSecret = tokenData.value || tokenData.client_secret?.value || tokenData.client_secret || tokenData.token;

      if (!clientSecret) {
        console.error("[voice-token] No client_secret in response:", JSON.stringify(tokenData));
        throw new Error("No client_secret returned from xAI");
      }

      console.log("[voice-token] Grok ephemeral token obtained");

      return new Response(
        JSON.stringify({
          provider: "grok",
          clientSecret,
          wsUrl: "wss://api.x.ai/v1/realtime",
          voice: "Ara",
          systemInstruction: systemInstruction || "Você é um professor amigável e didático. Seu objetivo é ensinar de forma clara e envolvente. Fale em português brasileiro.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // --- OpenAI (fallback) ---
    if (provider === "openai") {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (!OPENAI_API_KEY) {
        throw new Error("OPENAI_API_KEY is not configured");
      }

      console.log("[voice-token] Returning OpenAI API key for Realtime API");

      return new Response(
        JSON.stringify({
          provider: "openai",
          apiKey: OPENAI_API_KEY,
          model: "gpt-4o-realtime-preview-2024-12-17",
          voice: "echo",
          systemInstruction: systemInstruction || "Você é um professor amigável e didático. Seu objetivo é ensinar de forma clara e envolvente. Fale em português brasileiro.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown provider: ${provider}`);

  } catch (error) {
    console.error("[voice-token] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
