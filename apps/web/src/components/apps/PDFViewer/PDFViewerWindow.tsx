import Window from '@/components/window/Window';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { getRouteStrategy } from '@/lib/routing/windowRouteStrategies';
import type { Window as WindowType } from '@/stores/useWindowStore';
import PDFViewer from './PDFViewer';

interface PDFViewerWindowProps {
  window: WindowType;
  isActive: boolean;
}

const PDFViewerWindow = ({ window: windowData, isActive }: PDFViewerWindowProps) => {
  const routeStrategy = getRouteStrategy('pdfviewer');
  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
      routeStrategy,
    });

  const pdfUrl = windowData.urlPath ? `/content${windowData.urlPath}.pdf` : '';

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
        {pdfUrl ? (
          <PDFViewer url={pdfUrl} title={windowData.title} />
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
