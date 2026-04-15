import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * EMBED TRANSCRIPT
 *
 * Splits a video transcript into chunks, generates embeddings via OpenAI,
 * and stores them in transcript_embeddings for RAG search.
 */

const CHUNK_SIZE = 500; // ~500 tokens per chunk
const CHUNK_OVERLAP = 50; // overlap for context continuity

function splitIntoChunks(text: string): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let i = 0;

  while (i < words.length) {
    const chunk = words.slice(i, i + CHUNK_SIZE).join(" ");
    if (chunk.trim()) chunks.push(chunk.trim());
    i += CHUNK_SIZE - CHUNK_OVERLAP;
  }

  return chunks;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { video_id } = await req.json();
    if (!video_id) {
      return new Response(JSON.stringify({ error: "video_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch video transcript
    const { data: video, error: videoError } = await supabase
      .from("videos")
      .select("transcript, title")
      .eq("id", video_id)
      .single();

    if (videoError || !video?.transcript) {
      return new Response(
        JSON.stringify({ error: "Video not found or no transcript" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Delete existing embeddings for this video (re-embed)
    await supabase.from("transcript_embeddings").delete().eq("video_id", video_id);

    // Split transcript into chunks
    const chunks = splitIntoChunks(video.transcript);
    console.log(`[embed-transcript] ${chunks.length} chunks for video ${video_id}`);

    // Generate embeddings in batches of 20
    const BATCH_SIZE = 20;
    let inserted = 0;

    for (let b = 0; b < chunks.length; b += BATCH_SIZE) {
      const batch = chunks.slice(b, b + BATCH_SIZE);

      const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: batch,
        }),
      });

      if (!embResponse.ok) {
        const err = await embResponse.text();
        throw new Error(`OpenAI embeddings failed: ${err}`);
      }

      const embData = await embResponse.json();
      const rows = embData.data.map((item: any, idx: number) => ({
        video_id,
        chunk_text: batch[idx],
        chunk_index: b + idx,
        embedding: JSON.stringify(item.embedding),
        metadata: { title: video.title },
      }));

      const { error: insertError } = await supabase
        .from("transcript_embeddings")
        .insert(rows);

      if (insertError) throw insertError;
      inserted += rows.length;
    }

    console.log(`[embed-transcript] Inserted ${inserted} embeddings`);

    return new Response(
      JSON.stringify({ success: true, chunks: inserted }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[embed-transcript] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
