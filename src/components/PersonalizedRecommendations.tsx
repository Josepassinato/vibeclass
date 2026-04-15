import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lightbulb,
  Target,
  Award,
  Heart,
  BookOpen,
  Loader2
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LearningInsight {
  id: string;
  insight_type: string;
  category: string | null;
  title: string;
  content: string;
  confidence: number;
  created_at: string;
}

interface ConceptMastery {
  id: string;
  concept: string;
  mastery_level: number;
  total_attempts: number;
  correct_attempts: number;
  last_assessed_at: string | null;
}

interface PersonalizedRecommendationsProps {
  studentId: string;
}

const insightIcons: Record<string, any> = {
  strength: TrendingUp,
  weakness: TrendingDown,
  pattern: Brain,
  recommendation: Lightbulb,
  milestone: Award,
  risk: AlertTriangle,
  emotional_pattern: Heart,
};

const insightColors: Record<string, string> = {
  strength: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20',
  weakness: 'text-red-400 bg-red-400/10 border-red-400/20',
  pattern: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  recommendation: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
  milestone: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  risk: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  emotional_pattern: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
};

const insightLabels: Record<string, string> = {
  strength: 'Ponto Forte',
  weakness: 'A Melhorar',
  pattern: 'Padrão',
  recommendation: 'Recomendação',
  milestone: 'Conquista',
  risk: 'Atenção',
  emotional_pattern: 'Emocional',
};

function getMasteryColor(level: number): string {
  if (level >= 0.8) return 'text-emerald-400';
  if (level >= 0.6) return 'text-blue-400';
  if (level >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function getMasteryLabel(level: number): string {
  if (level >= 0.8) return 'Dominado';
  if (level >= 0.6) return 'Proficiente';
  if (level >= 0.4) return 'Desenvolvendo';
  if (level >= 0.2) return 'Iniciante';
  return 'A Explorar';
}

export function PersonalizedRecommendations({ studentId }: PersonalizedRecommendationsProps) {
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      setIsLoading(true);

      const [insightsRes, conceptsRes] = await Promise.all([
        supabase
          .from('learning_insights')
          .select('*')
          .eq('student_id', studentId)
          .eq('is_active', true)
          .order('confidence', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('concept_mastery')
          .select('*')
          .eq('student_id', studentId)
          .order('mastery_level', { ascending: true })
          .limit(15),
      ]);

      setInsights(insightsRes.data || []);
      setConcepts(conceptsRes.data || []);
      setIsLoading(false);
    };

    fetchData();
  }, [studentId]);

  if (isLoading) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Analisando seu aprendizado...</span>
        </CardContent>
      </Card>
    );
  }

  if (insights.length === 0 && concepts.length === 0) {
    return (
      <Card className="bg-card/50 border-border/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Aprendizado Personalizado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            Continue estudando! Seus insights personalizados aparecerao aqui conforme o tutor IA
            conhece melhor seu estilo de aprendizagem.
          </p>
        </CardContent>
      </Card>
    );
  }

  const strengths = insights.filter(i => i.insight_type === 'strength');
  const weaknesses = insights.filter(i => i.insight_type === 'weakness');
  const recommendations = insights.filter(i => i.insight_type === 'recommendation');
  const others = insights.filter(i => !['strength', 'weakness', 'recommendation'].includes(i.insight_type));

  const weakConcepts = concepts.filter(c => c.mastery_level < 0.5);
  const strongConcepts = concepts.filter(c => c.mastery_level >= 0.7);

  return (
    <div className="space-y-4">
      {/* Concept Mastery Map */}
      {concepts.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Mapa de Dominio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {concepts.map((concept) => (
              <div key={concept.id} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{concept.concept}</span>
                  <span className={cn('text-xs font-medium', getMasteryColor(concept.mastery_level))}>
                    {getMasteryLabel(concept.mastery_level)} ({Math.round(concept.mastery_level * 100)}%)
                  </span>
                </div>
                <Progress
                  value={concept.mastery_level * 100}
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {concept.correct_attempts}/{concept.total_attempts} acertos
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-primary" />
              Insights de Aprendizagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Recommendations first */}
            {recommendations.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
            {/* Then weaknesses */}
            {weaknesses.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
            {/* Then strengths */}
            {strengths.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
            {/* Then others */}
            {others.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Study Recommendations */}
      {weakConcepts.length > 0 && (
        <Card className="bg-card/50 border-amber-400/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-amber-400" />
              Recomendacoes de Estudo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-3">
              O tutor IA identificou estes conceitos que precisam de mais pratica:
            </p>
            <div className="space-y-2">
              {weakConcepts.map((concept) => (
                <div key={concept.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-400/5 border border-amber-400/10">
                  <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium">{concept.concept}</span>
                    <span className="text-xs text-muted-foreground ml-2">
                      {Math.round(concept.mastery_level * 100)}% dominio
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              O tutor vai focar nesses conceitos nas proximas aulas e quizzes.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightCard({ insight }: { insight: LearningInsight }) {
  const Icon = insightIcons[insight.insight_type] || Brain;
  const colorClass = insightColors[insight.insight_type] || 'text-gray-400 bg-gray-400/10 border-gray-400/20';
  const label = insightLabels[insight.insight_type] || insight.insight_type;

  return (
    <div className={cn('p-3 rounded-lg border', colorClass)}>
      <div className="flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">{insight.title}</span>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {label}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {insight.content}
          </p>
        </div>
      </div>
    </div>
  );
}
