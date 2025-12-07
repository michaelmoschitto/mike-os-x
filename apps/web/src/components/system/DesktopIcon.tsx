import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { parseWindowIdentifiersFromUrl } from '@/lib/routing/windowSerialization';
import { normalizePathForRouting } from '@/lib/utils';
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
  const { addWindow } = useWindowNavigation();

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
    const existingWindows = parseWindowIdentifiersFromUrl();

    if (icon.type === 'folder' && icon.urlPath) {
      // Open folder in finder with path
      const normalizedPath = normalizePathForRouting(icon.urlPath);
      const newWindowId = `finder:${normalizedPath}`;
      addWindow(existingWindows, newWindowId);
      return;
    }

    if (icon.type === 'file') {
      const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];
      const isImage = imageExtensions.includes(icon.fileExtension?.toLowerCase() || '');

      if (isImage && icon.urlPath) {
        // Open image in photos app
        const normalizedPath = normalizePathForRouting(icon.urlPath);
        const newWindowId = `photos:${normalizedPath}`;
        addWindow(existingWindows, newWindowId);
        return;
      }

      if (icon.fileExtension === 'pdf' && icon.urlPath) {
        // Open PDF in PDF viewer
        const normalizedPath = normalizePathForRouting(icon.urlPath);
        const newWindowId = `pdfviewer:${normalizedPath}`;
        addWindow(existingWindows, newWindowId);
        return;
      }

      if (icon.fileExtension === 'txt' || icon.fileExtension === 'md') {
        // Open text file in textedit
        const normalizedPath = icon.urlPath ? normalizePathForRouting(icon.urlPath) : '';
        const newWindowId = normalizedPath ? `textedit:${normalizedPath}` : 'textedit';
        addWindow(existingWindows, newWindowId);
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
          className={`desktop-icon-label font-ui max-w-full break-words px-1 text-center leading-tight ${
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
