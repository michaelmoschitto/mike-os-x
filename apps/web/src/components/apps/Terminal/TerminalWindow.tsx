import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

import Window from '@/components/window/Window';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';
import { useWebSocketManager } from '@/stores/useWebSocketManager';
import LoadingOverlay from './LoadingOverlay';
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
  const sessionIdRef = useRef<string | null>(null);
  const onDataDisposableRef = useRef<{ dispose: () => void } | null>(null);

  const { registerSession, unregisterSession, sendMessage, connectionState } =
    useWebSocketManager();

  useEffect(() => {
    if (!terminalRef.current) return;

    console.log('[Terminal] Initializing terminal');

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

    console.log('[Terminal] Terminal opened');

    const sessionId = `term-${windowData.id}`;
    sessionIdRef.current = sessionId;

    const handler = {
      onOutput: (data: string) => {
        terminal.write(data);
      },
      onError: (error: string) => {
        terminal.write(`\r\n\x1b[31mError: ${error}\x1b[0m\r\n`);
      },
      onSessionCreated: () => {
        console.log(`[Terminal] Session ${sessionId} created`);
        setTimeout(() => {
          const dims = { cols: terminal.cols, rows: terminal.rows };
          console.log('[Terminal] Sending terminal dimensions:', dims);
          sendMessage({
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          });
        }, 100);

        setTimeout(() => {
          terminal.focus();
          console.log('[Terminal] Focused after connection');
        }, 150);
      },
      onSessionClosed: () => {
        console.log(`[Terminal] Session ${sessionId} closed`);
      },
    };

    registerSession(sessionId, handler);

    if (onDataDisposableRef.current) {
      onDataDisposableRef.current.dispose();
    }

    const disposable = terminal.onData((data: string) => {
      sendMessage({
        type: 'input',
        sessionId,
        data,
      });
    });

    onDataDisposableRef.current = disposable;
    console.log('[Terminal] onData handler registered');

    const handleResize = () => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit();
        if (terminalInstanceRef.current && connectionState === 'connected') {
          const dims = { cols: terminal.cols, rows: terminal.rows };
          console.log('[Terminal] Sending resize:', dims);
          sendMessage({
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          });
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
      if (sessionIdRef.current) {
        unregisterSession(sessionIdRef.current);
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
      }, 200);
    }

    if (fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current?.fit();
      }, 100);
    }
  }, [isActive, windowData.size]);

  useEffect(() => {
    const terminal = terminalInstanceRef.current;
    const sessionId = sessionIdRef.current;
    if (!terminal || !sessionId) return;

    if (connectionState === 'connected' && fitAddonRef.current) {
      setTimeout(() => {
        const dims = { cols: terminal.cols, rows: terminal.rows };
        sendMessage({
          type: 'resize',
          sessionId,
          cols: dims.cols,
          rows: dims.rows,
        });
      }, 100);
    }
  }, [connectionState, sendMessage]);

  const handleClose = () => {
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
        const sessionId = sessionIdRef.current;
        if (connectionState === 'connected' && sessionId) {
          const dims = {
            cols: terminalInstanceRef.current.cols,
            rows: terminalInstanceRef.current.rows,
          };
          console.log('[Terminal] Sending resize after window resize:', dims);
          sendMessage({
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          });
        }
      }, 100);
    }
  };

  const handleTerminalClick = (e: React.MouseEvent) => {
    console.log('[Terminal] Terminal area clicked');
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
        className="pinstripe relative flex h-full flex-col overflow-hidden bg-[#f5f5f5]"
        onClick={handleTerminalClick}
      >
        <div
          ref={terminalRef}
          className="flex-1 cursor-text overflow-hidden"
          style={{ minHeight: 0 }}
        />
        <LoadingOverlay />
      </div>
    </Window>
  );
};

export default TerminalWindow;
