// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { WINDOW_DIMENSIONS } from '@/lib/constants';
import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { useWindowStore } from '@/stores/useWindowStore';

const navigate = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigate,
}));

const Probe = () => {
  const { addWindow } = useWindowNavigation();
  return (
    <button type="button" onClick={() => addWindow([], 'textedit:README')}>
      Open
    </button>
  );
};

describe('useWindowNavigation TextEdit restore', () => {
  beforeEach(() => {
    navigate.mockReset();
    useWindowStore.setState({
      windows: [],
      activeWindowId: null,
      maxZIndex: 100,
      skipNextRouteSync: {},
    });
  });

  test('restores a minimized TextEdit from the store even when it is absent from the URL', async () => {
    const user = userEvent.setup();
    const { width, height } = WINDOW_DIMENSIONS.textedit;
    useWindowStore.getState().openWindow({
      type: 'textedit',
      title: 'README',
      content: 'hello',
      position: { x: 40, y: 40 },
      size: { width, height },
      urlPath: '/README',
    });
    const windowId = useWindowStore.getState().windows[0].id;
    useWindowStore.getState().minimizeWindow(windowId);

    render(<Probe />);
    await user.click(screen.getByRole('button', { name: 'Open' }));

    expect(navigate).not.toHaveBeenCalled();
    expect(useWindowStore.getState().windows.find((w) => w.id === windowId)?.isMinimized).toBe(
      false
    );
    expect(useWindowStore.getState().activeWindowId).toBe(windowId);
  });
});
