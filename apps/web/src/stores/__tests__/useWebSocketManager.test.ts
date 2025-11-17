import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';

import { useWebSocketManager } from '@/stores/useWebSocketManager';

class MockCloseEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
}

class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  private timeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(public url: string) {
    this.timeoutId = setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 1);
  }

  send(_data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.onclose) {
      this.onclose(new MockCloseEvent('close') as unknown as CloseEvent);
    }
  }
}

describe('useWebSocketManager', () => {
  let originalWebSocket: typeof WebSocket;

  beforeEach(() => {
    originalWebSocket = global.WebSocket;
    global.WebSocket = MockWebSocket as unknown as typeof WebSocket;

    useWebSocketManager.setState({
      connectionState: 'disconnected',
      websocket: null,
      sessions: new Map(),
      reconnectAttempts: 0,
      reconnectTimeoutId: null,
    });
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    global.WebSocket = originalWebSocket;
    vi.useRealTimers();
    const { disconnect } = useWebSocketManager.getState();
    disconnect();
  });

  test('initializes with disconnected state', () => {
    const state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.websocket).toBeNull();
    expect(state.sessions.size).toBe(0);
    expect(state.reconnectAttempts).toBe(0);
  });

  test('connect creates WebSocket and updates state', async () => {
    const { connect } = useWebSocketManager.getState();
    connect();

    let state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connecting');
    expect(state.websocket).not.toBeNull();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connected');
  });

  test('registerSession adds session and sends create_session message when connected', async () => {
    const { connect, registerSession } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const state1 = useWebSocketManager.getState();
    expect(state1.connectionState).toBe('connected');
    expect(state1.websocket).not.toBeNull();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    const ws = state1.websocket;
    const sendSpy = vi.spyOn(ws!, 'send');

    registerSession('test-session-1', mockHandler);

    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.sessions.has('test-session-1')).toBe(true);
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'create_session',
        sessionId: 'test-session-1',
      })
    );
  });

  test('unregisterSession removes session and sends close_session message', async () => {
    const { connect, registerSession, unregisterSession } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const state1 = useWebSocketManager.getState();
    expect(state1.connectionState).toBe('connected');

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const state2 = useWebSocketManager.getState();
    const ws = state2.websocket;
    expect(ws).not.toBeNull();
    const sendSpy = vi.spyOn(ws!, 'send');
    unregisterSession('test-session-1');

    const state = useWebSocketManager.getState();
    expect(state.sessions.has('test-session-1')).toBe(false);
    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'close_session',
        sessionId: 'test-session-1',
      })
    );
  });

  test('sendMessage sends message when connected', async () => {
    const { connect, sendMessage } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connected');

    const ws = state.websocket;
    expect(ws).not.toBeNull();

    const sendSpy = vi.spyOn(ws!, 'send');

    sendMessage({
      type: 'input',
      sessionId: 'test-session',
      data: 'ls\n',
    });

    expect(sendSpy).toHaveBeenCalledWith(
      JSON.stringify({
        type: 'input',
        sessionId: 'test-session',
        data: 'ls\n',
      })
    );
  });

  test('sendMessage does not send when disconnected', () => {
    const { sendMessage } = useWebSocketManager.getState();
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    sendMessage({
      type: 'input',
      sessionId: 'test-session',
      data: 'ls\n',
    });

    expect(consoleSpy).toHaveBeenCalledWith(
      '[WebSocketManager] Cannot send message, not connected'
    );

    consoleSpy.mockRestore();
  });

  test('handles output messages and routes to correct session', async () => {
    const { connect, registerSession } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connected');

    const ws = state.websocket;
    expect(ws).not.toBeNull();

    const outputMessage = {
      type: 'output',
      sessionId: 'test-session-1',
      data: 'file.txt\n',
    };

    if (ws && ws.onmessage) {
      ws.onmessage({
        data: JSON.stringify(outputMessage),
      } as MessageEvent);
    }

    expect(mockHandler.onOutput).toHaveBeenCalledWith('file.txt\n');
  });

  test('handles error messages and routes to correct session', async () => {
    const { connect, registerSession } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connected');

    const ws = state.websocket;
    expect(ws).not.toBeNull();

    const errorMessage = {
      type: 'error',
      sessionId: 'test-session-1',
      error: 'Rate limit exceeded',
    };

    if (ws && ws.onmessage) {
      ws.onmessage({
        data: JSON.stringify(errorMessage),
      } as MessageEvent);
    }

    expect(mockHandler.onError).toHaveBeenCalledWith('Rate limit exceeded');
  });

  test('reconnects with exponential backoff on disconnect', async () => {
    const { connect } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const state1 = useWebSocketManager.getState();
    expect(state1.connectionState).toBe('connected');
    const ws = state1.websocket;
    expect(ws).not.toBeNull();

    if (ws && ws.onclose) {
      ws.onclose(new MockCloseEvent('close') as unknown as CloseEvent);
    }

    let state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.reconnectAttempts).toBe(1);
    expect(state.reconnectTimeoutId).not.toBeNull();

    vi.advanceTimersByTime(1999);
    state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('disconnected');

    vi.advanceTimersByTime(1);
    state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connecting');
    expect(state.websocket).not.toBeNull();
  });

  test('stops reconnecting after max attempts', async () => {
    const { connect } = useWebSocketManager.getState();

    connect();
    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    useWebSocketManager.setState({ reconnectAttempts: 5 });

    const stateBeforeClose = useWebSocketManager.getState();
    expect(stateBeforeClose.connectionState).toBe('connected');
    expect(stateBeforeClose.reconnectAttempts).toBe(5);

    const ws = stateBeforeClose.websocket;
    if (ws && ws.onclose) {
      ws.onclose(new MockCloseEvent('close') as unknown as CloseEvent);
    }

    const finalState = useWebSocketManager.getState();
    expect(finalState.reconnectAttempts).toBe(0);
    expect(finalState.connectionState).toBe('disconnected');
    expect(finalState.reconnectTimeoutId).toBeNull();
  });

  test('disconnect closes WebSocket and resets state', async () => {
    const { connect, disconnect } = useWebSocketManager.getState();
    connect();

    vi.advanceTimersByTime(1);
    await vi.runAllTimersAsync();

    const state1 = useWebSocketManager.getState();
    expect(state1.connectionState).toBe('connected');
    const ws = state1.websocket;
    expect(ws).not.toBeNull();

    const closeSpy = vi.spyOn(ws!, 'close');

    disconnect();

    expect(closeSpy).toHaveBeenCalled();

    const state = useWebSocketManager.getState();
    expect(state.websocket).toBeNull();
    expect(state.connectionState).toBe('disconnected');
    expect(state.reconnectAttempts).toBe(0);
  });
});
