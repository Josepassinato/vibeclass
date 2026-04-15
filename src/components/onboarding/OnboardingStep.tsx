import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStepProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: 'blue' | 'red' | 'yellow' | 'green';
  isActive: boolean;
}

const colorClasses = {
  blue: 'bg-google-blue/10 text-google-blue border-google-blue/30',
  red: 'bg-google-red/10 text-google-red border-google-red/30',
  yellow: 'bg-google-yellow/10 text-google-yellow border-google-yellow/30',
  green: 'bg-google-green/10 text-google-green border-google-green/30',
};

const iconBgClasses = {
  blue: 'bg-google-blue',
  red: 'bg-google-red',
  yellow: 'bg-google-yellow',
  green: 'bg-google-green',
};

export function OnboardingStep({ icon: Icon, title, description, color, isActive }: OnboardingStepProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isActive ? 1 : 0.5, y: 0 }}
      className={cn(
        'flex items-start gap-4 p-4 rounded-xl border transition-all',
        isActive ? colorClasses[color] : 'bg-muted/50 border-transparent'
      )}
    >
      <div className={cn(
        'p-3 rounded-xl shrink-0',
        isActive ? iconBgClasses[color] : 'bg-muted'
      )}>
        <Icon className={cn('h-6 w-6', isActive ? 'text-white' : 'text-muted-foreground')} />
      </div>
      <div>
        <h3 className={cn(
          'font-semibold mb-1',
          isActive ? '' : 'text-muted-foreground'
        )}>
          {title}
        </h3>
        <p className={cn(
          'text-sm',
          isActive ? 'text-foreground/80' : 'text-muted-foreground'
        )}>
          {description}
        </p>
      </div>
    </motion.div>
  );
}
