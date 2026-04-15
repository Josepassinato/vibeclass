import { Flame } from 'lucide-react';

interface StreakCounterProps {
  days: number;
  longestStreak: number;
}

export function StreakCounter({ days, longestStreak }: StreakCounterProps) {
  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-1 ${days > 0 ? 'text-orange-500' : 'text-muted-foreground'}`}>
        <Flame className={`h-4 w-4 ${days > 0 ? 'animate-pulse' : ''}`} />
        <span className="text-sm font-bold">{days}</span>
        <span className="text-xs">dias</span>
      </div>
      {longestStreak > days && (
        <span className="text-[10px] text-muted-foreground">Recorde: {longestStreak}</span>
      )}
    </div>
  );
}
