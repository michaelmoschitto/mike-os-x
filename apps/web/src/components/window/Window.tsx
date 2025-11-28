import { motion, useDragControls, useMotionValue } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import TrafficLights from '@/components/window/TrafficLights';
import { cn } from '@/lib/utils';

interface WindowProps {
  id: string;
  title: string;
  isActive: boolean;
  position: { x: number; y: number };
  size: { width: number; height: number };
  zIndex: number;
  onClose?: () => void;
  onMinimize?: () => void;
  onFocus?: () => void;
  onDragEnd?: (position: { x: number; y: number }) => void;
  onResize?: (size: { width: number; height: number }) => void;
  children: React.ReactNode;
}

const Window = ({
  id: _id,
  title,
  isActive,
  position,
  size,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onDragEnd,
  onResize,
  children,
}: WindowProps) => {
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const isDragging = useRef(false);
  const dragControls = useDragControls();
  const isResizing = useRef(false);

  const [currentSize, setCurrentSize] = useState(size);
  const initialSizeRef = useRef(size);
  const resizeStartPos = useRef({ x: 0, y: 0 });
  const [snapPreview, setSnapPreview] = useState<{
    position: { x: number; y: number };
    size: { width: number; height: number };
  } | null>(null);

  useEffect(() => {
    if (!isDragging.current) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, x, y]);

  useEffect(() => {
    if (!isResizing.current) {
      setCurrentSize(size);
      initialSizeRef.current = size;
    }
  }, [size]);

  const handleClick = () => {
    if (!isActive) {
      onFocus?.();
    }
  };

  const handleDragStart = () => {
    isDragging.current = true;
    onFocus?.();
    setSnapPreview(null);
  };

  const calculateSnapPreview = (currentX: number, _currentY: number) => {
    const screenWidth = globalThis.window.innerWidth;
    const screenHeight = globalThis.window.innerHeight;
    const menuBarHeight = 22;
    const halfWidth = screenWidth / 2;
    const snapThreshold = 50;
    const availableHeight = screenHeight - menuBarHeight;

    // Snap to left half
    if (currentX < snapThreshold) {
      return {
        position: { x: 0, y: 0 },
        size: { width: halfWidth, height: availableHeight },
      };
    }

    // Snap to right half
    if (currentX + currentSize.width > screenWidth - snapThreshold) {
      return {
        position: { x: halfWidth, y: 0 },
        size: { width: halfWidth, height: availableHeight },
      };
    }

    return null;
  };

  const handleDrag = () => {
    if (!isDragging.current) return;

    const currentX = x.get();
    const currentY = y.get();
    const preview = calculateSnapPreview(currentX, currentY);
    setSnapPreview(preview);
  };

  const handleDragEnd = () => {
    const finalX = x.get();
    const finalY = y.get();
    const preview = calculateSnapPreview(finalX, finalY);

    setSnapPreview(null);

    if (preview) {
      // Apply snap position and size after framer-motion finishes processing
      requestAnimationFrame(() => {
        x.set(preview.position.x);
        y.set(preview.position.y);
        setCurrentSize(preview.size);
        onResize?.(preview.size);
        onDragEnd?.(preview.position);
        isDragging.current = false;
      });
    } else {
      onDragEnd?.({ x: finalX, y: finalY });
      isDragging.current = false;
    }
  };

  const handleTitlebarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Don't start drag if clicking on traffic lights buttons
    const target = e.target as HTMLElement;
    if (target.closest('.traffic-lights')) {
      return;
    }
    dragControls.start(e);
  };

  const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();

    isResizing.current = true;
    initialSizeRef.current = currentSize;
    resizeStartPos.current = { x: e.clientX, y: e.clientY };
    onFocus?.();

    const handleMove = (moveEvent: PointerEvent) => {
      if (!isResizing.current) return;

      const deltaX = moveEvent.clientX - resizeStartPos.current.x;
      const deltaY = moveEvent.clientY - resizeStartPos.current.y;

      const newWidth = Math.max(
        400,
        Math.min(globalThis.window.innerWidth - position.x, initialSizeRef.current.width + deltaX)
      );
      const newHeight = Math.max(
        300,
        Math.min(
          globalThis.window.innerHeight - position.y - 60,
          initialSizeRef.current.height + deltaY
        )
      );

      setCurrentSize({ width: newWidth, height: newHeight });
    };

    const handleEnd = () => {
      if (!isResizing.current) return;

      isResizing.current = false;

      // Get the actual current size from state and notify parent
      setCurrentSize((current) => {
        onResize?.(current);
        return current;
      });

      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleEnd);
    };

    document.addEventListener('pointermove', handleMove);
    document.addEventListener('pointerup', handleEnd);
  };

  const snapPreviewElement = snapPreview
    ? createPortal(
        <motion.div
          className="pointer-events-none fixed rounded-lg"
          style={{
            left: snapPreview.position.x,
            top: snapPreview.position.y + 22,
            width: snapPreview.size.width,
            height: snapPreview.size.height,
            zIndex: 9999,
            border: '1px solid rgba(59, 156, 255, 0.5)',
            backgroundColor: 'rgba(59, 156, 255, 0.08)',
            boxShadow: 'inset 0 0 0 1px rgba(59, 156, 255, 0.2)',
          }}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.15 }}
        />,
        document.body
      )
    : null;

  return (
    <>
      {snapPreviewElement}
      <motion.div
        className={cn('aqua-window absolute')}
        style={{
          x,
          y,
          width: currentSize.width,
          height: currentSize.height,
          zIndex,
        }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.2 }}
        onClick={handleClick}
        drag
        dragControls={dragControls}
        dragMomentum={false}
        dragElastic={0}
        dragListener={false}
        dragConstraints={{
          left: 0,
          top: 0,
          right: globalThis.window.innerWidth - currentSize.width,
          bottom: globalThis.window.innerHeight - currentSize.height,
        }}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {/* Titlebar */}
        <div
          className={cn(
            'aqua-titlebar flex cursor-move items-center justify-between px-2.5',
            isActive ? 'active' : ''
          )}
          onPointerDown={handleTitlebarPointerDown}
        >
          <TrafficLights onClose={onClose} onMinimize={onMinimize} isActive={isActive} />
          <span className="font-ui text-[11px] font-semibold tracking-tight text-black/80 select-none">
            {title}
          </span>
          <div className="w-[42px]" />
        </div>

        {/* Content Area */}
        <div className="flex flex-col" style={{ height: 'calc(100% - 20px)' }}>
          {children}
        </div>

        {/* Resize Handle - larger hit area to work with scrollbars */}
        <div
          className="absolute right-0 bottom-0 z-50 cursor-nwse-resize"
          style={{
            width: 24,
            height: 24,
          }}
          onPointerDown={handleResizePointerDown}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className="pointer-events-none absolute right-0 bottom-0"
          >
            {/* Diagonal grip lines */}
            <line x1="14" y1="9" x2="9" y2="14" stroke="#999" strokeWidth="1" />
            <line x1="14" y1="12" x2="12" y2="14" stroke="#999" strokeWidth="1" />
            <line x1="14" y1="15" x2="15" y2="14" stroke="#999" strokeWidth="1" />
          </svg>
        </div>
      </motion.div>
    </>
  );
};

export default Window;
