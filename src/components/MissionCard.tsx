import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Target, 
  Clock, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  XCircle,
  Send,
  FileText,
  Link as LinkIcon,
  Code,
  Image
} from 'lucide-react';
import type { Mission, MissionSubmission } from '@/hooks/useMissions';

interface MissionCardProps {
  mission: Mission;
  submissions: MissionSubmission[];
  onSubmit: (evidenceText?: string, evidenceUrl?: string) => Promise<void>;
  isEvaluating: boolean;
}

const difficultyColors = {
  'básico': 'bg-green-500/20 text-green-400 border-green-500/30',
  'intermediário': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  'avançado': 'bg-red-500/20 text-red-400 border-red-500/30'
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-400', label: 'Pendente' },
  evaluating: { icon: Clock, color: 'text-blue-400', label: 'Avaliando...' },
  approved: { icon: CheckCircle2, color: 'text-green-400', label: 'Aprovada' },
  needs_revision: { icon: AlertCircle, color: 'text-orange-400', label: 'Revisão' },
  rejected: { icon: XCircle, color: 'text-red-400', label: 'Refazer' }
};

const evidenceIcons = {
  text: FileText,
  screenshot: Image,
  code: Code,
  link: LinkIcon,
  file: FileText
};

export function MissionCard({ mission, submissions, onSubmit, isEvaluating }: MissionCardProps) {
  const [evidenceText, setEvidenceText] = useState('');
  const [evidenceUrl, setEvidenceUrl] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const latestSubmission = submissions[0];
  const status = latestSubmission?.status;
  const isCompleted = status === 'approved';
  const canResubmit = !status || status === 'needs_revision' || status === 'rejected';

  const StatusIcon = status ? statusConfig[status].icon : Target;
  const EvidenceIcon = evidenceIcons[mission.evidence_type] || FileText;

  const handleSubmit = async () => {
    if (mission.evidence_type === 'link' && !evidenceUrl.trim()) {
      return;
    }
    if (mission.evidence_type === 'text' && !evidenceText.trim()) {
      return;
    }
    
    await onSubmit(
      mission.evidence_type === 'text' || mission.evidence_type === 'code' ? evidenceText : undefined,
      mission.evidence_type === 'link' || mission.evidence_type === 'screenshot' ? evidenceUrl : undefined
    );
    
    setEvidenceText('');
    setEvidenceUrl('');
    setIsExpanded(false);
  };

  return (
    <Card className={`transition-all duration-300 ${isCompleted ? 'border-green-500/50 bg-green-500/5' : 'border-border/50'}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <StatusIcon className={`w-5 h-5 ${status ? statusConfig[status].color : 'text-muted-foreground'}`} />
              {mission.title}
            </CardTitle>
            <CardDescription className="mt-1">{mission.description}</CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant="outline" className={difficultyColors[mission.difficulty_level]}>
              {mission.difficulty_level}
            </Badge>
            <div className="flex items-center gap-1 text-sm text-yellow-400">
              <Star className="w-4 h-4" />
              {mission.points_reward} pts
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Status and Score */}
        {latestSubmission && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${statusConfig[status!].color}`}>
                {statusConfig[status!].label}
              </span>
              {latestSubmission.score !== null && (
                <span className="text-sm">
                  Pontuação: <strong>{latestSubmission.score}/100</strong>
                </span>
              )}
            </div>
            {latestSubmission.score !== null && (
              <Progress value={latestSubmission.score} className="h-2" />
            )}
            {latestSubmission.ai_feedback && (
              <p className="text-sm text-muted-foreground mt-2">{latestSubmission.ai_feedback}</p>
            )}
          </div>
        )}

        {/* Instructions (expandable) */}
        {!isCompleted && (
          <div className="space-y-3">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full justify-start"
            >
              <EvidenceIcon className="w-4 h-4 mr-2" />
              {isExpanded ? 'Ocultar instruções' : 'Ver instruções e submeter'}
            </Button>

            {isExpanded && (
              <div className="space-y-4 pt-2 border-t">
                <div className="text-sm">
                  <strong>Instruções:</strong>
                  <p className="mt-1 text-muted-foreground whitespace-pre-wrap">{mission.instructions}</p>
                </div>

                {mission.evaluation_criteria.length > 0 && (
                  <div className="text-sm">
                    <strong>Critérios de avaliação:</strong>
                    <ul className="mt-1 list-disc list-inside text-muted-foreground">
                      {mission.evaluation_criteria.map((criterion, i) => (
                        <li key={i}>{criterion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {mission.time_limit_minutes && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Tempo limite: {mission.time_limit_minutes} minutos
                  </div>
                )}

                {/* Evidence Input */}
                {canResubmit && (
                  <div className="space-y-2">
                    {(mission.evidence_type === 'text' || mission.evidence_type === 'code') && (
                      <Textarea
                        placeholder={mission.evidence_type === 'code' ? 'Cole seu código aqui...' : 'Escreva sua resposta aqui...'}
                        value={evidenceText}
                        onChange={(e) => setEvidenceText(e.target.value)}
                        rows={4}
                        className="font-mono"
                      />
                    )}
                    
                    {(mission.evidence_type === 'link' || mission.evidence_type === 'screenshot') && (
                      <Input
                        type="url"
                        placeholder={mission.evidence_type === 'screenshot' ? 'URL da imagem/screenshot' : 'Cole o link aqui...'}
                        value={evidenceUrl}
                        onChange={(e) => setEvidenceUrl(e.target.value)}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>

      {isExpanded && canResubmit && (
        <CardFooter>
          <Button 
            onClick={handleSubmit} 
            disabled={isEvaluating || (!evidenceText.trim() && !evidenceUrl.trim())}
            className="w-full"
          >
            {isEvaluating ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Avaliando...
              </>
            ) : (
              <>
                <Send className="w-4 h-4 mr-2" />
                Enviar Evidência
              </>
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
