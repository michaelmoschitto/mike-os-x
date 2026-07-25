// @vitest-environment jsdom
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import TextEditWindow from '@/components/apps/TextEdit/TextEditWindow';
import { useContentIndex } from '@/lib/contentIndex';
import type { Window as WindowType } from '@/stores/useWindowStore';

vi.mock('@/components/window/Window', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid="window-shell" data-title={title}>
      {children}
    </div>
  ),
}));

vi.mock('@/lib/hooks/useWindowLifecycle', () => ({
  useWindowLifecycle: () => ({
    handleClose: vi.fn(),
    handleFocus: vi.fn(),
    handleMinimize: vi.fn(),
    handleDragEnd: vi.fn(),
    handleResize: vi.fn(),
  }),
}));

vi.mock('@/lib/contentLoader', () => ({
  loadContentFile: vi.fn(async () => ({
    content: 'loaded document\nsecond line',
    metadata: { title: 'README' },
  })),
}));

const baseWindow: WindowType = {
  id: 'window-1',
  type: 'textedit',
  appName: 'TextEdit',
  title: 'README',
  content: '',
  position: { x: 40, y: 40 },
  size: { width: 600, height: 500 },
  zIndex: 101,
  isMinimized: false,
  urlPath: '/README',
};

describe('TextEditWindow', () => {
  beforeEach(() => {
    useContentIndex.setState({
      entries: new Map([
        [
          '/README',
          {
            urlPath: '/README',
            filePath: '../../content/README.md',
            fileExtension: '.md',
            appType: 'textedit',
            metadata: { title: 'README' },
          },
        ],
      ]),
      folders: [],
      isIndexed: true,
    });
  });

  test('loads source content and mounts the editor without mutating window content', async () => {
    const windowData = { ...baseWindow, content: '' };
    render(<TextEditWindow window={windowData} isActive />);

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'README' })).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox', { name: 'README' }).textContent).toContain(
      'loaded document'
    );
    expect(windowData.content).toBe('');
  });

  test('initializes from provided window content without fetching', async () => {
    render(
      <TextEditWindow window={{ ...baseWindow, content: 'preloaded <b>html</b>' }} isActive />
    );

    await waitFor(() => {
      expect(screen.getByRole('textbox', { name: 'README' })).toBeInTheDocument();
    });

    expect(screen.getByRole('textbox', { name: 'README' }).textContent).toContain(
      'preloaded <b>html</b>'
    );
  });

  test('shows a retryable error when the document cannot be found', async () => {
    useContentIndex.setState({
      entries: new Map(),
      folders: [],
      isIndexed: true,
    });

    render(<TextEditWindow window={baseWindow} isActive />);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent('Document could not be found.');
    });

    act(() => {
      screen.getByRole('button', { name: 'Retry' }).click();
    });

    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });
});
