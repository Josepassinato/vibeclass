import { Clock, Pause, BookOpen } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TeachingMoment } from '@/hooks/useContentManager';

interface TeachingMomentsListProps {
  moments: TeachingMoment[] | null | undefined;
  activeMomentIndex?: number;
}

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const TeachingMomentsList = ({ moments, activeMomentIndex }: TeachingMomentsListProps) => {
  if (!moments || moments.length === 0) {
    return (
      <Card className="bg-muted/30">
        <CardContent className="p-4 text-center text-muted-foreground text-sm">
          <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Nenhum momento de pausa configurado para esta aula.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/50 border-primary/20">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Pause className="h-3.5 w-3.5 text-primary" />
          </div>
          Momentos de Pausa do Agente
          <Badge variant="secondary" className="ml-auto text-[10px]">
            {moments.length} {moments.length === 1 ? 'pausa' : 'pausas'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0">
        <div className="space-y-2">
          {moments.map((moment, index) => (
            <div
              key={index}
              className={`p-2.5 rounded-lg border transition-all ${
                activeMomentIndex === index
                  ? 'bg-primary/10 border-primary ring-1 ring-primary/50'
                  : 'bg-muted/30 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-start gap-2">
                <Badge 
                  variant={activeMomentIndex === index ? "default" : "outline"} 
                  className="text-[10px] font-mono flex-shrink-0 mt-0.5"
                >
                  <Clock className="h-2.5 w-2.5 mr-1" />
                  {formatTime(moment.timestamp_seconds)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium leading-tight">{moment.topic}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">
                    {moment.key_insight}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          O agente pausará o vídeo nesses momentos para reforçar o aprendizado
        </p>
      </CardContent>
    </Card>
  );
};
