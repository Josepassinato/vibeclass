import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  ClipboardList, 
  Sparkles, 
  Home, 
  RotateCcw,
  CheckCircle2,
  Calendar,
  Check,
  Target,
  Rocket,
  ArrowRight
} from 'lucide-react';

interface Mission {
  id: string;
  title: string;
  description: string;
  instructions: string;
  evidence_type: string;
  difficulty_level: string;
  points_reward: number;
}

interface LessonEndScreenProps {
  videoTitle?: string;
  weeklyTask?: string;
  summaryPoints?: string[];
  mission?: Mission;
  onGoHome?: () => void;
  onRestartLesson?: () => void;
  onStartMission?: () => void;
  isVisible: boolean;
  isProfessorSpeaking?: boolean;
}

export function LessonEndScreen({
  videoTitle,
  weeklyTask,
  summaryPoints = [],
  mission,
  onGoHome,
  onRestartLesson,
  onStartMission,
  isVisible,
  isProfessorSpeaking = false,
}: LessonEndScreenProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      const timer = setTimeout(() => setShowConfetti(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/95 backdrop-blur-md p-4"
        >
          {/* Confetti Animation */}
          {showConfetti && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    y: -20, 
                    x: Math.random() * window.innerWidth,
                    rotate: 0,
                    scale: 0
                  }}
                  animate={{ 
                    y: window.innerHeight + 100,
                    rotate: Math.random() * 720 - 360,
                    scale: [0, 1, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 0.5,
                    ease: "easeOut"
                  }}
                  className="absolute w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor: [
                      'hsl(var(--google-blue))',
                      'hsl(var(--google-yellow))',
                      'hsl(var(--google-green))',
                      'hsl(var(--google-red))',
                    ][i % 4]
                  }}
                />
              ))}
            </div>
          )}

          <motion.div
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="w-full max-w-2xl"
          >
            <Card className="border-2 border-primary/20 shadow-2xl overflow-hidden">
              {/* Professor Speaking Indicator */}
              {isProfessorSpeaking && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-primary/10 border-b border-primary/20 px-4 py-3 flex items-center justify-center gap-3"
                >
                  <div className="flex items-center gap-1">
                    {[0, 1, 2, 3].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1 bg-primary rounded-full"
                        animate={{
                          height: [8, 16, 8],
                        }}
                        transition={{
                          duration: 0.5,
                          repeat: Infinity,
                          delay: i * 0.1,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-sm font-medium text-primary">
                    Professor Vibe está explicando...
                  </span>
                </motion.div>
              )}

              {/* Header with Trophy */}
              <CardHeader className="text-center pb-4 bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", delay: 0.2 }}
                  className="mx-auto mb-4"
                >
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-google-yellow to-google-yellow/60 flex items-center justify-center shadow-lg">
                    <Trophy className="w-10 h-10 text-white" />
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground flex items-center justify-center gap-2">
                    <Sparkles className="h-6 w-6 text-google-yellow" />
                    Aula Concluída!
                    <Sparkles className="h-6 w-6 text-google-yellow" />
                  </CardTitle>
                  {videoTitle && (
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                      {videoTitle}
                    </p>
                  )}
                </motion.div>
              </CardHeader>

              <CardContent className="space-y-6 p-6">
                {/* Summary Points */}
                {summaryPoints.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="space-y-3"
                  >
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-google-green" />
                      O que você aprendeu
                    </h3>
                    <ul className="space-y-2">
                      {summaryPoints.map((point, index) => (
                        <motion.li
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-start gap-3 text-sm text-foreground/90"
                        >
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-google-green/20 text-google-green flex items-center justify-center">
                            <Check className="w-3 h-3" />
                          </span>
                          {point}
                        </motion.li>
                      ))}
                    </ul>
                  </motion.div>
                )}

                {/* Mission Card - Primary CTA when mission exists */}
                {mission && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.6, type: "spring" }}
                    className="relative"
                  >
                    <div className="absolute -inset-1.5 bg-gradient-to-r from-google-green via-google-blue to-google-yellow rounded-2xl blur-md opacity-40 animate-pulse" />
                    <div className="relative bg-gradient-to-br from-primary/5 to-accent/10 border-2 border-primary/40 rounded-xl p-5 space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-google-green to-google-green/60 flex items-center justify-center shadow-lg flex-shrink-0">
                          <Target className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-lg text-foreground">
                              Missão Prática
                            </h3>
                            <Badge className="bg-google-green/20 text-google-green border-0">
                              <Rocket className="w-3 h-3 mr-1" />
                              +{mission.points_reward} pts
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            Aplique o que você aprendeu!
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-background/80 rounded-lg p-4 space-y-2">
                        <h4 className="font-semibold text-foreground">
                          {mission.title}
                        </h4>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          {mission.description}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Badge variant="outline" className="text-xs">
                            {mission.difficulty_level}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {mission.evidence_type}
                          </Badge>
                        </div>
                      </div>

                      <Button
                        onClick={onStartMission}
                        size="lg"
                        className="w-full gap-2 bg-gradient-to-r from-google-green to-google-green/80 hover:from-google-green/90 hover:to-google-green/70 text-white shadow-lg"
                      >
                        <Target className="w-5 h-5" />
                        Começar Missão
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {/* Weekly Task - Fallback when no mission */}
                {!mission && weeklyTask && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="relative"
                  >
                    <div className="absolute -inset-1 bg-gradient-to-r from-google-blue via-google-green to-google-yellow rounded-xl blur-sm opacity-30" />
                    <div className="relative bg-card border-2 border-primary/30 rounded-xl p-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-google-blue to-google-blue/60 flex items-center justify-center">
                          <ClipboardList className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground flex items-center gap-2">
                            Tarefa da Semana
                            <Badge variant="secondary" className="text-xs">
                              <Calendar className="w-3 h-3 mr-1" />
                              7 dias
                            </Badge>
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Pratique o que você aprendeu
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="text-foreground leading-relaxed">
                          {weeklyTask}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* No task or mission - Loading state */}
                {!mission && !weeklyTask && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="text-center py-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-muted mx-auto mb-3 flex items-center justify-center">
                      <ClipboardList className="w-6 h-6 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground text-sm">
                      Nenhuma missão configurada para esta aula
                    </p>
                  </motion.div>
                )}

                {/* Action Buttons */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="flex flex-col sm:flex-row gap-3 pt-4"
                >
                  {onRestartLesson && (
                    <Button
                      variant="outline"
                      onClick={onRestartLesson}
                      className="flex-1 gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Rever Aula
                    </Button>
                  )}
                  {onGoHome && (
                    <Button
                      onClick={onGoHome}
                      className="flex-1 gap-2 bg-gradient-to-r from-google-blue to-google-blue/80 hover:from-google-blue/90 hover:to-google-blue/70"
                    >
                      <Home className="w-4 h-4" />
                      Ir para Dashboard
                    </Button>
                  )}
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
