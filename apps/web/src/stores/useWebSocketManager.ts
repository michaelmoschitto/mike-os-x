import { create } from 'zustand';

import type {
  ClientMessage,
  ServerMessage,
  OutputMessage,
  ErrorMessage,
} from '@/lib/terminal/messageProtocol';

type ConnectionState = 'disconnected' | 'connecting' | 'connected';

interface SessionHandler {
  onOutput: (data: string) => void;
  onError: (error: string) => void;
  onSessionCreated: () => void;
  onSessionClosed: () => void;
}

interface WebSocketManagerState {
  connectionState: ConnectionState;
  websocket: WebSocket | null;
  sessions: Map<string, SessionHandler>;
  reconnectAttempts: number;
  reconnectTimeoutId: ReturnType<typeof setTimeout> | null;
  connectionTimeoutId: ReturnType<typeof setTimeout> | null;
  connect: () => void;
  disconnect: () => void;
  registerSession: (sessionId: string, handler: SessionHandler) => void;
  unregisterSession: (sessionId: string) => void;
  sendMessage: (message: ClientMessage) => void;
}

const MAX_RECONNECT_ATTEMPTS = 5;
const INITIAL_RECONNECT_DELAY = 2000;

const getReconnectDelay = (attempt: number): number => {
  return Math.min(INITIAL_RECONNECT_DELAY * Math.pow(2, attempt), 16000);
};

const getWebSocketUrl = (): string => {
  if (typeof window === 'undefined') {
    return 'ws://localhost:8000/ws/terminal';
  }

  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '');

  if (!apiHost) {
    if (import.meta.env.DEV) {
      apiHost = 'localhost:8000';
    } else {
      apiHost = window.location.host;
    }
  }

  return `${protocol}//${apiHost}/ws/terminal`;
};

export const useWebSocketManager = create<WebSocketManagerState>((set, get) => {
  const handleMessage = (event: MessageEvent) => {
    try {
      const message: ServerMessage = JSON.parse(event.data);
      const { sessions } = get();

      if (message.type === 'output') {
        const outputMsg = message as OutputMessage;
        const handler = sessions.get(outputMsg.sessionId);
        if (handler) {
          handler.onOutput(outputMsg.data);
        } else {
          console.warn(`[WebSocketManager] No handler for output session: ${outputMsg.sessionId}`);
        }
      } else if (message.type === 'error') {
        const errorMsg = message as ErrorMessage;
        const handler = sessions.get(errorMsg.sessionId);
        if (handler) {
          handler.onError(errorMsg.error);
        } else {
          console.error(
            `[WebSocketManager] No handler for error session: ${errorMsg.sessionId}`,
            errorMsg.error
          );
        }
      } else if (message.type === 'session_created') {
        console.log(`[WebSocketManager] Session created: ${message.sessionId}`);
        const handler = sessions.get(message.sessionId);
        if (handler) {
          handler.onSessionCreated();
        } else {
          console.warn(`[WebSocketManager] No handler for session_created: ${message.sessionId}`);
        }
      } else if (message.type === 'session_closed') {
        console.log(`[WebSocketManager] Session closed: ${message.sessionId}`);
        const handler = sessions.get(message.sessionId);
        if (handler) {
          handler.onSessionClosed();
        }
      }
    } catch (error) {
      console.error('[WebSocketManager] Error parsing message:', error);
    }
  };

  const handleOpen = () => {
    console.log('[WebSocketManager] WebSocket connected');
    const { reconnectTimeoutId, connectionTimeoutId, sessions, websocket } = get();

    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
      set({ connectionTimeoutId: null });
    }

    set({
      connectionState: 'connected',
      reconnectAttempts: 0,
    });

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
      set({ reconnectTimeoutId: null });
    }

    if (websocket && websocket.readyState === WebSocket.OPEN) {
      console.log(`[WebSocketManager] Sending create_session for ${sessions.size} sessions`);
      for (const [sessionId] of sessions) {
        console.log(`[WebSocketManager] Creating session: ${sessionId}`);
        const message: ClientMessage = {
          type: 'create_session',
          sessionId,
        };
        websocket.send(JSON.stringify(message));
      }
    }
  };

  const handleError = (error: Event) => {
    console.error('[WebSocketManager] WebSocket error:', error);
    const { connectionState } = get();

    if (connectionState === 'connecting') {
      set({ connectionState: 'disconnected' });
    }
  };

  const handleClose = () => {
    console.log('[WebSocketManager] WebSocket closed');
    const { reconnectAttempts, websocket } = get();

    if (websocket) {
      set({ websocket: null });
    }

    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = getReconnectDelay(reconnectAttempts);
      console.log(
        `[WebSocketManager] Reconnecting in ${delay}ms (attempt ${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`
      );

      const timeoutId = setTimeout(() => {
        set({ reconnectTimeoutId: null });
        get().connect();
      }, delay);

      set({
        connectionState: 'disconnected',
        reconnectTimeoutId: timeoutId,
        reconnectAttempts: reconnectAttempts + 1,
      });
    } else {
      console.error('[WebSocketManager] Max reconnection attempts reached');
      set({
        connectionState: 'disconnected',
        reconnectAttempts: 0,
      });
    }
  };

  const connect = () => {
    const { websocket, connectionState, connectionTimeoutId } = get();

    if (websocket?.readyState === WebSocket.OPEN) {
      console.log('[WebSocketManager] Already connected');
      return;
    }

    if (connectionState === 'connecting') {
      console.log('[WebSocketManager] Already connecting');
      return;
    }

    if (websocket?.readyState === WebSocket.CONNECTING) {
      console.log('[WebSocketManager] WebSocket already connecting');
      return;
    }

    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
    }

    console.log('[WebSocketManager] Connecting...');
    set({ connectionState: 'connecting' });

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(wsUrl);

      ws.onopen = handleOpen;
      ws.onmessage = handleMessage;
      ws.onerror = handleError;
      ws.onclose = handleClose;

      set({ websocket: ws });

      const timeoutId = setTimeout(() => {
        const currentState = get();
        if (
          currentState.connectionState === 'connecting' &&
          currentState.websocket?.readyState === WebSocket.CONNECTING
        ) {
          console.warn('[WebSocketManager] Connection timeout, closing and retrying');
          currentState.websocket?.close();
          set({ connectionState: 'disconnected', connectionTimeoutId: null });
          handleClose();
        }
      }, 10000);

      set({ connectionTimeoutId: timeoutId });
    } catch (error) {
      console.error('[WebSocketManager] Failed to create WebSocket:', error);
      set({ connectionState: 'disconnected' });
      handleClose();
    }
  };

  const disconnect = () => {
    const { websocket, reconnectTimeoutId, connectionTimeoutId } = get();

    if (reconnectTimeoutId) {
      clearTimeout(reconnectTimeoutId);
    }

    if (connectionTimeoutId) {
      clearTimeout(connectionTimeoutId);
    }

    if (websocket) {
      websocket.close();
    }

    set({
      websocket: null,
      connectionState: 'disconnected',
      reconnectAttempts: 0,
      reconnectTimeoutId: null,
      connectionTimeoutId: null,
    });
  };

  const registerSession = (sessionId: string, handler: SessionHandler) => {
    const { sessions, websocket, connectionState } = get();

    console.log(
      `[WebSocketManager] Registering session ${sessionId}, state: ${connectionState}, sessions: ${sessions.size}`
    );

    const newSessions = new Map(sessions);
    newSessions.set(sessionId, handler);

    set({ sessions: newSessions });

    if (connectionState === 'connected' && websocket?.readyState === WebSocket.OPEN) {
      console.log(`[WebSocketManager] Sending create_session for ${sessionId}`);
      const message: ClientMessage = {
        type: 'create_session',
        sessionId,
      };
      websocket.send(JSON.stringify(message));
    } else {
      console.log(`[WebSocketManager] Session ${sessionId} will be created when connection opens`);
      if (connectionState === 'disconnected' && !websocket) {
        connect();
      }
    }
  };

  const unregisterSession = (sessionId: string) => {
    const { sessions, websocket, connectionState } = get();
    const newSessions = new Map(sessions);
    const handler = newSessions.get(sessionId);
    newSessions.delete(sessionId);

    set({ sessions: newSessions });

    if (connectionState === 'connected' && websocket && handler) {
      const message: ClientMessage = {
        type: 'close_session',
        sessionId,
      };
      websocket.send(JSON.stringify(message));
    }
  };

  const sendMessage = (message: ClientMessage) => {
    const { websocket, connectionState } = get();

    if (connectionState === 'connected' && websocket?.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocketManager] Cannot send message, not connected');
    }
  };

  return {
    connectionState: 'disconnected',
    websocket: null,
    sessions: new Map(),
    reconnectAttempts: 0,
    reconnectTimeoutId: null,
    connectionTimeoutId: null,
    connect,
    disconnect,
    registerSession,
    unregisterSession,
    sendMessage,
  };
});
