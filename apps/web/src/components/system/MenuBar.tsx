import { useState, useEffect, useCallback } from 'react';

import MenuBarMenu from '@/components/ui/aqua/MenuBarMenu';
import { getDefaultMenuItems, getTerminalMenuItems } from '@/lib/menus/terminalMenus';
import { useWindowStore } from '@/stores/useWindowStore';

const MenuBar = () => {
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const windows = useWindowStore((state) => state.windows);
  const { openWindow, closeWindow, minimizeWindow, focusWindow, addTabToWindow, closeTab } =
    useWindowStore();

  const activeWindow = windows.find((w) => w.id === activeWindowId);
  const appName = activeWindow?.appName || '';

  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return now.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  });

  const handleNewTerminalWindow = useCallback(() => {
    const windowWidth = 649;
    const windowHeight = 436;
    const centerX = (window.innerWidth - windowWidth) / 2;
    const centerY = (window.innerHeight - windowHeight - 22 - 60) / 2;

    openWindow({
      type: 'terminal',
      title: 'Terminal',
      content: '',
      position: { x: centerX, y: centerY + 22 },
      size: { width: windowWidth, height: windowHeight },
    });
  }, [openWindow]);

  const handleNewTerminalTab = useCallback(() => {
    if (activeWindow?.type === 'terminal') {
      addTabToWindow(activeWindow.id);
    } else {
      handleNewTerminalWindow();
    }
  }, [activeWindow, addTabToWindow, handleNewTerminalWindow]);

  const handleNewWindow = useCallback(() => {
    const windowWidth = 800;
    const windowHeight = 600;
    const centerX = (window.innerWidth - windowWidth) / 2;
    const centerY = (window.innerHeight - windowHeight - 22 - 60) / 2;

    openWindow({
      type: 'finder',
      title: 'Finder',
      content: '',
      position: { x: centerX, y: centerY + 22 },
      size: { width: windowWidth, height: windowHeight },
      currentPath: '/home',
      viewMode: 'icon',
      navigationHistory: ['/home'],
      navigationIndex: 0,
      appName: 'Finder',
    });
  }, [openWindow]);

  const handleCloseTerminalTab = useCallback(() => {
    if (activeWindow?.type === 'terminal' && activeWindow.activeTabId) {
      closeTab(activeWindow.id, activeWindow.activeTabId);
    }
  }, [activeWindow, closeTab]);

  const handleCloseWindow = useCallback(() => {
    if (activeWindowId) {
      closeWindow(activeWindowId);
    }
  }, [activeWindowId, closeWindow]);

  const handleQuitTerminal = useCallback(() => {
    const terminalWindows = windows.filter((w) => w.type === 'terminal');
    terminalWindows.forEach((w) => closeWindow(w.id));
  }, [windows, closeWindow]);

  const handleMinimizeWindow = () => {
    if (activeWindowId) {
      minimizeWindow(activeWindowId);
    }
  };

  const handleBringAllToFront = () => {
    const visibleWindows = windows.filter((w) => !w.isMinimized);
    visibleWindows.forEach((window) => {
      focusWindow(window.id);
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (!modifier) return;

      if (activeWindow?.type === 'terminal') {
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          handleNewTerminalTab();
        } else if (e.key === 'n' || e.key === 'N') {
          e.preventDefault();
          handleNewTerminalWindow();
        } else if (e.key === 'w' || e.key === 'W') {
          e.preventDefault();
          if ((activeWindow.tabs?.length || 0) > 1) {
            handleCloseTerminalTab();
          } else {
            handleCloseWindow();
          }
        } else if (e.key === 'q' || e.key === 'Q') {
          e.preventDefault();
          handleQuitTerminal();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    activeWindow,
    windows,
    handleNewTerminalTab,
    handleNewTerminalWindow,
    handleCloseTerminalTab,
    handleCloseWindow,
    handleQuitTerminal,
  ]);

  const menuConfig =
    activeWindow?.type === 'terminal'
      ? getTerminalMenuItems(activeWindow, {
          handleNewTab: handleNewTerminalTab,
          handleNewWindow: handleNewTerminalWindow,
          handleCloseTab: handleCloseTerminalTab,
          handleCloseWindow: handleCloseWindow,
          handleQuitTerminal: handleQuitTerminal,
          handleMinimizeWindow: handleMinimizeWindow,
          handleBringAllToFront: handleBringAllToFront,
        })
      : getDefaultMenuItems(activeWindow, {
          handleNewWindow: handleNewWindow,
          handleCloseWindow: handleCloseWindow,
          handleMinimizeWindow: handleMinimizeWindow,
          handleBringAllToFront: handleBringAllToFront,
        });

  return (
    <div className="aqua-menubar font-ui fixed top-0 right-0 left-0 z-50 flex h-[22px] items-center justify-between px-3 text-[13px] text-black/90">
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <img src="/icons/apple.png" alt="Apple" className="h-4 w-4" />
        </div>
        <span className="ml-1 font-semibold">{appName}</span>
        <MenuBarMenu label="File" items={menuConfig.file} />
        <MenuBarMenu label="Edit" items={menuConfig.edit} />
        <MenuBarMenu label="View" items={menuConfig.view} />
        <MenuBarMenu label="Go" items={menuConfig.go} />
        <MenuBarMenu label="Window" items={menuConfig.window} />
        <MenuBarMenu label="Help" items={menuConfig.help} />
      </div>
      <div className="flex items-center text-[12px]">
        <span>{currentTime}</span>
      </div>
    </div>
  );
};

export default MenuBar;
