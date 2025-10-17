import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { Fragment, useRef, useState } from 'react';

import { useUI } from '@/lib/store';

type DockIconType =
  | 'finder'
  | 'browser'
  | 'projects'
  | 'writing'
  | 'photos'
  | 'reading'
  | 'about'
  | 'ai'
  | 'trash';

interface DockIcon {
  id: DockIconType;
  label: string;
  icon: string;
}

const dockIcons: DockIcon[] = [
  { id: 'finder', label: 'Finder', icon: '/icons/finder.png' },
  { id: 'browser', label: 'Internet Explorer', icon: '/icons/browser.png' },
  { id: 'projects', label: 'Projects', icon: '/icons/projects.png' },
  { id: 'writing', label: 'Writing', icon: '/icons/writing.png' },
  { id: 'photos', label: 'Photos', icon: '/icons/photos.png' },
  { id: 'reading', label: 'Reading', icon: '/icons/reading.png' },
  { id: 'about', label: 'About', icon: '/icons/about.png' },
  { id: 'ai', label: 'AI', icon: '/icons/ai.png' },
  { id: 'trash', label: 'Trash', icon: '/icons/trash.png' },
];

const BASE_SIZE = 56; // 56px = 14 in Tailwind (h-14)
const MAX_SCALE = 2.0;
const INFLUENCE_DISTANCE = 120; // Distance in pixels where magnification effect applies

const Dock = () => {
  const [hoveredIcon, setHoveredIcon] = useState<string | null>(null);
  const { activeApp } = useUI();
  const dockRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(Infinity);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!dockRef.current) return;
    const rect = dockRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
  };

  const handleMouseLeave = () => {
    mouseX.set(Infinity);
    setHoveredIcon(null);
  };

  return (
    <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
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
        }}
      >
        {dockIcons.map((item) => (
          <Fragment key={item.id}>
            <DockIcon
              icon={item}
              mouseX={mouseX}
              isActive={activeApp === item.id}
              isHovered={hoveredIcon === item.id}
              onHover={setHoveredIcon}
            />
            {/* Divider before Trash icon */}
            {item.id === 'ai' && <div className="mx-1 h-12 w-px self-end bg-white/20" />}
          </Fragment>
        ))}
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
}

const DockIcon = ({ icon, mouseX, isActive, isHovered, onHover }: DockIconProps) => {
  const iconRef = useRef<HTMLDivElement>(null);

  // Calculate distance from mouse to this icon's center
  const distance = useTransform(mouseX, (val) => {
    if (!iconRef.current) return Infinity;

    const rect = iconRef.current.getBoundingClientRect();
    const iconCenterX =
      rect.left + rect.width / 2 - iconRef.current.offsetParent!.getBoundingClientRect().left;

    return Math.abs(val - iconCenterX);
  });

  // Convert distance to scale using a smooth curve
  // Uses an exponential falloff for smooth macOS-like magnification
  const scale = useTransform(distance, (dist) => {
    if (dist === Infinity) return 1;

    // Exponential decay function for smooth magnification
    const influence = Math.max(0, 1 - dist / INFLUENCE_DISTANCE);
    const magnification = 1 + (MAX_SCALE - 1) * Math.pow(influence, 1.5);

    return Math.max(1, Math.min(MAX_SCALE, magnification));
  });

  // Apply smooth spring physics to scale changes
  const smoothScale = useSpring(scale, {
    stiffness: 400,
    damping: 28,
    mass: 0.5,
  });

  // Y offset to lift icons when magnified (keeps bottoms aligned)
  const y = useTransform(smoothScale, (s) => -(s - 1) * (BASE_SIZE / 2));

  return (
    <div ref={iconRef} className="relative flex flex-col items-center">
      <motion.div
        className="relative flex cursor-pointer items-center justify-center"
        onMouseEnter={() => onHover(icon.id)}
        onMouseLeave={() => onHover(null)}
        style={{
          width: BASE_SIZE,
          height: BASE_SIZE,
          scale: smoothScale,
          y,
          filter: 'drop-shadow(0 4px 8px rgba(0, 0, 0, 0.4))',
        }}
      >
        <img
          src={icon.icon}
          alt={icon.label}
          className="h-full w-full object-contain"
          draggable={false}
        />
      </motion.div>

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
    </div>
  );
};

export default Dock;
