import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Download, Users, BookOpen, Trophy, Clock } from 'lucide-react';
import { EngagementChart } from '@/components/analytics/EngagementChart';
import { QuizPerformance } from '@/components/analytics/QuizPerformance';
import { StudentProgressTable } from '@/components/analytics/StudentProgress';

type Period = '7d' | '30d' | '90d';

export default function Analytics() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalLessonsCompleted, setTotalLessonsCompleted] = useState(0);
  const [avgQuizScore, setAvgQuizScore] = useState(0);
  const [totalStudyMinutes, setTotalStudyMinutes] = useState(0);

  // Chart data
  const [engagementData, setEngagementData] = useState<Array<{ videoTitle: string; avgEngagement: number; completionRate: number }>>([]);
  const [quizPassRate, setQuizPassRate] = useState(0);
  const [quizAttempts, setQuizAttempts] = useState(0);
  const [students, setStudents] = useState<Array<{
    id: string; name: string | null; totalStudyMinutes: number;
    lastSeen: string | null; avgQuizScore: number; lessonsCompleted: number;
  }>>([]);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const getPeriodDate = () => {
    const now = new Date();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    now.setDate(now.getDate() - days);
    return now.toISOString();
  };

  const loadAnalytics = async () => {
    setIsLoading(true);
    const since = getPeriodDate();

    try {
      // Student profiles
      const { data: profiles } = await supabase
        .from('student_profiles')
        .select('*')
        .gte('last_seen_at', since);

      setTotalStudents(profiles?.length || 0);
      setTotalStudyMinutes(
        profiles?.reduce((sum, p) => sum + (p.total_study_time_minutes || 0), 0) || 0
      );

      // Student progress table
      const studentRows = (profiles || []).map(p => ({
        id: p.student_id,
        name: p.name,
        totalStudyMinutes: p.total_study_time_minutes || 0,
        lastSeen: p.last_seen_at,
        avgQuizScore: 0,
        lessonsCompleted: 0,
      }));

      // Lesson completions
      const { data: progress } = await supabase
        .from('student_lesson_progress')
        .select('student_id, is_completed')
        .eq('is_completed', true)
        .gte('created_at', since);

      setTotalLessonsCompleted(progress?.length || 0);

      // Count per student
      const completionsByStudent = new Map<string, number>();
      (progress || []).forEach(p => {
        completionsByStudent.set(p.student_id, (completionsByStudent.get(p.student_id) || 0) + 1);
      });
      studentRows.forEach(s => {
        s.lessonsCompleted = completionsByStudent.get(s.id) || 0;
      });

      // Quiz results
      const { data: quizResults } = await supabase
        .from('student_quiz_results')
        .select('score_percentage, passed, student_id')
        .gte('completed_at', since);

      const qr = quizResults || [];
      setQuizAttempts(qr.length);
      setAvgQuizScore(qr.length > 0 ? qr.reduce((s, r) => s + r.score_percentage, 0) / qr.length : 0);
      setQuizPassRate(qr.length > 0 ? (qr.filter(r => r.passed).length / qr.length) * 100 : 0);

      // Avg quiz score per student
      const scoresByStudent = new Map<string, number[]>();
      qr.forEach(r => {
        const arr = scoresByStudent.get(r.student_id) || [];
        arr.push(r.score_percentage);
        scoresByStudent.set(r.student_id, arr);
      });
      studentRows.forEach(s => {
        const scores = scoresByStudent.get(s.id);
        s.avgQuizScore = scores ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
      });

      setStudents(studentRows);

      // Engagement by video
      const { data: videos } = await supabase.from('videos').select('id, title');
      const { data: allProgress } = await supabase
        .from('student_lesson_progress')
        .select('video_id, is_completed')
        .gte('created_at', since);

      const videoStats = (videos || []).map(v => {
        const entries = (allProgress || []).filter(p => p.video_id === v.id);
        const completed = entries.filter(p => p.is_completed).length;
        return {
          videoTitle: v.title.length > 20 ? v.title.substring(0, 18) + '...' : v.title,
          avgEngagement: entries.length > 0 ? (completed / entries.length) * 100 : 0,
          completionRate: entries.length > 0 ? Math.round((completed / entries.length) * 100) : 0,
        };
      }).filter(v => v.completionRate > 0 || v.avgEngagement > 0);

      setEngagementData(videoStats);
    } catch (err) {
      console.error('[Analytics] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCSV = () => {
    const headers = ['Aluno', 'Tempo (min)', 'Aulas Concluidas', 'Media Quiz (%)', 'Ultimo Acesso'];
    const rows = students.map(s => [
      s.name || 'Anonimo',
      Math.round(s.totalStudyMinutes),
      s.lessonsCompleted,
      Math.round(s.avgQuizScore),
      s.lastSeen ? new Date(s.lastSeen).toLocaleDateString('pt-BR') : '-',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${period}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-semibold">Analytics</h1>
          </div>
          <div className="flex items-center gap-2">
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <Button
                key={p}
                variant={period === p ? 'default' : 'outline'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
              </Button>
            ))}
            <Button variant="outline" size="sm" onClick={exportCSV}>
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-lg p-4 text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Alunos ativos</p>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{totalLessonsCompleted}</p>
            <p className="text-xs text-muted-foreground">Aulas concluidas</p>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <Trophy className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{Math.round(avgQuizScore)}%</p>
            <p className="text-xs text-muted-foreground">Media quizzes</p>
          </div>
          <div className="bg-card border rounded-lg p-4 text-center">
            <Clock className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-bold">{Math.round(totalStudyMinutes / 60)}h</p>
            <p className="text-xs text-muted-foreground">Tempo total estudo</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-6">
          <EngagementChart data={engagementData} />
          <QuizPerformance passRate={quizPassRate} avgScore={avgQuizScore} totalAttempts={quizAttempts} />
        </div>

        {/* Student Table */}
        <StudentProgressTable students={students} />
      </div>
    </div>
  );
}
