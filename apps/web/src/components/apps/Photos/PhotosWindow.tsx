import { useCallback, useEffect, useMemo, useState } from 'react';

import PhotosGrid from '@/components/apps/Photos/PhotosGrid';
import PhotosInfoSidebar from '@/components/apps/Photos/PhotosInfoSidebar';
import PhotosSidebar from '@/components/apps/Photos/PhotosSidebar';
import PhotosSingleView from '@/components/apps/Photos/PhotosSingleView';
import PhotosToolbar from '@/components/apps/Photos/PhotosToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { useWindowNavigation } from '@/lib/hooks/useWindowNavigation';
import { getPhotoAlbums, getAlbumPhotos, type PhotoData } from '@/lib/photosContent';
import { parseWindowIdentifiersFromUrl } from '@/lib/routing/windowSerialization';
import { cn } from '@/lib/utils';
import { showCompactNotification } from '@/stores/notificationHelpers';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

// Helper functions to build photo routes (inline replacements for deleted photosRouting.ts)
const removeFileExtension = (filename: string): string => {
  return filename.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
};

const buildPhotoRoute = (photo: PhotoData): string => {
  const normalizedPath = photo.urlPath.startsWith('/') ? photo.urlPath.slice(1) : photo.urlPath;
  const pathParts = normalizedPath.split('/').filter(Boolean);

  // Photos in dock/photos/album structure
  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/?w=photos:${albumName}:${photoNameWithoutExt}`;
  }

  // Desktop photos
  if (pathParts.length > 0 && pathParts[0] !== 'dock') {
    const photoName = pathParts[pathParts.length - 1];
    const photoNameWithoutExt = removeFileExtension(photoName);
    return `/?w=photos:desktop:${photoNameWithoutExt}`;
  }

  return `/?w=photos`;
};

const buildAlbumRoute = (albumPath?: string): string => {
  if (!albumPath) {
    return '/?w=photos';
  }

  const normalizedAlbumPath = albumPath.startsWith('/') ? albumPath.slice(1) : albumPath;
  const pathParts = normalizedAlbumPath.split('/').filter(Boolean);

  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    return `/?w=photos:${albumName}`;
  }

  return '/?w=photos';
};

interface PhotosWindowProps {
  window: WindowType;
  isActive: boolean;
}

const PhotosWindow = ({ window: windowData, isActive }: PhotosWindowProps) => {
  const { updateWindow } = useWindowStore();
  const { addWindow } = useWindowNavigation();
  const selectedPhotoIndex = windowData.selectedPhotoIndex ?? null;
  const isSlideshow = windowData.isSlideshow ?? false;

  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const [slideshowPaused, setSlideshowPaused] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(true);

  const albumPath = windowData.albumPath;
  const isIndexed = useContentIndex((state) => state.isIndexed);
  const albums = useMemo(() => {
    if (!isIndexed) return [];
    return getPhotoAlbums();
  }, [isIndexed]);
  const photos = useMemo(() => {
    if (!isIndexed) return [];
    return getAlbumPhotos(albumPath);
  }, [albumPath, isIndexed]);

  const selectedPhoto = useMemo(() => {
    if (selectedPhotoIndex === null) return null;
    return photos[selectedPhotoIndex] || null;
  }, [selectedPhotoIndex, photos]);

  const handlePhotoClick = useCallback(
    (photo: PhotoData) => {
      const route = buildPhotoRoute(photo);
      const windowIdentifier = route.replace('/?w=', '').split('&')[0];
      const existingWindows = parseWindowIdentifiersFromUrl();
      const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
      addWindow(nonPhotosWindows, windowIdentifier);
    },
    [addWindow]
  );

  const handleCloseSingleView = useCallback(() => {
    const route = buildAlbumRoute(albumPath);
    const windowIdentifier = route.replace('/?w=', '').split('&')[0];
    const existingWindows = parseWindowIdentifiersFromUrl();
    const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
    addWindow(nonPhotosWindows, windowIdentifier);
  }, [albumPath, addWindow]);

  const handleAlbumChange = useCallback(
    (newAlbumPath?: string) => {
      const route = buildAlbumRoute(newAlbumPath);
      const windowIdentifier = route.replace('/?w=', '').split('&')[0];
      const existingWindows = parseWindowIdentifiersFromUrl();
      const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
      addWindow(nonPhotosWindows, windowIdentifier);
    },
    [addWindow]
  );

  const handleViewModeChange = useCallback(
    (mode: 'grid' | 'slideshow') => {
      if (mode === 'slideshow' && photos.length > 0 && selectedPhotoIndex === null) {
        const firstPhoto = photos[0];
        const route = buildPhotoRoute(firstPhoto);
        const windowIdentifier = route.replace('/?w=', '').split('&')[0];
        const existingWindows = parseWindowIdentifiersFromUrl();
        const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
        addWindow(nonPhotosWindows, windowIdentifier);
      } else if (mode === 'grid') {
        updateWindow(windowData.id, { isSlideshow: false }, { skipRouteSync: true });
      }
    },
    [photos, selectedPhotoIndex, updateWindow, windowData.id, addWindow]
  );

  const handleNextPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const nextIndex = selectedPhotoIndex === null ? 0 : (selectedPhotoIndex + 1) % photos.length;
    const nextPhoto = photos[nextIndex];
    const route = buildPhotoRoute(nextPhoto);
    const windowIdentifier = route.replace('/?w=', '').split('&')[0];
    const existingWindows = parseWindowIdentifiersFromUrl();
    const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
    addWindow(nonPhotosWindows, windowIdentifier);
  }, [photos, selectedPhotoIndex, addWindow]);

  const handlePreviousPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const prevIndex =
      selectedPhotoIndex === null
        ? photos.length - 1
        : (selectedPhotoIndex - 1 + photos.length) % photos.length;
    const prevPhoto = photos[prevIndex];
    const route = buildPhotoRoute(prevPhoto);
    const windowIdentifier = route.replace('/?w=', '').split('&')[0];
    const existingWindows = parseWindowIdentifiersFromUrl();
    const nonPhotosWindows = existingWindows.filter((id) => !id.startsWith('photos'));
    addWindow(nonPhotosWindows, windowIdentifier);
  }, [photos, selectedPhotoIndex, addWindow]);

  const handleShare = useCallback(async () => {
    if (!selectedPhoto) return;

    const photoUrl = buildPhotoRoute(selectedPhoto);
    const fullUrl = `${window.location.origin}${photoUrl}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      showCompactNotification('URL Copied', 'Photo URL copied to clipboard', { type: 'success' });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      showCompactNotification('Error', 'Failed to copy URL');
    }
  }, [selectedPhoto]);

  useEffect(() => {
    if (!useContentIndex.getState().isIndexed) {
      import('@/lib/contentIndex').then(({ initializeContentIndex }) => {
        initializeContentIndex();
      });
    }
  }, []);

  useEffect(() => {
    if (!isSlideshow || slideshowPaused || photos.length === 0) return;

    const interval = setInterval(() => {
      handleNextPhoto();
    }, 3000);

    return () => clearInterval(interval);
  }, [isSlideshow, slideshowPaused, photos.length, handleNextPhoto]);

  const showSingleView = selectedPhotoIndex !== null && selectedPhoto !== null;

  return (
    <Window
      id={windowData.id}
      title="Photos"
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
      <div className="relative flex h-full flex-col">
        <PhotosToolbar
          albums={albums}
          currentAlbumPath={albumPath}
          isSlideshow={isSlideshow}
          slideshowPaused={slideshowPaused}
          showInfoSidebar={showInfoSidebar}
          selectedPhoto={selectedPhoto}
          onAlbumChange={handleAlbumChange}
          onViewModeChange={handleViewModeChange}
          onSlideshowPause={() => setSlideshowPaused(!slideshowPaused)}
          onToggleInfo={() => setShowInfoSidebar(!showInfoSidebar)}
          onShare={handleShare}
        />
        <div className="flex flex-1 overflow-hidden">
          <PhotosSidebar
            albums={albums}
            currentAlbumPath={albumPath}
            onAlbumChange={handleAlbumChange}
          />
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
            {showSingleView && selectedPhoto && selectedPhotoIndex !== null && (
              <PhotosSingleView
                photo={selectedPhoto}
                photos={photos}
                currentIndex={selectedPhotoIndex}
                onClose={handleCloseSingleView}
                onNext={handleNextPhoto}
                onPrevious={handlePreviousPhoto}
              />
            )}
            <div
              className={cn('flex min-h-0', showSingleView ? 'h-[200px] flex-shrink-0' : 'flex-1')}
            >
              <PhotosGrid
                photos={photos}
                onPhotoClick={handlePhotoClick}
                selectedIndex={showSingleView ? selectedPhotoIndex : null}
                isCarouselMode={showSingleView}
              />
            </div>
          </div>
          {showInfoSidebar && showSingleView && selectedPhoto && selectedPhotoIndex !== null && (
            <PhotosInfoSidebar
              photo={selectedPhoto}
              currentIndex={selectedPhotoIndex}
              totalPhotos={photos.length}
            />
          )}
        </div>
      </div>
    </Window>
  );
};

export default PhotosWindow;
