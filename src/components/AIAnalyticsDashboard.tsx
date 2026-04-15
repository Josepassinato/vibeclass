import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Brain,
  Clock,
  Target,
  Flame,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  BarChart3,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Area,
  AreaChart,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';

interface AIAnalyticsDashboardProps {
  studentId: string;
}

interface KPIData {
  totalStudyHours: number;
  quizAverage: number;
  currentStreak: number;
  lessonsCompleted: number;
  totalLessons: number;
}

interface LessonHeatmapItem {
  lessonTitle: string;
  quizScore: number;
  completedAt: string;
}

interface QuizDataPoint {
  date: string;
  score: number;
  label: string;
}

interface StudyPatternDay {
  day: string;
  minutes: number;
}

interface WeeklyReport {
  summary: string;
  strengths: string[];
  improvements: string[];
  recommendedLesson: string;
}

interface DropoutRisk {
  level: 'green' | 'yellow' | 'red';
  daysSinceLogin: number;
  suggestion: string;
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4 },
  }),
};

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'];

function getHeatColor(score: number): string {
  if (score >= 80) return 'bg-green-500';
  if (score >= 60) return 'bg-yellow-500';
  if (score >= 40) return 'bg-orange-500';
  return 'bg-red-500';
}

function getHeatOpacity(score: number): string {
  if (score >= 90) return 'opacity-100';
  if (score >= 70) return 'opacity-80';
  if (score >= 50) return 'opacity-60';
  return 'opacity-40';
}

function getPatternIntensity(minutes: number, maxMinutes: number): string {
  if (maxMinutes === 0) return 'bg-muted';
  const ratio = minutes / maxMinutes;
  if (ratio === 0) return 'bg-muted';
  if (ratio < 0.25) return 'bg-emerald-900/50';
  if (ratio < 0.5) return 'bg-emerald-700/60';
  if (ratio < 0.75) return 'bg-emerald-500/70';
  return 'bg-emerald-400';
}

function getRiskConfig(level: 'green' | 'yellow' | 'red') {
  const map = {
    green: {
      label: 'Ativo',
      color: 'text-green-400',
      bg: 'bg-green-500/20 border-green-500/30',
      icon: TrendingUp,
    },
    yellow: {
      label: 'Em risco',
      color: 'text-yellow-400',
      bg: 'bg-yellow-500/20 border-yellow-500/30',
      icon: AlertTriangle,
    },
    red: {
      label: 'Inativo',
      color: 'text-red-400',
      bg: 'bg-red-500/20 border-red-500/30',
      icon: AlertTriangle,
    },
  };
  return map[level];
}

function computeDropoutRisk(daysSinceLogin: number, streak: number, completionRate: number): DropoutRisk {
  let level: 'green' | 'yellow' | 'red' = 'green';
  let suggestion = 'Continue assim! Seu ritmo esta otimo.';

  if (daysSinceLogin > 7 || (streak === 0 && completionRate < 0.3)) {
    level = 'red';
    suggestion = 'Que tal retomar com uma aula curta? Escolhemos uma especial pra voce.';
  } else if (daysSinceLogin > 3 || (streak === 0 && completionRate < 0.6)) {
    level = 'yellow';
    suggestion = 'Voce esta quase la! Uma sessao rapida pode manter seu progresso.';
  }

  return { level, daysSinceLogin, suggestion };
}

export function AIAnalyticsDashboard({ studentId }: AIAnalyticsDashboardProps) {
  const [kpi, setKpi] = useState<KPIData>({
    totalStudyHours: 0,
    quizAverage: 0,
    currentStreak: 0,
    lessonsCompleted: 0,
    totalLessons: 0,
  });
  const [heatmapData, setHeatmapData] = useState<LessonHeatmapItem[]>([]);
  const [quizData, setQuizData] = useState<QuizDataPoint[]>([]);
  const [studyPattern, setStudyPattern] = useState<StudyPatternDay[]>(
    dayLabels.map((day) => ({ day, minutes: 0 }))
  );
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [dropoutRisk, setDropoutRisk] = useState<DropoutRisk>({
    level: 'green',
    daysSinceLogin: 0,
    suggestion: '',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!studentId) return;

    const fetchData = async () => {
      setIsLoading(true);

      try {
        // Fetch lesson progress
        const { data: progressData } = await supabase
          .from('student_lesson_progress')
          .select('watch_time, completed, lesson_id, completed_at, updated_at')
          .eq('student_id', studentId);

        // Fetch quiz results
        const { data: quizResults } = await supabase
          .from('student_quiz_results')
          .select('score, created_at, lesson_id')
          .eq('student_id', studentId)
          .order('created_at', { ascending: true });

        // Fetch XP / streak
        const { data: xpData } = await supabase
          .from('student_xp')
          .select('current_streak, last_activity_date, total_xp')
          .eq('student_id', studentId)
          .single();

        // Fetch total lessons count
        const { count: totalLessons } = await supabase
          .from('videos')
          .select('id', { count: 'exact', head: true });

        // Compute KPIs
        const totalWatchSeconds = (progressData || []).reduce(
          (sum, p) => sum + (p.watch_time || 0),
          0
        );
        const completedLessons = (progressData || []).filter((p) => p.completed).length;
        const scores = (quizResults || []).map((q) => q.score || 0);
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        const streak = xpData?.current_streak || 0;

        setKpi({
          totalStudyHours: Math.round((totalWatchSeconds / 3600) * 10) / 10,
          quizAverage: Math.round(avgScore),
          currentStreak: streak,
          lessonsCompleted: completedLessons,
          totalLessons: totalLessons || 0,
        });

        // Heatmap: completed lessons with quiz scores
        const lessonScoreMap = new Map<string, number>();
        (quizResults || []).forEach((q) => {
          const existing = lessonScoreMap.get(q.lesson_id);
          if (!existing || q.score > existing) {
            lessonScoreMap.set(q.lesson_id, q.score || 0);
          }
        });

        const heatmap: LessonHeatmapItem[] = (progressData || [])
          .filter((p) => p.completed)
          .map((p) => ({
            lessonTitle: `Aula ${p.lesson_id.slice(0, 6)}`,
            quizScore: lessonScoreMap.get(p.lesson_id) || 0,
            completedAt: p.completed_at || p.updated_at || '',
          }))
          .slice(0, 12);

        setHeatmapData(heatmap);

        // Quiz timeline
        const quizTimeline: QuizDataPoint[] = (quizResults || []).map((q, i) => ({
          date: new Date(q.created_at).toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          }),
          score: q.score || 0,
          label: `Quiz ${i + 1}`,
        }));
        setQuizData(quizTimeline);

        // Study pattern by day of week
        const dayMinutes = [0, 0, 0, 0, 0, 0, 0];
        (progressData || []).forEach((p) => {
          const dateStr = p.completed_at || p.updated_at;
          if (dateStr) {
            const dayIndex = (new Date(dateStr).getDay() + 6) % 7; // Mon=0
            dayMinutes[dayIndex] += Math.round((p.watch_time || 0) / 60);
          }
        });
        setStudyPattern(
          dayLabels.map((day, i) => ({ day, minutes: dayMinutes[i] }))
        );

        // Dropout risk
        const lastActivity = xpData?.last_activity_date
          ? new Date(xpData.last_activity_date)
          : null;
        const daysSinceLogin = lastActivity
          ? Math.floor((Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        const completionRate = totalLessons ? completedLessons / totalLessons : 0;

        setDropoutRisk(computeDropoutRisk(daysSinceLogin, streak, completionRate));
      } catch (err) {
        console.error('Analytics fetch error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [studentId]);

  // Fetch AI weekly report
  useEffect(() => {
    if (!studentId) return;

    const fetchReport = async () => {
      setReportLoading(true);
      try {
        const { data, error } = await supabase.functions.invoke('agent-feedback', {
          body: { type: 'weekly_report', studentId },
        });

        if (!error && data) {
          setWeeklyReport({
            summary: data.summary || 'Sem dados suficientes para gerar relatorio.',
            strengths: data.strengths || [],
            improvements: data.improvements || [],
            recommendedLesson: data.recommendedLesson || '',
          });
        }
      } catch {
        setWeeklyReport({
          summary: 'Nao foi possivel gerar o relatorio neste momento.',
          strengths: [],
          improvements: [],
          recommendedLesson: '',
        });
      } finally {
        setReportLoading(false);
      }
    };

    fetchReport();
  }, [studentId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          <p className="text-sm text-muted-foreground">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  const maxStudyMinutes = Math.max(...studyPattern.map((d) => d.minutes), 1);
  const riskConfig = getRiskConfig(dropoutRisk.level);
  const RiskIcon = riskConfig.icon;

  return (
    <TooltipProvider>
      <div className="space-y-4">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            {
              icon: Clock,
              label: 'Tempo de estudo',
              value: `${kpi.totalStudyHours}h`,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              icon: Target,
              label: 'Media dos quizzes',
              value: `${kpi.quizAverage}%`,
              color: 'text-emerald-400',
              bg: 'bg-emerald-500/10',
            },
            {
              icon: Flame,
              label: 'Streak atual',
              value: `${kpi.currentStreak} dias`,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
            {
              icon: BookOpen,
              label: 'Aulas concluidas',
              value: `${kpi.lessonsCompleted}/${kpi.totalLessons}`,
              color: 'text-violet-400',
              bg: 'bg-violet-500/10',
            },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              custom={i}
              initial="hidden"
              animate="visible"
              variants={cardVariants}
            >
              <Card className="border-border/50">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`p-1.5 rounded-md ${item.bg}`}>
                      <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                    </div>
                  </div>
                  <p className="text-xl font-bold tracking-tight">{item.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.label}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* AI Weekly Report */}
        <motion.div custom={4} initial="hidden" animate="visible" variants={cardVariants}>
          <Card className="border-border/50 bg-gradient-to-br from-primary/5 to-transparent">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-medium">Relatorio Semanal IA</CardTitle>
                <Badge variant="outline" className="text-[10px] h-4 px-1.5 ml-auto">
                  Grok
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {reportLoading ? (
                <div className="flex items-center gap-2 py-4">
                  <div className="h-4 w-4 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                  <p className="text-xs text-muted-foreground">Gerando relatorio com IA...</p>
                </div>
              ) : weeklyReport ? (
                <>
                  <p className="text-sm text-foreground/90 leading-relaxed">
                    {weeklyReport.summary}
                  </p>
                  {weeklyReport.strengths.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-green-400 mb-1">Pontos fortes</p>
                      <ul className="space-y-0.5">
                        {weeklyReport.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-green-500 mt-0.5">+</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {weeklyReport.improvements.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-amber-400 mb-1">A melhorar</p>
                      <ul className="space-y-0.5">
                        {weeklyReport.improvements.map((s, i) => (
                          <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                            <span className="text-amber-500 mt-0.5">~</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {weeklyReport.recommendedLesson && (
                    <div className="pt-1 border-t border-border/30">
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/80">Proxima aula sugerida:</span>{' '}
                        {weeklyReport.recommendedLesson}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-muted-foreground py-2">Relatorio indisponivel.</p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Heatmap + Quiz Chart row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Attention Heatmap */}
          <motion.div custom={5} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Mapa de Desempenho</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {heatmapData.length > 0 ? (
                  <div className="space-y-1.5">
                    {heatmapData.map((lesson, i) => (
                      <Tooltip key={i}>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-2 group cursor-default">
                            <span className="text-[10px] text-muted-foreground w-16 truncate">
                              {lesson.lessonTitle}
                            </span>
                            <div className="flex-1 h-4 rounded-sm overflow-hidden bg-muted/30">
                              <div
                                className={`h-full rounded-sm transition-all ${getHeatColor(lesson.quizScore)} ${getHeatOpacity(lesson.quizScore)}`}
                                style={{ width: `${Math.max(lesson.quizScore, 5)}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">
                              {lesson.quizScore}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          <p className="font-medium">{lesson.lessonTitle}</p>
                          <p>Quiz: {lesson.quizScore}%</p>
                          {lesson.completedAt && (
                            <p className="text-muted-foreground">
                              {new Date(lesson.completedAt).toLocaleDateString('pt-BR')}
                            </p>
                          )}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhuma aula concluida ainda
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Quiz Performance Chart */}
          <motion.div custom={6} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Evolucao dos Quizzes</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                {quizData.length > 1 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={quizData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        domain={[0, 100]}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <RechartsTooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                        formatter={(value: number) => [`${value}%`, 'Nota']}
                      />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        fill="url(#scoreGradient)"
                      />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(142, 76%, 36%)"
                        strokeWidth={2}
                        dot={{ r: 3, fill: 'hsl(142, 76%, 36%)' }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-xs text-muted-foreground text-center py-12">
                    {quizData.length === 1
                      ? 'Complete mais quizzes para ver a evolucao'
                      : 'Nenhum quiz respondido ainda'}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Study Pattern + Dropout Risk row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Study Pattern */}
          <motion.div custom={7} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-sm font-medium">Padrao de Estudo</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1.5">
                  {studyPattern.map((day) => (
                    <Tooltip key={day.day}>
                      <TooltipTrigger asChild>
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`w-full aspect-square rounded-sm ${getPatternIntensity(day.minutes, maxStudyMinutes)} transition-colors`}
                          />
                          <span className="text-[9px] text-muted-foreground">{day.day}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        <p>
                          {day.day}: {day.minutes} min
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-1 mt-2">
                  <span className="text-[9px] text-muted-foreground">Menos</span>
                  {['bg-muted', 'bg-emerald-900/50', 'bg-emerald-700/60', 'bg-emerald-500/70', 'bg-emerald-400'].map(
                    (color, i) => (
                      <div key={i} className={`w-2.5 h-2.5 rounded-sm ${color}`} />
                    )
                  )}
                  <span className="text-[9px] text-muted-foreground">Mais</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Dropout Risk */}
          <motion.div custom={8} initial="hidden" animate="visible" variants={cardVariants}>
            <Card className={`border ${riskConfig.bg}`}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <RiskIcon className={`h-4 w-4 ${riskConfig.color}`} />
                  <CardTitle className="text-sm font-medium">Risco de Abandono</CardTitle>
                  <Badge
                    variant="outline"
                    className={`text-[10px] h-4 px-1.5 ml-auto ${riskConfig.color}`}
                  >
                    {riskConfig.label}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-12 w-12 rounded-full flex items-center justify-center ${
                      dropoutRisk.level === 'green'
                        ? 'bg-green-500/20'
                        : dropoutRisk.level === 'yellow'
                        ? 'bg-yellow-500/20'
                        : 'bg-red-500/20'
                    }`}
                  >
                    <div
                      className={`h-6 w-6 rounded-full ${
                        dropoutRisk.level === 'green'
                          ? 'bg-green-500'
                          : dropoutRisk.level === 'yellow'
                          ? 'bg-yellow-500'
                          : 'bg-red-500'
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">
                      Ultimo acesso: {dropoutRisk.daysSinceLogin === 0
                        ? 'hoje'
                        : dropoutRisk.daysSinceLogin === 1
                        ? 'ontem'
                        : `${dropoutRisk.daysSinceLogin} dias atras`}
                    </p>
                    <Progress
                      value={
                        dropoutRisk.level === 'green'
                          ? 100
                          : dropoutRisk.level === 'yellow'
                          ? 50
                          : 15
                      }
                      className="h-1.5 mt-1"
                    />
                  </div>
                </div>
                {dropoutRisk.suggestion && (
                  <div className="bg-background/30 rounded-md p-2">
                    <p className="text-xs text-foreground/80 flex items-start gap-1.5">
                      <Brain className="h-3 w-3 mt-0.5 text-primary flex-shrink-0" />
                      {dropoutRisk.suggestion}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </TooltipProvider>
  );
}
