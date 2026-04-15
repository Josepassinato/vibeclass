import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  Flame, 
  Star, 
  Target,
  TrendingUp
} from 'lucide-react';
import type { StudentAchievements } from '@/hooks/useMissions';

interface AchievementsPanelProps {
  achievements: StudentAchievements | null;
  isLoading?: boolean;
}

// Level thresholds for progress calculation
const LEVEL_THRESHOLDS = [0, 100, 300, 600, 1000, 1500, 2200, 3000, 4000, 5500];

export function AchievementsPanel({ achievements, isLoading }: AchievementsPanelProps) {
  if (isLoading || !achievements) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 bg-muted rounded w-32" />
        </CardHeader>
        <CardContent>
          <div className="h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const currentLevelThreshold = LEVEL_THRESHOLDS[achievements.level - 1] || 0;
  const nextLevelThreshold = LEVEL_THRESHOLDS[achievements.level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progressToNextLevel = ((achievements.total_points - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold)) * 100;
  const pointsToNextLevel = nextLevelThreshold - achievements.total_points;

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Trophy className="w-5 h-5 text-yellow-400" />
          Conquistas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Level & Points */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-xl font-bold text-black">
              {achievements.level}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Nível</p>
              <p className="font-semibold">{achievements.total_points} pontos</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Próximo nível</p>
            <p className="text-sm">{pointsToNextLevel > 0 ? `${pointsToNextLevel} pts` : 'MAX'}</p>
          </div>
        </div>
        
        <Progress value={Math.min(progressToNextLevel, 100)} className="h-2" />

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Flame className="w-5 h-5 text-orange-400" />
            <div>
              <p className="text-xs text-muted-foreground">Sequência</p>
              <p className="font-semibold">{achievements.current_streak} dias</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Target className="w-5 h-5 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">Missões</p>
              <p className="font-semibold">{achievements.missions_completed}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Star className="w-5 h-5 text-yellow-400" />
            <div>
              <p className="text-xs text-muted-foreground">Média</p>
              <p className="font-semibold">{Math.round(achievements.average_score)}%</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">Recorde</p>
              <p className="font-semibold">{achievements.longest_streak} dias</p>
            </div>
          </div>
        </div>

        {/* Badges */}
        {achievements.badges.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2">Medalhas</p>
            <div className="flex flex-wrap gap-2">
              {achievements.badges.map((badge) => (
                <Badge 
                  key={badge.id} 
                  variant="secondary"
                  className="px-3 py-1"
                  title={badge.description}
                >
                  <span className="mr-1">{badge.icon}</span>
                  {badge.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {achievements.badges.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Complete missões para ganhar medalhas! 🏅
          </p>
        )}
      </CardContent>
    </Card>
  );
}
