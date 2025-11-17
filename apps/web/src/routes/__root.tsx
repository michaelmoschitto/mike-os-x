import { createRootRoute, Outlet } from '@tanstack/react-router';
import { useEffect } from 'react';

import { useWebSocketManager } from '@/stores/useWebSocketManager';

const RootComponent = () => {
  const connect = useWebSocketManager((state) => state.connect);
  const connectionState = useWebSocketManager((state) => state.connectionState);

  useEffect(() => {
    if (connectionState === 'disconnected') {
      console.log('[Root] Initializing WebSocket connection');
      connect();
    }
  }, [connect, connectionState]);

  return <Outlet />;
};

export const Route = createRootRoute({
  component: RootComponent,
});
