import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Languages, Type, ChevronDown, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { supabase } from '@/integrations/supabase/client';

type SupportedLanguage = 'pt-BR' | 'en' | 'es';
type FontSize = 'sm' | 'md' | 'lg';

interface TranscriptSegment {
  text: string;
  startTime: number;
  endTime: number;
}

interface EnhancedCaptionsProps {
  /** Full transcript text */
  transcript: string;
  /** Current playback time in seconds */
  currentTime: number;
  /** Whether captions are visible */
  isVisible: boolean;
  /** Display language */
  language?: SupportedLanguage;
  /** Keywords to highlight (from teaching_moments) */
  keywords?: string[];
  /** Position mode */
  position?: 'overlay' | 'sidebar';
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  'pt-BR': 'PT',
  en: 'EN',
  es: 'ES',
};

/**
 * Splits a transcript string into timed segments.
 * Uses sentence boundaries and estimates timing based on word count.
 */
function buildSegments(transcript: string, wordsPerSecond = 2.5): TranscriptSegment[] {
  if (!transcript.trim()) return [];

  // Split on sentence-ending punctuation while keeping the delimiter
  const raw = transcript
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const segments: TranscriptSegment[] = [];
  let cursor = 0;

  for (const text of raw) {
    const wordCount = text.split(/\s+/).length;
    const duration = Math.max(wordCount / wordsPerSecond, 1);
    segments.push({
      text,
      startTime: cursor,
      endTime: cursor + duration,
    });
    cursor += duration;
  }

  return segments;
}

/**
 * Highlights keywords inside a text string by wrapping them in <mark> spans.
 */
function highlightKeywords(text: string, keywords: string[]): React.ReactNode {
  if (!keywords.length) return text;

  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  const parts = text.split(pattern);

  return parts.map((part, i) => {
    const isKeyword = keywords.some((k) => k.toLowerCase() === part.toLowerCase());
    if (isKeyword) {
      return (
        <span key={i} className="text-amber-400 font-semibold bg-amber-400/15 px-0.5 rounded">
          {part}
        </span>
      );
    }
    return part;
  });
}

// Simple in-memory translation cache
const translationCache = new Map<string, string>();

function cacheKey(text: string, lang: SupportedLanguage): string {
  return `${lang}::${text.slice(0, 120)}`;
}

export function EnhancedCaptions({
  transcript,
  currentTime,
  isVisible,
  language: initialLanguage = 'pt-BR',
  keywords = [],
  position = 'overlay',
}: EnhancedCaptionsProps) {
  const [language, setLanguage] = useState<SupportedLanguage>(initialLanguage);
  const [fontSize, setFontSize] = useState<FontSize>('md');
  const [showControls, setShowControls] = useState(false);
  const [translatedSegments, setTranslatedSegments] = useState<Map<number, string>>(new Map());
  const [translating, setTranslating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  const segments = useMemo(() => buildSegments(transcript), [transcript]);

  const activeIndex = useMemo(() => {
    const idx = segments.findIndex(
      (seg) => currentTime >= seg.startTime && currentTime < seg.endTime
    );
    return idx >= 0 ? idx : segments.length > 0 ? segments.length - 1 : -1;
  }, [segments, currentTime]);

  // Auto-scroll to the active segment
  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeIndex]);

  // Translate the active segment when language changes
  useEffect(() => {
    if (language === 'pt-BR' || activeIndex < 0) return;

    const seg = segments[activeIndex];
    if (!seg) return;

    const key = cacheKey(seg.text, language);
    if (translationCache.has(key)) {
      setTranslatedSegments((prev) => {
        const next = new Map(prev);
        next.set(activeIndex, translationCache.get(key)!);
        return next;
      });
      return;
    }

    let cancelled = false;
    setTranslating(true);

    supabase.functions
      .invoke('content-manager', {
        body: {
          action: 'translate',
          text: seg.text,
          targetLanguage: language,
        },
      })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.translated) {
          translationCache.set(key, data.translated);
          setTranslatedSegments((prev) => {
            const next = new Map(prev);
            next.set(activeIndex, data.translated);
            return next;
          });
        }
      })
      .catch(() => {
        // Translation unavailable — silently fall back to original
      })
      .finally(() => {
        if (!cancelled) setTranslating(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeIndex, language, segments]);

  const getSegmentText = useCallback(
    (index: number, seg: TranscriptSegment): string => {
      if (language !== 'pt-BR' && translatedSegments.has(index)) {
        return translatedSegments.get(index)!;
      }
      return seg.text;
    },
    [language, translatedSegments]
  );

  if (!isVisible || segments.length === 0) return null;

  const isSidebar = position === 'sidebar';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.25 }}
        className={
          isSidebar
            ? 'flex flex-col h-full bg-zinc-900/95 backdrop-blur-md border border-zinc-800 rounded-lg overflow-hidden'
            : 'absolute bottom-14 sm:bottom-16 left-2 right-2 z-10 flex flex-col items-center pointer-events-auto'
        }
      >
        {/* Controls bar */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 ${
            isSidebar
              ? 'border-b border-zinc-800 bg-zinc-900'
              : 'bg-black/80 backdrop-blur-sm rounded-t-lg w-full max-w-2xl justify-between'
          }`}
        >
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              onClick={() => setShowControls((prev) => !prev)}
              title="Configurações de legenda"
            >
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${showControls ? 'rotate-180' : ''}`}
              />
            </Button>

            {/* Language toggle */}
            <ToggleGroup
              type="single"
              value={language}
              onValueChange={(val) => {
                if (val) setLanguage(val as SupportedLanguage);
              }}
              className="gap-0"
            >
              {(Object.keys(LANGUAGE_LABELS) as SupportedLanguage[]).map((lang) => (
                <ToggleGroupItem
                  key={lang}
                  value={lang}
                  className="h-6 px-1.5 text-[10px] data-[state=on]:bg-violet-600 data-[state=on]:text-white text-zinc-400"
                >
                  {LANGUAGE_LABELS[lang]}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="flex items-center gap-1">
            {translating && (
              <Badge variant="outline" className="text-[10px] h-5 border-amber-500/40 text-amber-400">
                <Languages className="h-3 w-3 mr-0.5" />
                ...
              </Badge>
            )}

            {language !== 'pt-BR' && !translating && (
              <Badge variant="outline" className="text-[10px] h-5 border-violet-500/40 text-violet-400">
                <Languages className="h-3 w-3 mr-0.5" />
                {LANGUAGE_LABELS[language]}
              </Badge>
            )}
          </div>
        </div>

        {/* Expandable font-size controls */}
        <AnimatePresence>
          {showControls && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className={`overflow-hidden px-3 py-1.5 flex items-center gap-2 ${
                isSidebar ? 'border-b border-zinc-800 bg-zinc-950' : 'bg-black/80 backdrop-blur-sm w-full max-w-2xl'
              }`}
            >
              <Type className="h-3.5 w-3.5 text-zinc-400" />
              <ToggleGroup
                type="single"
                value={fontSize}
                onValueChange={(val) => {
                  if (val) setFontSize(val as FontSize);
                }}
                className="gap-0"
              >
                <ToggleGroupItem value="sm" className="h-6 px-2 text-[10px] data-[state=on]:bg-zinc-700">
                  A
                </ToggleGroupItem>
                <ToggleGroupItem value="md" className="h-6 px-2 text-xs data-[state=on]:bg-zinc-700">
                  A
                </ToggleGroupItem>
                <ToggleGroupItem value="lg" className="h-6 px-2 text-sm data-[state=on]:bg-zinc-700">
                  A
                </ToggleGroupItem>
              </ToggleGroup>

              {language !== 'pt-BR' && (
                <span className="text-[10px] text-zinc-500 ml-auto">
                  Tradução automática
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Captions content */}
        <ScrollArea
          className={
            isSidebar
              ? 'flex-1 px-3 py-2'
              : 'max-h-28 w-full max-w-2xl bg-black/80 backdrop-blur-sm rounded-b-lg px-3 py-2'
          }
        >
          <div ref={scrollRef} className="space-y-1">
            {segments.map((seg, i) => {
              const isActive = i === activeIndex;
              const displayText = getSegmentText(i, seg);

              return (
                <div
                  key={i}
                  ref={isActive ? activeRef : undefined}
                  className={`transition-all duration-200 rounded px-1.5 py-0.5 ${FONT_SIZE_MAP[fontSize]} ${
                    isActive
                      ? 'text-white bg-violet-600/20 border-l-2 border-violet-500'
                      : 'text-zinc-500'
                  }`}
                >
                  {isActive ? highlightKeywords(displayText, keywords) : displayText}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Toggle button for showing/hiding the enhanced captions panel.
 */
export function EnhancedCaptionsToggle({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={onToggle}
      className="h-11 w-11 sm:h-9 sm:w-9 p-0"
      title={visible ? 'Ocultar legendas' : 'Mostrar legendas'}
    >
      {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
    </Button>
  );
}
