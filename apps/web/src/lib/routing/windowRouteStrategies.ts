import { buildPhotoRouteFromWindow, buildAlbumRouteFromWindow } from '@/lib/photosRouting';
import type { Window } from '@/stores/useWindowStore';

export interface WindowRouteStrategy {
  getRouteForWindow: (window: Window) => string;
  shouldSyncRoute: (window: Window) => boolean;
}

const browserStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    const browserUrl = window.url && window.url !== 'about:blank' ? window.url : '';
    return browserUrl ? `/browser?url=${encodeURIComponent(browserUrl)}` : '/browser';
  },
  shouldSyncRoute: (window) => window.type === 'browser',
};

const textEditStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    return window.urlPath || '/';
  },
  shouldSyncRoute: (window) => window.type === 'textedit' && !!window.urlPath,
};

const terminalStrategy: WindowRouteStrategy = {
  getRouteForWindow: () => '/terminal',
  shouldSyncRoute: () => true,
};

const pdfViewerStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    return window.urlPath || '/';
  },
  shouldSyncRoute: (window) => window.type === 'pdfviewer' && !!window.urlPath,
};

const finderStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    if (window.currentPath?.startsWith('/dock/')) {
      return window.currentPath;
    }
    return '/';
  },
  shouldSyncRoute: (window) => {
    return window.currentPath?.startsWith('/dock/') ?? false;
  },
};

const photosStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    const photoRoute = buildPhotoRouteFromWindow(window.urlPath, window.selectedPhotoIndex);
    if (photoRoute) {
      return photoRoute;
    }

    return buildAlbumRouteFromWindow(window.albumPath);
  },
  shouldSyncRoute: (window) => window.type === 'photos',
};

export const windowRouteStrategies: Record<
  'browser' | 'textedit' | 'terminal' | 'pdfviewer' | 'finder' | 'photos',
  WindowRouteStrategy
> = {
  browser: browserStrategy,
  textedit: textEditStrategy,
  terminal: terminalStrategy,
  pdfviewer: pdfViewerStrategy,
  finder: finderStrategy,
  photos: photosStrategy,
};

export const getRouteStrategy = (
  windowType: 'browser' | 'textedit' | 'terminal' | 'pdfviewer' | 'finder' | 'photos'
): WindowRouteStrategy => {
  return windowRouteStrategies[windowType];
};
