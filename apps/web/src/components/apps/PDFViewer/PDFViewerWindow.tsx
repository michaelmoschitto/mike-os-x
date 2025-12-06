import PDFViewer from '@/components/apps/PDFViewer/PDFViewer';
import Window from '@/components/window/Window';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { sanitizeUrlPath, validatePdfUrl } from '@/lib/utils';
import type { Window as WindowType } from '@/stores/useWindowStore';

interface PDFViewerWindowProps {
  window: WindowType;
  isActive: boolean;
}

const PDFViewerWindow = ({ window: windowData, isActive }: PDFViewerWindowProps) => {
  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const sanitizedPath = windowData.urlPath ? sanitizeUrlPath(windowData.urlPath) : '';
  const pdfUrl = sanitizedPath ? `/content${sanitizedPath}.pdf` : '';
  const isValidUrl = pdfUrl ? validatePdfUrl(pdfUrl) : false;

  return (
    <Window
      id={windowData.id}
      title={windowData.title}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onFocus={handleFocus}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
    >
      <div className="h-full w-full">
        {pdfUrl && isValidUrl ? (
          <PDFViewer url={pdfUrl} />
        ) : (
          <div className="aqua-pinstripe font-ui flex h-full items-center justify-center text-[11px] text-[var(--color-text-secondary)]">
            No PDF to display
          </div>
        )}
      </div>
    </Window>
  );
};

export default PDFViewerWindow;
