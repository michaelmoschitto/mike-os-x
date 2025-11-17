import { useWebSocketManager } from '@/stores/useWebSocketManager';

const LoadingOverlay = () => {
  const connectionState = useWebSocketManager((state) => state.connectionState);

  if (connectionState === 'connected') {
    return null;
  }

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1e1e1e]/80">
      <div className="font-ui flex items-center gap-1 text-sm text-yellow-400">
        <span>Connecting</span>
        <span className="flex gap-0.5">
          <span
            className="animate-pulse"
            style={{ animationDelay: '0ms', animationDuration: '1.4s' }}
          >
            .
          </span>
          <span
            className="animate-pulse"
            style={{ animationDelay: '200ms', animationDuration: '1.4s' }}
          >
            .
          </span>
          <span
            className="animate-pulse"
            style={{ animationDelay: '400ms', animationDuration: '1.4s' }}
          >
            .
          </span>
        </span>
      </div>
    </div>
  );
};

export default LoadingOverlay;
