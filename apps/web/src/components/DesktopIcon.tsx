import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

import type { DesktopIcon } from '@/stores/useDesktopStore';
import { useWindowStore } from '@/stores/useWindowStore';

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
  const lastClickTime = useRef(0);
  const openWindow = useWindowStore((state) => state.openWindow);

  // Update motion values when position prop changes (but not during drag)
  useEffect(() => {
    if (!isDragging.current) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, x, y]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;
    
    // Double-click detection (< 300ms)
    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      handleDoubleClick();
    } else {
      onSelect(icon.id);
    }
    
    lastClickTime.current = now;
  };

  const handleDoubleClick = () => {
    // Only open text files (.txt, .md) in TextEdit
    if (icon.type === 'file' && (icon.fileExtension === 'txt' || icon.fileExtension === 'md')) {
      // Calculate centered position for window
      const windowWidth = 600;
      const windowHeight = 500;
      const centerX = (window.innerWidth - windowWidth) / 2;
      const centerY = (window.innerHeight - windowHeight - 22 - 60) / 2; // Account for menubar and dock

      openWindow({
        type: 'textedit',
        title: icon.label,
        content: icon.content || '',
        position: { x: centerX, y: centerY + 22 }, // Add menubar height
        size: { width: windowWidth, height: windowHeight },
      });
    }
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
      <div className="flex flex-col items-center gap-1">
        <img
          src={icon.icon}
          alt={icon.label}
          className={`h-12 w-12 object-contain ${isSelected ? 'brightness-75' : ''}`}
          draggable={false}
        />
        <span
          className={`desktop-icon-label font-ui max-w-full px-1 text-center leading-tight break-words ${
            isSelected ? 'desktop-icon-selected' : ''
          }`}
        >
          {icon.label}
        </span>
      </div>
    </motion.div>
  );
};

export default DesktopIcon;
