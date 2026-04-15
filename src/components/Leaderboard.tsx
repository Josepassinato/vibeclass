import { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trophy, Medal, Award } from 'lucide-react';
import { getLevelName } from '@/hooks/useGamification';
import type { LeaderboardEntry } from '@/hooks/useGamification';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  currentStudentId?: string;
  onLoad?: () => void;
}

function getRankIcon(rank: number) {
  if (rank === 1) return <Trophy className="h-4 w-4 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-4 w-4 text-gray-400" />;
  if (rank === 3) return <Award className="h-4 w-4 text-amber-600" />;
  return <span className="text-xs text-muted-foreground w-4 text-center">{rank}</span>;
}

export function Leaderboard({ entries, currentStudentId, onLoad }: LeaderboardProps) {
  useEffect(() => { onLoad?.(); }, [onLoad]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4" />
          Ranking
        </CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sem participantes ainda</p>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => {
              const isMe = entry.studentId === currentStudentId;
              return (
                <div
                  key={entry.studentId}
                  className={`flex items-center gap-3 p-2 rounded-lg ${isMe ? 'bg-primary/10 border border-primary/30' : ''}`}
                >
                  <div className="w-6 flex justify-center">{getRankIcon(entry.rank)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {isMe ? 'Voce' : `Aluno #${entry.rank}`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{getLevelName(entry.totalXp)}</p>
                  </div>
                  <Badge variant="secondary" className="text-xs font-mono">{entry.totalXp} XP</Badge>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
