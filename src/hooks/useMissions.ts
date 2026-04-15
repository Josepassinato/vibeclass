import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

export interface Mission {
  id: string;
  video_id: string | null;
  title: string;
  description: string;
  instructions: string;
  evidence_type: 'text' | 'screenshot' | 'code' | 'link' | 'file';
  difficulty_level: 'básico' | 'intermediário' | 'avançado';
  points_reward: number;
  time_limit_minutes: number | null;
  evaluation_criteria: string[];
  is_active: boolean;
  mission_order: number | null;
}

export interface MissionSubmission {
  id: string;
  mission_id: string;
  student_id: string;
  evidence_text: string | null;
  evidence_url: string | null;
  status: 'pending' | 'evaluating' | 'approved' | 'needs_revision' | 'rejected';
  ai_evaluation: Record<string, unknown>;
  ai_feedback: string | null;
  score: number | null;
  attempt_number: number;
  submitted_at: string;
  evaluated_at: string | null;
}

export interface StudentAchievements {
  total_points: number;
  current_streak: number;
  longest_streak: number;
  level: number;
  badges: Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
  }>;
  missions_completed: number;
  missions_attempted: number;
  average_score: number;
}

interface EvaluationResult {
  status: 'approved' | 'needs_revision' | 'rejected';
  score: number;
  criteriaResults: {
    criterion: string;
    met: boolean;
    notes: string;
  }[];
  summary: string;
}

interface FeedbackResult {
  message: string;
  encouragement: string;
  nextSteps: string[];
  specificImprovements?: string[];
  celebrationMessage?: string;
}

export function useMissions(studentId: string) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [submissions, setSubmissions] = useState<MissionSubmission[]>([]);
  const [achievements, setAchievements] = useState<StudentAchievements | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Load missions for a video
  const loadMissions = useCallback(async (videoId?: string) => {
    setIsLoading(true);
    try {
      let query = supabase
        .from('missions')
        .select('*')
        .eq('is_active', true)
        .order('mission_order');

      if (videoId) {
        query = query.eq('video_id', videoId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const parsedMissions: Mission[] = (data || []).map(m => ({
        id: m.id,
        video_id: m.video_id,
        title: m.title,
        description: m.description,
        instructions: m.instructions,
        evidence_type: m.evidence_type as Mission['evidence_type'],
        difficulty_level: m.difficulty_level as Mission['difficulty_level'],
        points_reward: m.points_reward,
        time_limit_minutes: m.time_limit_minutes,
        evaluation_criteria: Array.isArray(m.evaluation_criteria) 
          ? (m.evaluation_criteria as string[])
          : [],
        is_active: m.is_active,
        mission_order: m.mission_order
      }));

      setMissions(parsedMissions);
      return parsedMissions;
    } catch (error) {
      logger.error('[useMissions] Failed to load missions:', error);
      toast.error('Erro ao carregar missões');
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load student's submissions
  const loadSubmissions = useCallback(async (missionId?: string) => {
    try {
      let query = supabase
        .from('student_mission_submissions')
        .select('*')
        .eq('student_id', studentId)
        .order('submitted_at', { ascending: false });

      if (missionId) {
        query = query.eq('mission_id', missionId);
      }

      const { data, error } = await query;
      if (error) throw error;

      const parsedSubmissions: MissionSubmission[] = (data || []).map(s => ({
        id: s.id,
        mission_id: s.mission_id,
        student_id: s.student_id,
        evidence_text: s.evidence_text,
        evidence_url: s.evidence_url,
        status: s.status as MissionSubmission['status'],
        ai_evaluation: (s.ai_evaluation as Record<string, unknown>) || {},
        ai_feedback: s.ai_feedback,
        score: s.score,
        attempt_number: s.attempt_number,
        submitted_at: s.submitted_at,
        evaluated_at: s.evaluated_at
      }));

      setSubmissions(parsedSubmissions);
      return parsedSubmissions;
    } catch (error) {
      logger.error('[useMissions] Failed to load submissions:', error);
      return [];
    }
  }, [studentId]);

  // Load student achievements
  const loadAchievements = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('agent-achievements', {
        body: { studentId, action: 'get_status' }
      });

      if (error) throw error;

      if (data?.currentStats) {
        setAchievements({
          total_points: data.currentStats.totalPoints,
          current_streak: data.currentStats.currentStreak,
          longest_streak: data.currentStats.longestStreak,
          level: data.currentStats.level,
          badges: data.currentStats.badges || [],
          missions_completed: data.currentStats.missionsCompleted,
          missions_attempted: data.currentStats.missionsAttempted,
          average_score: data.currentStats.averageScore
        });
      }

      return data;
    } catch (error) {
      logger.error('[useMissions] Failed to load achievements:', error);
      return null;
    }
  }, [studentId]);

  // Submit evidence for a mission
  const submitEvidence = useCallback(async (
    mission: Mission,
    evidenceText?: string,
    evidenceUrl?: string
  ): Promise<{ success: boolean; feedback?: FeedbackResult }> => {
    setIsEvaluating(true);
    
    try {
      // Get previous attempt count
      const { data: prevSubmissions } = await supabase
        .from('student_mission_submissions')
        .select('attempt_number')
        .eq('mission_id', mission.id)
        .eq('student_id', studentId)
        .order('attempt_number', { ascending: false })
        .limit(1);

      const attemptNumber = (prevSubmissions?.[0]?.attempt_number || 0) + 1;

      // Create submission record
      const { data: submission, error: submitError } = await supabase
        .from('student_mission_submissions')
        .insert({
          mission_id: mission.id,
          student_id: studentId,
          evidence_text: evidenceText,
          evidence_url: evidenceUrl,
          status: 'evaluating',
          attempt_number: attemptNumber
        })
        .select()
        .single();

      if (submitError) throw submitError;

      toast.info('🔍 Avaliando sua submissão...', { duration: 3000 });

      // Call Agent Evaluator
      const { data: evaluation, error: evalError } = await supabase.functions.invoke('agent-evaluator', {
        body: {
          missionTitle: mission.title,
          missionDescription: mission.description,
          missionInstructions: mission.instructions,
          evaluationCriteria: mission.evaluation_criteria,
          evidenceType: mission.evidence_type,
          evidenceText,
          evidenceUrl,
          difficultyLevel: mission.difficulty_level
        }
      });

      if (evalError) throw evalError;

      const evalResult = evaluation as EvaluationResult;

      // Call Agent Feedback
      const { data: feedback, error: feedbackError } = await supabase.functions.invoke('agent-feedback', {
        body: {
          missionTitle: mission.title,
          evaluationStatus: evalResult.status,
          evaluationScore: evalResult.score,
          criteriaResults: evalResult.criteriaResults,
          evaluationSummary: evalResult.summary,
          attemptNumber
        }
      });

      if (feedbackError) throw feedbackError;

      const feedbackResult = feedback as FeedbackResult;

      // Update submission with evaluation results
      const { error: updateError } = await supabase
        .from('student_mission_submissions')
        .update({
          status: evalResult.status,
          ai_evaluation: JSON.parse(JSON.stringify(evalResult)),
          ai_feedback: feedbackResult.message,
          score: evalResult.score,
          evaluated_at: new Date().toISOString()
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // If approved, update achievements
      if (evalResult.status === 'approved') {
        const { data: achievementData } = await supabase.functions.invoke('agent-achievements', {
          body: {
            studentId,
            action: 'mission_completed',
            missionId: mission.id,
            pointsEarned: mission.points_reward,
            score: evalResult.score
          }
        });

        if (achievementData?.newBadges?.length > 0) {
          achievementData.newBadges.forEach((badge: { name: string; icon: string }) => {
            toast.success(`🏅 Nova conquista: ${badge.icon} ${badge.name}!`, { duration: 5000 });
          });
        }

        if (achievementData?.levelUp) {
          toast.success(`🎉 LEVEL UP! Você agora é nível ${achievementData.levelUp.newLevel}!`, { duration: 5000 });
        }

        toast.success(feedbackResult.celebrationMessage || 'Missão aprovada! 🎉', { duration: 4000 });
      } else if (evalResult.status === 'needs_revision') {
        toast.warning('Quase lá! Revise alguns pontos.', { duration: 4000 });
      } else {
        toast.error('Tente novamente após revisar o conteúdo.', { duration: 4000 });
      }

      // Reload submissions
      await loadSubmissions(mission.id);
      await loadAchievements();

      return { success: true, feedback: feedbackResult };

    } catch (error) {
      logger.error('[useMissions] Submission failed:', error);
      toast.error('Erro ao processar submissão');
      return { success: false };
    } finally {
      setIsEvaluating(false);
    }
  }, [studentId, loadSubmissions, loadAchievements]);

  // Get submission status for a mission
  const getMissionStatus = useCallback((missionId: string) => {
    const missionSubmissions = submissions.filter(s => s.mission_id === missionId);
    if (missionSubmissions.length === 0) return 'not_started';
    
    const latestSubmission = missionSubmissions[0];
    return latestSubmission.status;
  }, [submissions]);

  return {
    missions,
    submissions,
    achievements,
    isLoading,
    isEvaluating,
    loadMissions,
    loadSubmissions,
    loadAchievements,
    submitEvidence,
    getMissionStatus
  };
}
