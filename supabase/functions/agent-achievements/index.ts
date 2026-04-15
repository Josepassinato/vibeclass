import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, handleCors } from "../_shared/cors.ts";

/**
 * AGENTE DE CONQUISTAS E GAMIFICAÇÃO
 *
 * Especialista em calcular pontos, níveis, streaks e badges.
 * Gerencia todo o sistema de gamificação do estudante.
 */

interface AchievementRequest {
  studentId: string;
  action: 'mission_completed' | 'mission_attempted' | 'streak_check' | 'get_status';
  missionId?: string;
  pointsEarned?: number;
  score?: number;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

interface AchievementResult {
  success: boolean;
  currentStats: {
    totalPoints: number;
    level: number;
    currentStreak: number;
    longestStreak: number;
    missionsCompleted: number;
    missionsAttempted: number;
    averageScore: number;
  };
  newBadges?: Badge[];
  levelUp?: {
    oldLevel: number;
    newLevel: number;
  };
  message?: string;
}

// Level thresholds
const LEVEL_THRESHOLDS = [
  0,      // Level 1
  100,    // Level 2
  300,    // Level 3
  600,    // Level 4
  1000,   // Level 5
  1500,   // Level 6
  2200,   // Level 7
  3000,   // Level 8
  4000,   // Level 9
  5500,   // Level 10
];

// Badge definitions
const BADGE_DEFINITIONS = {
  first_mission: {
    id: 'first_mission',
    name: 'Primeira Missão',
    description: 'Completou sua primeira missão',
    icon: '🎯',
    condition: (stats: any) => stats.missionsCompleted >= 1
  },
  five_missions: {
    id: 'five_missions',
    name: 'Explorador',
    description: 'Completou 5 missões',
    icon: '🗺️',
    condition: (stats: any) => stats.missionsCompleted >= 5
  },
  ten_missions: {
    id: 'ten_missions',
    name: 'Aventureiro',
    description: 'Completou 10 missões',
    icon: '⚔️',
    condition: (stats: any) => stats.missionsCompleted >= 10
  },
  streak_3: {
    id: 'streak_3',
    name: 'Em Chamas',
    description: '3 dias seguidos de estudo',
    icon: '🔥',
    condition: (stats: any) => stats.currentStreak >= 3
  },
  streak_7: {
    id: 'streak_7',
    name: 'Dedicado',
    description: '7 dias seguidos de estudo',
    icon: '💪',
    condition: (stats: any) => stats.currentStreak >= 7
  },
  perfect_score: {
    id: 'perfect_score',
    name: 'Perfeição',
    description: 'Nota 100 em uma missão',
    icon: '💯',
    condition: (_stats: any, context: any) => context?.score === 100
  },
  high_average: {
    id: 'high_average',
    name: 'Excelência',
    description: 'Média acima de 90%',
    icon: '🌟',
    condition: (stats: any) => stats.averageScore >= 90 && stats.missionsCompleted >= 3
  },
  level_5: {
    id: 'level_5',
    name: 'Mestre Aprendiz',
    description: 'Alcançou o nível 5',
    icon: '🏆',
    condition: (stats: any) => stats.level >= 5
  },
};

function calculateLevel(totalPoints: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalPoints >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const request: AchievementRequest = await req.json();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[agent-achievements] Action:", request.action, "Student:", request.studentId);

    // Get or create student achievements
    let { data: achievements, error: fetchError } = await supabase
      .from('student_achievements')
      .select('*')
      .eq('student_id', request.studentId)
      .single();

    if (fetchError && fetchError.code === 'PGRST116') {
      // Create new achievement record
      const { data: newAchievements, error: createError } = await supabase
        .from('student_achievements')
        .insert({
          student_id: request.studentId,
          total_points: 0,
          current_streak: 0,
          longest_streak: 0,
          level: 1,
          badges: [],
          missions_completed: 0,
          missions_attempted: 0,
          average_score: 0,
          last_activity_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      achievements = newAchievements;
    } else if (fetchError) {
      throw fetchError;
    }

    const currentBadges: Badge[] = achievements.badges || [];
    const newBadges: Badge[] = [];
    let levelUp: { oldLevel: number; newLevel: number } | undefined;

    // Process action
    if (request.action === 'mission_completed' && request.pointsEarned !== undefined) {
      const oldLevel = achievements.level;
      const newTotalPoints = achievements.total_points + request.pointsEarned;
      const newLevel = calculateLevel(newTotalPoints);
      const newMissionsCompleted = achievements.missions_completed + 1;
      const newMissionsAttempted = achievements.missions_attempted + 1;
      
      // Calculate new average
      const totalScoreSum = (achievements.average_score * achievements.missions_completed) + (request.score || 0);
      const newAverageScore = newMissionsCompleted > 0 ? totalScoreSum / newMissionsCompleted : 0;

      // Update streak
      const lastActivity = achievements.last_activity_at ? new Date(achievements.last_activity_at) : null;
      const now = new Date();
      const daysDiff = lastActivity 
        ? Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      let newStreak = achievements.current_streak;
      if (daysDiff <= 1) {
        newStreak = daysDiff === 1 ? achievements.current_streak + 1 : achievements.current_streak;
      } else {
        newStreak = 1; // Reset streak
      }
      const newLongestStreak = Math.max(achievements.longest_streak, newStreak);

      // Check for level up
      if (newLevel > oldLevel) {
        levelUp = { oldLevel, newLevel };
      }

      // Update database
      const { error: updateError } = await supabase
        .from('student_achievements')
        .update({
          total_points: newTotalPoints,
          level: newLevel,
          current_streak: newStreak,
          longest_streak: newLongestStreak,
          missions_completed: newMissionsCompleted,
          missions_attempted: newMissionsAttempted,
          average_score: newAverageScore,
          last_activity_at: now.toISOString()
        })
        .eq('student_id', request.studentId);

      if (updateError) throw updateError;

      // Update achievements for badge checking
      achievements = {
        ...achievements,
        total_points: newTotalPoints,
        level: newLevel,
        current_streak: newStreak,
        longest_streak: newLongestStreak,
        missions_completed: newMissionsCompleted,
        missions_attempted: newMissionsAttempted,
        average_score: newAverageScore
      };

    } else if (request.action === 'mission_attempted') {
      const { error: updateError } = await supabase
        .from('student_achievements')
        .update({
          missions_attempted: achievements.missions_attempted + 1,
          last_activity_at: new Date().toISOString()
        })
        .eq('student_id', request.studentId);

      if (updateError) throw updateError;
      achievements.missions_attempted += 1;
    }

    // Check for new badges
    const existingBadgeIds = currentBadges.map(b => b.id);
    const context = { score: request.score };

    for (const [badgeId, badgeDef] of Object.entries(BADGE_DEFINITIONS)) {
      if (!existingBadgeIds.includes(badgeId)) {
        const stats = {
          totalPoints: achievements.total_points,
          level: achievements.level,
          currentStreak: achievements.current_streak,
          longestStreak: achievements.longest_streak,
          missionsCompleted: achievements.missions_completed,
          missionsAttempted: achievements.missions_attempted,
          averageScore: achievements.average_score
        };

        if (badgeDef.condition(stats, context)) {
          const newBadge: Badge = {
            id: badgeDef.id,
            name: badgeDef.name,
            description: badgeDef.description,
            icon: badgeDef.icon,
            earnedAt: new Date().toISOString()
          };
          newBadges.push(newBadge);
        }
      }
    }

    // Save new badges if any
    if (newBadges.length > 0) {
      const allBadges = [...currentBadges, ...newBadges];
      const { error: badgeError } = await supabase
        .from('student_achievements')
        .update({ badges: allBadges })
        .eq('student_id', request.studentId);

      if (badgeError) throw badgeError;
    }

    const result: AchievementResult = {
      success: true,
      currentStats: {
        totalPoints: achievements.total_points,
        level: achievements.level,
        currentStreak: achievements.current_streak,
        longestStreak: achievements.longest_streak,
        missionsCompleted: achievements.missions_completed,
        missionsAttempted: achievements.missions_attempted,
        averageScore: achievements.average_score
      },
      newBadges: newBadges.length > 0 ? newBadges : undefined,
      levelUp
    };

    console.log("[agent-achievements] Success. Stats:", result.currentStats);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[agent-achievements] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
