import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

import type { DesktopIconData } from '@/stores/useDesktopStore';

interface DesktopIconProps {
  icon: DesktopIconData;
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

    if (timeSinceLastClick < 300 && timeSinceLastClick > 0) {
      handleDoubleClick();
    } else {
      onSelect(icon.id);
    }

    lastClickTime.current = now;
  };

  const handleDoubleClick = () => {
    // Get existing windows from URL, handling TanStack Router's JSON serialization
    const currentParams = new URLSearchParams(window.location.search);
    const rawWindows = currentParams.getAll('w');
    
    // TanStack Router may serialize arrays as JSON strings like '["terminal"]'
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

    if (icon.type === 'folder' && icon.urlPath) {
      // Open folder in finder with path
      const newWindowId = `finder:${icon.urlPath}`;
      const allWindows = [...existingWindows, newWindowId];
      window.location.href = '/?w=' + allWindows.join('&w=');
      return;
    }

    if (icon.type === 'file') {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const isImage = imageExtensions.includes(icon.fileExtension?.toLowerCase() || '');
      
      if (isImage && icon.urlPath) {
        // Open image in photos app
        const newWindowId = `photos:${icon.urlPath}`;
        const allWindows = [...existingWindows, newWindowId];
        window.location.href = '/?w=' + allWindows.join('&w=');
        return;
      }
      
      if (icon.fileExtension === 'txt' || icon.fileExtension === 'md') {
        // Open text file in textedit
        const newWindowId = icon.urlPath ? `textedit:${icon.urlPath}` : 'textedit';
        const allWindows = [...existingWindows, newWindowId];
        window.location.href = '/?w=' + allWindows.join('&w=');
        return;
      }
    }

    // Fallback: navigate to the content URL path directly
    if (icon.urlPath) {
      window.location.href = icon.urlPath;
    }
  };

  const handleDragStart = () => {
    isDragging.current = true;
  };

  const handleDragEnd = () => {
    isDragging.current = false;
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
