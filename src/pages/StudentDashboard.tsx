import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { 
  GraduationCap, 
  Trophy, 
  Target, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  BarChart3,
  BookOpen,
  Award,
  ArrowLeft,
  Loader2,
  ScrollText
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import { CertificatesPanel } from '@/components/certificates';
import { useAuth } from '@/hooks/useAuth';
import { AIAnalyticsDashboard } from '@/components/AIAnalyticsDashboard';
import { GamificationHub } from '@/components/GamificationHub';
import { PersonalizedRecommendations } from '@/components/PersonalizedRecommendations';

interface QuizResult {
  id: string;
  video_id: string;
  passed: boolean;
  score_percentage: number;
  total_questions: number;
  correct_answers: number;
  completed_at: string;
}

interface LessonProgress {
  id: string;
  video_id: string;
  is_completed: boolean | null;
  watch_time_seconds: number | null;
  completed_at: string | null;
}

interface VideoInfo {
  id: string;
  title: string;
  lesson_order: number | null;
  duration_minutes: number | null;
}

interface DashboardStats {
  totalLessons: number;
  completedLessons: number;
  totalQuizzes: number;
  passedQuizzes: number;
  averageScore: number;
  totalStudyTime: number;
  bestScore: number;
  worstScore: number;
}

const StudentDashboard = () => {
  const { user } = useAuth();
  const [quizResults, setQuizResults] = useState<QuizResult[]>([]);
  const [lessonProgress, setLessonProgress] = useState<LessonProgress[]>([]);
  const [videos, setVideos] = useState<VideoInfo[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalLessons: 0,
    completedLessons: 0,
    totalQuizzes: 0,
    passedQuizzes: 0,
    averageScore: 0,
    totalStudyTime: 0,
    bestScore: 0,
    worstScore: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Use authenticated user ID or fallback to localStorage
  const studentId = user?.id || localStorage.getItem('studentId') || localStorage.getItem('student_id') || '';

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!studentId) {
        setIsLoading(false);
        return;
      }

      try {
        // Load all data in parallel
        const [videosRes, quizRes, progressRes] = await Promise.all([
          supabase.from('videos').select('id, title, lesson_order, duration_minutes').order('lesson_order'),
          supabase.from('student_quiz_results').select('*').eq('student_id', studentId).order('completed_at', { ascending: false }),
          supabase.from('student_lesson_progress').select('*').eq('student_id', studentId),
        ]);

        const videosData = videosRes.data || [];
        const quizData = quizRes.data || [];
        const progressData = progressRes.data || [];

        setVideos(videosData);
        setQuizResults(quizData);
        setLessonProgress(progressData);

        // Calculate stats
        const completedLessons = progressData.filter(p => p.is_completed).length;
        const passedQuizzes = quizData.filter(q => q.passed).length;
        const scores = quizData.map(q => q.score_percentage);
        const averageScore = scores.length > 0 
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) 
          : 0;
        const totalStudyTime = progressData.reduce((acc, p) => acc + (p.watch_time_seconds || 0), 0);

        setStats({
          totalLessons: videosData.length,
          completedLessons,
          totalQuizzes: quizData.length,
          passedQuizzes,
          averageScore,
          totalStudyTime,
          bestScore: scores.length > 0 ? Math.max(...scores) : 0,
          worstScore: scores.length > 0 ? Math.min(...scores) : 0,
        });
      } catch (err) {
        console.error('Error loading dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [studentId]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  const getVideoTitle = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video?.title || 'Aula desconhecida';
  };

  const getVideoOrder = (videoId: string) => {
    const video = videos.find(v => v.id === videoId);
    return video?.lesson_order || 0;
  };

  const progressPercentage = stats.totalLessons > 0 
    ? Math.round((stats.completedLessons / stats.totalLessons) * 100) 
    : 0;

  const quizPassRate = stats.totalQuizzes > 0
    ? Math.round((stats.passedQuizzes / stats.totalQuizzes) * 100)
    : 0;

  // Chart data
  const quizScoresData = quizResults.slice(0, 10).map((q, index) => ({
    name: `Aula ${getVideoOrder(q.video_id)}`,
    score: q.score_percentage,
    passed: q.passed,
  })).reverse();

  const pieData = [
    { name: 'Aprovados', value: stats.passedQuizzes, color: 'hsl(var(--google-green))' },
    { name: 'Reprovados', value: stats.totalQuizzes - stats.passedQuizzes, color: 'hsl(var(--google-red))' },
  ].filter(d => d.value > 0);

  const progressData = lessonProgress
    .filter(p => p.completed_at)
    .map((p, index) => ({
      date: new Date(p.completed_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      completed: index + 1,
    }));

  // Chart configuration
  const chartConfig = {
    score: {
      label: 'Nota',
      color: 'hsl(var(--primary))',
    },
    completed: {
      label: 'Aulas Concluídas',
      color: 'hsl(var(--google-blue))',
    },
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary mb-4" />
          <p className="text-muted-foreground">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  if (!studentId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardContent className="py-8 text-center">
            <GraduationCap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-lg font-semibold mb-2">Nenhum progresso encontrado</h2>
            <p className="text-muted-foreground mb-4">
              Comece a assistir as aulas para ver suas estatísticas aqui.
            </p>
            <Button asChild>
              <Link to="/aluno">Ir para Sala de Aula</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" className="h-11 w-11 sm:h-10 sm:w-10" asChild>
                <Link to="/aluno">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div className="p-2 rounded-xl gradient-primary">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Meu Desempenho</h1>
                <p className="text-xs text-muted-foreground">
                  Acompanhe seu progresso e estatísticas
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Progress Card */}
          <Card className="col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-primary" />
                Progresso do Curso
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between mb-2">
                <span className="text-3xl font-bold">{progressPercentage}%</span>
                <span className="text-sm text-muted-foreground">
                  {stats.completedLessons}/{stats.totalLessons} aulas
                </span>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </CardContent>
          </Card>

          {/* Average Score */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-google-yellow" />
                Média dos Quizzes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className={cn(
                "text-3xl font-bold",
                stats.averageScore >= 70 ? "text-google-green" : "text-google-red"
              )}>
                {stats.averageScore}%
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.totalQuizzes} quiz{stats.totalQuizzes !== 1 ? 'zes' : ''} feito{stats.totalQuizzes !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          {/* Study Time */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4 text-google-blue" />
                Tempo de Estudo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-bold">
                {formatTime(stats.totalStudyTime)}
              </span>
              <p className="text-xs text-muted-foreground mt-1">
                Total acumulado
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        {stats.totalQuizzes > 0 && (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Quiz Scores Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Notas por Aula
                </CardTitle>
                <CardDescription>Desempenho nos quizzes</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[200px]">
                  <BarChart data={quizScoresData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fontSize: 10 }} 
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="score" 
                      radius={[4, 4, 0, 0]}
                      fill="hsl(var(--primary))"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Pie Chart - Pass Rate */}
            {pieData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-5 w-5 text-google-yellow" />
                    Taxa de Aprovação
                  </CardTitle>
                  <CardDescription>{quizPassRate}% de aprovação</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={2}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}`}
                          labelLine={false}
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex justify-center gap-4 mt-2">
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded bg-google-green" />
                      <span>Aprovados ({stats.passedQuizzes})</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs">
                      <div className="w-3 h-3 rounded bg-google-red" />
                      <span>Reprovados ({stats.totalQuizzes - stats.passedQuizzes})</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Progress Over Time */}
        {progressData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-5 w-5 text-google-green" />
                Progresso ao Longo do Tempo
              </CardTitle>
              <CardDescription>Aulas concluídas por data</CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <LineChart data={progressData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="completed" 
                    stroke="hsl(var(--google-blue))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--google-blue))' }}
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Performance Summary */}
        <div className="grid md:grid-cols-2 gap-4">
          {/* Quiz Performance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-google-yellow" />
                Desempenho nos Quizzes
              </CardTitle>
              <CardDescription>
                Taxa de aprovação e melhores resultados
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <span className="text-sm">Taxa de Aprovação</span>
                <Badge variant={quizPassRate >= 70 ? "success" : "error"}>
                  {quizPassRate}%
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-google-green/10 rounded-lg text-center">
                  <CheckCircle className="h-6 w-6 text-google-green mx-auto mb-1" />
                  <p className="text-2xl font-bold text-google-green">{stats.passedQuizzes}</p>
                  <p className="text-xs text-muted-foreground">Aprovados</p>
                </div>
                <div className="p-3 bg-google-red/10 rounded-lg text-center">
                  <XCircle className="h-6 w-6 text-google-red mx-auto mb-1" />
                  <p className="text-2xl font-bold text-google-red">
                    {stats.totalQuizzes - stats.passedQuizzes}
                  </p>
                  <p className="text-xs text-muted-foreground">Reprovados</p>
                </div>
              </div>

              {stats.totalQuizzes > 0 && (
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-google-green" />
                    <span>Melhor: <strong>{stats.bestScore}%</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>Pior: <strong>{stats.worstScore}%</strong></span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lesson Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Progresso por Aula
              </CardTitle>
              <CardDescription>
                Status de cada aula do curso
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[280px] overflow-y-auto">
                {videos.map(video => {
                  const progress = lessonProgress.find(p => p.video_id === video.id);
                  const quiz = quizResults.find(q => q.video_id === video.id);
                  const isCompleted = progress?.is_completed;

                  return (
                    <div 
                      key={video.id}
                      className={cn(
                        "flex items-center gap-3 p-2 rounded-lg border",
                        isCompleted ? "bg-google-green/5 border-google-green/30" : "bg-muted/30"
                      )}
                    >
                      <div className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                        isCompleted ? "bg-google-green text-white" : "bg-muted text-muted-foreground"
                      )}>
                        {isCompleted ? <CheckCircle className="h-4 w-4" /> : video.lesson_order}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.title}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {quiz && (
                            <Badge 
                              variant={quiz.passed ? "success" : "error"} 
                              className="text-[10px] h-4"
                            >
                              Quiz: {quiz.score_percentage}%
                            </Badge>
                          )}
                          {progress?.watch_time_seconds && progress.watch_time_seconds > 0 && (
                            <span>{formatTime(progress.watch_time_seconds)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                {videos.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-sm">
                    Nenhuma aula disponível
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quiz Results */}
        {quizResults.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                Histórico de Quizzes
              </CardTitle>
              <CardDescription>
                Seus resultados mais recentes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {quizResults.slice(0, 5).map(result => (
                  <div 
                    key={result.id}
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border",
                      result.passed ? "bg-google-green/5 border-google-green/30" : "bg-google-red/5 border-google-red/30"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center",
                        result.passed ? "bg-google-green/20" : "bg-google-red/20"
                      )}>
                        {result.passed ? (
                          <CheckCircle className="h-5 w-5 text-google-green" />
                        ) : (
                          <XCircle className="h-5 w-5 text-google-red" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          Aula {getVideoOrder(result.video_id)}: {getVideoTitle(result.video_id)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {result.correct_answers}/{result.total_questions} respostas corretas
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={cn(
                        "text-lg font-bold",
                        result.passed ? "text-google-green" : "text-google-red"
                      )}>
                        {result.score_percentage}%
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(result.completed_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Certificates Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-google-yellow" />
              Meus Certificados
            </CardTitle>
            <CardDescription>
              Certificados de conclusão de módulos e curso
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CertificatesPanel studentId={studentId} />
          </CardContent>
        </Card>

        {/* Personalized Learning Recommendations */}
        <PersonalizedRecommendations studentId={studentId} />

        {/* AI Analytics Dashboard */}
        <AIAnalyticsDashboard studentId={studentId} />

        {/* Gamification Hub */}
        <GamificationHub studentId={studentId} />

        {/* Back to Classroom */}
        <div className="text-center pt-4">
          <Button asChild size="lg" className="h-12 sm:h-11">
            <Link to="/aluno">
              <GraduationCap className="h-5 w-5 mr-2" />
              Voltar para Sala de Aula
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
