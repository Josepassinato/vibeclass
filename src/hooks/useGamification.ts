import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

export interface XPData {
  totalXp: number;
  level: number;
  currentStreakDays: number;
  longestStreakDays: number;
  lastStudyDate: string | null;
}

export interface LeaderboardEntry {
  studentId: string;
  totalXp: number;
  level: number;
  rank: number;
}

// XP rewards per action
const XP_REWARDS = {
  VIDEO_COMPLETE: 50,
  QUIZ_CORRECT: 20,
  MISSION_COMPLETE: 30,
} as const;

// Level thresholds
const LEVELS = [
  { min: 0, name: 'Iniciante' },
  { min: 101, name: 'Estudante' },
  { min: 501, name: 'Dedicado' },
  { min: 1501, name: 'Expert' },
  { min: 5001, name: 'Mestre' },
] as const;

export function getLevelName(xp: number): string {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return LEVELS[i].name;
  }
  return 'Iniciante';
}

export function getLevel(xp: number): number {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].min) return i + 1;
  }
  return 1;
}

export function getNextLevelXp(xp: number): number {
  for (const level of LEVELS) {
    if (xp < level.min) return level.min;
  }
  return LEVELS[LEVELS.length - 1].min;
}

export function useGamification(studentId: string) {
  const [xpData, setXpData] = useState<XPData>({
    totalXp: 0, level: 1, currentStreakDays: 0, longestStreakDays: 0, lastStudyDate: null,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load XP data
  useEffect(() => {
    if (!studentId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from('student_xp')
          .select('*')
          .eq('student_id', studentId)
          .single();

        if (data) {
          setXpData({
            totalXp: data.total_xp,
            level: data.level,
            currentStreakDays: data.current_streak_days,
            longestStreakDays: data.longest_streak_days,
            lastStudyDate: data.last_study_date,
          });
        }
      } catch {
        // No XP record yet — will be created on first action
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [studentId]);

  /** Add XP and update streak */
  const addXp = useCallback(async (amount: number) => {
    if (!studentId) return;

    const today = new Date().toISOString().split('T')[0];
    const isNewDay = xpData.lastStudyDate !== today;

    const newXp = xpData.totalXp + amount;
    const newLevel = getLevel(newXp);
    const newStreak = isNewDay ? xpData.currentStreakDays + 1 : xpData.currentStreakDays;
    const newLongest = Math.max(newStreak, xpData.longestStreakDays);

    const updates = {
      student_id: studentId,
      total_xp: newXp,
      level: newLevel,
      current_streak_days: newStreak,
      longest_streak_days: newLongest,
      last_study_date: today,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('student_xp')
      .upsert(updates, { onConflict: 'student_id' });

    if (error) {
      logger.error('[Gamification] Error adding XP:', error);
      return;
    }

    const leveledUp = newLevel > xpData.level;
    setXpData({
      totalXp: newXp,
      level: newLevel,
      currentStreakDays: newStreak,
      longestStreakDays: newLongest,
      lastStudyDate: today,
    });

    return { xpGained: amount, leveledUp, newLevel };
  }, [studentId, xpData]);

  const awardVideoComplete = useCallback(() => addXp(XP_REWARDS.VIDEO_COMPLETE), [addXp]);
  const awardQuizCorrect = useCallback(() => addXp(XP_REWARDS.QUIZ_CORRECT), [addXp]);
  const awardMissionComplete = useCallback(() => addXp(XP_REWARDS.MISSION_COMPLETE), [addXp]);

  /** Load top 20 leaderboard */
  const loadLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('student_xp')
      .select('student_id, total_xp, level')
      .order('total_xp', { ascending: false })
      .limit(20);

    if (data) {
      setLeaderboard(data.map((d, i) => ({
        studentId: d.student_id,
        totalXp: d.total_xp,
        level: d.level,
        rank: i + 1,
      })));
    }
  }, []);

  return {
    xpData,
    leaderboard,
    isLoading,
    addXp,
    awardVideoComplete,
    awardQuizCorrect,
    awardMissionComplete,
    loadLeaderboard,
    getLevelName: () => getLevelName(xpData.totalXp),
    getNextLevelXp: () => getNextLevelXp(xpData.totalXp),
    XP_REWARDS,
  };
}
