import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

// Simple admin password - in production, use proper auth
const ADMIN_PASSWORD = Deno.env.get("ADMIN_PASSWORD") || "admin123";

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { action, password, video } = await req.json();

    // Verify admin password
    if (password !== ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ error: "Senha incorreta" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    switch (action) {
      case "list": {
        const { data, error } = await supabase
          .from("videos")
          .select("*")
          .order("lesson_order", { ascending: true });

        if (error) throw error;
        return new Response(
          JSON.stringify({ videos: data }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "add": {
        if (!video?.youtube_id || !video?.title) {
          throw new Error("youtube_id e title são obrigatórios");
        }

        const { data, error } = await supabase
          .from("videos")
          .insert({
            youtube_id: video.youtube_id,
            title: video.title,
            transcript: video.transcript || null,
            analysis: video.analysis || null,
            description: video.description || null,
            duration_minutes: video.duration_minutes || null,
            lesson_order: video.lesson_order || 1,
            teaching_moments: video.teaching_moments || [],
            is_configured: video.is_configured || false,
            thumbnail_url: video.thumbnail_url || `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`,
          })
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ video: data, message: "Aula adicionada com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "update": {
        if (!video?.id) {
          throw new Error("id é obrigatório para atualização");
        }

        // Build update object with only provided fields
        const updateData: Record<string, unknown> = {};
        if (video.title !== undefined) updateData.title = video.title;
        if (video.transcript !== undefined) updateData.transcript = video.transcript;
        if (video.analysis !== undefined) updateData.analysis = video.analysis;
        if (video.description !== undefined) updateData.description = video.description;
        if (video.duration_minutes !== undefined) updateData.duration_minutes = video.duration_minutes;
        if (video.lesson_order !== undefined) updateData.lesson_order = video.lesson_order;
        if (video.thumbnail_url !== undefined) updateData.thumbnail_url = video.thumbnail_url;
        if (video.teaching_moments !== undefined) updateData.teaching_moments = video.teaching_moments;
        if (video.is_configured !== undefined) updateData.is_configured = video.is_configured;
        if (video.is_released !== undefined) updateData.is_released = video.is_released;
        if (video.teacher_intro !== undefined) updateData.teacher_intro = video.teacher_intro;

        const { data, error } = await supabase
          .from("videos")
          .update(updateData)
          .eq("id", video.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(
          JSON.stringify({ video: data, message: "Aula atualizada com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "reorder": {
        // Receive an array of { id, lesson_order } and update all
        const { videos } = await req.json().catch(() => ({ videos: video }));
        const videosToUpdate = videos || video;
        
        if (!Array.isArray(videosToUpdate)) {
          throw new Error("Array de vídeos é obrigatório para reordenação");
        }

        for (const v of videosToUpdate) {
          const { error } = await supabase
            .from("videos")
            .update({ lesson_order: v.lesson_order })
            .eq("id", v.id);
          
          if (error) throw error;
        }

        return new Response(
          JSON.stringify({ message: "Ordem atualizada com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case "delete": {
        if (!video?.id) {
          throw new Error("id é obrigatório para exclusão");
        }

        const { error } = await supabase
          .from("videos")
          .delete()
          .eq("id", video.id);

        if (error) throw error;
        return new Response(
          JSON.stringify({ message: "Vídeo excluído com sucesso" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        throw new Error("Ação inválida");
    }
  } catch (error) {
    console.error("Admin videos error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
