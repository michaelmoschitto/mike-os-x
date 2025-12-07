import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  LayoutGroup,
  type MotionValue,
} from 'framer-motion';
import { Fragment, useRef, useState } from 'react';

import { useUI } from '@/lib/store';

type DockIconType =
  | 'browser'
  | 'terminal'
  | 'projects'
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
  { id: 'projects', label: 'Projects', icon: '/icons/projects.png' },
  { id: 'writing', label: 'Writing', icon: '/icons/writing.png' },
  { id: 'photos', label: 'Photos', icon: '/icons/photos.png' },
  { id: 'reading', label: 'Reading', icon: '/icons/reading.png' },
  { id: 'finder', label: 'Finder', icon: '/icons/about.png' },
  { id: 'trash', label: 'Trash', icon: '/icons/trash.png' },
];

const BASE_SIZE = 56;
const MAX_SCALE = 2.3;
const DISTANCE = 140;

const Dock = () => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const { activeApp } = useUI();
  const dockRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    mouseX.set(e.pageX);
  };

  const handleMouseLeave = () => {
    mouseX.set(Infinity);
    setHoveredIcon(null);
  };

  const handleIconClick = (iconId: DockIconType) => {
    const windowMap: Record<string, string> = {
      finder: 'finder:dock/finder',
      browser: 'browser:about:blank',
      terminal: 'terminal',
      reading: 'finder:dock/reading',
      projects: 'finder:dock/projects',
      writing: 'finder:dock/writing',
      trash: 'finder:dock/trash',
      photos: 'photos',
    };

    const newWindowId = windowMap[iconId];
    if (!newWindowId) return;

    // Get existing windows from URL, handling TanStack Router's JSON serialization
    const currentParams = new URLSearchParams(window.location.search);
    const rawWindows = currentParams.getAll('w');

    // TanStack Router may serialize arrays as JSON strings like '["terminal"]'
    // We need to flatten these back to individual window IDs
    const existingWindows: string[] = [];
    for (const w of rawWindows) {
      if (w.startsWith('[') && w.endsWith(']')) {
        try {
          const parsed = JSON.parse(w);
          if (Array.isArray(parsed)) {
            existingWindows.push(...parsed);
          } else {
            existingWindows.push(w);
          }
        } catch {
          existingWindows.push(w);
        }
      } else {
        existingWindows.push(w);
      }
    }

    // Check if this exact window is already open
    const alreadyOpen = existingWindows.includes(newWindowId);

    if (alreadyOpen) {
      return;
    }

    // Add new window to existing windows
    const allWindows = [...existingWindows, newWindowId];
    const newUrl = '/?w=' + allWindows.join('&w=');
    window.location.href = newUrl;
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
                isActive={activeApp === item.id}
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
