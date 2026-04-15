import { forwardRef } from 'react';
import { motion } from 'framer-motion';

interface VoiceIndicatorProps {
  isActive: boolean;
  type: 'listening' | 'speaking';
  isVoiceDetected?: boolean; // Shows when voice is actively detected vs silence
}

export const VoiceIndicator = forwardRef<HTMLDivElement, VoiceIndicatorProps>(
  ({ isActive, type, isVoiceDetected = true }, ref) => {
  const barCount = 5;
  
  // When listening, use different visual based on voice detection
  const getBarColor = () => {
    if (type === 'speaking') {
      return 'bg-accent';
    }
    // For listening: green when voice detected, muted when silent
    return isVoiceDetected ? 'bg-green-500' : 'bg-muted-foreground/40';
  };
  
  // More energetic animation when voice is detected
  const getAnimation = () => {
    if (!isActive) {
      return { height: 8 };
    }
    
    if (type === 'speaking') {
      return {
        height: [8, 24, 12, 28, 8],
        transition: {
          duration: 0.8,
          repeat: Infinity,
          ease: "easeInOut"
        }
      };
    }
    
    // For listening: animated when voice detected, subtle pulse when silent
    if (isVoiceDetected) {
      return {
        height: [12, 28, 16, 32, 12],
        transition: {
          duration: 0.5,
          repeat: Infinity,
          ease: "easeInOut"
        }
      };
    }
    
    // Silent/waiting state - subtle breathing animation
    return {
      height: [8, 12, 8],
      transition: {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      }
    };
  };
  
  return (
    <div ref={ref} className="flex items-center justify-center gap-1 h-8 relative">
      {Array.from({ length: barCount }).map((_, i) => {
        const anim = getAnimation();
        return (
          <motion.div
            key={i}
            className={`w-1 rounded-full transition-colors duration-200 ${getBarColor()}`}
            animate={{
              height: anim.height,
            }}
            transition={{
              duration: anim.transition?.duration ?? 0.8,
              repeat: anim.transition?.repeat ?? 0,
              ease: anim.transition?.ease as "easeInOut" ?? "easeInOut",
              delay: i * 0.1
            }}
          />
        );
      })}
      
      {/* Voice detection indicator dot */}
      {type === 'listening' && isActive && (
        <motion.div
          className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
            isVoiceDetected ? 'bg-green-500' : 'bg-muted-foreground/40'
          }`}
          animate={isVoiceDetected ? {
            scale: [1, 1.3, 1],
            opacity: [1, 0.8, 1],
          } : {
            scale: 1,
            opacity: 0.5,
          }}
          transition={{
            duration: 0.5,
            repeat: isVoiceDetected ? Infinity : 0,
          }}
        />
      )}
    </div>
  );
  }
);

VoiceIndicator.displayName = 'VoiceIndicator';
