import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Module {
  id: string;
  title: string;
  description: string | null;
  module_order: number;
  is_released: boolean | null;
}

interface Lesson {
  id: string;
  title: string;
  module_id: string | null;
  lesson_order: number | null;
  is_released: boolean | null;
}

interface LessonProgress {
  lessonId: string;
  quizPassed: boolean;
  missionCompleted: boolean;
  isComplete: boolean; // Both quiz and mission done
}

interface ModuleProgress {
  moduleId: string;
  totalLessons: number;
  completedLessons: number;
  isComplete: boolean;
  isUnlocked: boolean;
  progressPercentage: number;
}

interface UseModuleProgressReturn {
  modules: Module[];
  lessons: Lesson[];
  lessonProgress: Map<string, LessonProgress>;
  moduleProgress: Map<string, ModuleProgress>;
  isLoading: boolean;
  isLessonUnlocked: (lessonId: string) => boolean;
  isModuleUnlocked: (moduleId: string) => boolean;
  getLessonsForModule: (moduleId: string) => Lesson[];
  getUnassignedLessons: () => Lesson[];
  refreshProgress: () => Promise<void>;
}

export function useModuleProgress(studentId: string): UseModuleProgressReturn {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [lessonProgress, setLessonProgress] = useState<Map<string, LessonProgress>>(new Map());
  const [moduleProgress, setModuleProgress] = useState<Map<string, ModuleProgress>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load modules, lessons, quiz results, and mission submissions in parallel
      const [modulesRes, lessonsRes, quizRes, missionsRes] = await Promise.all([
        supabase.from('modules').select('*').order('module_order'),
        supabase.from('videos').select('id, title, module_id, lesson_order, is_released').order('lesson_order'),
        supabase.from('student_quiz_results').select('video_id, passed').eq('student_id', studentId).eq('passed', true),
        supabase.from('student_mission_submissions')
          .select('mission_id, status, missions!inner(video_id)')
          .eq('student_id', studentId)
          .eq('status', 'completed')
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      const modulesData = modulesRes.data || [];
      const lessonsData = lessonsRes.data || [];
      const passedQuizzes = new Set((quizRes.data || []).map(q => q.video_id));
      
      // Get completed missions by video_id
      const completedMissionsByVideo = new Set<string>();
      if (missionsRes.data) {
        missionsRes.data.forEach((sub: any) => {
          if (sub.missions?.video_id) {
            completedMissionsByVideo.add(sub.missions.video_id);
          }
        });
      }

      setModules(modulesData);
      setLessons(lessonsData);

      // Calculate lesson progress
      const lessonProgressMap = new Map<string, LessonProgress>();
      lessonsData.forEach(lesson => {
        const quizPassed = passedQuizzes.has(lesson.id);
        const missionCompleted = completedMissionsByVideo.has(lesson.id);
        lessonProgressMap.set(lesson.id, {
          lessonId: lesson.id,
          quizPassed,
          missionCompleted,
          isComplete: quizPassed && missionCompleted,
        });
      });
      setLessonProgress(lessonProgressMap);

      // Calculate module progress
      const moduleProgressMap = new Map<string, ModuleProgress>();
      modulesData.forEach((module, moduleIndex) => {
        const moduleLessons = lessonsData.filter(l => l.module_id === module.id);
        const completedCount = moduleLessons.filter(l => {
          const progress = lessonProgressMap.get(l.id);
          return progress?.isComplete;
        }).length;

        // Check if previous module is complete (for unlock logic)
        let isUnlocked = module.is_released ?? false;
        if (moduleIndex > 0 && isUnlocked) {
          const prevModule = modulesData[moduleIndex - 1];
          const prevModuleProgress = moduleProgressMap.get(prevModule.id);
          isUnlocked = prevModuleProgress?.isComplete ?? false;
        }

        moduleProgressMap.set(module.id, {
          moduleId: module.id,
          totalLessons: moduleLessons.length,
          completedLessons: completedCount,
          isComplete: moduleLessons.length > 0 && completedCount === moduleLessons.length,
          isUnlocked,
          progressPercentage: moduleLessons.length > 0 
            ? Math.round((completedCount / moduleLessons.length) * 100) 
            : 0,
        });
      });
      setModuleProgress(moduleProgressMap);

    } catch (err) {
      console.error('[useModuleProgress] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isModuleUnlocked = useCallback((moduleId: string): boolean => {
    const progress = moduleProgress.get(moduleId);
    return progress?.isUnlocked ?? false;
  }, [moduleProgress]);

  const isLessonUnlocked = useCallback((lessonId: string): boolean => {
    const lesson = lessons.find(l => l.id === lessonId);
    if (!lesson) return false;

    // Unassigned lessons follow legacy behavior (always unlocked if released)
    if (!lesson.module_id) {
      return lesson.is_released ?? false;
    }

    // Check if the module is unlocked
    const moduleUnlocked = isModuleUnlocked(lesson.module_id);
    if (!moduleUnlocked) return false;

    // Check lesson release status
    if (!(lesson.is_released ?? false)) return false;

    // Within a module, lessons are sequential
    const moduleLessons = lessons
      .filter(l => l.module_id === lesson.module_id)
      .sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0));
    
    const lessonIndex = moduleLessons.findIndex(l => l.id === lessonId);
    if (lessonIndex === 0) return true; // First lesson in module

    // Check if previous lesson in module is complete
    const prevLesson = moduleLessons[lessonIndex - 1];
    const prevProgress = lessonProgress.get(prevLesson.id);
    return prevProgress?.isComplete ?? false;
  }, [lessons, lessonProgress, isModuleUnlocked]);

  const getLessonsForModule = useCallback((moduleId: string): Lesson[] => {
    return lessons
      .filter(l => l.module_id === moduleId)
      .sort((a, b) => (a.lesson_order ?? 0) - (b.lesson_order ?? 0));
  }, [lessons]);

  const getUnassignedLessons = useCallback((): Lesson[] => {
    return lessons.filter(l => !l.module_id);
  }, [lessons]);

  return {
    modules,
    lessons,
    lessonProgress,
    moduleProgress,
    isLoading,
    isLessonUnlocked,
    isModuleUnlocked,
    getLessonsForModule,
    getUnassignedLessons,
    refreshProgress: loadData,
  };
}
