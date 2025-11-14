import { useState, useEffect } from 'react';

import { useWindowStore } from '@/stores/useWindowStore';

const MenuBar = () => {
  const activeWindowId = useWindowStore((state) => state.activeWindowId);
  const windows = useWindowStore((state) => state.windows);

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

  return (
    <div className="aqua-menubar font-ui fixed top-0 right-0 left-0 z-50 flex h-[22px] items-center justify-between px-3 text-[13px] text-black/90">
      <div className="flex items-center gap-1">
        <div className="flex items-center">
          <img src="/icons/apple.png" alt="Apple" className="h-4 w-4" />
        </div>
        <span className="ml-1 font-semibold">{appName}</span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          File
        </span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          Edit
        </span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          View
        </span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          Go
        </span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          Window
        </span>
        <span className="cursor-default rounded px-1.5 py-0.5 transition-colors hover:bg-[var(--color-highlight)] hover:text-white">
          Help
        </span>
      </div>
      <div className="flex items-center text-[12px]">
        <span>{currentTime}</span>
      </div>
    </div>
  );
};

export default MenuBar;
