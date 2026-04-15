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

async function fetchTranscriptViaYouTubeAPI(videoId: string, apiKey: string): Promise<string | null> {
  try {
    console.log("Attempting YouTube Data API for video:", videoId);
    
    // Step 1: Get caption track list
    const captionsListUrl = `https://www.googleapis.com/youtube/v3/captions?part=snippet&videoId=${videoId}&key=${apiKey}`;
    const captionsResponse = await fetch(captionsListUrl);
    
    if (!captionsResponse.ok) {
      const errorText = await captionsResponse.text();
      console.log("YouTube API captions list failed:", captionsResponse.status, errorText);
      return null;
    }
    
    const captionsData = await captionsResponse.json();
    console.log("YouTube API found captions:", captionsData.items?.length || 0);
    
    if (!captionsData.items || captionsData.items.length === 0) {
      console.log("No captions available via YouTube API");
      return null;
    }
    
    // Prefer Portuguese, then English, then any
    let selectedCaption = captionsData.items.find((c: any) => 
      c.snippet.language === 'pt' || c.snippet.language === 'pt-BR'
    );
    if (!selectedCaption) {
      selectedCaption = captionsData.items.find((c: any) => 
        c.snippet.language?.startsWith('pt')
      );
    }
    if (!selectedCaption) {
      selectedCaption = captionsData.items.find((c: any) => 
        c.snippet.language === 'en' || c.snippet.language?.startsWith('en')
      );
    }
    if (!selectedCaption) {
      selectedCaption = captionsData.items[0];
    }
    
    console.log("Selected caption track:", selectedCaption.snippet.language, selectedCaption.id);
    
    // Note: Downloading caption tracks requires OAuth, so we fall back to other methods
    // But having the caption info confirms the video HAS captions
    return null; // Will try scraping next with confirmation that captions exist
  } catch (error) {
    console.error("YouTube API error:", error);
    return null;
  }
}

async function fetchTranscriptViaScraping(videoId: string): Promise<string | null> {
  try {
    console.log("Attempting YouTube page scraping for video:", videoId);
    
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const pageResponse = await fetch(watchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      }
    });
    
    if (!pageResponse.ok) {
      console.log("Failed to fetch YouTube page:", pageResponse.status);
      return null;
    }
    
    const html = await pageResponse.text();
    
    // Try to extract captions URL from playerCaptionsTracklistRenderer
    const captionMatch = html.match(/"captionTracks":\s*(\[.*?\])/s);
    if (captionMatch) {
      try {
        const captionTracks = JSON.parse(captionMatch[1]);
        
        if (captionTracks && captionTracks.length > 0) {
          console.log("Found caption tracks via scraping:", captionTracks.length);
          
          // Prefer Portuguese, then English, then any available
          let selectedTrack = captionTracks.find((t: any) => t.languageCode === 'pt' || t.languageCode === 'pt-BR');
          if (!selectedTrack) {
            selectedTrack = captionTracks.find((t: any) => t.languageCode?.startsWith('pt'));
          }
          if (!selectedTrack) {
            selectedTrack = captionTracks.find((t: any) => t.languageCode === 'en' || t.languageCode?.startsWith('en'));
          }
          if (!selectedTrack) {
            selectedTrack = captionTracks[0];
          }
          
          const captionUrl = selectedTrack.baseUrl;
          if (captionUrl) {
            console.log("Fetching captions from URL for language:", selectedTrack.languageCode);
            const captionResponse = await fetch(captionUrl);
            
            if (captionResponse.ok) {
              const captionXml = await captionResponse.text();
              const transcript = parseTranscriptXml(captionXml);
              
              if (transcript && transcript.length > 200) {
                console.log("Transcript extracted via scraping:", transcript.length, "chars");
                return transcript.length > 15000 ? transcript.substring(0, 15000) + '...' : transcript;
              }
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse caption tracks:", e);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Scraping error:", error);
    return null;
  }
}

async function fetchTranscriptViaTimedText(videoId: string): Promise<string | null> {
  console.log("Attempting direct timedtext API...");
  
  const languages = ['pt', 'pt-BR', 'en', 'a.pt', 'a.en'];
  
  for (const lang of languages) {
    const timedTextUrl = `https://www.youtube.com/api/timedtext?v=${videoId}&lang=${lang}`;
    
    try {
      const ttResponse = await fetch(timedTextUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });
      
      if (ttResponse.ok) {
        const xml = await ttResponse.text();
        
        if (xml && xml.includes('<text')) {
          const transcript = parseTranscriptXml(xml);
          
          if (transcript && transcript.length > 200) {
            console.log(`Transcript found via timedtext API (${lang}):`, transcript.length, "chars");
            return transcript.length > 15000 ? transcript.substring(0, 15000) + '...' : transcript;
          }
        }
      }
    } catch (e) {
      console.log(`timedtext API failed for ${lang}:`, e);
    }
  }
  
  return null;
}

async function fetchTranscriptViaThirdParty(videoId: string): Promise<string | null> {
  console.log("Attempting third-party transcript service...");
  
  try {
    const transcriptApiUrl = `https://youtubetranscript.com/?server_vid2=${videoId}`;
    const response = await fetch(transcriptApiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      }
    });
    
    if (response.ok) {
      const html = await response.text();
      const transcript = parseTranscriptXml(html);
      
      if (transcript && transcript.length > 200) {
        console.log("Transcript found via third-party:", transcript.length, "chars");
        return transcript.length > 15000 ? transcript.substring(0, 15000) + '...' : transcript;
      }
    }
  } catch (e) {
    console.log("Third-party service failed:", e);
  }
  
  return null;
}

function parseTranscriptXml(xml: string): string {
  const textMatches = xml.matchAll(/<text[^>]*>([^<]*)<\/text>/g);
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
  
  return texts.join(' ');
}

async function fetchTranscript(videoId: string, googleApiKey?: string): Promise<string | null> {
  // Try multiple methods in order of reliability
  
  // Method 1: YouTube Data API (to check if captions exist)
  if (googleApiKey) {
    await fetchTranscriptViaYouTubeAPI(videoId, googleApiKey);
  }
  
  // Method 2: Direct page scraping (most reliable for getting actual transcript)
  let transcript = await fetchTranscriptViaScraping(videoId);
  if (transcript) return transcript;
  
  // Method 3: Timedtext API
  transcript = await fetchTranscriptViaTimedText(videoId);
  if (transcript) return transcript;
  
  // Method 4: Third-party service
  transcript = await fetchTranscriptViaThirdParty(videoId);
  if (transcript) return transcript;
  
  console.log("No usable transcript found via any method");
  return null;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const XAI_API_KEY = Deno.env.get("XAI_API_KEY");
    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");

    if (!XAI_API_KEY) {
      throw new Error("XAI_API_KEY is not configured");
    }

    const { youtubeUrl, manualTranscript } = await req.json();
    
    if (!youtubeUrl) {
      throw new Error("YouTube URL is required");
    }

    const videoId = extractVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error("Invalid YouTube URL");
    }

    // Get video info using YouTube oEmbed API (no auth required)
    const oembedResponse = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!oembedResponse.ok) {
      throw new Error("Could not fetch video information");
    }

    const videoInfo = await oembedResponse.json();
    
    // Use manual transcript if provided, otherwise try to fetch automatically
    let transcript: string | null = null;
    
    if (manualTranscript && manualTranscript.trim().length > 50) {
      console.log("Using manual transcript:", manualTranscript.length, "chars");
      let cleanTranscript = manualTranscript.trim();
      // Limit to avoid token limits
      if (cleanTranscript.length > 12000) {
        cleanTranscript = cleanTranscript.substring(0, 12000) + '...';
      }
      transcript = cleanTranscript;
    } else {
      console.log("Fetching transcript for video:", videoId);
      transcript = await fetchTranscript(videoId, GOOGLE_API_KEY);
      console.log("Transcript found:", transcript ? `${transcript.length} chars` : "none");
    }

    // Build the analysis prompt
    let prompt: string;
    if (transcript) {
      prompt = `Você é um professor especialista analisando uma vídeo-aula. Analise a TRANSCRIÇÃO REAL do vídeo abaixo e:

1. Identifique os 5 pontos principais abordados
2. Resuma cada ponto de forma clara e didática
3. Destaque conceitos-chave que o aluno deve memorizar

Título: "${videoInfo.title}"
Canal: "${videoInfo.author_name}"

TRANSCRIÇÃO DO VÍDEO:
${transcript}

Responda em português brasileiro com uma análise estruturada baseada no conteúdo REAL do vídeo.`;
    } else {
      prompt = `Você é um professor especialista. Analise este título de vídeo-aula e sugira 5 pontos principais que provavelmente serão abordados:

Título: "${videoInfo.title}"
Canal: "${videoInfo.author_name}"

NOTA: Não foi possível obter a transcrição deste vídeo. A análise é baseada apenas no título.

Responda em português brasileiro com uma lista numerada dos tópicos principais que o aluno deve prestar atenção nesta aula.`;
    }

    // Use Grok API to analyze
    const aiResponse = await fetch(
      "https://api.x.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${XAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-3-mini-fast",
          messages: [{
            role: "user",
            content: prompt
          }],
          max_completion_tokens: 2000
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("Grok API error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 401) {
        throw new Error("Invalid XAI API key.");
      }
      throw new Error("Failed to analyze video");
    }

    const aiData = await aiResponse.json();
    const analysis = aiData.choices?.[0]?.message?.content || "Não foi possível analisar o vídeo.";

    return new Response(
      JSON.stringify({
        videoId,
        title: videoInfo.title,
        author: videoInfo.author_name,
        thumbnail: videoInfo.thumbnail_url,
        hasTranscript: !!transcript,
        transcript: transcript || null, // Include raw transcript for the agent
        analysis
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error analyzing video:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
