import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const { youtubeUrl, audioBase64 } = await req.json();
    
    // If audio is provided directly as base64, transcribe it
    if (audioBase64) {
      console.log("Transcribing provided audio...");
      
      // Decode base64 to binary
      const binaryString = atob(audioBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Create form data for Whisper API
      const formData = new FormData();
      const blob = new Blob([bytes], { type: 'audio/webm' });
      formData.append('file', blob, 'audio.webm');
      formData.append('model', 'whisper-1');
      formData.append('language', 'pt');
      formData.append('response_format', 'text');
      
      const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });
      
      if (!whisperResponse.ok) {
        const errorText = await whisperResponse.text();
        console.error("Whisper API error:", whisperResponse.status, errorText);
        throw new Error(`Whisper API error: ${whisperResponse.status}`);
      }
      
      const transcript = await whisperResponse.text();
      console.log("Transcription complete:", transcript.length, "chars");
      
      return new Response(
        JSON.stringify({ transcript }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // If YouTube URL provided, try to fetch existing captions
    if (youtubeUrl) {
      const videoId = extractVideoId(youtubeUrl);
      if (!videoId) {
        throw new Error("Invalid YouTube URL");
      }
      
      console.log("Attempting to fetch captions for video:", videoId);
      
      // Try to get captions from YouTube
      const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
      const pageResponse = await fetch(watchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        }
      });
      
      if (!pageResponse.ok) {
        return new Response(
          JSON.stringify({ 
            transcript: null, 
            error: "Could not fetch video page",
            suggestion: "Para uma transcrição precisa, grave o áudio do vídeo e envie diretamente."
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const html = await pageResponse.text();
      
      // Try to extract captions URL
      const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
      if (captionMatch) {
        try {
          const captionTracks = JSON.parse(captionMatch[1]);
          
          if (captionTracks && captionTracks.length > 0) {
            // Prefer Portuguese
            let selectedTrack = captionTracks.find((t: any) => 
              t.languageCode === 'pt' || t.languageCode === 'pt-BR'
            );
            if (!selectedTrack) {
              selectedTrack = captionTracks.find((t: any) => 
                t.languageCode?.startsWith('pt')
              );
            }
            if (!selectedTrack) {
              selectedTrack = captionTracks[0];
            }
            
            const captionUrl = selectedTrack.baseUrl;
            if (captionUrl) {
              const captionResponse = await fetch(captionUrl);
              
              if (captionResponse.ok) {
                const captionXml = await captionResponse.text();
                
                const textMatches = captionXml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
                const texts: string[] = [];
                
                for (const match of textMatches) {
                  let text = match[1]
                    .replace(/&amp;/g, '&')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .replace(/&quot;/g, '"')
                    .replace(/&#39;/g, "'")
                    .replace(/\n/g, ' ')
                    .trim();
                  
                  if (text) {
                    texts.push(text);
                  }
                }
                
                if (texts.length > 0) {
                  const transcript = texts.join(' ');
                  console.log("Caption transcript found:", transcript.length, "chars");
                  
                  return new Response(
                    JSON.stringify({ 
                      transcript,
                      source: 'youtube_captions',
                      language: selectedTrack.languageCode
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                  );
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed to parse caption tracks:", e);
        }
      }
      
      // No captions found
      return new Response(
        JSON.stringify({ 
          transcript: null, 
          error: "Este vídeo não possui legendas disponíveis",
          suggestion: "Para transcrever este vídeo, você pode: 1) Adicionar a transcrição manualmente, ou 2) Usar a função de transcrição por áudio"
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    throw new Error("Either youtubeUrl or audioBase64 is required");
    
  } catch (error) {
    console.error("Error transcribing:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});