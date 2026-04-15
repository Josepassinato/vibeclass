import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Video, Bot, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface AvatarFeedbackProps {
  text: string;
  mode: 'feedback' | 'intro' | 'encouragement';
  onComplete?: () => void;
}

interface HeyGenSession {
  session_id: string;
  access_token: string;
  url: string;
}

const modeConfig = {
  feedback: {
    gradient: 'from-violet-500/20 to-purple-600/20',
    border: 'border-violet-500/30',
    label: 'Feedback da Missao',
    iconColor: 'text-violet-400',
  },
  intro: {
    gradient: 'from-blue-500/20 to-cyan-600/20',
    border: 'border-blue-500/30',
    label: 'Introducao da Aula',
    iconColor: 'text-blue-400',
  },
  encouragement: {
    gradient: 'from-amber-500/20 to-orange-600/20',
    border: 'border-amber-500/30',
    label: 'Motivacao',
    iconColor: 'text-amber-400',
  },
};

function TypewriterText({ text }: { text: string }) {
  const [visibleWords, setVisibleWords] = useState(0);
  const words = text.split(' ');

  useEffect(() => {
    setVisibleWords(0);
    const interval = setInterval(() => {
      setVisibleWords((prev) => {
        if (prev >= words.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 80);
    return () => clearInterval(interval);
  }, [text, words.length]);

  return (
    <p className="text-sm leading-relaxed text-foreground/90">
      {words.map((word, i) => (
        <motion.span
          key={`${i}-${word}`}
          initial={{ opacity: 0, y: 4 }}
          animate={i < visibleWords ? { opacity: 1, y: 0 } : { opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className="inline-block mr-1"
        >
          {word}
        </motion.span>
      ))}
    </p>
  );
}

export function AvatarFeedback({ text, mode, onComplete }: AvatarFeedbackProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'streaming' | 'fallback' | 'error'>('idle');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const sessionRef = useRef<HeyGenSession | null>(null);
  const mediaSourceRef = useRef<MediaSource | null>(null);

  const config = modeConfig[mode];
  const apiKey = import.meta.env.VITE_HEYGEN_API_KEY;
  const avatarId = import.meta.env.VITE_HEYGEN_AVATAR_ID || 'default';
  const voiceId = import.meta.env.VITE_HEYGEN_VOICE_ID || 'default';

  const initSession = useCallback(async () => {
    if (!apiKey) {
      setStatus('fallback');
      return;
    }

    setStatus('loading');

    try {
      const response = await fetch('https://api.heygen.com/v1/streaming.new', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          quality: 'medium',
          avatar_id: avatarId,
          voice: { voice_id: voiceId },
        }),
      });

      if (!response.ok) {
        throw new Error(`HeyGen API error: ${response.status}`);
      }

      const result = await response.json();
      const session: HeyGenSession = result.data;
      sessionRef.current = session;

      const ws = new WebSocket(session.url);
      wsRef.current = ws;

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'auth',
            token: session.access_token,
          })
        );

        ws.send(
          JSON.stringify({
            type: 'task',
            task_type: 'talk',
            text,
          })
        );
      };

      const mediaSource = new MediaSource();
      mediaSourceRef.current = mediaSource;

      if (videoRef.current) {
        videoRef.current.src = URL.createObjectURL(mediaSource);
      }

      let sourceBuffer: SourceBuffer | null = null;
      const pendingBuffers: ArrayBuffer[] = [];

      mediaSource.addEventListener('sourceopen', () => {
        try {
          sourceBuffer = mediaSource.addSourceBuffer('video/webm; codecs="vp8, opus"');
          sourceBuffer.addEventListener('updateend', () => {
            if (pendingBuffers.length > 0 && sourceBuffer && !sourceBuffer.updating) {
              sourceBuffer.appendBuffer(pendingBuffers.shift()!);
            }
          });
        } catch {
          setStatus('fallback');
        }
      });

      ws.onmessage = (event) => {
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);
          if (msg.type === 'stream_ready') {
            setStatus('streaming');
            setIsPlaying(true);
            videoRef.current?.play();
          } else if (msg.type === 'task_complete') {
            onComplete?.();
          } else if (msg.type === 'error') {
            setStatus('fallback');
          }
        } else if (event.data instanceof ArrayBuffer || event.data instanceof Blob) {
          const handleBuffer = async (buffer: ArrayBuffer) => {
            if (sourceBuffer && !sourceBuffer.updating) {
              sourceBuffer.appendBuffer(buffer);
            } else {
              pendingBuffers.push(buffer);
            }
          };

          if (event.data instanceof Blob) {
            event.data.arrayBuffer().then(handleBuffer);
          } else {
            handleBuffer(event.data);
          }
        }
      };

      ws.onerror = () => {
        setStatus('fallback');
      };

      ws.onclose = () => {
        if (status === 'loading') {
          setStatus('fallback');
        }
      };
    } catch {
      setStatus('fallback');
    }
  }, [apiKey, avatarId, voiceId, text, onComplete, status]);

  useEffect(() => {
    initSession();
    return () => {
      wsRef.current?.close();
      if (mediaSourceRef.current?.readyState === 'open') {
        try {
          mediaSourceRef.current.endOfStream();
        } catch {
          // ignore
        }
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleVideoEnd = () => {
    setIsPlaying(false);
    onComplete?.();
  };

  const isFallback = status === 'fallback' || status === 'error';
  const isLoading = status === 'loading';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`overflow-hidden border ${config.border} bg-gradient-to-br ${config.gradient}`}>
        <CardContent className="p-3">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-7 w-7 border border-border/50">
              <AvatarFallback className="bg-background/50">
                {isFallback ? (
                  <Bot className={`h-4 w-4 ${config.iconColor}`} />
                ) : (
                  <Video className={`h-4 w-4 ${config.iconColor}`} />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground/80">Ray Jane</p>
              <p className="text-[10px] text-muted-foreground">{config.label}</p>
            </div>
            {status === 'streaming' && (
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={toggleMute}
                >
                  {isMuted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={togglePlay}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Content */}
          <AnimatePresence mode="wait">
            {isLoading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-6"
              >
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="h-10 w-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  </div>
                  <p className="text-xs text-muted-foreground animate-pulse">
                    Ray Jane esta preparando...
                  </p>
                </div>
              </motion.div>
            )}

            {status === 'streaming' && (
              <motion.div
                key="video"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <video
                  ref={videoRef}
                  className="w-full rounded-md aspect-video bg-black/50"
                  playsInline
                  autoPlay
                  onEnded={handleVideoEnd}
                />
              </motion.div>
            )}

            {isFallback && (
              <motion.div
                key="fallback"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-2"
              >
                <div className="flex gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className={`h-4 w-4 ${config.iconColor}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0 bg-background/30 rounded-lg p-3">
                    <TypewriterText text={text} />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
