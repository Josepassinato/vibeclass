import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface CheckModuleCompletionParams {
  studentId: string;
  studentName: string;
  moduleId: string;
  moduleTitle: string;
}

export function useCertificateGeneration() {
  // Check if a module is complete and generate certificate if so
  const checkAndGenerateCertificate = useCallback(async ({
    studentId,
    studentName,
    moduleId,
    moduleTitle,
  }: CheckModuleCompletionParams) => {
    try {
      // Get all lessons in this module
      const { data: moduleLessons, error: lessonsError } = await supabase
        .from('videos')
        .select('id')
        .eq('module_id', moduleId);

      if (lessonsError || !moduleLessons || moduleLessons.length === 0) {
        return { generated: false };
      }

      const lessonIds = moduleLessons.map(l => l.id);

      // Check if all lessons have passed quizzes
      const { data: passedQuizzes, error: quizError } = await supabase
        .from('student_quiz_results')
        .select('video_id')
        .eq('student_id', studentId)
        .eq('passed', true)
        .in('video_id', lessonIds);

      if (quizError) {
        logger.error('[CertGen] Error checking quizzes:', quizError);
        return { generated: false };
      }

      const passedQuizIds = new Set((passedQuizzes || []).map(q => q.video_id));

      // Check if all lessons have completed missions
      const { data: completedMissions, error: missionError } = await supabase
        .from('student_mission_submissions')
        .select('mission_id, missions!inner(video_id)')
        .eq('student_id', studentId)
        .eq('status', 'completed');

      if (missionError) {
        logger.error('[CertGen] Error checking missions:', missionError);
        return { generated: false };
      }

      const completedMissionVideoIds = new Set<string>();
      if (completedMissions) {
        completedMissions.forEach((sub: any) => {
          if (sub.missions?.video_id) {
            completedMissionVideoIds.add(sub.missions.video_id);
          }
        });
      }

      // Check if all lessons are complete (quiz + mission)
      const allLessonsComplete = lessonIds.every(
        id => passedQuizIds.has(id) && completedMissionVideoIds.has(id)
      );

      if (!allLessonsComplete) {
        return { generated: false };
      }

      // Check if certificate already exists
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('student_id', studentId)
        .eq('module_id', moduleId)
        .eq('certificate_type', 'module')
        .maybeSingle();

      if (existingCert) {
        return { generated: false, alreadyExists: true };
      }

      // Generate the certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          studentId,
          studentName,
          moduleId,
          moduleTitle,
          certificateType: 'module',
        },
      });

      if (error) {
        logger.error('[CertGen] Error generating certificate:', error);
        return { generated: false, error };
      }

      // Show celebration toast
      toast.success(
        `🎓 Parabéns! Você completou o módulo "${moduleTitle}" e ganhou um certificado!`,
        {
          duration: 5000,
          action: {
            label: 'Ver Certificados',
            onClick: () => {
              window.location.href = '/aluno/dashboard';
            },
          },
        }
      );

      return { 
        generated: true, 
        certificate: data.certificate,
        svg: data.svg,
      };
    } catch (error) {
      logger.error('[CertGen] Unexpected error:', error);
      return { generated: false, error };
    }
  }, []);

  // Check if entire course is complete and generate course certificate
  const checkCourseCompletion = useCallback(async (
    studentId: string,
    studentName: string
  ) => {
    try {
      // Get all modules
      const { data: modules, error: modulesError } = await supabase
        .from('modules')
        .select('id, title')
        .eq('is_released', true);

      if (modulesError || !modules || modules.length === 0) {
        return { generated: false };
      }

      // Check if all modules have certificates
      const { data: moduleCerts, error: certsError } = await supabase
        .from('certificates')
        .select('module_id')
        .eq('student_id', studentId)
        .eq('certificate_type', 'module');

      if (certsError) {
        logger.error('[CertGen] Error checking module certs:', certsError);
        return { generated: false };
      }

      const certifiedModuleIds = new Set((moduleCerts || []).map(c => c.module_id));
      const allModulesCompleted = modules.every(m => certifiedModuleIds.has(m.id));

      if (!allModulesCompleted) {
        return { generated: false };
      }

      // Check if course certificate already exists
      const { data: existingCert } = await supabase
        .from('certificates')
        .select('id')
        .eq('student_id', studentId)
        .eq('certificate_type', 'course')
        .maybeSingle();

      if (existingCert) {
        return { generated: false, alreadyExists: true };
      }

      // Generate course certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          studentId,
          studentName,
          certificateType: 'course',
        },
      });

      if (error) {
        logger.error('[CertGen] Error generating course certificate:', error);
        return { generated: false, error };
      }

      // Show special celebration for course completion
      toast.success(
        '🏆 INCRÍVEL! Você completou o curso inteiro e ganhou o certificado de conclusão!',
        {
          duration: 8000,
          action: {
            label: 'Ver Certificados',
            onClick: () => {
              window.location.href = '/aluno/dashboard';
            },
          },
        }
      );

      return {
        generated: true,
        certificate: data.certificate,
        svg: data.svg,
      };
    } catch (error) {
      logger.error('[CertGen] Unexpected error:', error);
      return { generated: false, error };
    }
  }, []);

  return {
    checkAndGenerateCertificate,
    checkCourseCompletion,
  };
}
