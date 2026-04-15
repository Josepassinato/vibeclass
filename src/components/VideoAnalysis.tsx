import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Youtube, ExternalLink, FileText, ChevronDown, ChevronUp, Upload, X, File, Mic } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface VideoInfo {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  hasTranscript?: boolean;
  transcript?: string | null;
  analysis: string;
}

interface VideoAnalysisProps {
  onVideoAnalyzed: (videoInfo: VideoInfo) => void;
}

export function VideoAnalysis({ onVideoAnalyzed }: VideoAnalysisProps) {
  const [url, setUrl] = useState('');
  const [manualTranscript, setManualTranscript] = useState('');
  const [showTranscriptInput, setShowTranscriptInput] = useState(false);
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Handle audio file upload for Whisper transcription
  const handleAudioUpload = async (file: File) => {
    const validTypes = ['audio/mp3', 'audio/mpeg', 'audio/wav', 'audio/webm', 'audio/mp4', 'audio/m4a', 'audio/ogg'];
    const validExtensions = ['.mp3', '.wav', '.webm', '.m4a', '.ogg', '.mp4'];
    
    const isValidType = validTypes.includes(file.type) || validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));
    
    if (!isValidType) {
      setError('Formato de áudio não suportado. Use MP3, WAV, WEBM, M4A ou OGG.');
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError('Arquivo de áudio muito grande. Máximo 25MB.');
      return;
    }

    setTranscribing(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string)?.split(',')[1];
        
        if (!base64) {
          setError('Erro ao ler o arquivo de áudio');
          setTranscribing(false);
          return;
        }

        try {
          const { data, error: fnError } = await supabase.functions.invoke('transcribe-video', {
            body: { audioBase64: base64 }
          });

          if (fnError) throw new Error(fnError.message);
          if (data.error) throw new Error(data.error);

          if (data.transcript) {
            setManualTranscript(data.transcript);
            setShowTranscriptInput(true);
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Erro ao transcrever áudio');
        } finally {
          setTranscribing(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError('Erro ao processar arquivo de áudio');
      setTranscribing(false);
    }
  };

  // Try to fetch transcript from YouTube
  const handleFetchTranscript = async () => {
    if (!url.trim()) {
      setError('Cole o link do YouTube primeiro');
      return;
    }
    
    setTranscribing(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('transcribe-video', {
        body: { youtubeUrl: url }
      });

      if (fnError) throw new Error(fnError.message);
      
      if (data.transcript) {
        setManualTranscript(data.transcript);
        setShowTranscriptInput(true);
      } else if (data.error) {
        setError(data.suggestion || data.error);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao buscar transcrição');
    } finally {
      setTranscribing(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    const validTypes = [
      'text/plain',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.txt')) {
      setError('Formato não suportado. Use TXT, PDF ou DOCX.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Arquivo muito grande. Máximo 5MB.');
      return;
    }

    setUploadedFile(file);
    setFileLoading(true);
    setError(null);

    try {
      // For text files, read directly
      if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        const text = await file.text();
        setManualTranscript(text);
      } else {
        // For PDF/DOCX, we'll read as base64 and send to edge function for parsing
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = (e.target?.result as string)?.split(',')[1];
          
          // For now, just show a message that they need to copy text
          // In a production app, you'd use a PDF parsing library
          setManualTranscript(`[Arquivo carregado: ${file.name}]\n\nPor favor, copie e cole o texto do documento aqui, ou use um arquivo .txt`);
        };
        reader.readAsDataURL(file);
      }
    } catch (err) {
      setError('Erro ao ler o arquivo');
    } finally {
      setFileLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeFile = () => {
    setUploadedFile(null);
    setManualTranscript('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: fnError } = await supabase.functions.invoke('analyze-youtube', {
        body: { 
          youtubeUrl: url,
          manualTranscript: manualTranscript.trim() || undefined
        }
      });
      
      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);
      
      setVideoInfo(data);
      onVideoAnalyzed(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze video');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Youtube className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
          <Input
            placeholder="Cole o link do YouTube aqui..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            className="pl-9 sm:pl-11 h-10 text-sm"
          />
        </div>
        <Button onClick={handleAnalyze} disabled={loading || !url.trim()} className="h-10 sm:w-auto w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Analisar'}
        </Button>
      </div>

      {/* Manual Transcript Input */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setShowTranscriptInput(!showTranscriptInput)}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <FileText className="h-4 w-4" />
          <span>Adicionar transcrição (colar ou upload)</span>
          {showTranscriptInput ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>
        
        {showTranscriptInput && (
          <div className="space-y-3">
            {/* File Upload Area */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.pdf,.docx,.doc"
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                className="hidden"
              />
              
              {fileLoading ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  <span className="text-sm text-muted-foreground">Carregando arquivo...</span>
                </div>
              ) : uploadedFile ? (
                <div className="flex items-center justify-center gap-2 py-2">
                  <File className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{uploadedFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="p-1 hover:bg-destructive/10 rounded-full transition-colors"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Arraste um arquivo ou <span className="text-primary font-medium">clique para selecionar</span>
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    TXT, PDF, DOCX (máx. 5MB)
                  </p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-xs text-muted-foreground">ou cole o texto</span>
              <div className="flex-1 h-px bg-border" />
            </div>

            {/* Text Area */}
            <Textarea
              placeholder="Cole aqui a transcrição do vídeo (legendas, descrição detalhada, etc.)..."
              value={manualTranscript}
              onChange={(e) => setManualTranscript(e.target.value)}
              className="min-h-[120px] text-sm"
            />
            <p className="text-xs text-muted-foreground">
              💡 Dica: Você pode copiar as legendas do YouTube clicando em "..." → "Mostrar transcrição" no vídeo
            </p>

            {/* Audio transcription options */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleFetchTranscript}
                disabled={transcribing || !url.trim()}
                className="flex items-center justify-center gap-2 h-9 text-xs sm:text-sm"
              >
                {transcribing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Youtube className="h-4 w-4" />
                )}
                <span className="hidden xs:inline">Buscar legendas do YouTube</span>
                <span className="xs:hidden">Buscar legendas</span>
              </Button>

              <span className="text-xs text-muted-foreground hidden sm:block">ou</span>

              <div className="w-full sm:w-auto">
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*,.mp3,.wav,.webm,.m4a,.ogg"
                  onChange={(e) => e.target.files?.[0] && handleAudioUpload(e.target.files[0])}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={transcribing}
                  className="flex items-center justify-center gap-2 h-9 text-xs sm:text-sm w-full sm:w-auto"
                >
                  {transcribing ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="h-4 w-4" />
                  )}
                  <span className="hidden xs:inline">Transcrever áudio (Whisper)</span>
                  <span className="xs:hidden">Transcrever áudio</span>
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      
      {videoInfo && (
        <Card className="overflow-hidden">
          <div className="flex flex-col md:flex-row">
            <div className="relative w-full md:w-64 flex-shrink-0">
              <img 
                src={videoInfo.thumbnail} 
                alt={videoInfo.title}
                className="w-full h-36 md:h-full object-cover"
              />
              <a 
                href={`https://youtube.com/watch?v=${videoInfo.videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="h-8 w-8 text-white" />
              </a>
            </div>
            <div className="flex-1">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg line-clamp-2">{videoInfo.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{videoInfo.author}</p>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h4 className="text-sm font-medium">📚 Pontos principais:</h4>
                    {videoInfo.hasTranscript ? (
                      <span className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2 py-0.5 rounded-full">
                        ✓ Baseado na transcrição
                      </span>
                    ) : (
                      <span className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 px-2 py-0.5 rounded-full">
                        ⚠️ Baseado apenas no título
                      </span>
                    )}
                  </div>
                  
                  {!videoInfo.hasTranscript && (
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 mb-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        <strong>⚠️ Não foi possível acessar as legendas deste vídeo.</strong>
                        <br />
                        Para uma análise precisa, clique em "Adicionar transcrição" acima e:
                        <br />• Cole as legendas manualmente, ou
                        <br />• Faça upload de um arquivo de texto, ou
                        <br />• Envie o áudio para transcrição via Whisper
                      </p>
                    </div>
                  )}
                  
                  <div className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {videoInfo.analysis}
                  </div>
                </div>
              </CardContent>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
