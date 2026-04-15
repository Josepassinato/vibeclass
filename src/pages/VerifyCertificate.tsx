import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Award, Calendar, BookOpen, User } from 'lucide-react';
import { useBranding } from '@/branding';

interface CertificateData {
  id: string;
  student_name: string;
  module_title: string | null;
  certificate_type: string;
  certificate_code: string;
  issued_at: string;
}

export default function VerifyCertificate() {
  const { code } = useParams<{ code: string }>();
  const { config, labels } = useBranding();
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid'>('loading');
  const [certificate, setCertificate] = useState<CertificateData | null>(null);

  useEffect(() => {
    if (!code) {
      setStatus('invalid');
      return;
    }

    async function verify() {
      const { data, error } = await supabase
        .from('certificates')
        .select('id, student_name, module_title, certificate_type, certificate_code, issued_at')
        .eq('certificate_code', code)
        .maybeSingle();

      if (error || !data) {
        setStatus('invalid');
      } else {
        setCertificate(data);
        setStatus('valid');
      }
    }

    verify();
  }, [code]);

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">{config.brandName}</h1>
          <p className="text-sm text-slate-400">{config.legalName}</p>
        </div>

        {status === 'loading' && (
          <Card className="border-slate-700 bg-slate-800/50 backdrop-blur">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
              <p className="text-slate-300">Verificando certificado...</p>
            </CardContent>
          </Card>
        )}

        {status === 'valid' && certificate && (
          <Card className="border-amber-500/30 bg-slate-800/50 backdrop-blur overflow-hidden">
            {/* Gold top bar */}
            <div className="h-1.5 bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-400" />
            <CardContent className="p-6">
              <div className="flex flex-col items-center text-center mb-6">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 flex items-center justify-center mb-3">
                  <CheckCircle2 className="h-10 w-10 text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Certificado Valido</h2>
                <Badge variant="outline" className="mt-2 border-emerald-500/50 text-emerald-400">
                  Autenticado
                </Badge>
              </div>

              <div className="space-y-4 bg-slate-900/50 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">{labels.learnerSingularTitle}</p>
                    <p className="text-white font-medium">{certificate.student_name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <BookOpen className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">
                      {certificate.certificate_type === 'course' ? 'Programa Completo' : labels.moduleSingularTitle}
                    </p>
                    <p className="text-white font-medium">
                      {certificate.module_title || config.certificateProgramFallback}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Emitido em</p>
                    <p className="text-white font-medium">{formatDate(certificate.issued_at)}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Award className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 uppercase tracking-wide">Codigo</p>
                    <p className="text-amber-400 font-mono text-sm">{certificate.certificate_code}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {status === 'invalid' && (
          <Card className="border-red-500/30 bg-slate-800/50 backdrop-blur overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-red-500 via-red-400 to-red-500" />
            <CardContent className="flex flex-col items-center justify-center py-12 px-6">
              <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <XCircle className="h-10 w-10 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Certificado Nao Encontrado</h2>
              <p className="text-slate-400 text-sm text-center">
                O codigo <span className="font-mono text-red-400">{code || '—'}</span> nao corresponde a nenhum certificado emitido.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="text-center mt-6">
          <Link to="/">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Ir para a escola
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
