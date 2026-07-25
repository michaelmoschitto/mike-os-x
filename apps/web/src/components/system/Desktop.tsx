import { useEffect } from 'react';

import { BrowserWindow } from '@/components/apps/Browser';
import { FinderWindow } from '@/components/apps/Finder';
import { PDFViewerWindow } from '@/components/apps/PDFViewer';
import { PhotosWindow } from '@/components/apps/Photos';
import { TerminalWindow } from '@/components/apps/Terminal';
import { TextEditWindow } from '@/components/apps/TextEdit';
import DesktopIcons from '@/components/system/DesktopIcons';
import Dock from '@/components/system/Dock';
import MenuBar from '@/components/system/MenuBar';
import MobileBanner from '@/components/system/MobileBanner';
import Notification from '@/components/system/Notification';
import { useDesktopStore } from '@/stores/useDesktopStore';
import { useWindowStore } from '@/stores/useWindowStore';

const Desktop = () => {
  const windows = useWindowStore((state) => state.windows);
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const initializeIcons = useDesktopStore((state) => state.initializeIcons);

  useEffect(() => {
    initializeIcons();
  }, [initializeIcons]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MobileBanner />
      <MenuBar />

      <div
        className="absolute top-[22px] right-0 bottom-0 left-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/imgs/osx-10-light.png)' }}
      >
        <DesktopIcons />

        {[...windows]
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((window) => {
            if (window.isMinimized && window.type !== 'textedit') {
              return null;
            }

            const isActive = !window.isMinimized && window.id === activeWindowId;
            const windowNode =
              window.type === 'browser' ? (
                <BrowserWindow window={window} isActive={isActive} />
              ) : window.type === 'terminal' ? (
                <TerminalWindow window={window} isActive={isActive} />
              ) : window.type === 'pdfviewer' ? (
                <PDFViewerWindow window={window} isActive={isActive} />
              ) : window.type === 'finder' ? (
                <FinderWindow window={window} isActive={isActive} />
              ) : window.type === 'photos' ? (
                <PhotosWindow window={window} isActive={isActive} />
              ) : (
                <TextEditWindow window={window} isActive={isActive} />
              );

            return (
              <div
                key={window.id}
                aria-hidden={window.isMinimized}
                className={window.isMinimized ? 'pointer-events-none invisible' : undefined}
              >
                {windowNode}
              </div>
            );
          })}
      </div>

      <Dock />
      <Notification />
    </div>
  );
};

export default Desktop;
