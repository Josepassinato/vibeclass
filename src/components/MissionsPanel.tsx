import { useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Target, CheckCircle2, Clock } from 'lucide-react';
import { MissionCard } from './MissionCard';
import { AchievementsPanel } from './AchievementsPanel';
import { useMissions } from '@/hooks/useMissions';
import { useCertificateGeneration } from '@/hooks/useCertificateGeneration';
import { useAuth } from '@/hooks/useAuth';

interface MissionsPanelProps {
  videoId?: string;
  studentId: string;
  moduleId?: string;
  moduleTitle?: string;
}

export function MissionsPanel({ videoId, studentId, moduleId, moduleTitle }: MissionsPanelProps) {
  const { profile } = useAuth();
  const { checkAndGenerateCertificate, checkCourseCompletion } = useCertificateGeneration();
  
  const {
    missions,
    submissions,
    achievements,
    isLoading,
    isEvaluating,
    loadMissions,
    loadSubmissions,
    loadAchievements,
    submitEvidence,
    getMissionStatus
  } = useMissions(studentId);

  useEffect(() => {
    loadMissions(videoId);
    loadSubmissions();
    loadAchievements();
  }, [videoId, loadMissions, loadSubmissions, loadAchievements]);

  const pendingMissions = missions.filter(m => {
    const status = getMissionStatus(m.id);
    return status === 'not_started' || status === 'needs_revision' || status === 'rejected';
  });

  const completedMissions = missions.filter(m => getMissionStatus(m.id) === 'approved');

  const getSubmissionsForMission = (missionId: string) => {
    return submissions.filter(s => s.mission_id === missionId);
  };

  const handleSubmit = useCallback(async (mission: typeof missions[0], evidenceText?: string, evidenceUrl?: string) => {
    const result = await submitEvidence(mission, evidenceText, evidenceUrl);
    
    // If mission was approved, check for module completion and certificate
    if (result.success && moduleId && moduleTitle && profile?.full_name) {
      // Small delay to ensure database is updated
      setTimeout(async () => {
        const certResult = await checkAndGenerateCertificate({
          studentId,
          studentName: profile.full_name || 'Aluno',
          moduleId,
          moduleTitle,
        });

        // If module certificate was generated, check for course completion
        if (certResult.generated) {
          await checkCourseCompletion(studentId, profile.full_name || 'Aluno');
        }
      }, 1000);
    }
  }, [submitEvidence, moduleId, moduleTitle, profile, studentId, checkAndGenerateCertificate, checkCourseCompletion]);

  if (isLoading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Missões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2].map((i) => (
              <div key={i} className="animate-pulse border rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-5 h-5 bg-muted rounded" />
                  <div className="h-5 bg-muted rounded w-3/4" />
                </div>
                <div className="h-4 bg-muted rounded w-full mb-2" />
                <div className="h-4 bg-muted rounded w-2/3" />
                <div className="flex gap-2 mt-3">
                  <div className="h-6 bg-muted rounded w-16" />
                  <div className="h-6 bg-muted rounded w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <AchievementsPanel achievements={achievements} />

      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Target className="w-5 h-5 text-primary" />
            Missões Práticas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="w-full justify-start rounded-none border-b bg-transparent px-4">
              <TabsTrigger value="pending" className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                Pendentes ({pendingMissions.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Concluídas ({completedMissions.length})
              </TabsTrigger>
            </TabsList>

            <ScrollArea className="h-[400px]">
              <TabsContent value="pending" className="p-4 space-y-4 mt-0">
                {pendingMissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão pendente!</p>
                    <p className="text-sm">Todas as missões foram completadas 🎉</p>
                  </div>
                ) : (
                  pendingMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      submissions={getSubmissionsForMission(mission.id)}
                      onSubmit={(text, url) => handleSubmit(mission, text, url)}
                      isEvaluating={isEvaluating}
                    />
                  ))
                )}
              </TabsContent>

              <TabsContent value="completed" className="p-4 space-y-4 mt-0">
                {completedMissions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <CheckCircle2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma missão concluída ainda</p>
                    <p className="text-sm">Complete as missões pendentes!</p>
                  </div>
                ) : (
                  completedMissions.map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      submissions={getSubmissionsForMission(mission.id)}
                      onSubmit={(text, url) => handleSubmit(mission, text, url)}
                      isEvaluating={isEvaluating}
                    />
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
