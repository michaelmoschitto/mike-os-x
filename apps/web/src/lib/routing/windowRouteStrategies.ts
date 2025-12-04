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
  getRouteForWindow: () => '/',
  shouldSyncRoute: () => false,
};

const pdfViewerStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    return window.urlPath || '/';
  },
  shouldSyncRoute: (window) => window.type === 'pdfviewer' && !!window.urlPath,
};

const finderStrategy: WindowRouteStrategy = {
  getRouteForWindow: () => '/',
  shouldSyncRoute: () => false,
};

const photosStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    if (window.urlPath && window.selectedPhotoIndex !== undefined && window.selectedPhotoIndex !== null) {
      const normalizedUrlPath = window.urlPath.startsWith('/') 
        ? window.urlPath.slice(1) 
        : window.urlPath;
      const pathParts = normalizedUrlPath.split('/').filter(Boolean);
      
      if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
        const albumName = pathParts[2];
        const photoName = pathParts[pathParts.length - 1];
        const photoNameWithoutExt = photoName.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
        return `/photos/${albumName}/${photoNameWithoutExt}`;
      }
      
      if (pathParts.length > 0 && pathParts[0] !== 'dock') {
        const photoName = pathParts[pathParts.length - 1];
        const photoNameWithoutExt = photoName.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
        return `/photos/desktop/${photoNameWithoutExt}`;
      }
      
      return `/photos?photo=${encodeURIComponent(window.urlPath)}`;
    }
    if (window.albumPath) {
      const normalizedAlbumPath = window.albumPath.startsWith('/') 
        ? window.albumPath.slice(1) 
        : window.albumPath;
      const pathParts = normalizedAlbumPath.split('/').filter(Boolean);
      if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
        const albumName = pathParts[2];
        return `/photos/${albumName}`;
      }
      return `/photos?album=${encodeURIComponent(window.albumPath)}`;
    }
    return '/photos';
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
