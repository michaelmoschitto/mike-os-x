import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

interface PDFViewerProps {
  url: string;
  title: string;
}

const PDFViewer = ({ url, title }: PDFViewerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [scale, setScale] = useState(1.0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [renderedPages, setRenderedPages] = useState<Set<number>>(new Set());
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());

  useEffect(() => {
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
    if (!pdfDoc || !containerRef.current) return;

    const renderPage = async (pageNum: number) => {
      if (renderedPages.has(pageNum)) return;

      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRefs.current.get(pageNum);
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        const containerWidth = containerRef.current?.clientWidth ?? 800;
        const viewport = page.getViewport({ scale: 1.0 });
        const defaultScale = (containerWidth - 80) / viewport.width;
        const actualScale = scale * defaultScale;
        const scaledViewport = page.getViewport({ scale: actualScale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;
        setRenderedPages((prev) => new Set(prev).add(pageNum));
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const pageNum = parseInt(entry.target.getAttribute('data-page-num') ?? '0', 10);
            if (pageNum > 0) {
              renderPage(pageNum);
            }
          }
        });
      },
      { rootMargin: '200px' }
    );

    const canvases = Array.from(canvasRefs.current.values());
    canvases.forEach((canvas) => observer.observe(canvas));

    return () => {
      observer.disconnect();
    };
  }, [pdfDoc, scale, renderedPages]);

  useEffect(() => {
    setRenderedPages(new Set());
  }, [scale]);


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
      {/* PDF pages container with infinite scroll */}
      <div ref={containerRef} className="aqua-pinstripe h-full overflow-auto">
        <div className="flex flex-col items-center gap-4 py-5">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <div key={pageNum} className="flex flex-col items-center gap-2">
              <canvas
                ref={(el) => {
                  if (el) {
                    canvasRefs.current.set(pageNum, el);
                  } else {
                    canvasRefs.current.delete(pageNum);
                  }
                }}
                data-page-num={pageNum}
                style={{
                  maxWidth: '100%',
                  height: 'auto',
                  boxShadow: 'var(--shadow-window)',
                }}
              />
              <div className="font-ui text-[10px] text-[var(--color-text-secondary)]">
                Page {pageNum}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
