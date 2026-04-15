import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

interface LessonProgress {
  id: string;
  student_id: string;
  video_id: string;
  is_completed: boolean | null;
  completed_at: string | null;
  watch_time_seconds: number | null;
  last_position_seconds: number | null;
}

interface ProgressStats {
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  totalWatchTimeMinutes: number;
}

interface UseStudentProgressOptions {
  onProgressUpdate?: (stats: ProgressStats) => void;
  userId?: string; // Optional: use authenticated user ID
}

export function useStudentProgress(options: UseStudentProgressOptions = {}) {
  const [studentId, setStudentId] = useState<string>('');
  const [progressMap, setProgressMap] = useState<Map<string, LessonProgress>>(new Map());
  const [stats, setStats] = useState<ProgressStats>({
    totalLessons: 0,
    completedLessons: 0,
    progressPercentage: 0,
    totalWatchTimeMinutes: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // Use ref to avoid re-creating loadProgress when options change
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Initialize student ID - prefer authenticated user ID, then check both localStorage keys
  useEffect(() => {
    if (options.userId) {
      setStudentId(options.userId);
    } else {
      // Support both camelCase (VoiceChat) and snake_case patterns
      const storedId = localStorage.getItem('studentId') || localStorage.getItem('student_id');
      if (storedId) {
        setStudentId(storedId);
      } else {
        const newId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('studentId', newId);
        setStudentId(newId);
      }
    }
  }, [options.userId]);

  // Load progress from database
  const loadProgress = useCallback(async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      // Get total configured lessons
      const { data: videos, error: videosError } = await supabase
        .from('videos')
        .select('id')
        .eq('is_configured', true);

      if (videosError) throw videosError;

      // Get student progress
      const { data: progress, error: progressError } = await supabase
        .from('student_lesson_progress')
        .select('*')
        .eq('student_id', studentId);

      if (progressError) throw progressError;

      // Build progress map
      const map = new Map<string, LessonProgress>();
      (progress || []).forEach((p) => {
        map.set(p.video_id, p as LessonProgress);
      });
      setProgressMap(map);

      // Calculate stats
      const totalLessons = videos?.length || 0;
      const completedLessons = (progress || []).filter((p) => p.is_completed).length;
      const totalWatchTimeSeconds = (progress || []).reduce(
        (acc: number, p) => acc + (p.watch_time_seconds || 0),
        0
      );

      const newStats: ProgressStats = {
        totalLessons,
        completedLessons,
        progressPercentage: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        totalWatchTimeMinutes: Math.round(totalWatchTimeSeconds / 60),
      };

      setStats(newStats);
      optionsRef.current.onProgressUpdate?.(newStats);
    } catch (error) {
      logger.error('[StudentProgress] Error loading progress:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // Load progress when student ID is available
  useEffect(() => {
    if (studentId) {
      loadProgress();
    }
  }, [studentId, loadProgress]);

  // Mark lesson as completed
  const markLessonComplete = useCallback(async (videoId: string) => {
    if (!studentId) return;

    try {
      const existingProgress = progressMap.get(videoId);

      if (existingProgress) {
        // Update existing record
        await supabase
          .from('student_lesson_progress')
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          })
          .eq('id', existingProgress.id);
      } else {
        // Create new record
        await supabase
          .from('student_lesson_progress')
          .insert({
            student_id: studentId,
            video_id: videoId,
            is_completed: true,
            completed_at: new Date().toISOString(),
          });
      }

      // Reload progress
      await loadProgress();
    } catch (error) {
      logger.error('[StudentProgress] Error marking lesson complete:', error);
    }
  }, [studentId, progressMap, loadProgress]);

  // Update watch time and position
  const updateWatchProgress = useCallback(async (
    videoId: string, 
    watchTimeSeconds: number, 
    positionSeconds: number
  ) => {
    if (!studentId) return;

    try {
      const existingProgress = progressMap.get(videoId);

      if (existingProgress) {
        await supabase
          .from('student_lesson_progress')
          .update({
            watch_time_seconds: watchTimeSeconds,
            last_position_seconds: positionSeconds,
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('student_lesson_progress')
          .insert({
            student_id: studentId,
            video_id: videoId,
            watch_time_seconds: watchTimeSeconds,
            last_position_seconds: positionSeconds,
          });
      }

      // Update local map
      setProgressMap(prev => {
        const newMap = new Map(prev);
        const existing = newMap.get(videoId);
        if (existing) {
          newMap.set(videoId, {
            ...existing,
            watch_time_seconds: watchTimeSeconds,
            last_position_seconds: positionSeconds,
          });
        }
        return newMap;
      });
    } catch (error) {
      logger.error('[StudentProgress] Error updating watch progress:', error);
    }
  }, [studentId, progressMap]);

  // Get progress for a specific lesson
  const getLessonProgress = useCallback((videoId: string): LessonProgress | undefined => {
    return progressMap.get(videoId);
  }, [progressMap]);

  // Check if a lesson is completed
  const isLessonCompleted = useCallback((videoId: string): boolean => {
    return progressMap.get(videoId)?.is_completed || false;
  }, [progressMap]);

  return {
    studentId,
    stats,
    isLoading,
    progressMap,
    markLessonComplete,
    updateWatchProgress,
    getLessonProgress,
    isLessonCompleted,
    refreshProgress: loadProgress,
  };
}
