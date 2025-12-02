import * as pdfjsLib from 'pdfjs-dist';
import { useCallback, useEffect, useRef, useState } from 'react';

import PDFPageRenderer from '@/components/apps/PDFViewer/PDFPageRenderer';
import PDFToolbar from '@/components/apps/PDFViewer/PDFToolbar';
import { validatePdfUrl } from '@/lib/utils';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  url: string;
}

const PDFViewer = ({ url }: PDFViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [visiblePages, setVisiblePages] = useState<Set<number>>(new Set());
  const [containerWidth, setContainerWidth] = useState(800);

  useEffect(() => {
    if (!validatePdfUrl(url)) {
      setError('Invalid PDF URL');
      setLoading(false);
      return;
    }

    const loadPDF = async () => {
      try {
        setLoading(true);
        setError(null);
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        setPdfDoc(pdf);
        setLoading(false);
      } catch (err) {
        console.error('Error loading PDF:', err);
        setError(`Failed to load PDF: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setLoading(false);
      }
    };

    loadPDF();
  }, [url]);

  useEffect(() => {
    if (!containerRef.current) return;

    const updateContainerWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    updateContainerWidth();
    const resizeObserver = new ResizeObserver(updateContainerWidth);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!pdfDoc || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') ?? '0', 10);
            if (pageNum > 0) {
              setVisiblePages((prev) => new Set(prev).add(pageNum));
            }
          }
        });
      },
      { rootMargin: '200px' }
    );

    const canvases = containerRef.current.querySelectorAll('[data-page-num]');
    canvases.forEach((canvas) => observer.observe(canvas));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc]);

  useEffect(() => {
    setVisiblePages(new Set());
  }, [scale]);

  const handleZoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  if (loading) {
    return (
      <div className="aqua-pinstripe flex h-full items-center justify-center">
        <div className="font-ui text-[11px] text-[var(--color-text-secondary)]">Loading PDF...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="aqua-pinstripe flex h-full items-center justify-center">
        <div className="font-ui text-[11px] text-red-600">{error}</div>
      </div>
    );
  }

  if (!pdfDoc) return null;

  const totalPages = pdfDoc.numPages;

  return (
    <div className="flex h-full flex-col">
      <PDFToolbar scale={scale} onZoomIn={handleZoomIn} onZoomOut={handleZoomOut} />

      <div ref={containerRef} className="aqua-pinstripe flex-1 overflow-auto">
        <div className="flex flex-col items-center gap-4 py-5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <PDFPageRenderer
              key={pageNum}
              pageNum={pageNum}
              pdfDoc={pdfDoc}
              scale={scale}
              containerWidth={containerWidth}
              isVisible={visiblePages.has(pageNum)}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
