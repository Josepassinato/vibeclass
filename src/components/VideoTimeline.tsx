import { useMemo } from 'react';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface Marker {
  timestamp: number;
  type: 'quiz' | 'moment';
  label?: string;
}

interface VideoTimelineProps {
  /** Current playback time in seconds */
  currentTime: number;
  /** Total video duration in seconds */
  duration: number;
  /** Callback when user seeks to a position */
  onSeek: (seconds: number) => void;
  /** Teaching moment markers */
  teachingMoments?: Array<{ timestamp_seconds: number; topic?: string }>;
  /** Quiz timestamp markers */
  quizTimestamps?: number[];
  /** Additional CSS class */
  className?: string;
}

/**
 * Interactive video timeline with progress and markers
 */
export function VideoTimeline({
  currentTime,
  duration,
  onSeek,
  teachingMoments = [],
  quizTimestamps = [],
  className,
}: VideoTimelineProps) {
  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Combine and sort all markers
  const markers = useMemo<Marker[]>(() => {
    const momentMarkers = teachingMoments.map((m) => ({
      timestamp: m.timestamp_seconds,
      type: 'moment' as const,
      label: m.topic || 'Momento de aprofundamento',
    }));

    const quizMarkers = quizTimestamps.map((t, i) => ({
      timestamp: t,
      type: 'quiz' as const,
      label: `Mini Quiz ${i + 1}`,
    }));

    return [...momentMarkers, ...quizMarkers].sort((a, b) => a.timestamp - b.timestamp);
  }, [teachingMoments, quizTimestamps]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSliderChange = (value: number[]) => {
    const seekTime = (value[0] / 100) * duration;
    onSeek(seekTime);
  };

  return (
    <TooltipProvider>
      <div className={cn('relative w-full', className)}>
        {/* Timeline Slider */}
        <div className="relative">
          <Slider
            value={[progressPercent]}
            onValueChange={handleSliderChange}
            max={100}
            step={0.1}
            className="w-full"
            aria-label="Progresso do vídeo"
          />

          {/* Markers overlay */}
          {duration > 0 && markers.length > 0 && (
            <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none">
              {markers.map((marker, index) => {
                const leftPercent = (marker.timestamp / duration) * 100;
                const isPassed = currentTime >= marker.timestamp;

                return (
                  <Tooltip key={`${marker.type}-${marker.timestamp}-${index}`}>
                    <TooltipTrigger asChild>
                      <button
                        className={cn(
                          'absolute w-3 h-3 rounded-full -translate-x-1/2 pointer-events-auto transition-all hover:scale-125 focus:scale-125 focus:outline-none',
                          marker.type === 'quiz'
                            ? isPassed
                              ? 'bg-google-blue/60'
                              : 'bg-google-blue'
                            : isPassed
                            ? 'bg-google-yellow/60'
                            : 'bg-google-yellow',
                          'ring-2 ring-background'
                        )}
                        style={{ left: `${leftPercent}%` }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSeek(marker.timestamp);
                        }}
                        aria-label={`${marker.label} em ${formatTime(marker.timestamp)}`}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'w-2 h-2 rounded-full',
                            marker.type === 'quiz' ? 'bg-google-blue' : 'bg-google-yellow'
                          )}
                        />
                        <span>{marker.label}</span>
                        <span className="text-muted-foreground">({formatTime(marker.timestamp)})</span>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>

        {/* Time display */}
        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground font-mono">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Markers legend */}
        {markers.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-muted-foreground">
            {quizTimestamps.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-google-blue" />
                <span>Quiz</span>
              </div>
            )}
            {teachingMoments.length > 0 && (
              <div className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-google-yellow" />
                <span>Momento</span>
              </div>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
