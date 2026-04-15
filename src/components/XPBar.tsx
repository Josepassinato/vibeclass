import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';
import { getLevelName, getNextLevelXp } from '@/hooks/useGamification';

interface XPBarProps {
  totalXp: number;
  level: number;
  compact?: boolean;
}

export function XPBar({ totalXp, level, compact = false }: XPBarProps) {
  const levelName = getLevelName(totalXp);
  const nextXp = getNextLevelXp(totalXp);
  const progress = nextXp > 0 ? Math.min((totalXp / nextXp) * 100, 100) : 100;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-xs font-mono font-medium">{totalXp} XP</span>
        <Badge variant="outline" className="text-[10px] h-4 px-1">Lv{level}</Badge>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Zap className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-medium">{levelName}</span>
          <Badge variant="secondary" className="text-xs">Lv{level}</Badge>
        </div>
        <span className="text-xs text-muted-foreground">{totalXp}/{nextXp} XP</span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>
  );
}
