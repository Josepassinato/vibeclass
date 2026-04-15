import { motion } from 'framer-motion';
import { Award, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface CertificateCardProps {
  id: string;
  studentName: string;
  moduleTitle: string | null;
  certificateType: 'module' | 'course';
  certificateCode: string;
  issuedAt: string;
  onDownload: () => void;
  onView: () => void;
  isDownloading?: boolean;
}

export function CertificateCard({
  studentName,
  moduleTitle,
  certificateType,
  certificateCode,
  issuedAt,
  onDownload,
  onView,
  isDownloading = false,
}: CertificateCardProps) {
  const formattedDate = new Date(issuedAt).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const title = certificateType === 'course' 
    ? 'Conclusão do Curso' 
    : moduleTitle || 'Módulo';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card className={cn(
        'overflow-hidden border-2 transition-all',
        certificateType === 'course' 
          ? 'border-google-yellow/50 bg-gradient-to-br from-google-yellow/10 to-transparent' 
          : 'border-primary/30 bg-gradient-to-br from-primary/5 to-transparent'
      )}>
        <CardContent className="p-4 sm:p-6">
          <div className="flex items-start gap-4">
            {/* Icon */}
            <div className={cn(
              'p-3 rounded-xl shrink-0',
              certificateType === 'course' 
                ? 'bg-google-yellow text-white' 
                : 'bg-primary text-primary-foreground'
            )}>
              <Award className="h-6 w-6" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h3 className="font-semibold truncate">{title}</h3>
                <Badge 
                  variant="outline" 
                  className={cn(
                    'text-xs shrink-0',
                    certificateType === 'course' && 'border-google-yellow text-google-yellow'
                  )}
                >
                  {certificateType === 'course' ? 'Curso Completo' : 'Módulo'}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-2">
                Emitido para <span className="font-medium text-foreground">{studentName}</span>
              </p>

              <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
                <span>{formattedDate}</span>
                <span className="font-mono bg-muted px-2 py-0.5 rounded">{certificateCode}</span>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onView}
                  className="flex-1 sm:flex-none"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Visualizar
                </Button>
                <Button
                  size="sm"
                  onClick={onDownload}
                  disabled={isDownloading}
                  className={cn(
                    'flex-1 sm:flex-none',
                    certificateType === 'course' && 'bg-google-yellow hover:bg-google-yellow/90 text-white'
                  )}
                >
                  <Download className="h-4 w-4 mr-1" />
                  {isDownloading ? 'Baixando...' : 'Baixar'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
