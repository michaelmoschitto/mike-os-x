import { motion, useMotionValue } from 'framer-motion';
import { useEffect, useRef } from 'react';

import TrafficLights from '@/components/TrafficLights';
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
  children: React.ReactNode;
}

const Window = ({
  id,
  title,
  isActive,
  position,
  size,
  zIndex,
  onClose,
  onMinimize,
  onFocus,
  onDragEnd,
  children,
}: WindowProps) => {
  const x = useMotionValue(position.x);
  const y = useMotionValue(position.y);
  const isDragging = useRef(false);

  useEffect(() => {
    if (!isDragging.current) {
      x.set(position.x);
      y.set(position.y);
    }
  }, [position.x, position.y, x, y]);

  const handleClick = () => {
    if (!isActive) {
      onFocus?.();
    }
  };

  const handleDragStart = () => {
    isDragging.current = true;
    onFocus?.();
  };

  const handleDragEnd = () => {
    isDragging.current = false;
    onDragEnd?.({ x: x.get(), y: y.get() });
  };

  return (
    <motion.div
      className={cn('aqua-window absolute overflow-hidden')}
      style={{
        x,
        y,
        width: size.width,
        height: size.height,
        zIndex,
      }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      drag
      dragMomentum={false}
      dragElastic={0}
      dragConstraints={{
        left: 0,
        top: 22,
        right: globalThis.window.innerWidth - size.width,
        bottom: globalThis.window.innerHeight - size.height - 60,
      }}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      dragListener={isActive}
    >
      {/* Titlebar */}
      <div
        className={cn(
          'aqua-titlebar flex cursor-move items-center justify-between px-2.5',
          isActive ? 'active' : ''
        )}
      >
        <TrafficLights onClose={onClose} onMinimize={onMinimize} isActive={isActive} />
        <span className="font-ui text-[11px] font-semibold tracking-tight text-black/80 select-none">
          {title}
        </span>
        <div className="w-[42px]" />
      </div>

      {/* Content Area */}
      <div className="flex flex-col overflow-hidden" style={{ height: 'calc(100% - 20px)' }}>
        {children}
      </div>
    </motion.div>
  );
};

export default Window;
