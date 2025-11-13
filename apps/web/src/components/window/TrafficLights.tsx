import { cn } from '@/lib/utils';

interface TrafficLightsProps {
  onClose?: () => void;
  onMinimize?: () => void;
  onMaximize?: () => void;
  isActive?: boolean;
  isForeground?: boolean;
  debugMode?: boolean;
}

/**
 * Mac OS X Aqua-style traffic light window controls
 * Recreates the authentic look with CSS gradients, shadows, and shine effects
 */
const TrafficLights = ({
  onClose,
  onMinimize,
  onMaximize,
  isActive = true,
  isForeground,
  debugMode = false,
}: TrafficLightsProps) => {
  // Support both isActive and isForeground for backward compatibility
  const foreground = isForeground !== undefined ? isForeground : isActive;

  return (
    <div
      className="traffic-lights flex items-center gap-2 ml-1.5 relative"
      data-titlebar-controls
    >
      {/* Close Button (Red) */}
      <div
        className="relative"
        style={{ width: '13px', height: '13px' }}
      >
        <div
          aria-hidden="true"
          className="rounded-full relative overflow-hidden cursor-default outline-none box-border"
          style={{
            width: '13px',
            height: '13px',
            background: foreground
              ? 'linear-gradient(rgb(193, 58, 45), rgb(205, 73, 52))'
              : 'linear-gradient(rgba(160, 160, 160, 0.625), rgba(255, 255, 255, 0.625))',
            boxShadow: foreground
              ? 'rgba(0, 0, 0, 0.5) 0px 2px 4px, rgba(0, 0, 0, 0.4) 0px 1px 2px, rgba(225, 70, 64, 0.5) 0px 1px 1px, rgba(0, 0, 0, 0.3) 0px 0px 0px 0.5px inset, rgba(150, 40, 30, 0.8) 0px 1px 3px inset, rgba(225, 70, 64, 0.75) 0px 2px 3px 1px inset'
              : '0 2px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 2px 3px 1px #bbbbbb',
          }}
        >
          {/* Top shine */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '28%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))',
              width: 'calc(100% - 6px)',
              borderRadius: '6px 6px 0 0',
              top: '1px',
              filter: 'blur(0.2px)',
              zIndex: 2,
            }}
          />
          {/* Bottom glow */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '33%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.5))',
              width: 'calc(100% - 3px)',
              borderRadius: '0 0 6px 6px',
              bottom: '1px',
              filter: 'blur(0.3px)',
            }}
          />
        </div>
        <button
          aria-label="Close"
          className={cn(
            'absolute -inset-2 z-10 rounded-none outline-none cursor-default',
            debugMode ? 'bg-red-500/50' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onClose?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          type="button"
        />
      </div>

      {/* Minimize Button (Yellow) */}
      <div
        className="relative"
        style={{ width: '13px', height: '13px' }}
      >
        <div
          aria-hidden="true"
          className="rounded-full relative overflow-hidden cursor-default outline-none box-border"
          style={{
            width: '13px',
            height: '13px',
            background: foreground
              ? 'linear-gradient(rgb(202, 130, 13), rgb(253, 253, 149))'
              : 'linear-gradient(rgba(160, 160, 160, 0.625), rgba(255, 255, 255, 0.625))',
            boxShadow: foreground
              ? 'rgba(0, 0, 0, 0.5) 0px 2px 4px, rgba(0, 0, 0, 0.4) 0px 1px 2px, rgba(223, 161, 35, 0.5) 0px 1px 1px, rgba(0, 0, 0, 0.3) 0px 0px 0px 0.5px inset, rgb(155, 78, 21) 0px 1px 3px inset, rgb(241, 157, 20) 0px 2px 3px 1px inset'
              : '0 2px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 2px 3px 1px #bbbbbb',
          }}
        >
          {/* Top shine */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '28%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))',
              width: 'calc(100% - 6px)',
              borderRadius: '6px 6px 0 0',
              top: '1px',
              filter: 'blur(0.2px)',
              zIndex: 2,
            }}
          />
          {/* Bottom glow */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '33%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.5))',
              width: 'calc(100% - 3px)',
              borderRadius: '0 0 6px 6px',
              bottom: '1px',
              filter: 'blur(0.3px)',
            }}
          />
        </div>
        <button
          aria-label="Minimize"
          className={cn(
            'absolute -inset-2 z-10 rounded-none outline-none cursor-default',
            debugMode ? 'bg-yellow-500/50' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onMinimize?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          type="button"
        />
      </div>

      {/* Maximize Button (Green) */}
      <div
        className="relative"
        style={{ width: '13px', height: '13px' }}
      >
        <div
          aria-hidden="true"
          className="rounded-full relative overflow-hidden cursor-default outline-none box-border"
          style={{
            width: '13px',
            height: '13px',
            background: foreground
              ? 'linear-gradient(rgb(111, 174, 58), rgb(138, 192, 50))'
              : 'linear-gradient(rgba(160, 160, 160, 0.625), rgba(255, 255, 255, 0.625))',
            boxShadow: foreground
              ? 'rgba(0, 0, 0, 0.5) 0px 2px 4px, rgba(0, 0, 0, 0.4) 0px 1px 2px, rgb(59, 173, 29, 0.5) 0px 1px 1px, rgba(0, 0, 0, 0.3) 0px 0px 0px 0.5px inset, rgb(53, 91, 17) 0px 1px 3px inset, rgb(98, 187, 19) 0px 2px 3px 1px inset'
              : '0 2px 3px rgba(0, 0, 0, 0.2), 0 1px 1px rgba(0, 0, 0, 0.3), inset 0 0 0 0.5px rgba(0, 0, 0, 0.3), inset 0 1px 2px rgba(0, 0, 0, 0.4), inset 0 2px 3px 1px #bbbbbb',
          }}
        >
          {/* Top shine */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '28%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.9), rgba(255, 255, 255, 0.3))',
              width: 'calc(100% - 6px)',
              borderRadius: '6px 6px 0 0',
              top: '1px',
              filter: 'blur(0.2px)',
              zIndex: 2,
            }}
          />
          {/* Bottom glow */}
          <div
            className="absolute left-1/2 transform -translate-x-1/2 pointer-events-none"
            style={{
              height: '33%',
              background:
                'linear-gradient(rgba(255, 255, 255, 0.2), rgba(255, 255, 255, 0.5))',
              width: 'calc(100% - 3px)',
              borderRadius: '0 0 6px 6px',
              bottom: '1px',
              filter: 'blur(0.3px)',
            }}
          />
        </div>
        <button
          aria-label="Maximize"
          className={cn(
            'absolute -inset-2 z-10 rounded-none outline-none cursor-default',
            debugMode ? 'bg-green-500/50' : 'opacity-0'
          )}
          onClick={(e) => {
            e.stopPropagation();
            onMaximize?.();
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          type="button"
        />
      </div>
    </div>
  );
};

export default TrafficLights;
