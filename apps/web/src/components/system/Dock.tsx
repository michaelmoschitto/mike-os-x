import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  LayoutGroup,
  type MotionValue,
} from 'framer-motion';
import { Fragment, useMemo, useRef, useState } from 'react';

import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { parseWindowIdentifiersFromUrl } from '@/lib/routing/windowSerialization';
import { getAppTypeForDock, useWindowStore } from '@/stores/useWindowStore';

type DockIconType =
  | 'browser'
  | 'terminal'
  | 'textedit'
  | 'writing'
  | 'photos'
  | 'reading'
  | 'finder'
  | 'trash';

interface DockIcon {
  id: DockIconType;
  label: string;
  icon: string;
}

const dockIcons: DockIcon[] = [
  { id: 'browser', label: 'Internet Explorer', icon: '/icons/browser.png' },
  { id: 'terminal', label: 'Terminal', icon: '/icons/ai.png' },
  { id: 'textedit', label: 'TextEdit', icon: '/icons/file-text.png' },
  { id: 'writing', label: 'Writing', icon: '/icons/writing.png' },
  { id: 'photos', label: 'Photos', icon: '/icons/photos.png' },
  { id: 'reading', label: 'Reading', icon: '/icons/reading.png' },
  { id: 'finder', label: 'Finder', icon: '/icons/about.png' },
  { id: 'trash', label: 'Trash', icon: '/icons/trash.png' },
];

const BASE_SIZE = 56;
const MAX_SCALE = 2.3;
const DISTANCE = 140;

const pickTopmostWindow = <T extends { zIndex: number }>(windows: T[]): T | null =>
  windows.reduce<T | null>(
    (latest, window) => (!latest || window.zIndex > latest.zIndex ? window : latest),
    null
  );

const Dock = () => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);
  const { addWindow } = useWindowNavigation();
  const windows = useWindowStore((state) => state.windows);
  const openWindow = useWindowStore((state) => state.openWindow);
  const minimizeWindow = useWindowStore((state) => state.minimizeWindow);
  const focusWindow = useWindowStore((state) => state.focusWindow);

  const runningDockApps = useMemo(() => {
    const apps = new Set<DockIconType>();
    for (const window of windows) {
      const app = getAppTypeForDock(window);
      if (app && dockIcons.some((icon) => icon.id === app)) {
        apps.add(app as DockIconType);
      }
    }
    return apps;
  }, [windows]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.set(e.pageX);
  };

  const handleMouseLeave = () => {
    mouseX.set(Infinity);
    setHoveredIcon(null);
  };

  const handleTextEditDockClick = () => {
    const textEditWindows = windows.filter((window) => window.type === 'textedit');
    const minimizedWindow = pickTopmostWindow(
      textEditWindows.filter((window) => window.isMinimized)
    );
    if (minimizedWindow) {
      minimizeWindow(minimizedWindow.id);
      focusWindow(minimizedWindow.id);
      return;
    }

    const visibleWindow = pickTopmostWindow(
      textEditWindows.filter((window) => !window.isMinimized)
    );
    if (visibleWindow) {
      focusWindow(visibleWindow.id);
      return;
    }

    const { width, height } = WINDOW_DIMENSIONS.textedit;
    const position = getCenteredWindowPosition(width, height);
    openWindow({
      type: 'textedit',
      title: 'Untitled',
      content: '',
      position,
      size: { width, height },
    });
  };

  const handleIconClick = (iconId: DockIconType) => {
    if (iconId === 'textedit') {
      handleTextEditDockClick();
      return;
    }

    const windowMap: Record<string, string> = {
      finder: 'finder:dock/finder',
      browser: 'browser:https://blog.mikemoschitto.com',
      terminal: 'terminal',
      reading: 'finder:dock/reading',
      writing: 'finder:dock/writing',
      trash: 'finder:dock/trash',
      photos: 'photos',
    };

    const newWindowId = windowMap[iconId];
    if (!newWindowId) return;

    const existingWindows = parseWindowIdentifiersFromUrl();

    addWindow(existingWindows, newWindowId);
  };

  return (
    <div
      className="fixed bottom-4 left-1/2 z-[1000] -translate-x-1/2"
      style={{ overflow: 'visible' }}
    >
      <motion.div
        ref={dockRef}
        className="aqua-pinstripe-dark flex items-end gap-1 border border-white/20 bg-white/10 px-3 py-2 shadow-2xl backdrop-blur-2xl"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          height: BASE_SIZE + 16,
          overflow: 'visible',
        }}
      >
        <LayoutGroup>
          {dockIcons.map((item) => (
            <Fragment key={item.id}>
              <DockIcon
                icon={item}
                mouseX={mouseX}
                isActive={runningDockApps.has(item.id)}
                isHovered={hoveredIcon === item.id}
                onHover={setHoveredIcon}
                onClick={handleIconClick}
              />
              {/* Divider before Trash icon */}
              {item.id === 'finder' && <div className="mx-1 h-12 w-px self-end bg-white/20" />}
            </Fragment>
          ))}
        </LayoutGroup>
      </motion.div>
    </div>
  );
};

interface DockIconProps {
  icon: DockIcon;
  mouseX: MotionValue<number>;
  isActive: boolean;
  isHovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (id: DockIconType) => void;
}

const DockIcon = ({ icon, mouseX, isActive, isHovered, onHover, onClick }: DockIconProps) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const maxButtonSize = Math.round(BASE_SIZE * MAX_SCALE);

  const distanceCalc = useTransform(mouseX, (val) => {
    const bounds = wrapperRef.current?.getBoundingClientRect();
    if (!bounds || !Number.isFinite(val)) return Infinity;
    return val - (bounds.left + bounds.width / 2);
  });

  const sizeTransform = useTransform(
    distanceCalc,
    [-DISTANCE, 0, DISTANCE],
    [BASE_SIZE, maxButtonSize, BASE_SIZE]
  );

  const sizeSpring = useSpring(sizeTransform, {
    mass: 0.22,
    stiffness: 130,
    damping: 16,
  });

  const widthValue = sizeSpring as unknown as number;

  const yOffset = useTransform(sizeSpring, (size) => {
    return -(size - BASE_SIZE) * 0.5;
  });

  const ySpring = useSpring(yOffset, {
    mass: 0.22,
    stiffness: 130,
    damping: 16,
  });

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onClick(icon.id);
  };

  return (
    <motion.div
      ref={wrapperRef}
      layout
      layoutId={`dock-icon-${icon.id}`}
      style={{
        transformOrigin: 'bottom center',
        willChange: 'width, height, transform',
        width: widthValue,
        height: widthValue,
        marginLeft: 4,
        marginRight: 4,
        overflow: 'visible',
        y: ySpring,
      }}
      className="relative flex flex-shrink-0 flex-col items-center"
      transition={{
        layout: {
          type: 'spring',
          stiffness: 300,
          damping: 30,
          mass: 0.8,
        },
      }}
    >
      <button
        type="button"
        aria-label={icon.label}
        title={icon.label}
        className="relative flex h-full w-full cursor-pointer items-end justify-center border-0 bg-transparent p-0"
        onMouseEnter={() => onHover(icon.id)}
        onMouseLeave={() => onHover(null)}
        onClick={handleClick}
        style={{
          willChange: 'transform',
        }}
      >
        <img
          src={icon.icon}
          alt={icon.label}
          className="pointer-events-none h-full w-full object-contain select-none"
          draggable={false}
          style={{
            imageRendering: '-webkit-optimize-contrast',
            filter:
              'drop-shadow(0 8px 16px rgba(0, 0, 0, 0.3)) drop-shadow(0 2px 4px rgba(0, 0, 0, 0.2))',
          }}
        />
      </button>

      {isActive && (
        <motion.div
          className="absolute -bottom-1 h-1 w-1 rounded-full bg-white/90"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {isHovered && (
        <motion.div
          className="font-ui absolute -top-10 rounded bg-black/80 px-2 py-0.5 text-[11px] whitespace-nowrap text-white shadow-lg backdrop-blur-sm"
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
        >
          {icon.label}
        </motion.div>
      )}
    </motion.div>
  );
};

export default Dock;
