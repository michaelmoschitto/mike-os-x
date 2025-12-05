import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';

import Desktop from '@/components/system/Desktop';
import { WINDOW_DIMENSIONS, getCenteredWindowPosition } from '@/lib/constants';
import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { getPhotoByPath, getAlbumPhotos } from '@/lib/photosContent';
import { resolveUrlToContent } from '@/lib/urlResolver';
import { useWindowStore } from '@/stores/useWindowStore';
import type { Window } from '@/stores/useWindowStore';

export const Route = createFileRoute('/$')({
  validateSearch: (search: Record<string, unknown>) => {
    return {
      url: (search.url as string) || undefined,
      album: (search.album as string) || undefined,
      photo: (search.photo as string) || undefined,
    };
  },
  loader: async ({ params }) => {
    const path = params._splat || '';

    if (path === 'browser' || path.startsWith('browser/')) {
      return {
        isBrowserRoute: true,
        isPhotosRoute: false,
        isTerminalRoute: false,
        isFinderRoute: false,
        resolved: null,
        error: null,
        path,
      };
    }

    if (path === 'photos' || path.startsWith('photos/')) {
      return {
        isBrowserRoute: false,
        isPhotosRoute: true,
        isTerminalRoute: false,
        isFinderRoute: false,
        resolved: null,
        error: null,
        path,
      };
    }

    if (path === 'terminal') {
      return {
        isBrowserRoute: false,
        isPhotosRoute: false,
        isTerminalRoute: true,
        isFinderRoute: false,
        resolved: null,
        error: null,
        path,
      };
    }

    if (path.startsWith('dock/')) {
      return {
        isBrowserRoute: false,
        isPhotosRoute: false,
        isTerminalRoute: false,
        isFinderRoute: true,
        finderPath: path,
        resolved: null,
        error: null,
        path,
      };
    }

    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      await initializeContentIndex();
    }

    try {
      const resolved = await resolveUrlToContent(path);
      return {
        isBrowserRoute: false,
        isPhotosRoute: false,
        isTerminalRoute: false,
        isFinderRoute: false,
        resolved,
        error: null,
        path,
      };
    } catch (error) {
      return {
        isBrowserRoute: false,
        isPhotosRoute: false,
        isTerminalRoute: false,
        isFinderRoute: false,
        resolved: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        path,
      };
    }
  },
  component: PathComponent,
});

type OpenWindowFunction = (
  window: Omit<Window, 'id' | 'zIndex' | 'isMinimized' | 'appName'> & { appName?: string }
) => void;

const handlePhotosRoute = (
  path: string | undefined,
  album: string | undefined,
  photo: string | undefined,
  openWindow: OpenWindowFunction
) => {
  const { windows, updateWindow, focusWindow } = useWindowStore.getState();
  const existingPhotosWindow = windows.find((w) => w.type === 'photos' && !w.isMinimized);

  let albumPath: string | undefined;
  let selectedPhotoIndex: number | undefined;
  let photoUrlPath: string | undefined;

  const pathParts = (path || '').split('/').filter(Boolean);

  if (pathParts.length >= 2 && pathParts[0] === 'photos') {
    const albumName = pathParts[1];
    const photoName = pathParts[2];

    if (photoName) {
      // Content index stores urlPath WITHOUT extension, so look up without extension
      const testPath =
        albumName === 'desktop' ? photoName : `dock/photos/${albumName}/${photoName}`;
      const foundPhoto = getPhotoByPath(testPath);

      if (foundPhoto) {
        photoUrlPath = foundPhoto.urlPath;
        const photos = getAlbumPhotos(foundPhoto.albumPath);
        const index = photos.findIndex((p) => p.id === foundPhoto.id);
        if (index !== -1) {
          selectedPhotoIndex = index;
          albumPath = foundPhoto.albumPath;
        }
      }
    } else {
      albumPath = `dock/photos/${albumName}`;
    }
  } else {
    if (album) {
      albumPath = decodeURIComponent(album);
    }

    if (photo) {
      const photoPath = decodeURIComponent(photo);
      const photoData = getPhotoByPath(photoPath);
      if (photoData) {
        const photos = getAlbumPhotos(photoData.albumPath);
        const index = photos.findIndex((p) => p.id === photoData.id);
        if (index !== -1) {
          selectedPhotoIndex = index;
          albumPath = photoData.albumPath;
          photoUrlPath = photoData.urlPath;
        }
      }
    }
  }

  if (existingPhotosWindow) {
    focusWindow(existingPhotosWindow.id);

    const currentState = existingPhotosWindow;
    const willChange =
      currentState.albumPath !== albumPath ||
      currentState.selectedPhotoIndex !== selectedPhotoIndex ||
      currentState.urlPath !== (photoUrlPath || existingPhotosWindow.urlPath);

    if (!willChange) {
      return;
    }

    updateWindow(
      existingPhotosWindow.id,
      {
        albumPath,
        selectedPhotoIndex,
        urlPath: photoUrlPath || existingPhotosWindow.urlPath,
      },
      { skipRouteSync: true }
    );
    return;
  }

  const { width, height } = WINDOW_DIMENSIONS.photos;
  const position = getCenteredWindowPosition(width, height);

  openWindow({
    type: 'photos',
    title: 'Photos',
    content: '',
    position,
    size: { width, height },
    albumPath,
    selectedPhotoIndex,
    urlPath: photoUrlPath,
  });
};

const handleTerminalRoute = (openWindow: OpenWindowFunction) => {
  const { windows, focusWindow } = useWindowStore.getState();
  const existingTerminalWindow = windows.find((w) => w.type === 'terminal' && !w.isMinimized);

  if (existingTerminalWindow) {
    focusWindow(existingTerminalWindow.id);
    return;
  }

  const { width, height } = WINDOW_DIMENSIONS.terminal;
  const position = getCenteredWindowPosition(width, height);

  openWindow({
    type: 'terminal',
    title: 'Terminal',
    content: '',
    position,
    size: { width, height },
  });
};

const handleFinderRoute = (finderPath: string, openWindow: OpenWindowFunction) => {
  const { windows, focusWindow } = useWindowStore.getState();

  // Normalize paths for comparison (remove leading slashes)
  const normalizedFinderPath = finderPath.replace(/^\//, '');

  const existingFinderWindow = windows.find(
    (w) =>
      w.type === 'finder' &&
      (w.currentPath || '').replace(/^\//, '') === normalizedFinderPath &&
      !w.isMinimized
  );

  if (existingFinderWindow) {
    focusWindow(existingFinderWindow.id);
    return;
  }

  const pathParts = finderPath.split('/').filter(Boolean);
  const title = pathParts.length > 1 ? pathParts[pathParts.length - 1] : 'Finder';
  const capitalizedTitle = title.charAt(0).toUpperCase() + title.slice(1);

  // Ensure we use the path with a leading slash for consistency in the window store
  const windowPath = finderPath.startsWith('/') ? finderPath : `/${finderPath}`;

  const { width, height } = WINDOW_DIMENSIONS.finder;
  const position = getCenteredWindowPosition(width, height);

  openWindow({
    type: 'finder',
    title: capitalizedTitle,
    content: '',
    position,
    size: { width, height },
    currentPath: windowPath,
    viewMode: 'icon',
    navigationHistory: [windowPath],
    navigationIndex: 0,
    appName: 'Finder',
  });
};

function PathComponent() {
  const {
    resolved,
    error,
    isBrowserRoute,
    isPhotosRoute,
    isTerminalRoute,
    isFinderRoute,
    finderPath,
    path,
  } = Route.useLoaderData();
  const { url, album, photo } = Route.useSearch();
  const { getOrCreateBrowserWindow, focusWindow, navigateToUrl, openWindowFromUrl, openWindow } =
    useWindowStore();

  useEffect(() => {
    if (isBrowserRoute) {
      const browserWindow = getOrCreateBrowserWindow();

      if (browserWindow) {
        focusWindow(browserWindow.id);

        if (url) {
          try {
            const decodedUrl = decodeURIComponent(url);
            if (decodedUrl !== browserWindow.url) {
              navigateToUrl(browserWindow.id, decodedUrl, undefined, true);
            }
          } catch (e) {
            console.error('Failed to decode URL:', e);
          }
        }
      }
      return;
    }

    if (isPhotosRoute) {
      const indexState = useContentIndex.getState();
      if (!indexState.isIndexed) {
        initializeContentIndex().then(() => {
          handlePhotosRoute(path, album, photo, openWindow);
        });
        return;
      }

      handlePhotosRoute(path, album, photo, openWindow);
      return;
    }

    if (isTerminalRoute) {
      handleTerminalRoute(openWindow);
      return;
    }

    if (isFinderRoute && finderPath) {
      handleFinderRoute(finderPath, openWindow);
      return;
    }

    if (resolved && !error) {
      const entry: ContentIndexEntry = resolved.entry;
      openWindowFromUrl(entry.urlPath, resolved.content, {
        appType: entry.appType,
        metadata: entry.metadata,
        fileExtension: entry.fileExtension,
      });
    }
  }, [
    isBrowserRoute,
    isPhotosRoute,
    isTerminalRoute,
    isFinderRoute,
    finderPath,
    path,
    url,
    album,
    photo,
    getOrCreateBrowserWindow,
    focusWindow,
    navigateToUrl,
    resolved,
    error,
    openWindowFromUrl,
    openWindow,
  ]);

  return (
    <>
      <Desktop />
      {error && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
          <div className="aqua-window max-w-md p-6">
            <h2 className="font-ui mb-4 text-lg font-semibold">File Not Found</h2>
            <p className="font-ui text-sm">{error}</p>
          </div>
        </div>
      )}
    </>
  );
}
