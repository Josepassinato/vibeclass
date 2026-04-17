import { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { VideoTimeline } from '@/components/VideoTimeline';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Volume1, Maximize, Minimize } from 'lucide-react';

import type { UnifiedLessonPlayerHandle } from '@/lib/players/unified-player';

export interface VideoPlayerRef extends UnifiedLessonPlayerHandle {
  /** Reset playhead to 0 and start playing. YouTube-specific convenience. */
  restart: () => void;
  /**
   * Must be called from a real user gesture (e.g. click) to unlock programmatic playback.
   * This removes the "Clique para habilitar" overlay.
   */
  unlockPlayback: () => void;
}

/** Props for the VideoPlayer component */
export type VideoPlayerProps = {
  /** YouTube video ID */
  videoId: string;
  /** Optional video title */
  title?: string;
  /** When true, video expands to fill available height (90vh) */
  expanded?: boolean;
  /** Callback when video playback ends */
  onEnded?: () => void;
  /** Callback when video starts playing (including manual play by student) */
  onPlay?: () => void;
  /** Callback when video is paused (including manual pause by student) */
  onPause?: () => void;
  /** Callback when student seeks to a different position */
  onSeek?: (seconds: number) => void;
  /** Teaching moments for timeline markers */
  teachingMoments?: Array<{ timestamp_seconds: number; topic?: string }>;
  /** Quiz timestamps for timeline markers */
  quizTimestamps?: number[];
};

export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer({ videoId, title, expanded = false, onEnded, onPlay, onPause, onSeek, teachingMoments = [], quizTimestamps = [] }, ref) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(100);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const playerRef = useRef<any>(null);
    const [isReady, setIsReady] = useState(false);
    const isReadyRef = useRef(false);
    const timeIntervalRef = useRef<number | null>(null);
    const pendingActionsRef = useRef<Array<() => void>>([]);
    const [userInteracted, setUserInteracted] = useState(false);
    const userInteractedRef = useRef(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [playbackRate, setPlaybackRate] = useState(() => {
      const stored = localStorage.getItem('vibe-class-playback-rate');
      return stored ? parseFloat(stored) : 1;
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2];

    useEffect(() => {
      // Load YouTube IFrame API
      if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
      }

      // Wait for API to load
      const checkAPI = window.setInterval(() => {
        if (window.YT && window.YT.Player) {
          clearInterval(checkAPI);
          initPlayer();
        }
      }, 100);

      return () => {
        clearInterval(checkAPI);
        if (timeIntervalRef.current) {
          clearInterval(timeIntervalRef.current);
          timeIntervalRef.current = null;
        }
        pendingActionsRef.current = [];
        isReadyRef.current = false;
        if (playerRef.current) {
          playerRef.current.destroy();
          playerRef.current = null;
        }
      };
    }, [videoId]);

    const initPlayer = () => {
      setIsReady(false);
      isReadyRef.current = false;
      setIsPlaying(false);

      if (timeIntervalRef.current) {
        clearInterval(timeIntervalRef.current);
        timeIntervalRef.current = null;
      }

      pendingActionsRef.current = [];

      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }

      playerRef.current = new window.YT.Player(`youtube-player-${videoId}`, {
        videoId: videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            setIsReady(true);
            isReadyRef.current = true;

            // Get duration
            try {
              const dur = playerRef.current?.getDuration?.() || 0;
              setDuration(dur);
            } catch {
              // ignore
            }

            // Start with full volume unmuted and apply stored playback rate
            try {
              playerRef.current?.unMute();
              playerRef.current?.setVolume(100);
              playerRef.current?.setPlaybackRate(playbackRate);
              setIsMuted(false);
              setVolume(100);
            } catch {
              // ignore
            }

            // Flush any queued actions that happened before the iframe was ready
            const queued = pendingActionsRef.current.splice(0);
            for (const fn of queued) {
              try {
                fn();
              } catch (e) {
                console.warn('VideoPlayer: queued action failed', e);
              }
            }

            console.log('YouTube player ready');
          },
          onStateChange: (event: any) => {
            const wasPlaying = isPlaying;
            const nowPlaying = event.data === window.YT.PlayerState.PLAYING;
            setIsPlaying(nowPlaying);
            // Notify on play/pause state changes
            if (nowPlaying && !wasPlaying) {
              onPlay?.();
            }
            if (!nowPlaying && wasPlaying && event.data === window.YT.PlayerState.PAUSED) {
              onPause?.();
            }
            // Detect video ended
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded?.();
            }
          },
        },
      });

      // Update current time periodically
      timeIntervalRef.current = window.setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          setCurrentTime(playerRef.current.getCurrentTime());
        }
      }, 1000);
    };

    useImperativeHandle(ref, () => {
      const runOrQueue = (fn: () => void) => {
        if (playerRef.current && isReadyRef.current) {
          fn();
          return;
        }
        pendingActionsRef.current.push(fn);
        console.log('VideoPlayer: action queued (player not ready yet)');
      };

      return {
        play: () => {
          console.log('VideoPlayer: play called');
          runOrQueue(() => {
            playerRef.current?.playVideo();
            // Ensure volume is up
            try {
              playerRef.current?.unMute();
              playerRef.current?.setVolume(100);
              setIsMuted(false);
            } catch {}
          });
        },
        pause: () => {
          console.log('VideoPlayer: pause called');
          runOrQueue(() => {
            playerRef.current?.pauseVideo();
          });
        },
        restart: () => {
          console.log('VideoPlayer: restart called');
          runOrQueue(() => {
            playerRef.current?.seekTo(0, true);
            playerRef.current?.playVideo();
            // Ensure volume is up
            try {
              playerRef.current?.unMute();
              playerRef.current?.setVolume(100);
              setIsMuted(false);
            } catch {}
          });
        },
        seekTo: (seconds: number) => {
          console.log('VideoPlayer: seekTo called', seconds);
          runOrQueue(() => {
            playerRef.current?.seekTo(seconds, true);
          });
        },
        getCurrentTime: () => {
          return playerRef.current?.getCurrentTime?.() || 0;
        },
        getDuration: () => {
          return playerRef.current?.getDuration?.() || duration || 0;
        },
        isPaused: () => {
          // Check player state directly for more accurate status
          if (playerRef.current?.getPlayerState) {
            const state = playerRef.current.getPlayerState();
            // YT.PlayerState.PLAYING = 1
            return state !== 1;
          }
          return !isPlaying;
        },
        unlockPlayback: () => {
          console.log('VideoPlayer: unlockPlayback called, userInteracted:', userInteractedRef.current);
          
          // Check using ref to avoid stale closures
          if (userInteractedRef.current) {
            console.log('VideoPlayer: Already unlocked, skipping');
            return;
          }

          // Set immediately to prevent double-calls
          userInteractedRef.current = true;
          setUserInteracted(true);

          runOrQueue(() => {
            if (!playerRef.current) {
              console.log('VideoPlayer: No player, skipping unlock');
              return;
            }

            // Start playing (muted) then immediately pause to unlock programmatic control
            try {
              playerRef.current.mute();
              setIsMuted(true);
              playerRef.current.playVideo();
              window.setTimeout(() => {
                try {
                  playerRef.current?.pauseVideo();
                  playerRef.current?.seekTo(0, true);
                  // Unmute and set volume to max after unlocking
                  playerRef.current?.unMute();
                  playerRef.current?.setVolume(100);
                  setIsMuted(false);
                  setVolume(100);
                  console.log('VideoPlayer: Playback unlocked by user interaction');
                } catch (e) {
                  console.warn('Failed to finalize unlock playback:', e);
                }
              }, 150);
            } catch (e) {
              console.warn('Failed to unlock playback:', e);
            }
          });
        },
      };
    }, [isPlaying]);

    const handlePlay = () => {
      // Programmatic play may be blocked unless muted; we keep default muted.
      playerRef.current?.playVideo();
    };
    const handlePause = () => playerRef.current?.pauseVideo();
    const handleRestart = () => {
      playerRef.current?.seekTo(0, true);
      playerRef.current?.playVideo();
    };
    const handleMute = () => {
      if (isMuted) {
        playerRef.current?.unMute();
        playerRef.current?.setVolume(volume);
      } else {
        playerRef.current?.mute();
      }
      setIsMuted(!isMuted);
    };

    const handleVolumeChange = (value: number[]) => {
      const newVolume = value[0];
      setVolume(newVolume);
      if (playerRef.current) {
        playerRef.current.setVolume(newVolume);
        if (newVolume === 0) {
          playerRef.current.mute();
          setIsMuted(true);
        } else if (isMuted) {
          playerRef.current.unMute();
          setIsMuted(false);
        }
      }
    };

    const getVolumeIcon = () => {
      if (isMuted || volume === 0) return <VolumeX className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      if (volume < 50) return <Volume1 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
      return <Volume2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />;
    };

    const formatTime = (seconds: number) => {
      const mins = Math.floor(seconds / 60);
      const secs = Math.floor(seconds % 60);
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Handle first interaction to unlock programmatic playback (manual click)
    const handleUnlockPlayback = () => {
      if (!userInteractedRef.current && playerRef.current) {
        userInteractedRef.current = true;
        setUserInteracted(true);
        // Start playing then immediately pause to unlock
        try {
          playerRef.current.mute();
          playerRef.current.playVideo();
          setTimeout(() => {
            playerRef.current?.pauseVideo();
            playerRef.current?.seekTo(0, true);
            // Unmute and set volume to max after unlocking
            playerRef.current?.unMute();
            playerRef.current?.setVolume(100);
            setIsMuted(false);
            setVolume(100);
            console.log('VideoPlayer: Playback unlocked by user interaction (manual click)');
          }, 150);
        } catch (e) {
          console.warn('Failed to unlock playback:', e);
        }
      }
    };

    const cyclePlaybackRate = () => {
      const currentIdx = PLAYBACK_RATES.indexOf(playbackRate);
      const nextIdx = (currentIdx + 1) % PLAYBACK_RATES.length;
      const newRate = PLAYBACK_RATES[nextIdx];
      setPlaybackRate(newRate);
      localStorage.setItem('vibe-class-playback-rate', String(newRate));
      try {
        playerRef.current?.setPlaybackRate(newRate);
      } catch {}
    };

    // Fullscreen toggle using native browser API
    const toggleFullscreen = async () => {
      if (!containerRef.current) return;
      
      try {
        if (!document.fullscreenElement) {
          await containerRef.current.requestFullscreen();
          setIsFullscreen(true);
        } else {
          await document.exitFullscreen();
          setIsFullscreen(false);
        }
      } catch (err) {
        console.warn('Fullscreen error:', err);
      }
    };

    // Listen for fullscreen changes (e.g., user presses Escape)
    useEffect(() => {
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      
      document.addEventListener('fullscreenchange', handleFullscreenChange);
      return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    return (
      <Card ref={containerRef} className={`overflow-hidden transition-all duration-300 h-full ${expanded || isFullscreen ? 'border-0 rounded-none' : ''} ${isFullscreen ? 'bg-black' : ''}`}>
        <div className={`relative bg-black ${expanded || isFullscreen ? 'h-[calc(100%-56px)]' : 'h-[calc(100%-56px)]'}`}>
          <div id={`youtube-player-${videoId}`} className="absolute inset-0 w-full h-full [&>iframe]:w-full [&>iframe]:h-full" />
          
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="animate-pulse text-muted-foreground">Carregando player...</div>
            </div>
          )}
          
          {/* Unlock overlay - requires user click to enable programmatic control */}
          {isReady && !userInteracted && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/60 cursor-pointer z-10"
              onClick={handleUnlockPlayback}
            >
              <div className="text-center text-white">
                <Play className="h-12 w-12 mx-auto mb-2 opacity-90" />
                <p className="text-sm font-medium">Clique para habilitar</p>
                <p className="text-xs opacity-75">Permite controle por voz</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Custom Controls */}
        <div className={`p-2 sm:p-3 border-t ${isFullscreen ? 'bg-black/90' : 'bg-card'}`}>
          {/* Timeline with markers */}
          <VideoTimeline
            currentTime={currentTime}
            duration={duration}
            onSeek={(seconds) => {
              playerRef.current?.seekTo(seconds, true);
              onSeek?.(seconds);
            }}
            teachingMoments={teachingMoments}
            quizTimestamps={quizTimestamps}
            className="mb-3"
          />
          
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            <div className="flex items-center gap-1 sm:gap-2">
              {isPlaying ? (
                <Button size="sm" variant="outline" onClick={handlePause} className="h-11 w-11 sm:h-9 sm:w-9 p-0">
                  <Pause className="h-4 w-4" />
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={handlePlay} className="h-11 w-11 sm:h-9 sm:w-9 p-0">
                  <Play className="h-4 w-4" />
                </Button>
              )}
              <Button size="sm" variant="ghost" onClick={handleRestart} className="h-11 w-11 sm:h-9 sm:w-9 p-0">
                <RotateCcw className="h-4 w-4" />
              </Button>
              
              {/* Volume Control */}
              <div className="flex items-center gap-1 sm:gap-2">
                <Button size="sm" variant="ghost" onClick={handleMute} className="h-11 w-11 sm:h-9 sm:w-9 p-0">
                  {getVolumeIcon()}
                </Button>
                <Slider
                  value={[isMuted ? 0 : volume]}
                  onValueChange={handleVolumeChange}
                  max={100}
                  step={5}
                  className="w-16 sm:w-24"
                />
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Playback Speed */}
              <Button size="sm" variant="ghost" onClick={cyclePlaybackRate} className="h-11 sm:h-9 px-2 text-xs font-mono" title="Velocidade de reprodução">
                {playbackRate}x
              </Button>
              {/* Fullscreen Button */}
              <Button size="sm" variant="ghost" onClick={toggleFullscreen} className="h-11 w-11 sm:h-9 sm:w-9 p-0" title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}>
                {isFullscreen ? (
                  <Minimize className="h-4 w-4" />
                ) : (
                  <Maximize className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          
          {title && !isFullscreen && (
            <p className="text-xs sm:text-sm font-medium mt-1.5 sm:mt-2 line-clamp-1">{title}</p>
          )}
        </div>
      </Card>
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

// Extend window for YouTube API
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
