import { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

import Window from '@/components/window/Window';
import type { InputMessage, ResizeMessage } from '@/lib/terminal/messageProtocol';
import { useWebSocketManager } from '@/stores/useWebSocketManager';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';
import 'xterm/css/xterm.css';

interface TerminalWindowProps {
  window: WindowType;
  isActive: boolean;
}

const TerminalWindow = ({ window: windowData, isActive }: TerminalWindowProps) => {
  const { closeWindow, focusWindow, updateWindowPosition, updateWindowSize, minimizeWindow } =
    useWindowStore();

  const { registerSession, unregisterSession, sendMessage, connectionState } =
    useWebSocketManager();

  const terminalRef = useRef<HTMLDivElement>(null);
  const terminalInstanceRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionCreatedRef = useRef<boolean>(false);
  const sessionRegisteredTimeRef = useRef<number>(0);
  const sessionId = windowData.id;

  useEffect(() => {
    if (!terminalRef.current) return;

    sessionCreatedRef.current = false;
    sessionRegisteredTimeRef.current = Date.now();

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

    const onDataDisposable = terminal.onData((data: string) => {
      const message: InputMessage = {
        type: 'input',
        sessionId,
        data,
      };
      sendMessage(message);
    });

    registerSession(sessionId, {
      onOutput: (data: string) => {
        terminal.write(data);
      },
      onError: (error: string) => {
        terminal.write(`\r\n\x1b[31m${error}\x1b[0m\r\n`);
      },
      onSessionCreated: () => {
        sessionCreatedRef.current = true;
        setTimeout(() => {
          if (terminalInstanceRef.current && fitAddonRef.current) {
            fitAddonRef.current.fit();
            const dims = {
              cols: terminalInstanceRef.current.cols,
              rows: terminalInstanceRef.current.rows,
            };
            const resizeMessage: ResizeMessage = {
              type: 'resize',
              sessionId,
              cols: dims.cols,
              rows: dims.rows,
            };
            sendMessage(resizeMessage);
          }
        }, 100);

        setTimeout(() => {
          terminal.focus();
        }, 150);
      },
      onSessionClosed: () => {
        const timeSinceRegistration = Date.now() - sessionRegisteredTimeRef.current;
        if (sessionCreatedRef.current && timeSinceRegistration > 500) {
          terminal.write('\r\n\x1b[33mSession closed\x1b[0m\r\n');
        }
      },
    });

    const handleResize = () => {
      if (fitAddonRef.current && terminalInstanceRef.current) {
        fitAddonRef.current.fit();
        if (connectionState === 'connected') {
          const dims = {
            cols: terminalInstanceRef.current.cols,
            rows: terminalInstanceRef.current.rows,
          };
          const resizeMessage: ResizeMessage = {
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          };
          sendMessage(resizeMessage);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    if (connectionState === 'disconnected') {
      terminal.write('\r\n\x1b[33mConnecting...\x1b[0m\r\n');
    } else if (connectionState === 'connecting') {
      terminal.write('\r\n\x1b[33mConnecting...\x1b[0m\r\n');
    }

    return () => {
      window.removeEventListener('resize', handleResize);
      onDataDisposable.dispose();
      unregisterSession(sessionId);
      terminal.dispose();
      sessionCreatedRef.current = false;
    };
  }, [sessionId, registerSession, unregisterSession, sendMessage, connectionState]);

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
        if (connectionState === 'connected' && terminalInstanceRef.current) {
          const dims = {
            cols: terminalInstanceRef.current.cols,
            rows: terminalInstanceRef.current.rows,
          };
          const resizeMessage: ResizeMessage = {
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          };
          sendMessage(resizeMessage);
        }
      }, 100);
    }
  }, [isActive, windowData.size, sessionId, sendMessage, connectionState]);

  const handleClose = () => {
    unregisterSession(sessionId);
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
        if (connectionState === 'connected' && terminalInstanceRef.current) {
          const dims = {
            cols: terminalInstanceRef.current.cols,
            rows: terminalInstanceRef.current.rows,
          };
          const resizeMessage: ResizeMessage = {
            type: 'resize',
            sessionId,
            cols: dims.cols,
            rows: dims.rows,
          };
          sendMessage(resizeMessage);
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
