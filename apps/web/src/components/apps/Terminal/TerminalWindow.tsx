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

    console.log('[Terminal] Initializing terminal');

    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 15,
      fontFamily: '"MesloLGS NF", "FiraCode Nerd Font", "MesloLGS Nerd Font", Monaco, Menlo, monospace',
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

    console.log('[Terminal] Terminal opened, textarea:', terminal.textarea);

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
      console.log('[Terminal] Connecting to WebSocket:', wsUrl);

      try {
        const ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          console.log('[Terminal] WebSocket connected');

          if (onDataDisposableRef.current) {
            onDataDisposableRef.current.dispose();
          }

          const disposable = terminal.onData((data: string) => {
            if (ws.readyState === WebSocket.OPEN) {
              console.log('[Terminal] Sending data to server:', {
                length: data.length,
                charCodes: Array.from(data).map((c) => c.charCodeAt(0)),
              });
              ws.send(data);
            } else {
              console.warn('[Terminal] WebSocket not open, cannot send data');
            }
          });

          onDataDisposableRef.current = disposable;
          console.log('[Terminal] onData handler registered');

          setTimeout(() => {
            const dims = { cols: terminal.cols, rows: terminal.rows };
            console.log('[Terminal] Sending terminal dimensions:', dims);
            ws.send(JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows }));
          }, 100);

          setTimeout(() => {
            terminal.focus();
            console.log('[Terminal] Focused after connection');
          }, 150);

          if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
          }
        };

        ws.onmessage = (event) => {
          const preview = event.data.substring(0, 50);
          const charCodes = Array.from(preview, (c) => (c as string).charCodeAt(0));
          console.log('[Terminal] Received data from server:', {
            length: event.data.length,
            preview: event.data.substring(0, 100),
            charCodes,
          });
          terminal.write(event.data);
        };

        ws.onerror = (error) => {
          console.error('[Terminal] WebSocket error:', error);
          terminal.write('\r\n\x1b[31mConnection error\x1b[0m\r\n');
        };

        ws.onclose = () => {
          console.log('[Terminal] WebSocket closed');
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
      } catch (error) {
        console.error('[Terminal] Failed to connect:', error);
        terminal.write('\r\n\x1b[31mFailed to connect to terminal server\x1b[0m\r\n');
      }
    };

    connectWebSocket();

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (websocketRef.current?.readyState === WebSocket.OPEN) {
          const dims = { cols: terminal.cols, rows: terminal.rows };
          console.log('[Terminal] Sending resize:', dims);
          websocketRef.current.send(
            JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows })
          );
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log('[Terminal] Cleaning up');
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
      console.log('[Terminal] Window became active, focusing...');
      setTimeout(() => {
        terminal.focus();
        const activeElement = document.activeElement;
        const textarea = terminal.textarea;
        console.log('[Terminal] Focus attempt complete');
        console.log('[Terminal] Active element:', activeElement?.tagName, activeElement?.className);
        console.log('[Terminal] Terminal textarea:', textarea?.tagName, textarea?.className);
        console.log('[Terminal] Textarea is focused:', textarea === activeElement);
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
    console.log('[Terminal] handleFocus called');
    focusWindow(windowData.id);
    setTimeout(() => {
      terminalInstanceRef.current?.focus();
      console.log('[Terminal] Focused terminal after handleFocus');
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
          console.log('[Terminal] Sending resize after window resize:', dims);
          websocketRef.current.send(
            JSON.stringify({ type: 'resize', cols: dims.cols, rows: dims.rows })
          );
        }
      }, 100);
    }
  };

  const handleTerminalClick = (e: React.MouseEvent) => {
    console.log('[Terminal] Terminal area clicked');
    e.stopPropagation();
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.focus();
      console.log('[Terminal] Terminal focused after click');
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
