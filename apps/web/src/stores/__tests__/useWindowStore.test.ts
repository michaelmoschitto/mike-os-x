import { beforeEach, describe, expect, test } from 'vitest';

import { WINDOW_DIMENSIONS } from '@/lib/constants';
import { useUI } from '@/lib/store';
import { getAppTypeForDock, useWindowStore, type WindowOpenConfig } from '@/stores/useWindowStore';

const openTextEdit = (overrides: Partial<WindowOpenConfig> = {}) => {
  const { width, height } = WINDOW_DIMENSIONS.textedit;
  useWindowStore.getState().openWindow({
    type: 'textedit',
    title: 'README',
    content: 'hello',
    position: { x: 40, y: 40 },
    size: { width, height },
    urlPath: '/README',
    ...overrides,
  });
  return useWindowStore.getState().windows.at(-1)!;
};

describe('useWindowStore TextEdit lifecycle', () => {
  beforeEach(() => {
    useWindowStore.setState({
      windows: [],
      activeWindowId: null,
      maxZIndex: 100,
      skipNextRouteSync: {},
    });
    useUI.setState({ activeApp: null });
  });

  test('closeWindow activates the topmost remaining visible window', () => {
    const first = openTextEdit({ title: 'One', urlPath: '/one' });
    const second = openTextEdit({ title: 'Two', urlPath: '/two' });
    useWindowStore.getState().focusWindow(first.id);

    useWindowStore.getState().closeWindow(first.id);

    expect(useWindowStore.getState().activeWindowId).toBe(second.id);
    expect(useWindowStore.getState().windows).toHaveLength(1);
  });

  test('minimizing an inactive window preserves the current active window', () => {
    const first = openTextEdit({ title: 'One', urlPath: '/one' });
    const second = openTextEdit({ title: 'Two', urlPath: '/two' });
    useWindowStore.getState().focusWindow(first.id);

    useWindowStore.getState().minimizeWindow(second.id);

    expect(useWindowStore.getState().activeWindowId).toBe(first.id);
    expect(useWindowStore.getState().windows.find((w) => w.id === second.id)?.isMinimized).toBe(
      true
    );
  });

  test('minimizing the active window selects the topmost remaining window', () => {
    const first = openTextEdit({ title: 'One', urlPath: '/one' });
    const second = openTextEdit({ title: 'Two', urlPath: '/two' });
    useWindowStore.getState().focusWindow(second.id);

    useWindowStore.getState().minimizeWindow(second.id);

    expect(useWindowStore.getState().activeWindowId).toBe(first.id);
  });

  test('restoring a minimized window activates it', () => {
    const first = openTextEdit({ title: 'One', urlPath: '/one' });
    const second = openTextEdit({ title: 'Two', urlPath: '/two' });
    useWindowStore.getState().minimizeWindow(second.id);
    useWindowStore.getState().focusWindow(first.id);

    useWindowStore.getState().minimizeWindow(second.id);

    expect(useWindowStore.getState().windows.find((w) => w.id === second.id)?.isMinimized).toBe(
      false
    );
    expect(useWindowStore.getState().activeWindowId).toBe(second.id);
  });

  test('minimized TextEdit still maps to the textedit dock app', () => {
    const window = openTextEdit();
    useWindowStore.getState().minimizeWindow(window.id);

    const minimized = useWindowStore.getState().windows.find((w) => w.id === window.id)!;
    expect(minimized.isMinimized).toBe(true);
    expect(getAppTypeForDock(minimized)).toBe('textedit');
  });
});
