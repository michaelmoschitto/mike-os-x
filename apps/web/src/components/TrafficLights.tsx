import { useState } from 'react';

interface TrafficLightsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isActive?: boolean;
}

const TrafficLights = ({
  onClose,
  onMinimize,
  onMaximize,
  isActive = true,
}: TrafficLightsProps) => {
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose?.();
  };

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMinimize?.();
  };

  const handleMaximize = (e: React.MouseEvent) => {
    e.stopPropagation();
    onMaximize?.();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        className="group relative h-[10px] w-[10px] rounded-full transition-all"
        style={{
          background: isActive ? 'linear-gradient(135deg, #fc6058 0%, #fc564e 100%)' : '#c9c9c9',
          boxShadow: isActive
            ? '0 0.5px 1.5px rgba(0, 0, 0, 0.4), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)'
            : '0 0.5px 1px rgba(0, 0, 0, 0.2)',
          border: isActive ? '0.5px solid #d8484f' : '0.5px solid #a8a8a8',
        }}
        onClick={handleClose}
        onMouseEnter={() => setHoveredButton('close')}
        onMouseLeave={() => setHoveredButton(null)}
        aria-label="Close"
        type="button"
      >
        {hoveredButton === 'close' && isActive && (
          <span className="absolute inset-0 flex items-center justify-center text-[7px] leading-none font-bold text-[#8b0000]">
            ×
          </span>
        )}
      </button>

      <button
        className="group relative h-[10px] w-[10px] rounded-full transition-all"
        style={{
          background: isActive ? 'linear-gradient(135deg, #fdbc40 0%, #fdb535 100%)' : '#c9c9c9',
          boxShadow: isActive
            ? '0 0.5px 1.5px rgba(0, 0, 0, 0.4), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)'
            : '0 0.5px 1px rgba(0, 0, 0, 0.2)',
          border: isActive ? '0.5px solid #d89e34' : '0.5px solid #a8a8a8',
        }}
        onClick={handleMinimize}
        onMouseEnter={() => setHoveredButton('minimize')}
        onMouseLeave={() => setHoveredButton(null)}
        aria-label="Minimize"
        type="button"
      >
        {hoveredButton === 'minimize' && isActive && (
          <span className="absolute inset-0 flex items-center justify-center text-[7px] leading-none font-bold text-[#7d5a00]">
            −
          </span>
        )}
      </button>

      <button
        className="group relative h-[10px] w-[10px] rounded-full transition-all"
        style={{
          background: isActive ? 'linear-gradient(135deg, #33c948 0%, #2cbd3e 100%)' : '#c9c9c9',
          boxShadow: isActive
            ? '0 0.5px 1.5px rgba(0, 0, 0, 0.4), inset 0 0.5px 0 rgba(255, 255, 255, 0.5)'
            : '0 0.5px 1px rgba(0, 0, 0, 0.2)',
          border: isActive ? '0.5px solid #28a038' : '0.5px solid #a8a8a8',
        }}
        onClick={handleMaximize}
        onMouseEnter={() => setHoveredButton('maximize')}
        onMouseLeave={() => setHoveredButton(null)}
        aria-label="Maximize"
        disabled
        type="button"
      />
    </div>
  );
};

export default TrafficLights;
