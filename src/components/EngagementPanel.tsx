import { motion } from 'framer-motion';
import { Brain, Eye, Volume2, MousePointer, Camera, CameraOff, ChevronDown, ChevronUp, Settings, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { StateVector } from '@/hooks/useEngagementDetection/types';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface EngagementPanelProps {
  stateVector: StateVector;
  visionEnabled: boolean;
  visionConsent: boolean;
  onToggleVision: () => void;
  isInterventionTriggered: boolean;
  className?: string;
}

function EngagementBar({ 
  label, 
  value, 
  color, 
  icon: Icon,
  inverted = false 
}: { 
  label: string; 
  value: number | null; 
  color: string;
  icon: React.ElementType;
  inverted?: boolean;
}) {
  const displayValue = value !== null ? Math.round(value * 100) : null;
  const barValue = inverted && displayValue !== null ? 100 - displayValue : displayValue;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Icon className="h-3 w-3" />
          <span>{label}</span>
        </div>
        <span className={cn(
          "font-mono text-xs",
          displayValue === null ? "text-muted-foreground" : 
          barValue !== null && barValue < 40 ? "text-destructive" : 
          barValue !== null && barValue > 70 ? "text-accent" : ""
        )}>
          {displayValue !== null ? `${displayValue}%` : 'N/A'}
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn("h-full rounded-full", color)}
          initial={{ width: 0 }}
          animate={{ width: barValue !== null ? `${barValue}%` : '0%' }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  );
}

export function EngagementPanel({
  stateVector,
  visionEnabled,
  visionConsent,
  onToggleVision,
  isInterventionTriggered,
  className,
}: EngagementPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const overallScore = stateVector.attention !== null && stateVector.engagement !== null
    ? Math.round((stateVector.attention + stateVector.engagement) / 2 * 100)
    : null;
  
  const statusColor = overallScore === null ? 'bg-muted' :
    overallScore < 40 ? 'bg-destructive' :
    overallScore < 70 ? 'bg-yellow-500' :
    'bg-accent';

  return (
    <div className={cn("rounded-xl border bg-card/50 backdrop-blur-sm", className)}>
      {/* Compact Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className={cn(
              "h-5 w-5",
              isInterventionTriggered ? "text-destructive animate-pulse" : "text-primary"
            )} />
            {isInterventionTriggered && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full"
              />
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Engajamento</span>
            <div className={cn("w-2 h-2 rounded-full", statusColor)} />
            {overallScore !== null && (
              <span className="text-xs text-muted-foreground font-mono">
                {overallScore}%
              </span>
            )}
          </div>
          
          {/* Source indicators */}
          <div className="flex items-center gap-1 ml-2">
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-1.5 py-0.5 text-[10px]",
                    stateVector.sources.includes('audio') 
                      ? "border-primary/50 text-primary" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <Volume2 className="h-2.5 w-2.5" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Sinais de Áudio</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-1.5 py-0.5 text-[10px]",
                    stateVector.sources.includes('behavioral') 
                      ? "border-primary/50 text-primary" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  <MousePointer className="h-2.5 w-2.5" />
                </Badge>
              </TooltipTrigger>
              <TooltipContent>Sinais Comportamentais</TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "px-1.5 py-0.5 text-[10px]",
                    stateVector.sources.includes('vision') 
                      ? "border-accent/50 text-accent" 
                      : "border-muted text-muted-foreground"
                  )}
                >
                  {visionEnabled ? <Eye className="h-2.5 w-2.5" /> : <CameraOff className="h-2.5 w-2.5" />}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {visionEnabled ? 'Câmera Ativa' : 'Câmera Desativada'}
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="px-3 pb-3 space-y-3 border-t"
        >
          <div className="pt-3 space-y-2">
            <EngagementBar 
              label="Atenção" 
              value={stateVector.attention} 
              color="bg-primary"
              icon={Eye}
            />
            <EngagementBar 
              label="Engajamento" 
              value={stateVector.engagement} 
              color="bg-accent"
              icon={Brain}
            />
            <EngagementBar 
              label="Confusão" 
              value={stateVector.confusion} 
              color="bg-yellow-500"
              icon={AlertTriangle}
              inverted
            />
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="text-xs text-muted-foreground">
              Confiança: {Math.round(stateVector.confidence.overall * 100)}%
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5"
              onClick={(e) => {
                e.stopPropagation();
                onToggleVision();
              }}
            >
              {visionEnabled ? (
                <>
                  <CameraOff className="h-3.5 w-3.5" />
                  Desativar Câmera
                </>
              ) : (
                <>
                  <Camera className="h-3.5 w-3.5" />
                  {visionConsent ? 'Ativar Câmera' : 'Câmera (Opt-in)'}
                </>
              )}
            </Button>
          </div>

          {isInterventionTriggered && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-2 rounded-lg bg-destructive/10 border border-destructive/20"
            >
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>Intervenção sugerida</span>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}
