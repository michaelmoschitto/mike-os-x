import { useDesktopStore } from '@/stores/useDesktopStore';
import DesktopIcon from '@/components/DesktopIcon';
import { useEffect, useState, useRef } from 'react';

const GRID_PADDING_RIGHT = 20;
const GRID_START_Y = 40;
const GRID_SPACING_X = 80;
const GRID_SPACING_Y = 100;
const ICONS_PER_COLUMN = 8;

const DesktopIcons = () => {
  const { icons, selectedIcon, setSelectedIcon, updateIconPosition } = useDesktopStore();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleBackgroundClick = () => {
    setSelectedIcon(null);
  };

  const handleIconSelect = (id: string) => {
    setSelectedIcon(id);
  };

  const handleIconDragEnd = (id: string, position: { x: number; y: number }) => {
    updateIconPosition(id, position);
  };

  const getIconPosition = (icon: (typeof icons)[0]) => {
    // If icon has custom position, use it
    if (icon.position) {
      return icon.position;
    }

    // Otherwise, calculate grid position from the right side
    const index = icon.gridIndex ?? 0;
    const col = Math.floor(index / ICONS_PER_COLUMN);
    const row = index % ICONS_PER_COLUMN;

    return {
      x: windowWidth - GRID_PADDING_RIGHT - (col + 1) * GRID_SPACING_X,
      y: GRID_START_Y + row * GRID_SPACING_Y,
    };
  };

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 top-[22px]"
      onClick={handleBackgroundClick}
      onMouseDown={(e) => {
        // Only deselect if clicking directly on background, not on icons
        if (e.target === e.currentTarget) {
          handleBackgroundClick();
        }
      }}
    >
      {icons.map((icon) => (
        <DesktopIcon
          key={icon.id}
          icon={icon}
          position={getIconPosition(icon)}
          isSelected={selectedIcon === icon.id}
          onSelect={handleIconSelect}
          onDragEnd={handleIconDragEnd}
          containerRef={containerRef}
        />
      ))}
    </div>
  );
};

export default DesktopIcons;
