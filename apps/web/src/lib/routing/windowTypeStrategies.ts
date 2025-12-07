import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { getPhotoByPath, getAlbumPhotos } from '@/lib/photosContent';
import { normalizePathForRouting } from '@/lib/utils';
import type { Window, WindowOpenConfig } from '@/stores/useWindowStore';

/**
 * Strategy interface for window type-specific behavior.
 * Each window type implements this interface to handle serialization,
 * deserialization, and special reconciliation logic.
 */
export interface WindowTypeStrategy {
  /**
   * Serialize a window to a URL identifier string.
   * @returns Identifier string if window should be serialized, null otherwise.
   */
  serialize: (window: Window) => string | null;

  /**
   * Deserialize a URL identifier string to a window configuration.
   * @returns WindowOpenConfig if identifier is valid, null otherwise.
   */
  deserialize: (identifier: string) => WindowOpenConfig | null;

  /**
   * Check if a window needs updating based on new config.
   * Used during reconciliation to determine if a window should be updated.
   */
  needsUpdate: (currentWindow: Window, newConfig: Partial<Window>) => boolean;

  /**
   * Get a fallback identifier for windows that don't serialize normally.
   * Used in lifecycle hooks when a window needs to be removed from URL
   * even though it doesn't serialize (e.g., browser:about:blank).
   */
  getFallbackIdentifier?: (window: Window) => string | null;

  /**
   * Check if this window type should be handled specially during reconciliation.
   * For example, photos windows should only allow one instance.
   */
  requiresSpecialReconciliation?: boolean;
}

/**
 * Remove file extension from photo filename
 */
const removeFileExtension = (filename: string): string => {
  return filename.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
};

const terminalStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;
    return 'terminal';
  },

  deserialize: () => {
    const { width, height } = WINDOW_DIMENSIONS.terminal;
    const position = getCenteredWindowPosition(width, height);
    return {
      type: 'terminal',
      title: 'Terminal',
      content: '',
      position,
      size: { width, height },
    };
  },

  needsUpdate: () => false,
};

const browserStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;
    if (!window.url || window.url === 'about:blank' || window.url === '') {
      return null;
    }
    return `browser:${encodeURIComponent(window.url)}`;
  },

  deserialize: (identifier) => {
    const url = decodeURIComponent(identifier.substring(8));
    const { width, height } = WINDOW_DIMENSIONS.browser;
    const position = getCenteredWindowPosition(width, height);
    return {
      type: 'browser',
      title: 'Internet Explorer',
      content: '',
      position,
      size: { width, height },
      url,
      history: [url],
      historyIndex: 0,
    };
  },

  needsUpdate: (currentWindow, newConfig) => {
    if (newConfig.url) {
      return currentWindow.url !== newConfig.url;
    }
    return false;
  },

  getFallbackIdentifier: (window) => {
    if (window.url === 'about:blank') {
      return 'browser:about:blank';
    }
    return null;
  },
};

const photosStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;

    // Photos with selected photo
    if (
      window.urlPath &&
      window.selectedPhotoIndex !== undefined &&
      window.selectedPhotoIndex !== null
    ) {
      const normalizedPath = normalizePathForRouting(window.urlPath);
      const pathParts = normalizedPath.split('/').filter(Boolean);

      // Photos in dock/photos/album structure
      if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
        const albumName = pathParts[2];
        const photoName = pathParts[pathParts.length - 1];
        const photoNameWithoutExt = removeFileExtension(photoName);
        return `photos:${albumName}:${photoNameWithoutExt}`;
      }

      // Desktop photos
      if (pathParts.length > 0 && pathParts[0] !== 'dock') {
        const photoName = pathParts[pathParts.length - 1];
        const photoNameWithoutExt = removeFileExtension(photoName);
        return `photos:desktop:${photoNameWithoutExt}`;
      }
    }

    // Photos with album only
    if (window.albumPath) {
      const normalizedAlbumPath = normalizePathForRouting(window.albumPath);
      const pathParts = normalizedAlbumPath.split('/').filter(Boolean);

      if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
        const albumName = pathParts[2];
        return `photos:${albumName}`;
      }
    }

    // Photos root (no album or photo selected)
    return 'photos';
  },

  deserialize: (identifier) => {
    const { width, height } = WINDOW_DIMENSIONS.photos;
    const position = getCenteredWindowPosition(width, height);

    const parts = identifier.split(':');

    if (parts.length === 1) {
      // Just "photos" - root view
      return {
        type: 'photos',
        title: 'Photos',
        content: '',
        position,
        size: { width, height },
      };
    }

    if (parts.length === 2) {
      // "photos:album" - album view
      const albumName = parts[1];
      const albumPath = albumName === 'desktop' ? 'desktop' : `dock/photos/${albumName}`;
      return {
        type: 'photos',
        title: 'Photos',
        content: '',
        position,
        size: { width, height },
        albumPath,
      };
    }

    if (parts.length === 3) {
      // "photos:album:photo" - single photo view
      const albumName = parts[1];
      const photoName = parts[2];

      // Construct the urlPath to look up the photo
      const urlPath = albumName === 'desktop' ? photoName : `dock/photos/${albumName}/${photoName}`;

      // Find the photo to get full data
      const photo = getPhotoByPath(urlPath);

      if (photo) {
        const photos = getAlbumPhotos(photo.albumPath);
        const index = photos.findIndex((p) => p.id === photo.id);

        return {
          type: 'photos',
          title: 'Photos',
          content: '',
          position,
          size: { width, height },
          albumPath: photo.albumPath,
          selectedPhotoIndex: index !== -1 ? index : 0,
          urlPath: photo.urlPath,
        };
      }

      // Photo not found, fall back to album view
      const albumPath = albumName === 'desktop' ? 'desktop' : `dock/photos/${albumName}`;
      return {
        type: 'photos',
        title: 'Photos',
        content: '',
        position,
        size: { width, height },
        albumPath,
      };
    }

    return null;
  },

  needsUpdate: (currentWindow, newConfig) => {
    if (newConfig.albumPath && currentWindow.albumPath !== newConfig.albumPath) {
      return true;
    }
    if (
      newConfig.selectedPhotoIndex !== undefined &&
      currentWindow.selectedPhotoIndex !== newConfig.selectedPhotoIndex
    ) {
      return true;
    }
    if (newConfig.urlPath && currentWindow.urlPath !== newConfig.urlPath) {
      return true;
    }
    return false;
  },

  requiresSpecialReconciliation: true,
};

const finderStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;
    if (window.currentPath) {
      const normalizedPath = normalizePathForRouting(window.currentPath);
      return `finder:${normalizedPath}`;
    }
    return null;
  },

  deserialize: (identifier) => {
    const path = identifier.substring(7);
    const { width, height } = WINDOW_DIMENSIONS.finder;
    const position = getCenteredWindowPosition(width, height);

    const pathParts = path.split('/').filter(Boolean);
    const title = pathParts.length > 1 ? pathParts[pathParts.length - 1] : 'Finder';
    const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

    const windowPath = path.startsWith('/') ? path : `/${path}`;

    return {
      type: 'finder',
      title: capitalizedTitle,
      content: '',
      position,
      size: { width, height },
      currentPath: windowPath,
      viewMode: 'icon' as const,
      navigationHistory: [windowPath],
      navigationIndex: 0,
    };
  },

  needsUpdate: (currentWindow, newConfig) => {
    if (newConfig.currentPath) {
      return currentWindow.currentPath !== newConfig.currentPath;
    }
    return false;
  },
};

const pdfViewerStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;
    if (window.urlPath) {
      return `pdfviewer:${normalizePathForRouting(window.urlPath)}`;
    }
    return null;
  },

  deserialize: (identifier) => {
    const path = identifier.substring(10);
    const { width, height } = WINDOW_DIMENSIONS.pdfviewer;
    const position = getCenteredWindowPosition(width, height);
    const urlPath = path.startsWith('/') ? path : `/${path}`;

    return {
      type: 'pdfviewer',
      title: path.split('/').pop() || 'Document',
      content: '',
      position,
      size: { width, height },
      urlPath,
    };
  },

  needsUpdate: (currentWindow, newConfig) => {
    if (newConfig.urlPath) {
      return currentWindow.urlPath !== newConfig.urlPath;
    }
    return false;
  },
};

const textEditStrategy: WindowTypeStrategy = {
  serialize: (window) => {
    if (window.isMinimized) return null;
    if (window.urlPath) {
      return `textedit:${normalizePathForRouting(window.urlPath)}`;
    }
    return null;
  },

  deserialize: (identifier) => {
    const path = identifier.substring(9);
    const { width, height } = WINDOW_DIMENSIONS.textedit;
    const position = getCenteredWindowPosition(width, height);
    const urlPath = path.startsWith('/') ? path : `/${path}`;

    return {
      type: 'textedit',
      title: path.split('/').pop() || 'Document',
      content: '',
      position,
      size: { width, height },
      urlPath,
    };
  },

  needsUpdate: (currentWindow, newConfig) => {
    if (newConfig.urlPath) {
      return currentWindow.urlPath !== newConfig.urlPath;
    }
    return false;
  },
};

/**
 * Registry of window type strategies.
 * Maps window types to their strategy implementations.
 */
export const windowTypeStrategies: Record<
  'terminal' | 'browser' | 'photos' | 'finder' | 'pdfviewer' | 'textedit',
  WindowTypeStrategy
> = {
  terminal: terminalStrategy,
  browser: browserStrategy,
  photos: photosStrategy,
  finder: finderStrategy,
  pdfviewer: pdfViewerStrategy,
  textedit: textEditStrategy,
};

/**
 * Get the strategy for a window type.
 */
export function getWindowTypeStrategy(
  windowType: 'terminal' | 'browser' | 'photos' | 'finder' | 'pdfviewer' | 'textedit'
): WindowTypeStrategy {
  return windowTypeStrategies[windowType];
}

/**
 * Get the strategy for a window identifier (extracts type from identifier).
 */
export function getStrategyForIdentifier(identifier: string): WindowTypeStrategy | null {
  if (identifier === 'terminal') {
    return terminalStrategy;
  }

  if (identifier.startsWith('browser:')) {
    return browserStrategy;
  }

  if (identifier.startsWith('photos')) {
    return photosStrategy;
  }

  if (identifier.startsWith('finder:')) {
    return finderStrategy;
  }

  if (identifier.startsWith('pdfviewer:')) {
    return pdfViewerStrategy;
  }

  if (identifier.startsWith('textedit:')) {
    return textEditStrategy;
  }

  return null;
}
