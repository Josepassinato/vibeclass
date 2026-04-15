import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileText, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface ExportTranscriptsPdfProps {
  password: string;
}

export function ExportTranscriptsPdf({ password }: ExportTranscriptsPdfProps) {
  const [isExporting, setIsExporting] = useState(false);

  const exportPdf = async () => {
    setIsExporting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-videos', {
        body: { action: 'list', password }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const videos = (data.videos || [])
        .filter((v: any) => v.transcript)
        .sort((a: any, b: any) => (a.lesson_order || 0) - (b.lesson_order || 0));

      if (videos.length === 0) {
        toast.error('Nenhuma transcrição encontrada');
        return;
      }

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const maxWidth = pageWidth - margin * 2;
      let y = margin;

      const addPageIfNeeded = (requiredSpace: number) => {
        if (y + requiredSpace > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
      };

      // Cover page
      doc.setFontSize(28);
      doc.setFont('helvetica', 'bold');
      const coverTitle = 'TRANSCRIÇÕES DAS AULAS';
      const titleWidth = doc.getTextWidth(coverTitle);
      doc.text(coverTitle, (pageWidth - titleWidth) / 2, pageHeight / 2 - 20);

      doc.setFontSize(18);
      doc.setFont('helvetica', 'normal');
      const subtitle = '12 BRAIN';
      const subtitleWidth = doc.getTextWidth(subtitle);
      doc.text(subtitle, (pageWidth - subtitleWidth) / 2, pageHeight / 2);

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      const dateStr = `Exportado em ${new Date().toLocaleDateString('pt-BR')}`;
      const dateWidth = doc.getTextWidth(dateStr);
      doc.text(dateStr, (pageWidth - dateWidth) / 2, pageHeight / 2 + 15);
      doc.setTextColor(0, 0, 0);

      // Content pages
      for (const video of videos) {
        doc.addPage();
        y = margin;

        // Lesson header
        doc.setFontSize(8);
        doc.setTextColor(120, 120, 120);
        doc.text(`Aula ${video.lesson_order}`, margin, y);
        y += 6;

        // Title
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 0, 0);
        const titleLines = doc.splitTextToSize(video.title, maxWidth);
        doc.text(titleLines, margin, y);
        y += titleLines.length * 7 + 2;

        // Separator line
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        y += 8;

        // Description
        if (video.description) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(80, 80, 80);
          const descLines = doc.splitTextToSize(video.description, maxWidth);
          addPageIfNeeded(descLines.length * 5 + 8);
          doc.text(descLines, margin, y);
          y += descLines.length * 5 + 8;
        }

        // Transcript body
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 30, 30);

        const paragraphs = video.transcript.split(/\n\n|\n/).filter((p: string) => p.trim());

        for (const paragraph of paragraphs) {
          const lines = doc.splitTextToSize(paragraph.trim(), maxWidth);
          for (const line of lines) {
            addPageIfNeeded(5);
            doc.text(line, margin, y);
            y += 5;
          }
          y += 3; // paragraph spacing
        }
      }

      // Footer on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 2; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(`Página ${i - 1} de ${totalPages - 1}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
        doc.text('12 BRAIN - Transcrições', margin, pageHeight - 10);
      }

      doc.save(`transcricoes-12brain-${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success(`PDF gerado com ${videos.length} transcrições!`);
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erro ao gerar PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Button variant="outline" onClick={exportPdf} disabled={isExporting}>
      {isExporting ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <FileText className="h-4 w-4 mr-2" />
      )}
      {isExporting ? 'Gerando PDF...' : 'Transcrições PDF'}
    </Button>
  );
}
