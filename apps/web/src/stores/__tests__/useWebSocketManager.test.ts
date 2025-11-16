import { describe, expect, test, beforeEach, vi, afterEach } from 'vitest';
import { useWebSocketManager } from '../useWebSocketManager';

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

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    // Mock implementation
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
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

    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connecting');
    expect(state.websocket).not.toBeNull();
  });

  test('registerSession adds session and sends create_session message when connected', async () => {
    const { connect, registerSession, sendMessage } = useWebSocketManager.getState();
    connect();

    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    const sendSpy = vi.spyOn(useWebSocketManager.getState(), 'sendMessage');

    registerSession('test-session-1', mockHandler);

    await vi.runAllTimersAsync();

    const state = useWebSocketManager.getState();
    expect(state.sessions.has('test-session-1')).toBe(true);
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'create_session',
      sessionId: 'test-session-1',
    });
  });

  test('unregisterSession removes session and sends close_session message', async () => {
    const { connect, registerSession, unregisterSession } = useWebSocketManager.getState();
    connect();

    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const sendSpy = vi.spyOn(useWebSocketManager.getState(), 'sendMessage');
    unregisterSession('test-session-1');

    const state = useWebSocketManager.getState();
    expect(state.sessions.has('test-session-1')).toBe(false);
    expect(sendSpy).toHaveBeenCalledWith({
      type: 'close_session',
      sessionId: 'test-session-1',
    });
  });

  test('sendMessage sends message when connected', async () => {
    const { connect, sendMessage } = useWebSocketManager.getState();
    connect();

    await vi.runAllTimersAsync();

    const ws = useWebSocketManager.getState().websocket;
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

    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const ws = useWebSocketManager.getState().websocket;
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

    await vi.runAllTimersAsync();

    const mockHandler = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onSessionCreated: vi.fn(),
      onSessionClosed: vi.fn(),
    };

    registerSession('test-session-1', mockHandler);
    await vi.runAllTimersAsync();

    const ws = useWebSocketManager.getState().websocket;
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

    await vi.runAllTimersAsync();

    const ws = useWebSocketManager.getState().websocket;
    expect(ws).not.toBeNull();

    if (ws && ws.onclose) {
      ws.onclose(new CloseEvent('close'));
    }

    await vi.runAllTimersAsync();

    let state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('disconnected');
    expect(state.reconnectAttempts).toBe(1);
    expect(state.reconnectTimeoutId).not.toBeNull();

    vi.advanceTimersByTime(2000);
    await vi.runAllTimersAsync();

    state = useWebSocketManager.getState();
    expect(state.connectionState).toBe('connecting');
  });

  test('stops reconnecting after max attempts', async () => {
    const { connect } = useWebSocketManager.getState();

    for (let i = 0; i < 6; i++) {
      connect();
      await vi.runAllTimersAsync();

      const ws = useWebSocketManager.getState().websocket;
      if (ws && ws.onclose) {
        ws.onclose(new CloseEvent('close'));
      }

      await vi.runAllTimersAsync();
      vi.advanceTimersByTime(20000);
      await vi.runAllTimersAsync();
    }

    const state = useWebSocketManager.getState();
    expect(state.reconnectAttempts).toBe(0);
    expect(state.connectionState).toBe('disconnected');
  });

  test('disconnect closes WebSocket and resets state', async () => {
    const { connect, disconnect } = useWebSocketManager.getState();
    connect();

    await vi.runAllTimersAsync();

    const ws = useWebSocketManager.getState().websocket;
    const closeSpy = vi.spyOn(ws!, 'close');

    disconnect();

    expect(closeSpy).toHaveBeenCalled();

    const state = useWebSocketManager.getState();
    expect(state.websocket).toBeNull();
    expect(state.connectionState).toBe('disconnected');
    expect(state.reconnectAttempts).toBe(0);
  });
});

