import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

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

interface GenerateCertificateParams {
  studentId: string;
  studentName: string;
  moduleId?: string;
  moduleTitle?: string;
  certificateType: 'module' | 'course';
}

export function useCertificates(studentId: string) {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all certificates for the student
  const fetchCertificates = useCallback(async () => {
    if (!studentId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .eq('student_id', studentId)
        .order('issued_at', { ascending: false });

      if (error) throw error;
      setCertificates((data || []) as Certificate[]);
    } catch (error) {
      logger.error('[Certificates] Error fetching:', error);
    } finally {
      setIsLoading(false);
    }
  }, [studentId]);

  // Generate a new certificate
  const generateCertificate = useCallback(async (params: GenerateCertificateParams) => {
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: params,
      });

      if (error) throw error;

      // Refresh certificates list
      await fetchCertificates();

      return {
        certificate: data.certificate as Certificate,
        svg: data.svg as string,
        isNew: data.message === 'Certificate created successfully',
      };
    } catch (error) {
      logger.error('[Certificates] Error generating:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, [fetchCertificates]);

  // Download certificate as SVG/PNG
  const downloadCertificate = useCallback(async (
    certificate: Certificate, 
    format: 'svg' | 'png' = 'png'
  ) => {
    try {
      // Regenerate the SVG for this certificate
      const { data, error } = await supabase.functions.invoke('generate-certificate', {
        body: {
          studentId: certificate.student_id,
          studentName: certificate.student_name,
          moduleId: certificate.module_id,
          moduleTitle: certificate.module_title,
          certificateType: certificate.certificate_type,
        },
      });

      if (error) throw error;

      const svg = data.svg as string;

      if (format === 'svg') {
        // Download as SVG
        const blob = new Blob([svg], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `certificado-${certificate.certificate_code}.svg`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Convert SVG to PNG using canvas
        const img = new Image();
        const svgBlob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);

        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 800;
          canvas.height = 600;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            canvas.toBlob((blob) => {
              if (blob) {
                const pngUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = `certificado-${certificate.certificate_code}.png`;
                a.click();
                URL.revokeObjectURL(pngUrl);
              }
            }, 'image/png');
          }
          URL.revokeObjectURL(url);
        };

        img.src = url;
      }
    } catch (error) {
      logger.error('[Certificates] Error downloading:', error);
      throw error;
    }
  }, []);

  return {
    certificates,
    isLoading,
    isGenerating,
    fetchCertificates,
    generateCertificate,
    downloadCertificate,
  };
}
