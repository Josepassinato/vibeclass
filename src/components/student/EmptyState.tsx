import { motion } from 'framer-motion';
import { GraduationCap, Play, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useBranding } from '@/branding';

interface EmptyStateProps {
  type: 'no-lessons' | 'no-video' | 'welcome';
  onAction?: () => void;
}

export function EmptyState({ type, onAction }: EmptyStateProps) {
  const { config, labels } = useBranding();

  if (type === 'no-lessons') {
    return (
      <div className="text-center py-12 px-4">
        <div className="p-4 rounded-full bg-muted inline-block mb-4">
          <Video className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground">Nenhuma {labels.lessonSingular} disponível ainda</p>
      </div>
    );
  }

  if (type === 'welcome') {
    return (
      <motion.div
        className="flex-1 flex items-center justify-center p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center max-w-sm">
          <div className="relative inline-block mb-6">
            <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-primary/20 via-accent/20 to-secondary/20">
              <GraduationCap className="h-12 w-12 sm:h-16 sm:w-16 text-primary" />
            </div>
            {/* Decorative dots */}
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-google-blue rounded-full" />
            <div className="absolute -bottom-1 -left-1 w-3 h-3 bg-google-red rounded-full" />
            <div className="absolute top-1/2 -right-4 w-2 h-2 bg-google-yellow rounded-full" />
          </div>

          <h2 className="text-xl sm:text-2xl font-bold mb-2">
            Bem-vindo ao <span className="text-primary">{config.brandName}</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base mb-6">
            {config.valueProposition}
          </p>
          {onAction && (
            <Button onClick={onAction} size="lg" className="rounded-full px-6">
              <Play className="h-4 w-4 mr-2" />
              Começar Agora
            </Button>
          )}
        </div>
      </motion.div>
    );
  }

  return null;
}
