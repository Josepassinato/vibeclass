import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Shield, X, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface VisionConsentDialogProps {
  isOpen: boolean;
  onGrantConsent: () => void;
  onDeny: () => void;
}

export function VisionConsentDialog({ isOpen, onGrantConsent, onDeny }: VisionConsentDialogProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <Card className="max-w-md w-full shadow-xl border-primary/20">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-full bg-primary/10">
                  <Camera className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">Ativar Detecção Visual?</CardTitle>
                <CardDescription className="text-base">
                  Melhore sua experiência de aprendizado com análise de atenção em tempo real
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Eye className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Rastreamento de Olhar</p>
                      <p className="text-xs text-muted-foreground">
                        Detecta quando você está olhando para o vídeo para pausar automaticamente se você se distrair
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <Shield className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Processamento Local</p>
                      <p className="text-xs text-muted-foreground">
                        Sua imagem nunca é enviada para servidores. Todo processamento acontece no seu dispositivo.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                    <EyeOff className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-sm">Totalmente Opcional</p>
                      <p className="text-xs text-muted-foreground">
                        Você pode desativar a qualquer momento nas configurações
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1"
                    onClick={onDeny}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Não, obrigado
                  </Button>
                  <Button 
                    className="flex-1 bg-primary hover:bg-primary/90"
                    onClick={onGrantConsent}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Ativar Câmera
                  </Button>
                </div>
                
                <p className="text-[10px] text-center text-muted-foreground">
                  Ao ativar, você concorda com o uso da câmera apenas para detecção de atenção.
                  Nenhum dado visual é armazenado ou transmitido.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
