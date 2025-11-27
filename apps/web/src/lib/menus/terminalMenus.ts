import type { MenuItem } from '@/components/ui/aqua/MenuBarMenu';
import type { Window } from '@/stores/useWindowStore';

interface MenuConfig {
  file: MenuItem[];
  edit: MenuItem[];
  view: MenuItem[];
  go: MenuItem[];
  window: MenuItem[];
  help: MenuItem[];
}

export const getTerminalMenuItems = (
  activeWindow: Window | undefined,
  handlers: {
    handleNewTab: () => void;
    handleNewWindow: () => void;
    handleCloseTab: () => void;
    handleCloseWindow: () => void;
    handleQuitTerminal: () => void;
    handleMinimizeWindow: () => void;
    handleBringAllToFront: () => void;
  }
): MenuConfig => {
  const hasMultipleTabs = (activeWindow?.tabs?.length || 0) > 1;
  const hasActiveWindow = !!activeWindow;

  return {
    file: [
      { label: 'New Tab', action: handlers.handleNewTab, shortcut: '⌘T' },
      { label: 'New Window', action: handlers.handleNewWindow, shortcut: '⌘N' },
      { separator: true },
      {
        label: hasMultipleTabs ? 'Close Tab' : 'Close Window',
        action: hasMultipleTabs ? handlers.handleCloseTab : handlers.handleCloseWindow,
        shortcut: '⌘W',
        disabled: !hasActiveWindow,
      },
      { separator: true },
      { label: 'Quit Terminal', action: handlers.handleQuitTerminal, shortcut: '⌘Q' },
    ],
    edit: [
      { label: 'Undo', action: () => {}, shortcut: '⌘Z', disabled: true },
      { label: 'Redo', action: () => {}, shortcut: '⇧⌘Z', disabled: true },
      { separator: true },
      { label: 'Cut', action: () => {}, shortcut: '⌘X', disabled: true },
      { label: 'Copy', action: () => {}, shortcut: '⌘C', disabled: true },
      { label: 'Paste', action: () => {}, shortcut: '⌘V', disabled: true },
    ],
    view: [{ label: 'Show View Options', action: () => {}, disabled: true }],
    go: [
      { label: 'Home', action: () => {}, disabled: true },
      { label: 'Back', action: () => {}, disabled: true },
      { label: 'Forward', action: () => {}, disabled: true },
    ],
    window: [
      { label: 'Minimize', action: handlers.handleMinimizeWindow, shortcut: '⌘M', disabled: !hasActiveWindow },
      { label: 'Zoom', action: () => {}, disabled: !hasActiveWindow },
      { separator: true },
      { label: 'Bring All to Front', action: handlers.handleBringAllToFront },
    ],
    help: [{ label: 'Help Center', action: () => {}, disabled: true }],
  };
};

export const getDefaultMenuItems = (
  activeWindow: Window | undefined,
  handlers: {
    handleNewWindow: () => void;
    handleCloseWindow: () => void;
    handleMinimizeWindow: () => void;
    handleBringAllToFront: () => void;
  }
): MenuConfig => {
  const hasActiveWindow = !!activeWindow;

  return {
    file: [
      { label: 'New Window', action: handlers.handleNewWindow, shortcut: '⌘N' },
      { label: 'Open...', action: () => {}, shortcut: '⌘O', disabled: true },
      { separator: true },
      { label: 'Close Window', action: handlers.handleCloseWindow, shortcut: '⌘W', disabled: !hasActiveWindow },
      { separator: true },
      { label: 'Quit', action: () => {}, shortcut: '⌘Q', disabled: true },
    ],
    edit: [
      { label: 'Undo', action: () => {}, shortcut: '⌘Z', disabled: true },
      { label: 'Redo', action: () => {}, shortcut: '⇧⌘Z', disabled: true },
      { separator: true },
      { label: 'Cut', action: () => {}, shortcut: '⌘X', disabled: true },
      { label: 'Copy', action: () => {}, shortcut: '⌘C', disabled: true },
      { label: 'Paste', action: () => {}, shortcut: '⌘V', disabled: true },
    ],
    view: [{ label: 'Show View Options', action: () => {}, disabled: true }],
    go: [
      { label: 'Home', action: () => {}, disabled: true },
      { label: 'Back', action: () => {}, disabled: true },
      { label: 'Forward', action: () => {}, disabled: true },
    ],
    window: [
      { label: 'Minimize', action: handlers.handleMinimizeWindow, shortcut: '⌘M', disabled: !hasActiveWindow },
      { label: 'Zoom', action: () => {}, disabled: !hasActiveWindow },
      { separator: true },
      { label: 'Bring All to Front', action: handlers.handleBringAllToFront },
    ],
    help: [{ label: 'Help Center', action: () => {}, disabled: true }],
  };
};

