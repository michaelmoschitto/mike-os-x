import { motion, useMotionValue } from 'framer-motion';
import type { DesktopIcon } from '@/stores/useDesktopStore';
import { useEffect, useRef } from 'react';

interface DesktopIconProps {
  icon: DesktopIcon;
  position: { x: number; y: number };
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDragEnd: (id: string, position: { x: number; y: number }) => void;
  containerRef: React.RefObject<HTMLDivElement>;
}

const DesktopIcon = ({
  icon,
  position,
  isSelected,
  onSelect,
  onDragEnd,
  containerRef,
}: DesktopIconProps) => {
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const isDragging = useRef(false);

  // Update motion values when position prop changes (but not during drag)
  useEffect(() => {
    if (!isDragging.current) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, x, y]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(icon.id);
  };

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    // Get final position from motion values
    onDragEnd(icon.id, { x: x.get(), y: y.get() });
  };

  return (
    <motion.div
      className="absolute flex cursor-pointer flex-col items-center"
      style={{
        x,
        y,
        width: 80,
      }}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={containerRef}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      whileDrag={{ scale: 1.05, zIndex: 50 }}
    >
      <div
        className={`flex flex-col items-center gap-1 rounded-md px-1 py-1 ${
          isSelected ? 'desktop-icon-selected' : ''
        }`}
      >
        <img
          src={icon.icon}
          alt={icon.label}
          className="h-12 w-12 object-contain"
          draggable={false}
        />
        <span className="desktop-icon-label max-w-full text-center leading-tight break-words">
          {icon.label}
        </span>
      </div>
    </motion.div>
  );
};

export default DesktopIcon;
