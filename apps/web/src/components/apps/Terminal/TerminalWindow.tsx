import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

import Window from '@/components/window/Window';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';
import 'xterm/css/xterm.css';

interface TerminalWindowProps {
  window: WindowType;
  isActive: boolean;
}

const TerminalWindow = ({ window: windowData, isActive }: TerminalWindowProps) => {
  const { closeWindow, focusWindow, updateWindowPosition, updateWindowSize, minimizeWindow } =
    useWindowStore();

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onDataDisposableRef = useRef<{ dispose: () => void } | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 15,
      fontFamily: '"MesloLGS NF", Monaco, Menlo, monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#e5e5e5',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    terminal.loadAddon(fitAddon);
    terminal.loadAddon(webLinksAddon);
    terminal.open(terminalRef.current);

    fitAddon.fit();

    terminalInstanceRef.current = terminal;
    fitAddonRef.current = fitAddon;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      let apiHost = import.meta.env.VITE_API_URL?.replace(/^https?:\/\//, '');

      if (!apiHost) {
        if (import.meta.env.DEV) {
          apiHost = 'localhost:8000';
        } else {
          apiHost = window.location.host;
        }
      }

      const wsUrl = `${protocol}//${apiHost}/ws/terminal`;

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (onDataDisposableRef.current) {
            onDataDisposableRef.current.dispose();
          }

          const disposable = terminal.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(data);
            }
          });

          onDataDisposableRef.current = disposable;

          setTimeout(() => {
            const dims = { cols: terminal.cols, rows: terminal.rows };
            ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }, 100);

          setTimeout(() => {
            terminal.focus();
          }, 150);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          terminal.write(event.data);
        };

        ws.onerror = () => {
          terminal.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        };

        ws.onclose = () => {
          terminal.write('\r\n\x1b[33mDisconnected. Reconnecting...\x1b[0m\r\n');
          if (onDataDisposableRef.current) {
            onDataDisposableRef.current.dispose();
            onDataDisposableRef.current = null;
          }
          if (!reconnectTimeoutRef.current) {
            reconnectTimeoutRef.current = setTimeout(() => {
              reconnectTimeoutRef.current = null;
              connectWebSocket();
            }, 2000);
          }
        };

        websocketRef.current = ws;
      } catch {
        terminal.write('\r\n\x1b[31mFailed to connect to terminal server\x1b[0m\r\n');
      }
    };

    connectWebSocket();

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const dims = { cols: terminal.cols, rows: terminal.rows };
          websocketRef.current.send(
            JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows })
          );
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (onDataDisposableRef.current) {
        onDataDisposableRef.current.dispose();
      }
      if (websocketRef.current) {
        websocketRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      terminal.dispose();
    };
  }, []);

  useEffect(() => {
    const terminal = terminalInstanceRef.current;
    if (!terminal) return;

    if (isActive) {
      setTimeout(() => {
        terminal.focus();
      }, 200);
    }

    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isActive, windowData.size]);

  const handleClose = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
    }
    closeWindow(windowData.id);
  };

  const handleMinimize = () => {
    minimizeWindow(windowData.id);
  };

  const handleFocus = () => {
    focusWindow(windowData.id);
    setTimeout(() => {
      terminalInstanceRef.current?.focus();
    }, 50);
  };

  const handleDragEnd = (position: { x: number; y: number }) => {
    updateWindowPosition(windowData.id, position);
  };

  const handleResize = (size: { width: number; height: number }) => {
    updateWindowSize(windowData.id, size);
    if (fitAddonRef.current && terminalInstanceRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
        if (websocketRef.current?.readyState === WebSocket.OPEN && terminalInstanceRef.current) {
          const dims = {
            cols: terminalInstanceRef.current.cols,
            rows: terminalInstanceRef.current.rows,
          };
          websocketRef.current.send(
            JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows })
          );
        }
      }, 100);
    }
  };

  const handleTerminalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.focus();
    }
  };

  return (
    <Window
      id={windowData.id}
      title={windowData.title}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onFocus={handleFocus}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
    >
      <div
        className="pinstripe flex h-full flex-col overflow-hidden bg-[#f5f5f5]"
        onClick={handleTerminalClick}
      >
        <div
          ref={terminalRef}
          className="flex-1 cursor-text overflow-hidden"
          style={{ minHeight: 0 }}
        />
      </div>
    </Window>
  );
};

export default TerminalWindow;
