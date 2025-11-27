import { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';

import Window from '@/components/window/Window';
import TerminalTabBar from '@/components/apps/Terminal/TerminalTabBar';
import type { InputMessage, ResizeMessage } from '@/lib/terminal/messageProtocol';
import { useWebSocketManager } from '@/stores/useWebSocketManager';
import {
  useWindowStore,
  type TerminalTab,
  type Window as WindowType,
} from '@/stores/useWindowStore';
import 'xterm/css/xterm.css';

interface TerminalWindowProps {
  window: WindowType;
  isActive: boolean;
}

interface TerminalInstance {
  terminal: Terminal;
  fitAddon: FitAddon;
  container: HTMLDivElement;
  sessionCreated: boolean;
  sessionRegisteredTime: number;
  onDataDisposable: { dispose: () => void };
}

const MIN_SESSION_DURATION_FOR_CLOSE_MESSAGE_MS = 500;

const TerminalWindow = ({ window: windowData, isActive }: TerminalWindowProps) => {
  const {
    closeWindow,
    focusWindow,
    updateWindowPosition,
    updateWindowSize,
    minimizeWindow,
    closeTab,
    setActiveTab: setActiveTabInStore,
    reorderTabs,
  } = useWindowStore();

  const { registerSession, unregisterSession, sendMessage, connectionState } =
    useWebSocketManager();

  const terminalsRef = useRef<Map<string, TerminalInstance>>(new Map());
  const containersRef = useRef<Map<string, HTMLDivElement>>(new Map());
  const [activeTabId, setActiveTabId] = useState<string | undefined>(windowData.activeTabId);

  const tabs = windowData.tabs || [];
  const currentActiveTabId = windowData.activeTabId || tabs[0]?.id;

  useEffect(() => {
    setActiveTabId(currentActiveTabId);
  }, [currentActiveTabId]);

  const initializeTerminal = (tab: TerminalTab, container: HTMLDivElement) => {
    if (terminalsRef.current.has(tab.id)) {
      return;
    }

    const sessionRegisteredTime = Date.now();
    let sessionCreated = false;

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
    terminal.open(container);

    fitAddon.fit();

    const onDataDisposable = terminal.onData((data: string) => {
      const message: InputMessage = {
        type: 'input',
        sessionId: tab.sessionId,
        data,
      };
      sendMessage(message);
    });

    registerSession(tab.sessionId, {
      onOutput: (data: string) => {
        terminal.write(data);
      },
      onError: (error: string) => {
        terminal.write(`\r\n\x1b[31m${error}\x1b[0m\r\n`);
      },
      onSessionCreated: () => {
        sessionCreated = true;
        setTimeout(() => {
          if (fitAddon && terminal) {
            fitAddon.fit();
            const dims = {
              cols: terminal.cols,
              rows: terminal.rows,
            };
            const resizeMessage: ResizeMessage = {
              type: 'resize',
              sessionId: tab.sessionId,
              cols: dims.cols,
              rows: dims.rows,
            };
            sendMessage(resizeMessage);
          }
        }, 100);

        setTimeout(() => {
          if (activeTabId === tab.id && isActive) {
            terminal.focus();
          }
        }, 150);
      },
      onSessionClosed: () => {
        const timeSinceRegistration = Date.now() - sessionRegisteredTime;
        if (
          sessionCreated &&
          timeSinceRegistration > MIN_SESSION_DURATION_FOR_CLOSE_MESSAGE_MS
        ) {
          terminal.write('\r\n\x1b[33mSession closed\x1b[0m\r\n');
        }
      },
    });

    if (connectionState === 'disconnected') {
      terminal.write('\r\n\x1b[33mConnecting...\x1b[0m\r\n');
    } else if (connectionState === 'connecting') {
      terminal.write('\r\n\x1b[33mConnecting...\x1b[0m\r\n');
    }

    terminalsRef.current.set(tab.id, {
      terminal,
      fitAddon,
      container,
      sessionCreated,
      sessionRegisteredTime,
      onDataDisposable,
    });
  };

  useEffect(() => {
    tabs.forEach((tab) => {
      const container = containersRef.current.get(tab.id);
      if (container && !terminalsRef.current.has(tab.id)) {
        initializeTerminal(tab, container);
      }
    });

    const tabIds = new Set(tabs.map((t) => t.id));
    terminalsRef.current.forEach((instance, tabId) => {
      if (!tabIds.has(tabId)) {
        const tab = tabs.find((t) => t.id === tabId);
        if (tab) {
          instance.onDataDisposable.dispose();
          unregisterSession(tab.sessionId);
          instance.terminal.dispose();
          terminalsRef.current.delete(tabId);
        }
      }
    });
  }, [tabs, connectionState, sendMessage, registerSession, unregisterSession, activeTabId, isActive]);

  useEffect(() => {
    const handleResize = () => {
      terminalsRef.current.forEach((instance, tabId) => {
        if (tabId === activeTabId && instance.fitAddon && instance.terminal) {
          instance.fitAddon.fit();
          if (connectionState === 'connected') {
            const dims = {
              cols: instance.terminal.cols,
              rows: instance.terminal.rows,
            };
            const resizeMessage: ResizeMessage = {
              type: 'resize',
              sessionId: tabs.find((t) => t.id === tabId)?.sessionId || '',
              cols: dims.cols,
              rows: dims.rows,
            };
            sendMessage(resizeMessage);
          }
        }
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTabId, connectionState, sendMessage, tabs]);

  useEffect(() => {
    if (activeTabId && isActive) {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance) {
        setTimeout(() => {
          instance.terminal.focus();
        }, 200);
      }
    }
  }, [activeTabId, isActive]);

  useEffect(() => {
    if (activeTabId) {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance?.fitAddon) {
        setTimeout(() => {
          instance.fitAddon.fit();
          if (connectionState === 'connected' && instance.terminal) {
            const tab = tabs.find((t) => t.id === activeTabId);
            if (tab) {
              const dims = {
                cols: instance.terminal.cols,
                rows: instance.terminal.rows,
              };
              const resizeMessage: ResizeMessage = {
                type: 'resize',
                sessionId: tab.sessionId,
                cols: dims.cols,
                rows: dims.rows,
              };
              sendMessage(resizeMessage);
            }
          }
        }, 100);
      }
    }
  }, [windowData.size, activeTabId, connectionState, sendMessage, tabs]);

  const handleClose = () => {
    tabs.forEach((tab) => {
      unregisterSession(tab.sessionId);
    });
    terminalsRef.current.forEach((instance) => {
      instance.onDataDisposable.dispose();
      instance.terminal.dispose();
    });
    terminalsRef.current.clear();
    closeWindow(windowData.id);
  };

  const handleMinimize = () => {
    minimizeWindow(windowData.id);
  };

  const handleFocus = () => {
    focusWindow(windowData.id);
    if (activeTabId) {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance) {
        setTimeout(() => {
          instance.terminal.focus();
        }, 50);
      }
    }
  };

  const handleDragEnd = (position: { x: number; y: number }) => {
    updateWindowPosition(windowData.id, position);
  };

  const handleResize = (size: { width: number; height: number }) => {
    updateWindowSize(windowData.id, size);
    if (activeTabId) {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance?.fitAddon) {
        setTimeout(() => {
          instance.fitAddon.fit();
          if (connectionState === 'connected' && instance.terminal) {
            const tab = tabs.find((t) => t.id === activeTabId);
            if (tab) {
              const dims = {
                cols: instance.terminal.cols,
                rows: instance.terminal.rows,
              };
              const resizeMessage: ResizeMessage = {
                type: 'resize',
                sessionId: tab.sessionId,
                cols: dims.cols,
                rows: dims.rows,
              };
              sendMessage(resizeMessage);
            }
          }
        }, 100);
      }
    }
  };

  const handleTabClick = (tabId: string) => {
    setActiveTabInStore(windowData.id, tabId);
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const instance = terminalsRef.current.get(tabId);
    const tab = tabs.find((t) => t.id === tabId);
    if (instance && tab) {
      instance.onDataDisposable.dispose();
      unregisterSession(tab.sessionId);
      instance.terminal.dispose();
      terminalsRef.current.delete(tabId);
    }
    closeTab(windowData.id, tabId);
  };

  const handleTabReorder = (fromIndex: number, toIndex: number) => {
    reorderTabs(windowData.id, fromIndex, toIndex);
  };

  const handleTerminalClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeTabId) {
      const instance = terminalsRef.current.get(activeTabId);
      if (instance) {
        instance.terminal.focus();
      }
    }
  };

  const setContainerRef = (tabId: string) => (el: HTMLDivElement | null) => {
    if (el) {
      containersRef.current.set(tabId, el);
    } else {
      containersRef.current.delete(tabId);
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
        <TerminalTabBar
          tabs={tabs}
          activeTabId={activeTabId}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
          onTabReorder={handleTabReorder}
        />
        <div className="relative flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          {tabs.map((tab) => (
            <div
              key={tab.id}
              ref={setContainerRef(tab.id)}
              className={tab.id === activeTabId ? 'absolute inset-0' : 'hidden'}
              style={{ display: tab.id === activeTabId ? 'block' : 'none' }}
            />
          ))}
        </div>
      </div>
    </Window>
  );
};

export default TerminalWindow;
