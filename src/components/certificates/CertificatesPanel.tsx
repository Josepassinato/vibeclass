import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Award, Loader2 } from 'lucide-react';
import { useCertificates } from '@/hooks/useCertificates';
import { CertificateCard } from './CertificateCard';
import { CertificateViewer } from './CertificateViewer';
import { toast } from 'sonner';

interface Certificate {
  id: string;
  student_id: string;
  module_id: string | null;
  certificate_type: 'module' | 'course';
  student_name: string;
  module_title: string | null;
  issued_at: string;
  certificate_code: string;
  created_at: string;
}

interface CertificatesPanelProps {
  studentId: string;
}

export function CertificatesPanel({ studentId }: CertificatesPanelProps) {
  const { certificates, isLoading, fetchCertificates, downloadCertificate } = useCertificates(studentId);
  const [viewingCertificate, setViewingCertificate] = useState<Certificate | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  const handleDownload = async (certificate: Certificate) => {
    setDownloadingId(certificate.id);
    try {
      await downloadCertificate(certificate, 'png');
      toast.success('Certificado baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar certificado');
    } finally {
      setDownloadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (certificates.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="p-4 rounded-full bg-muted inline-block mb-4">
          <Award className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="font-semibold mb-2">Nenhum certificado ainda</h3>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          Complete módulos do curso para ganhar certificados de conclusão!
        </p>
      </div>
    );
  }

  return (
    <>
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {certificates.map((cert, index) => (
          <motion.div
            key={cert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <CertificateCard
              id={cert.id}
              studentName={cert.student_name}
              moduleTitle={cert.module_title}
              certificateType={cert.certificate_type as 'module' | 'course'}
              certificateCode={cert.certificate_code}
              issuedAt={cert.issued_at}
              onView={() => setViewingCertificate(cert as Certificate)}
              onDownload={() => handleDownload(cert as Certificate)}
              isDownloading={downloadingId === cert.id}
            />
          </motion.div>
        ))}
      </motion.div>

      {/* Certificate Viewer Modal */}
      <AnimatePresence>
        {viewingCertificate && (
          <CertificateViewer
            certificate={viewingCertificate}
            onClose={() => setViewingCertificate(null)}
            onDownload={() => handleDownload(viewingCertificate)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
