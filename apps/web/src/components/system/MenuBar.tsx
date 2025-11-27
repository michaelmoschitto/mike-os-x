import { useState, useEffect } from 'react';

import MenuBarMenu, { type MenuItem } from '@/components/ui/aqua/MenuBarMenu';
import { useWindowStore } from '@/stores/useWindowStore';

const MenuBar = () => {
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const windows = useWindowStore((state) => state.windows);
  const { openWindow, closeWindow, minimizeWindow, focusWindow } = useWindowStore();

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

  const handleNewWindow = () => {
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
  };

  const handleCloseWindow = () => {
    if (activeWindowId) {
      closeWindow(activeWindowId);
    }
  };

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

  const fileMenuItems: MenuItem[] = [
    { label: 'New Window', action: handleNewWindow, shortcut: '⌘N' },
    { label: 'Open...', action: () => {}, shortcut: '⌘O', disabled: true },
    { separator: true },
    { label: 'Close Window', action: handleCloseWindow, shortcut: '⌘W', disabled: !activeWindowId },
    { separator: true },
    { label: 'Quit', action: () => {}, shortcut: '⌘Q', disabled: true },
  ];

  const editMenuItems: MenuItem[] = [
    { label: 'Undo', action: () => {}, shortcut: '⌘Z', disabled: true },
    { label: 'Redo', action: () => {}, shortcut: '⇧⌘Z', disabled: true },
    { separator: true },
    { label: 'Cut', action: () => {}, shortcut: '⌘X', disabled: true },
    { label: 'Copy', action: () => {}, shortcut: '⌘C', disabled: true },
    { label: 'Paste', action: () => {}, shortcut: '⌘V', disabled: true },
  ];

  const viewMenuItems: MenuItem[] = [
    { label: 'Show View Options', action: () => {}, disabled: true },
  ];

  const goMenuItems: MenuItem[] = [
    { label: 'Home', action: () => {}, disabled: true },
    { label: 'Back', action: () => {}, disabled: true },
    { label: 'Forward', action: () => {}, disabled: true },
  ];

  const windowMenuItems: MenuItem[] = [
    { label: 'Minimize', action: handleMinimizeWindow, shortcut: '⌘M', disabled: !activeWindowId },
    { label: 'Zoom', action: () => {}, disabled: !activeWindowId },
    { separator: true },
    { label: 'Bring All to Front', action: handleBringAllToFront },
  ];

  const helpMenuItems: MenuItem[] = [{ label: 'Help Center', action: () => {}, disabled: true }];

  return (
    <div className="aqua-menubar font-ui fixed top-0 right-0 left-0 z-50 flex h-[22px] items-center justify-between px-3 text-[13px] text-black/90">
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <img src="/icons/apple.png" alt="Apple" className="h-4 w-4" />
        </div>
        <span className="ml-1 font-semibold">{appName}</span>
        <MenuBarMenu label="File" items={fileMenuItems} />
        <MenuBarMenu label="Edit" items={editMenuItems} />
        <MenuBarMenu label="View" items={viewMenuItems} />
        <MenuBarMenu label="Go" items={goMenuItems} />
        <MenuBarMenu label="Window" items={windowMenuItems} />
        <MenuBarMenu label="Help" items={helpMenuItems} />
      </div>
      <div className="flex items-center text-[12px]">
        <span>{currentTime}</span>
      </div>
    </div>
  );
};

export default MenuBar;
