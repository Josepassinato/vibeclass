import { Clock, CheckCircle, Lock, Play } from 'lucide-react';

interface LessonCardProps {
  title: string;
  thumbnail: string;
  duration?: number | null;
  lessonNumber: number;
  isActive: boolean;
  isCompleted: boolean;
  isUnlocked: boolean;
  quizPassed?: boolean;
  missionCompleted?: boolean;
  onClick: () => void;
}

export function LessonCard({
  title,
  thumbnail,
  duration,
  lessonNumber,
  isActive,
  isCompleted,
  isUnlocked,
  quizPassed,
  missionCompleted,
  onClick,
}: LessonCardProps) {
  return (
    <button
      className={`w-full text-left flex items-center gap-3 p-2.5 rounded-lg transition-all ${
        !isUnlocked ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-muted/50'
      } ${isActive ? 'bg-primary/8' : ''}`}
      onClick={onClick}
      disabled={!isUnlocked}
    >
      {/* Thumbnail */}
      <div className="relative w-16 h-10 rounded-md overflow-hidden flex-shrink-0 bg-muted">
        <img
          src={thumbnail}
          alt={title}
          className={`w-full h-full object-cover ${!isUnlocked ? 'grayscale' : ''}`}
        />
        {!isUnlocked && (
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center">
            <Lock className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        {isUnlocked && isCompleted && (
          <div className="absolute inset-0 bg-accent/80 flex items-center justify-center">
            <CheckCircle className="h-4 w-4 text-white" />
          </div>
        )}
        {isUnlocked && !isCompleted && isActive && (
          <div className="absolute inset-0 bg-primary/80 flex items-center justify-center">
            <Play className="h-3.5 w-3.5 text-white fill-white" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-medium line-clamp-2 ${!isUnlocked ? 'text-muted-foreground' : ''}`}>
          {title}
        </p>
        <div className="flex items-center gap-1.5 mt-1 flex-wrap">
          {quizPassed && (
            <span className="text-[9px] text-accent">Quiz ✓</span>
          )}
          {missionCompleted && (
            <span className="text-[9px] text-primary">Missão ✓</span>
          )}
          {isUnlocked && duration && !isCompleted && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />
              {duration} min
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
