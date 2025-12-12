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
  const refreshIcons = useDesktopStore((state) => state.refreshIcons);

  useEffect(() => {
    initializeIcons();
  }, [initializeIcons]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
        const modifier = isMac ? e.metaKey : e.ctrlKey;

        if (modifier && e.shiftKey && e.key === 'R') {
          e.preventDefault();
          refreshIcons();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [refreshIcons]);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MobileBanner />
      <MenuBar />

      {/* Desktop background - starts below menu bar */}
      <div
        className="absolute top-[22px] right-0 bottom-0 left-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/imgs/osx-10-light.png)' }}
      >
        {/* Desktop Icons */}
        <DesktopIcons />

        {/* Windows */}
        {windows
          .filter((w) => !w.isMinimized)
          .map((window) => {
            if (window.type === 'browser') {
              return (
                <BrowserWindow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              );
            }
            if (window.type === 'terminal') {
              return (
                <TerminalWindow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              );
            }
            if (window.type === 'pdfviewer') {
              return (
                <PDFViewerWindow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              );
            }
            if (window.type === 'finder') {
              return (
                <FinderWindow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              );
            }
            if (window.type === 'photos') {
              return (
                <PhotosWindow
                  key={window.id}
                  window={window}
                  isActive={window.id === activeWindowId}
                />
              );
            }
            return (
              <TextEditWindow
                key={window.id}
                window={window}
                isActive={window.id === activeWindowId}
              />
            );
          })}
      </div>

      <Dock />
      <Notification />
    </div>
  );
};

export default Desktop;
