import { useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Trophy,
  Flame,
  Star,
  Medal,
  Crown,
  Zap,
  Target,
  BookOpen,
  Award,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useGamification, getLevelName, getNextLevelXp } from '@/hooks/useGamification';

interface GamificationHubProps {
  studentId: string;
}

// Badge definitions
const BADGE_DEFINITIONS = [
  { id: 'first-login', name: 'Primeiro Login', icon: Star, color: 'text-yellow-400', description: 'Fez login pela primeira vez' },
  { id: 'first-lesson', name: 'Primeira Aula', icon: BookOpen, color: 'text-blue-400', description: 'Completou a primeira aula' },
  { id: 'perfect-quiz', name: 'Quiz Perfeito', icon: Zap, color: 'text-purple-400', description: 'Acertou todas no quiz' },
  { id: 'streak-7', name: 'Streak 7 dias', icon: Flame, color: 'text-orange-400', description: '7 dias seguidos estudando' },
  { id: 'streak-30', name: 'Streak 30 dias', icon: Flame, color: 'text-red-400', description: '30 dias seguidos estudando' },
  { id: '5-missions', name: '5 Missoes', icon: Target, color: 'text-green-400', description: 'Completou 5 missoes' },
  { id: 'module-complete', name: 'Modulo Completo', icon: Award, color: 'text-indigo-400', description: 'Terminou um modulo inteiro' },
  { id: 'top-3', name: 'Top 3 Leaderboard', icon: Medal, color: 'text-amber-400', description: 'Ficou no Top 3 do ranking' },
  { id: 'master', name: 'Mestre', icon: Crown, color: 'text-yellow-500', description: 'Alcancou nivel maximo' },
] as const;

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs text-muted-foreground font-mono w-4 text-center">{rank}</span>;
}

export function GamificationHub({ studentId }: GamificationHubProps) {
  const {
    xpData,
    leaderboard,
    isLoading,
    loadLeaderboard,
  } = useGamification(studentId);

  useEffect(() => {
    loadLeaderboard();
  }, [loadLeaderboard]);

  const levelName = getLevelName(xpData.totalXp);
  const nextLevelXp = getNextLevelXp(xpData.totalXp);

  // Calculate circular progress
  const prevLevelXp = useMemo(() => {
    const LEVELS = [0, 101, 501, 1501, 5001];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
      if (xpData.totalXp >= LEVELS[i]) return LEVELS[i];
    }
    return 0;
  }, [xpData.totalXp]);

  const progressPct = nextLevelXp > prevLevelXp
    ? Math.min(((xpData.totalXp - prevLevelXp) / (nextLevelXp - prevLevelXp)) * 100, 100)
    : 100;

  // Determine earned badges based on xpData
  const earnedBadgeIds = useMemo(() => {
    const earned = new Set<string>();
    earned.add('first-login'); // always earned if they have data
    if (xpData.totalXp > 0) earned.add('first-lesson');
    if (xpData.currentStreakDays >= 7) earned.add('streak-7');
    if (xpData.currentStreakDays >= 30) earned.add('streak-30');
    if (xpData.level >= 5) earned.add('master');
    // Check leaderboard position
    const myRank = leaderboard.find((e) => e.studentId === studentId)?.rank;
    if (myRank && myRank <= 3) earned.add('top-3');
    return earned;
  }, [xpData, leaderboard, studentId]);

  const top5 = leaderboard.slice(0, 5);

  // SVG circular progress
  const circleRadius = 44;
  const circumference = 2 * Math.PI * circleRadius;
  const strokeOffset = circumference - (progressPct / 100) * circumference;

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="py-6">
              <div className="h-20 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* XP Progress + Streak Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* XP Progress Card */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="border-primary/20">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                {/* Circular Progress Ring */}
                <div className="relative w-24 h-24 flex-shrink-0">
                  <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50" cy="50" r={circleRadius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      className="text-muted/30"
                    />
                    <motion.circle
                      cx="50" cy="50" r={circleRadius}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="6"
                      strokeLinecap="round"
                      strokeDasharray={circumference}
                      initial={{ strokeDashoffset: circumference }}
                      animate={{ strokeDashoffset: strokeOffset }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="text-primary"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <motion.span
                      className="text-lg font-bold"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                    >
                      {xpData.totalXp}
                    </motion.span>
                    <span className="text-[10px] text-muted-foreground">XP</span>
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">{levelName}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      Lv.{xpData.level}
                    </Badge>
                  </div>
                  <Progress value={progressPct} className="h-1.5 mb-1" />
                  <p className="text-[11px] text-muted-foreground">
                    {nextLevelXp > xpData.totalXp
                      ? `${nextLevelXp - xpData.totalXp} XP para proximo nivel`
                      : 'Nivel maximo atingido!'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Streak Card */}
        <motion.div whileHover={{ scale: 1.02 }} transition={{ type: 'spring', stiffness: 300 }}>
          <Card className="border-orange-500/20">
            <CardContent className="py-5">
              <div className="flex items-center gap-4">
                <div className={cn(
                  'w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0',
                  xpData.currentStreakDays > 0
                    ? 'bg-gradient-to-br from-orange-400 to-red-500'
                    : 'bg-muted',
                )}>
                  <Flame className={cn(
                    'h-8 w-8',
                    xpData.currentStreakDays > 0 ? 'text-white' : 'text-muted-foreground',
                  )} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold flex items-center gap-1.5">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Sequencia
                  </p>
                  <motion.p
                    className="text-3xl font-bold"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    {xpData.currentStreakDays}
                    <span className="text-sm font-normal text-muted-foreground ml-1">dias</span>
                  </motion.p>
                  <p className="text-[11px] text-muted-foreground">
                    Recorde: {xpData.longestStreakDays} dias
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Badges Grid */}
      <Card className="border-primary/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Star className="h-4 w-4 text-yellow-400" />
            Medalhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3">
            {BADGE_DEFINITIONS.map((badge) => {
              const earned = earnedBadgeIds.has(badge.id);
              const Icon = badge.icon;
              return (
                <motion.div
                  key={badge.id}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className={cn(
                    'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-center transition-colors',
                    earned
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-border bg-muted/30 grayscale opacity-50',
                  )}
                  title={badge.description}
                >
                  <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center',
                    earned ? 'bg-primary/10' : 'bg-muted',
                  )}>
                    <Icon className={cn('h-5 w-5', earned ? badge.color : 'text-muted-foreground')} />
                  </div>
                  <span className="text-[11px] font-medium leading-tight">{badge.name}</span>
                </motion.div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Leaderboard Preview */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Ranking — Top 5
          </CardTitle>
        </CardHeader>
        <CardContent>
          {top5.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Sem participantes ainda
            </p>
          ) : (
            <div className="space-y-2">
              {top5.map((entry, idx) => {
                const isMe = entry.studentId === studentId;
                return (
                  <motion.div
                    key={entry.studentId}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg',
                      isMe ? 'bg-primary/10 border border-primary/30' : '',
                    )}
                  >
                    <div className="w-6 flex justify-center">{getRankIcon(entry.rank)}</div>
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs bg-muted">
                        {isMe ? 'EU' : `A${entry.rank}`}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isMe ? 'Voce' : `Aluno #${entry.rank}`}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {getLevelName(entry.totalXp)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs font-mono">
                      {entry.totalXp} XP
                    </Badge>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Atividade Recente
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-36">
            {xpData.totalXp === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma atividade ainda. Comece uma aula!
              </p>
            ) : (
              <div className="space-y-2">
                {/* Simulated recent activity from available data */}
                {xpData.lastStudyDate && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Sessao de estudo</p>
                      <p className="text-[10px] text-muted-foreground">{xpData.lastStudyDate}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      +XP
                    </Badge>
                  </div>
                )}
                {xpData.currentStreakDays > 0 && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-orange-500/10 flex items-center justify-center">
                      <Flame className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Streak de {xpData.currentStreakDays} dias</p>
                      <p className="text-[10px] text-muted-foreground">Em andamento</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-orange-500">
                      Ativo
                    </Badge>
                  </div>
                )}
                {xpData.level > 1 && (
                  <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/30">
                    <div className="w-8 h-8 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Star className="h-4 w-4 text-yellow-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium">Nivel {xpData.level} alcancado</p>
                      <p className="text-[10px] text-muted-foreground">{levelName}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] text-yellow-500">
                      Level Up
                    </Badge>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
