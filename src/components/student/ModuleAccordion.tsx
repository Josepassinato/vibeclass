import { Lock, CheckCircle, ChevronDown, Clock } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ModuleLesson {
  id: string;
  title: string;
  thumbnail: string;
  duration?: number | null;
  isCompleted: boolean;
  isUnlocked: boolean;
  quizPassed?: boolean;
  missionCompleted?: boolean;
}

interface ModuleAccordionProps {
  moduleId: string;
  moduleTitle: string;
  moduleIndex: number;
  isUnlocked: boolean;
  isComplete: boolean;
  isExpanded: boolean;
  completedLessons: number;
  totalLessons: number;
  progressPercentage: number;
  lessons: ModuleLesson[];
  selectedLessonId?: string;
  onToggle: () => void;
  onLessonSelect: (lessonId: string) => void;
}

export function ModuleAccordion({
  moduleTitle,
  moduleIndex,
  isUnlocked,
  isComplete,
  isExpanded,
  completedLessons,
  totalLessons,
  progressPercentage,
  lessons,
  selectedLessonId,
  onToggle,
  onLessonSelect,
}: ModuleAccordionProps) {
  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={`${!isUnlocked ? 'opacity-50' : ''}`}>
        <CollapsibleTrigger asChild>
          <button
            className={`w-full text-left px-3 py-2.5 flex items-center gap-3 rounded-lg transition-colors ${
              !isUnlocked ? 'cursor-not-allowed' : 'hover:bg-muted/50'
            }`}
          >
            {/* Module number */}
            <span className="text-xs font-medium text-muted-foreground w-5 text-center flex-shrink-0">
              {isUnlocked ? (moduleIndex + 1) : <Lock className="h-3.5 w-3.5 mx-auto" />}
            </span>

            {/* Module info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium truncate">{moduleTitle}</p>
                {isComplete && <CheckCircle className="h-3.5 w-3.5 text-accent flex-shrink-0" />}
              </div>
              {isUnlocked && (
                <div className="flex items-center gap-2 mt-1.5">
                  <Progress value={progressPercentage} className="h-1 flex-1" />
                  <span className="text-[10px] text-muted-foreground tabular-nums">
                    {completedLessons}/{totalLessons}
                  </span>
                </div>
              )}
            </div>

            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform flex-shrink-0 ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="ml-5 pl-3 border-l border-border space-y-0.5 py-1">
            {lessons.map((lesson) => (
              <button
                key={lesson.id}
                className={`w-full text-left flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  !lesson.isUnlocked
                    ? 'opacity-40 cursor-not-allowed'
                    : 'cursor-pointer hover:bg-muted/50'
                } ${
                  selectedLessonId === lesson.id
                    ? 'bg-primary/8 text-foreground'
                    : ''
                }`}
                onClick={() => lesson.isUnlocked && onLessonSelect(lesson.id)}
              >
                {/* Status indicator */}
                <div className="flex-shrink-0">
                  {!lesson.isUnlocked ? (
                    <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                  ) : lesson.isCompleted ? (
                    <CheckCircle className="h-3.5 w-3.5 text-accent" />
                  ) : selectedLessonId === lesson.id ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-primary bg-primary/20" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-muted-foreground/30" />
                  )}
                </div>

                {/* Lesson info */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{lesson.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {lesson.quizPassed && (
                      <span className="text-[9px] text-accent">Quiz ✓</span>
                    )}
                    {lesson.missionCompleted && (
                      <span className="text-[9px] text-primary">Missão ✓</span>
                    )}
                    {lesson.duration && !lesson.isCompleted && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {lesson.duration}min
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
