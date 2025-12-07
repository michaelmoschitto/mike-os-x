import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { getPhotoByPath, getAlbumPhotos } from '@/lib/photosContent';
import type { Window, TerminalTab } from '@/stores/useWindowStore';

/**
 * Validate if a window identifier is valid
 * Filters out empty strings, whitespace, JavaScript/JSON literals,
 * and checks for security issues like path traversal
 */
function isValidWindowIdentifier(identifier: string | null | undefined): identifier is string {
  if (!identifier || typeof identifier !== 'string') {
    return false;
  }

  if (identifier.trim() === '') {
    return false;
  }

  const invalidLiterals = [
    '[]',
    '{}',
    'null',
    'undefined',
    'NaN',
    '[object Object]',
    'true',
    'false',
  ];

  if (invalidLiterals.includes(identifier)) {
    return false;
  }

  if (identifier.includes('../') || identifier.includes('..\\')) {
    return false;
  }

  const validPatterns = [
    /^terminal$/,
    /^photos(:[a-zA-Z0-9_-]+)?(:[a-zA-Z0-9_-]+)?$/,
    /^browser:[a-zA-Z0-9/:._%-]+$/,
    /^finder:[a-zA-Z0-9/._-]+$/,
    /^pdfviewer:[a-zA-Z0-9/._-]+$/,
    /^textedit:[a-zA-Z0-9/._-]+$/,
  ];

  return validPatterns.some((pattern) => pattern.test(identifier));
}

export type WindowOpenConfig = Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & {
  appName?: string;
};

export interface WindowConfig {
  identifier: string;
  config: WindowOpenConfig;
}

export interface ExtendedWindowState {
  windows: Array<{
    type: 'terminal' | 'browser' | 'photos' | 'finder' | 'pdfviewer' | 'textedit';
    args: string[];
    position: { x: number; y: number };
    size: { width: number; height: number };
    zIndex: number;
    // Terminal-specific
    tabs?: Array<{ title: string }>;
    activeTabIndex?: number;
  }>;
  activeIndex?: number;
}

/**
 * Remove file extension from photo filename
 */
const removeFileExtension = (filename: string): string => {
  return filename.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
};

/**
 * Normalize path for routing (remove leading slash)
 */
const normalizePathForRouting = (path: string): string => {
  return path.startsWith('/') ? path.slice(1) : path;
};

/**
 * Get photo image URL from photo data
 */
export const getPhotoImageUrl = (urlPath: string, fileExtension: string): string => {
  const sanitizedPath = urlPath.startsWith('/') ? urlPath : '/' + urlPath;
  return `/content${sanitizedPath}${fileExtension}`;
};

/**
 * Serialize a single window to a URL identifier string
 * Returns null if window should not be serialized
 */
export function serializeWindow(window: Window): string | null {
  // Skip minimized windows
  if (window.isMinimized) {
    return null;
  }

  switch (window.type) {
    case 'terminal':
      return 'terminal';

    case 'browser':
      // Skip if no URL or blank URL
      if (!window.url || window.url === 'about:blank' || window.url === '') {
        return null;
      }
      return `browser:${encodeURIComponent(window.url)}`;

    case 'photos': {
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
    }

    case 'finder':
      if (window.currentPath) {
        const normalizedPath = normalizePathForRouting(window.currentPath);
        return `finder:${normalizedPath}`;
      }
      return null;

    case 'pdfviewer':
      if (window.urlPath) {
        return `pdfviewer:${normalizePathForRouting(window.urlPath)}`;
      }
      return null;

    case 'textedit':
      if (window.urlPath) {
        return `textedit:${normalizePathForRouting(window.urlPath)}`;
      }
      return null;

    default:
      return null;
  }
}

/**
 * Deserialize a URL identifier string to a window configuration
 */
export function deserializeWindow(identifier: string): WindowOpenConfig | null {
  if (!identifier) return null;

  // Terminal
  if (identifier === 'terminal') {
    const { width, height } = WINDOW_DIMENSIONS.terminal;
    const position = getCenteredWindowPosition(width, height);
    return {
      type: 'terminal',
      title: 'Terminal',
      content: '',
      position,
      size: { width, height },
    };
  }

  // Browser
  if (identifier.startsWith('browser:')) {
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
  }

  // Photos
  if (identifier.startsWith('photos')) {
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
  }

  // Finder
  if (identifier.startsWith('finder:')) {
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
  }

  // TextEdit with explicit prefix
  if (identifier.startsWith('textedit:')) {
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
  }

  // PDF Viewer with explicit prefix
  if (identifier.startsWith('pdfviewer:')) {
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
  }

  // Generic content path (urlPath based) - fallback
  const urlPath = identifier.startsWith('/') ? identifier : '/' + identifier;

  // Default to textedit, will be resolved by content type later
  const { width, height } = WINDOW_DIMENSIONS.textedit;
  const position = getCenteredWindowPosition(width, height);

  return {
    type: 'textedit',
    title: identifier.split('/').pop() || 'Document',
    content: '',
    position,
    size: { width, height },
    urlPath,
  };
}

/**
 * Determine if we should use extended state format (base64)
 * Returns true if 5 or more visible windows
 */
export function shouldUseExtendedState(windows: Window[]): boolean {
  const visibleWindows = windows.filter((w) => !w.isMinimized);
  return visibleWindows.length >= 5;
}

/**
 * Serialize extended window state to base64 JSON
 */
export function serializeExtendedState(windows: Window[]): string {
  const visibleWindows = windows.filter((w) => !w.isMinimized);

  const state: ExtendedWindowState = {
    windows: visibleWindows.map((w) => {
      const serialized: ExtendedWindowState['windows'][0] = {
        type: w.type,
        args: [],
        position: w.position,
        size: w.size,
        zIndex: w.zIndex,
      };

      // Add type-specific args
      switch (w.type) {
        case 'browser':
          if (w.url && w.url !== 'about:blank') {
            serialized.args.push(w.url);
          }
          break;
        case 'photos':
          if (w.urlPath && w.selectedPhotoIndex !== undefined) {
            const normalizedPath = normalizePathForRouting(w.urlPath);
            const pathParts = normalizedPath.split('/').filter(Boolean);
            if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
              const albumName = pathParts[2];
              const photoName = pathParts[pathParts.length - 1];
              const photoNameWithoutExt = removeFileExtension(photoName);
              serialized.args = [albumName, photoNameWithoutExt];
            } else if (pathParts.length > 0) {
              const photoName = pathParts[pathParts.length - 1];
              const photoNameWithoutExt = removeFileExtension(photoName);
              serialized.args = ['desktop', photoNameWithoutExt];
            }
          } else if (w.albumPath) {
            const normalizedAlbumPath = normalizePathForRouting(w.albumPath);
            const pathParts = normalizedAlbumPath.split('/').filter(Boolean);
            if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
              serialized.args = [pathParts[2]];
            }
          }
          break;
        case 'finder':
          if (w.currentPath) {
            serialized.args.push(normalizePathForRouting(w.currentPath));
          }
          break;
        case 'pdfviewer':
        case 'textedit':
          if (w.urlPath) {
            serialized.args.push(normalizePathForRouting(w.urlPath));
          }
          break;
        case 'terminal':
          // Store terminal tabs with default names
          if (w.tabs && w.tabs.length > 0) {
            serialized.tabs = w.tabs.map((tab) => ({ title: tab.title }));
            const activeTabIndex = w.tabs.findIndex((t) => t.id === w.activeTabId);
            if (activeTabIndex !== -1) {
              serialized.activeTabIndex = activeTabIndex;
            }
          }
          break;
      }

      return serialized;
    }),
    activeIndex: visibleWindows.length - 1, // Last window is active
  };

  return btoa(JSON.stringify(state));
}

/**
 * Deserialize extended window state from base64 JSON
 */
export function deserializeExtendedState(base64: string): ExtendedWindowState | null {
  try {
    const json = atob(base64);
    const state = JSON.parse(json) as ExtendedWindowState;
    return state;
  } catch (error) {
    console.error('Failed to deserialize extended state:', error);
    return null;
  }
}

/**
 * Serialize all visible windows to a URL string
 */
export function serializeWindowsToUrl(windows: Window[]): string {
  const visibleWindows = windows.filter((w) => !w.isMinimized);

  // Empty desktop
  if (visibleWindows.length === 0) {
    return '/';
  }

  // Use extended state for 5+ windows
  if (shouldUseExtendedState(windows)) {
    const state = serializeExtendedState(windows);
    return `/?state=${state}`;
  }

  // Simple format for < 5 windows
  const params = new URLSearchParams();
  for (const window of visibleWindows) {
    const identifier = serializeWindow(window);
    if (identifier) {
      params.append('w', identifier);
    }
  }

  const queryString = params.toString();

  // Defensive check: ensure no nested query strings (should never happen)
  if (queryString.includes('?')) {
    console.error('[windowSerialization] Detected nested query string in params:', queryString);
    // Safety fallback: return home
    return '/';
  }

  return queryString ? `/?${queryString}` : '/';
}

/**
 * Parse window identifiers from URL, handling TanStack Router's JSON serialization
 * TanStack Router may serialize arrays as JSON strings like '["terminal"]'
 * This function flattens them back to individual window IDs
 */
export function parseWindowIdentifiersFromUrl(): string[] {
  const searchParams = new URLSearchParams(window.location.search);
  const rawWindows = searchParams.getAll('w');
  const windowIdentifiers: string[] = [];

  for (const w of rawWindows) {
    if (w.startsWith('[') && w.endsWith(']')) {
      try {
        const parsed = JSON.parse(w);
        if (Array.isArray(parsed)) {
          windowIdentifiers.push(...parsed);
        } else {
          windowIdentifiers.push(w);
        }
      } catch {
        windowIdentifiers.push(w);
      }
    } else {
      windowIdentifiers.push(w);
    }
  }

  return windowIdentifiers.filter(isValidWindowIdentifier);
}

/**
 * Deserialize URL search params to window configurations
 */
export function deserializeUrlToWindows(searchParams: URLSearchParams): WindowConfig[] {
  const configs: WindowConfig[] = [];

  // Check for extended state format
  const stateParam = searchParams.get('state');
  if (stateParam) {
    const state = deserializeExtendedState(stateParam);
    if (state) {
      for (let i = 0; i < state.windows.length; i++) {
        const windowState = state.windows[i];

        // Build identifier from type and args
        let identifier: string;
        if (windowState.type === 'terminal') {
          identifier = 'terminal';
        } else if (windowState.type === 'browser' && windowState.args.length > 0) {
          identifier = `browser:${encodeURIComponent(windowState.args[0])}`;
        } else if (windowState.type === 'photos') {
          if (windowState.args.length === 2) {
            identifier = `photos:${windowState.args[0]}:${windowState.args[1]}`;
          } else if (windowState.args.length === 1) {
            identifier = `photos:${windowState.args[0]}`;
          } else {
            identifier = 'photos';
          }
        } else if (windowState.type === 'finder' && windowState.args.length > 0) {
          identifier = `finder:${windowState.args[0]}`;
        } else if (windowState.type === 'pdfviewer' && windowState.args.length > 0) {
          identifier = `pdfviewer:${windowState.args[0]}`;
        } else if (windowState.type === 'textedit' && windowState.args.length > 0) {
          identifier = `textedit:${windowState.args[0]}`;
        } else {
          continue;
        }

        // Validate identifier before deserializing
        if (!isValidWindowIdentifier(identifier)) {
          console.warn(
            '[windowSerialization] Skipping invalid identifier in extended state:',
            identifier
          );
          continue;
        }

        // Deserialize base config
        const baseConfig = deserializeWindow(identifier);
        if (baseConfig) {
          // Override with extended state
          const config: Partial<Window> = {
            ...baseConfig,
            position: windowState.position,
            size: windowState.size,
            zIndex: windowState.zIndex,
          };

          // Add terminal tabs
          if (windowState.type === 'terminal' && windowState.tabs) {
            const tabId = `tab-${Date.now()}-${i}`;
            const tabs: TerminalTab[] = windowState.tabs.map((tab, idx) => ({
              id: `${tabId}-${idx}`,
              title: tab.title,
              sessionId: `session-${tabId}-${idx}`,
            }));
            config.tabs = tabs;
            config.activeTabId =
              windowState.activeTabIndex !== undefined
                ? tabs[windowState.activeTabIndex]?.id
                : tabs[0]?.id;
          }

          configs.push({ identifier, config });
        }
      }
    }
    return configs;
  }

  // Simple format
  const allIdentifiers = searchParams.getAll('w');

  const windowIdentifiers = allIdentifiers.filter(isValidWindowIdentifier);

  const invalidIdentifiers = allIdentifiers.filter((id) => !isValidWindowIdentifier(id));
  if (invalidIdentifiers.length > 0) {
    console.warn(
      '[windowSerialization] Filtered out invalid window identifiers:',
      invalidIdentifiers
    );
  }

  for (const identifier of windowIdentifiers) {
    const config = deserializeWindow(identifier);
    if (config) {
      configs.push({ identifier, config });
    }
  }

  return configs;
}
