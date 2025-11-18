import type * as pdfjsLib from 'pdfjs-dist';
import { useEffect, useRef } from 'react';

interface PDFPageRendererProps {
  pageNum: number;
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  scale: number;
  containerWidth: number;
  isVisible: boolean;
}

const PDFPageRenderer = ({
  pageNum,
  pdfDoc,
  scale,
  containerWidth,
  isVisible,
}: PDFPageRendererProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const lastScaleRef = useRef<number | null>(null);
  const lastContainerWidthRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    const scaleChanged = lastScaleRef.current !== scale;
    const widthChanged = lastContainerWidthRef.current !== containerWidth;
    const isFirstRender = lastScaleRef.current === null;

    if (!isFirstRender && !scaleChanged && !widthChanged) return;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const viewport = page.getViewport({ scale: 1.0 });
        const defaultScale = (containerWidth - 80) / viewport.width;
        const actualScale = scale * defaultScale;
        const scaledViewport = page.getViewport({ scale: actualScale });

        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        const renderContext = {
          canvas: canvas,
          viewport: scaledViewport,
        };

        await page.render(renderContext).promise;
        lastScaleRef.current = scale;
        lastContainerWidthRef.current = containerWidth;
      } catch (err) {
        console.error(`Error rendering page ${pageNum}:`, err);
      }
    };

    renderPage();
  }, [pageNum, pdfDoc, scale, containerWidth, isVisible]);

  return (
    <div className="flex flex-col items-center gap-2" data-page-num={pageNum}>
      <canvas
        ref={canvasRef}
        className="h-auto max-w-full"
        style={{
          boxShadow: 'var(--shadow-window)',
        }}
      />
      <div className="font-ui text-[10px] text-[var(--color-text-secondary)]">Page {pageNum}</div>
    </div>
  );
};

export default PDFPageRenderer;
