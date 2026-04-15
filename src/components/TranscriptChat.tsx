import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, MessageCircle, Play, Send, Bot, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useBranding } from '@/branding';

interface SearchResult {
  chunk_text: string;
  video_id: string;
  chunk_index: number;
  similarity: number;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  results?: SearchResult[];
  timestamp: Date;
}

interface TranscriptChatProps {
  /** Optional callback when user clicks "Ir para o momento" */
  onNavigateToMoment?: (videoId: string, chunkIndex: number) => void;
  /** Map of video IDs to display titles */
  videoTitles?: Record<string, string>;
}

export function TranscriptChat({ onNavigateToMoment, videoTitles }: TranscriptChatProps) {
  const { config, labels } = useBranding();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading, scrollToBottom]);

  const getVideoTitle = (videoId: string): string => {
    if (videoTitles && videoTitles[videoId]) {
      return videoTitles[videoId];
    }
    return `Vídeo ${videoId.slice(0, 8)}...`;
  };

  const handleSend = async () => {
    const query = inputValue.trim();
    if (!query || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: query,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Step 1: RAG search via pgvector
      const { data, error } = await supabase.functions.invoke('search-transcript', {
        body: { query },
      });

      if (error) {
        throw new Error(error.message || 'Erro ao buscar transcrições');
      }

      const results: SearchResult[] = data?.results ?? [];

      let responseText: string;
      if (results.length === 0) {
        responseText = 'Não encontrei nenhum trecho relevante nas aulas para essa pergunta. Tente reformular ou perguntar sobre outro tema.';
      } else {
        // Step 2: Use Grok to generate conversational answer from RAG results
        try {
          const context = results.map((r, i) => `[Trecho ${i + 1}]: "${r.chunk_text}"`).join('\n\n');
          const { data: grokData } = await supabase.functions.invoke('content-manager', {
            body: {
              action: 'rag_answer',
              query,
              context,
              system_prompt: `Você é o ${config.aiTutorRoleDescription} da escola ${config.brandName}. Responda à pergunta do ${labels.learnerSingular} usando APENAS os trechos fornecidos das ${labels.lessonPlural}. Seja direto, educativo e motivador. Cite qual ${labels.lessonSingular}/trecho quando relevante. Responda em português brasileiro. Se os trechos não cobrirem a pergunta completamente, diga isso. Máximo 3 parágrafos.`
            },
          });
          responseText = grokData?.answer || `Encontrei ${results.length} trecho${results.length > 1 ? 's' : ''} relevante${results.length > 1 ? 's' : ''} nas aulas:`;
        } catch {
          // Fallback se Grok não responder
          responseText = `Encontrei ${results.length} trecho${results.length > 1 ? 's' : ''} relevante${results.length > 1 ? 's' : ''} nas aulas:`;
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: responseText,
        results: results.length > 0 ? results : undefined,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: `Erro ao buscar: ${err instanceof Error ? err.message : 'Erro desconhecido'}. Tente novamente.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatSimilarity = (similarity: number): string => {
    return `${Math.round(similarity * 100)}%`;
  };

  return (
    <Card className="flex flex-col h-full bg-gray-900/80 border-gray-700">
      <CardHeader className="pb-3 border-b border-gray-700">
        <CardTitle className="flex items-center gap-2 text-white text-lg">
          <MessageCircle className="h-5 w-5 text-purple-400" />
          Chat com {labels.lessonPluralTitle}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 min-h-0">
        {/* Messages area */}
        <ScrollArea className="flex-1 px-4 py-3" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-500 py-12">
              <Search className="h-10 w-10 mb-3 text-gray-600" />
              <p className="text-sm text-center">
                Faça perguntas sobre o conteúdo de {labels.lessonPlural}.
                <br />
                A IA vai buscar os trechos mais relevantes.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-7 w-7 rounded-full bg-purple-600/30 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-purple-400" />
                    </div>
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-xl px-4 py-2.5 ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-200'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{msg.text}</p>

                  {msg.results && msg.results.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {msg.results.map((result, idx) => (
                        <div
                          key={`${result.video_id}-${result.chunk_index}`}
                          className="bg-gray-900/60 border border-gray-700 rounded-lg p-3"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-purple-300 font-medium">
                              {getVideoTitle(result.video_id)}
                            </span>
                            <span className="text-xs text-gray-500">
                              Relevância: {formatSimilarity(result.similarity)}
                            </span>
                          </div>

                          <p className="text-sm text-gray-300 leading-relaxed mb-2">
                            "{result.chunk_text}"
                          </p>

                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-purple-400 hover:text-purple-300 hover:bg-purple-900/30"
                            onClick={() =>
                              onNavigateToMoment?.(result.video_id, result.chunk_index)
                            }
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Ir para o momento
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {msg.role === 'user' && (
                  <div className="flex-shrink-0 mt-1">
                    <div className="h-7 w-7 rounded-full bg-gray-700 flex items-center justify-center">
                      <User className="h-4 w-4 text-gray-300" />
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {isLoading && (
              <div className="flex gap-2 justify-start">
                <div className="flex-shrink-0 mt-1">
                  <div className="h-7 w-7 rounded-full bg-purple-600/30 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-purple-400" />
                  </div>
                </div>
                <div className="bg-gray-800 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:0ms]" />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:150ms]" />
                    <div className="h-2 w-2 rounded-full bg-purple-400 animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t border-gray-700 p-3">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Pergunte sobre qualquer ${labels.lessonSingular}...`}
              className="flex-1 bg-gray-800 border-gray-600 text-white placeholder:text-gray-500 focus-visible:ring-purple-500"
              disabled={isLoading}
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || isLoading}
              size="icon"
              className="bg-purple-600 hover:bg-purple-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
