import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { X, Download, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useBranding } from '@/branding';

/**
 * Sanitize SVG string to prevent XSS.
 * Only allows known safe SVG elements and attributes.
 */
function sanitizeSvg(raw: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(raw, 'image/svg+xml');

  // If parsing failed, return empty
  const parseError = doc.querySelector('parsererror');
  if (parseError) return '';

  const ALLOWED_TAGS = new Set([
    'svg', 'g', 'defs', 'linearGradient', 'radialGradient', 'stop',
    'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path',
    'text', 'tspan', 'textPath', 'clipPath', 'mask', 'use', 'symbol',
    'marker', 'pattern', 'image', 'title', 'desc',
  ]);

  const DANGEROUS_ATTRS = /^on|^xlink:href$|^href$/i;
  const SAFE_HREF_PATTERN = /^#/; // only allow internal fragment references

  function walk(node: Element) {
    const children = Array.from(node.children);
    for (const child of children) {
      const tag = child.tagName.toLowerCase();
      if (tag === 'script' || tag === 'foreignobject' || !ALLOWED_TAGS.has(tag)) {
        child.remove();
        continue;
      }
      // Remove dangerous attributes
      for (const attr of Array.from(child.attributes)) {
        if (DANGEROUS_ATTRS.test(attr.name)) {
          // Allow href only if it points to an internal fragment
          if ((attr.name === 'href' || attr.name === 'xlink:href') && SAFE_HREF_PATTERN.test(attr.value)) {
            continue;
          }
          child.removeAttribute(attr.name);
        }
      }
      walk(child);
    }
  }

  const svg = doc.documentElement;
  walk(svg);
  return new XMLSerializer().serializeToString(svg);
}

interface Certificate {
  id: string;
  student_id: string;
  module_id: string | null;
  certificate_type: 'module' | 'course';
  student_name: string;
  module_title: string | null;
  certificate_code: string;
}

interface CertificateViewerProps {
  certificate: Certificate;
  onClose: () => void;
  onDownload: () => void;
}

export function CertificateViewer({ certificate, onClose, onDownload }: CertificateViewerProps) {
  const [svg, setSvg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { config } = useBranding();

  useEffect(() => {
    const fetchSvg = async () => {
      try {
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
        setSvg(data.svg);
      } catch (error) {
        console.error('Error fetching certificate SVG:', error);
        toast.error('Erro ao carregar certificado');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSvg();
  }, [certificate]);

  // Sanitize SVG before rendering to prevent XSS
  const safeSvg = useMemo(() => (svg ? sanitizeSvg(svg) : null), [svg]);

  const handleShare = async () => {
    const shareText = `🎓 Certificado ${config.brandName}\n\nCódigo: ${certificate.certificate_code}\nAluno: ${certificate.student_name}`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Meu Certificado ${config.brandName}`,
          text: shareText,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share cancelled');
      }
    } else {
      // Fallback: copy to clipboard
      await navigator.clipboard.writeText(shareText);
      toast.success('Link copiado para a área de transferência!');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-card rounded-2xl shadow-2xl max-w-4xl w-full overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="font-semibold">Visualizar Certificado</h2>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Certificate Preview */}
        <div className="p-4 bg-muted/50 flex items-center justify-center min-h-[400px]">
          {isLoading ? (
            <div className="animate-pulse bg-muted rounded-lg w-full max-w-2xl aspect-[4/3]" />
          ) : safeSvg ? (
            <div
              className="w-full max-w-2xl rounded-lg overflow-hidden shadow-lg"
              dangerouslySetInnerHTML={{ __html: safeSvg }}
            />
          ) : (
            <p className="text-muted-foreground">Erro ao carregar certificado</p>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            <span className="font-mono bg-muted px-2 py-1 rounded">
              {certificate.certificate_code}
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Button onClick={onDownload}>
              <Download className="h-4 w-4 mr-2" />
              Baixar PNG
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
