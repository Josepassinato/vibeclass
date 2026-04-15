import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * SEARCH TRANSCRIPT — Personalized RAG
 *
 * Receives a query + video_id, generates embedding for the query,
 * and returns the top N most similar transcript chunks via pgvector.
 *
 * If student_id is provided, boosts results related to concepts
 * the student struggles with (from concept_mastery table).
 */

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { query, video_id, match_count = 5, student_id } = await req.json();

    if (!query || !video_id) {
      return new Response(
        JSON.stringify({ error: "query and video_id are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) throw new Error("OPENAI_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Optionally fetch weak concepts for this student
    let weakConcepts: string[] = [];
    if (student_id) {
      const { data: concepts } = await supabase
        .from("concept_mastery")
        .select("concept")
        .eq("student_id", student_id)
        .lt("mastery_level", 0.5)
        .order("mastery_level", { ascending: true })
        .limit(5);

      if (concepts && concepts.length > 0) {
        weakConcepts = concepts.map((c: any) => c.concept);
        console.log(`[search-transcript] Student ${student_id} weak concepts:`, weakConcepts.join(", "));
      }
    }

    // Enhance query with weak concepts for better relevance
    const enhancedQuery = weakConcepts.length > 0
      ? `${query} (conceitos relacionados: ${weakConcepts.join(", ")})`
      : query;

    // Generate embedding for the (possibly enhanced) query
    const embResponse = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "text-embedding-3-small",
        input: enhancedQuery,
      }),
    });

    if (!embResponse.ok) {
      const err = await embResponse.text();
      throw new Error(`OpenAI embeddings failed: ${err}`);
    }

    const embData = await embResponse.json();
    const queryEmbedding = embData.data[0].embedding;

    // Fetch more results to allow re-ranking
    const fetchCount = weakConcepts.length > 0 ? match_count * 2 : match_count;

    // Search using pgvector similarity function
    const { data: chunks, error: searchError } = await supabase.rpc(
      "match_transcript_chunks",
      {
        query_embedding: JSON.stringify(queryEmbedding),
        match_video_id: video_id,
        match_count: fetchCount,
        match_threshold: 0.45, // Slightly lower threshold for personalized search
      }
    );

    if (searchError) throw searchError;

    let rankedChunks = chunks || [];

    // Re-rank: boost chunks that mention weak concepts
    if (weakConcepts.length > 0 && rankedChunks.length > 0) {
      rankedChunks = rankedChunks.map((chunk: any) => {
        const text = (chunk.chunk_text || "").toLowerCase();
        let boost = 0;
        for (const concept of weakConcepts) {
          if (text.includes(concept.toLowerCase())) {
            boost += 0.05; // Boost per matching weak concept
          }
        }
        return { ...chunk, similarity: (chunk.similarity || 0) + boost };
      });

      // Re-sort by boosted similarity
      rankedChunks.sort((a: any, b: any) => (b.similarity || 0) - (a.similarity || 0));

      // Trim back to requested count
      rankedChunks = rankedChunks.slice(0, match_count);
    }

    const personalized = weakConcepts.length > 0;
    console.log(`[search-transcript] Found ${rankedChunks.length} chunks for query: "${query.substring(0, 50)}..."${personalized ? " (personalized)" : ""}`);

    return new Response(
      JSON.stringify({ chunks: rankedChunks, personalized }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[search-transcript] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
