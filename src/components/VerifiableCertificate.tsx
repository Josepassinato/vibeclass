import { useState, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Award, Download, Share2, ExternalLink, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useBranding } from '@/branding';

// ── Types ──────────────────────────────────────────────────────────────────

interface StudentStats {
  quizAvg: number;
  lessonsCompleted: number;
  totalXP: number;
}

interface VerifiableCertificateProps {
  studentName: string;
  moduleName: string;
  completionDate: string;
  certificateCode: string;
  studentStats?: StudentStats;
}

// ── Constants ──────────────────────────────────────────────────────────────

const VERIFICATION_BASE_URL = 'https://escola.12brain.org/verificar';

// ── Component ──────────────────────────────────────────────────────────────

export function VerifiableCertificate({
  studentName,
  moduleName,
  completionDate,
  certificateCode,
  studentStats,
}: VerifiableCertificateProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const certificateRef = useRef<HTMLDivElement>(null);
  const { config } = useBranding();

  const verificationUrl = `${VERIFICATION_BASE_URL}/${certificateCode}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(verificationUrl)}&bgcolor=0f172a&color=d4af37&format=svg`;

  const formattedDate = new Date(completionDate).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  // ── Actions ────────────────────────────────────────────────────────────

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(verificationUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar link');
    }
  }, [verificationUrl]);

  const handleShareLinkedIn = useCallback(() => {
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(verificationUrl)}`;
    window.open(linkedInUrl, '_blank', 'noopener,noreferrer');
  }, [verificationUrl]);

  const handleDownload = useCallback(async () => {
    if (!certificateRef.current) return;
    setIsDownloading(true);

    try {
      // Dynamic import of html2canvas
      const html2canvasModule = await import('html2canvas');
      const html2canvas = html2canvasModule.default;

      const canvas = await html2canvas(certificateRef.current, {
        backgroundColor: null,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `certificado-${certificateCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Certificado baixado!');
    } catch {
      // Fallback: open print dialog
      toast.info('Abrindo janela de impressao para salvar como PDF...');
      window.print();
    } finally {
      setIsDownloading(false);
    }
  }, [certificateCode]);

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className="w-full max-w-3xl mx-auto space-y-4"
    >
      {/* Certificate Card */}
      <Card className="overflow-hidden border-0 shadow-2xl">
        <div ref={certificateRef}>
          <CardContent className="p-0">
            <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-blue-950 p-8 sm:p-12">
              {/* Gold border effect */}
              <div className="absolute inset-0 p-[2px]">
                <div className="absolute inset-3 border-2 border-amber-500/40 rounded-lg" />
                <div className="absolute inset-5 border border-amber-500/20 rounded-md" />
              </div>

              {/* Corner accents */}
              <div className="absolute top-6 left-6 w-8 h-8 border-t-2 border-l-2 border-amber-500/60" />
              <div className="absolute top-6 right-6 w-8 h-8 border-t-2 border-r-2 border-amber-500/60" />
              <div className="absolute bottom-6 left-6 w-8 h-8 border-b-2 border-l-2 border-amber-500/60" />
              <div className="absolute bottom-6 right-6 w-8 h-8 border-b-2 border-r-2 border-amber-500/60" />

              {/* Content */}
              <div className="relative z-10 text-center space-y-6">
                {/* Logo area */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="flex items-center justify-center gap-3"
                >
                  <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-3 rounded-xl shadow-lg shadow-violet-500/20">
                    <Award className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-violet-400 font-bold text-lg tracking-wide">{config.brandName.toUpperCase()}</p>
                    <p className="text-slate-500 text-xs tracking-widest uppercase">{config.legalName}</p>
                  </div>
                </motion.div>

                {/* Divider */}
                <div className="flex items-center gap-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                  <span className="text-amber-500/60 text-xs">★</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />
                </div>

                {/* Title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <h1 className="text-2xl sm:text-3xl font-serif tracking-wide bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400 bg-clip-text text-transparent">
                    Certificado de Conclusao
                  </h1>
                  <p className="text-slate-500 text-sm mt-1 tracking-wide">CERTIFICATE OF COMPLETION</p>
                </motion.div>

                {/* Certify text */}
                <p className="text-slate-400 text-sm">Certificamos que</p>

                {/* Student Name */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                >
                  <h2 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">
                    {studentName}
                  </h2>
                  <div className="mt-2 mx-auto w-2/3 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                </motion.div>

                {/* Module description */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-1"
                >
                  <p className="text-slate-400 text-sm">
                    concluiu com exito o modulo
                  </p>
                  <p className="text-lg sm:text-xl text-violet-300 font-semibold">
                    &ldquo;{moduleName}&rdquo;
                  </p>
                  <p className="text-slate-500 text-sm">
                    da plataforma de ensino {config.brandName}
                  </p>
                </motion.div>

                {/* Stats section */}
                {studentStats && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7 }}
                    className="flex items-center justify-center gap-6 sm:gap-10 py-3"
                  >
                    <div className="text-center">
                      <p className="text-2xl font-bold text-amber-400">{studentStats.quizAvg}%</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Media Quiz</p>
                    </div>
                    <div className="w-px h-10 bg-slate-700" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-violet-400">{studentStats.lessonsCompleted}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">Aulas</p>
                    </div>
                    <div className="w-px h-10 bg-slate-700" />
                    <div className="text-center">
                      <p className="text-2xl font-bold text-emerald-400">{studentStats.totalXP}</p>
                      <p className="text-xs text-slate-500 uppercase tracking-wider">XP Total</p>
                    </div>
                  </motion.div>
                )}

                {/* Date */}
                <p className="text-slate-500 text-sm">
                  Emitido em {formattedDate}
                </p>

                {/* Bottom section: code + QR */}
                <div className="flex items-end justify-between pt-4">
                  <div className="text-left">
                    <p className="text-xs text-slate-600 uppercase tracking-wider mb-1">Codigo de autenticidade</p>
                    <p className="font-mono text-sm text-violet-400 bg-slate-800/50 px-3 py-1 rounded-md inline-block">
                      {certificateCode}
                    </p>
                  </div>

                  {/* QR Code */}
                  <div className="flex flex-col items-center gap-1">
                    <div className="bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                      <img
                        src={qrCodeUrl}
                        alt="QR Code de verificacao"
                        className="w-20 h-20 sm:w-24 sm:h-24"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <p className="text-[10px] text-slate-600">Escaneie para verificar</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-col sm:flex-row gap-3"
      >
        <Button
          onClick={handleDownload}
          disabled={isDownloading}
          className="flex-1 bg-gradient-to-r from-violet-600 to-purple-700 hover:from-violet-700 hover:to-purple-800 text-white shadow-lg shadow-violet-500/20"
        >
          <Download className="h-4 w-4 mr-2" />
          {isDownloading ? 'Gerando...' : 'Baixar PDF'}
        </Button>

        <Button
          onClick={handleShareLinkedIn}
          variant="outline"
          className="flex-1 border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Compartilhar LinkedIn
        </Button>

        <Button
          onClick={handleCopyLink}
          variant="outline"
          className="flex-1 border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-slate-300"
        >
          {copied ? (
            <Check className="h-4 w-4 mr-2 text-emerald-400" />
          ) : (
            <Copy className="h-4 w-4 mr-2" />
          )}
          {copied ? 'Copiado!' : 'Copiar Link'}
        </Button>
      </motion.div>
    </motion.div>
  );
}
