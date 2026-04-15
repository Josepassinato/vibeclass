import { motion } from 'framer-motion';

interface ProcessingIndicatorProps {
  /** Size variant for the indicator */
  size?: 'sm' | 'md' | 'lg';
  /** Optional label to display */
  label?: string;
}

/**
 * Animated "thinking" indicator with three pulsing dots
 * Used to show when the AI is processing/generating a response
 */
export function ProcessingIndicator({ size = 'md', label }: ProcessingIndicatorProps) {
  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-3 h-3',
  };

  const gaps = {
    sm: 'gap-1',
    md: 'gap-1.5',
    lg: 'gap-2',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`flex items-center ${gaps[size]}`}>
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${dotSizes[size]} rounded-full bg-google-yellow`}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              delay: index * 0.2,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>
      {label && (
        <span className="text-xs text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
