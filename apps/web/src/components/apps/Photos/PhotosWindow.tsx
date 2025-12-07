import { useCallback, useEffect, useMemo, useState } from 'react';

import PhotosGrid from '@/components/apps/Photos/PhotosGrid';
import PhotosInfoSidebar from '@/components/apps/Photos/PhotosInfoSidebar';
import PhotosSidebar from '@/components/apps/Photos/PhotosSidebar';
import PhotosSingleView from '@/components/apps/Photos/PhotosSingleView';
import PhotosToolbar from '@/components/apps/Photos/PhotosToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { getPhotoAlbums, getAlbumPhotos, type PhotoData } from '@/lib/photosContent';
import { serializeWindow } from '@/lib/routing/windowSerialization';
import { cn } from '@/lib/utils';
import { showCompactNotification } from '@/stores/notificationHelpers';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

const removeFileExtension = (filename: string): string => {
  return filename.replace(/\.(jpg|jpeg|png|gif|webp|svg)$/i, '');
};

const buildPhotoRoute = (photo: PhotoData, photos: PhotoData[]): string => {
  // Find the photo index in the photos array
  const photoIndex = photos.findIndex((p) => p.id === photo.id);

  // Build a temporary window object to serialize
  const tempWindow: WindowType = {
    type: 'photos',
    id: 'temp',
    appName: 'Photos',
    title: 'Photos',
    content: '',
    position: { x: 0, y: 0 },
    size: { width: 800, height: 600 },
    zIndex: 0,
    isMinimized: false,
    albumPath: photo.albumPath,
    urlPath: photo.urlPath,
    selectedPhotoIndex: photoIndex !== -1 ? photoIndex : undefined,
  };

  const identifier = serializeWindow(tempWindow);
  if (!identifier) return '/?w=photos';

  return `/?w=${identifier}`;
};

interface PhotosWindowProps {
  window: WindowType;
  isActive: boolean;
}

const PhotosWindow = ({ window: windowData, isActive }: PhotosWindowProps) => {
  const { updateWindow } = useWindowStore();
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
      // Find the photo's index in the current album
      const photoIndex = photos.findIndex((p) => p.id === photo.id);
      if (photoIndex === -1) return;

      // Update the window store directly
      updateWindow(
        windowData.id,
        {
          selectedPhotoIndex: photoIndex,
          urlPath: photo.urlPath,
          albumPath: photo.albumPath,
        },
        { skipRouteSync: false }
      );
    },
    [photos, updateWindow, windowData.id]
  );

  const handleCloseSingleView = useCallback(() => {
    // Update window to close single view (clear selected photo)
    updateWindow(
      windowData.id,
      {
        selectedPhotoIndex: undefined,
        urlPath: undefined,
      },
      { skipRouteSync: false }
    );
  }, [updateWindow, windowData.id]);

  const handleAlbumChange = useCallback(
    (newAlbumPath?: string) => {
      // Update the window store directly with the new album path
      // This ensures the UI updates immediately, then URL sync will handle navigation
      updateWindow(
        windowData.id,
        {
          albumPath: newAlbumPath,
          selectedPhotoIndex: undefined,
          urlPath: undefined,
        },
        { skipRouteSync: false }
      );
    },
    [updateWindow, windowData.id]
  );

  const handleViewModeChange = useCallback(
    (mode: 'grid' | 'slideshow') => {
      if (mode === 'slideshow' && photos.length > 0 && selectedPhotoIndex === null) {
        // Start slideshow with first photo
        const firstPhoto = photos[0];
        const photoIndex = photos.findIndex((p) => p.id === firstPhoto.id);
        if (photoIndex !== -1) {
          updateWindow(
            windowData.id,
            {
              selectedPhotoIndex: photoIndex,
              urlPath: firstPhoto.urlPath,
              albumPath: firstPhoto.albumPath,
              isSlideshow: true,
            },
            { skipRouteSync: false }
          );
        }
      } else if (mode === 'grid') {
        updateWindow(windowData.id, { isSlideshow: false }, { skipRouteSync: false });
      }
    },
    [photos, selectedPhotoIndex, updateWindow, windowData.id]
  );

  const handleNextPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const nextIndex = selectedPhotoIndex === null ? 0 : (selectedPhotoIndex + 1) % photos.length;
    const nextPhoto = photos[nextIndex];
    updateWindow(
      windowData.id,
      {
        selectedPhotoIndex: nextIndex,
        urlPath: nextPhoto.urlPath,
        albumPath: nextPhoto.albumPath,
      },
      { skipRouteSync: false }
    );
  }, [photos, selectedPhotoIndex, updateWindow, windowData.id]);

  const handlePreviousPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const prevIndex =
      selectedPhotoIndex === null
        ? photos.length - 1
        : (selectedPhotoIndex - 1 + photos.length) % photos.length;
    const prevPhoto = photos[prevIndex];
    updateWindow(
      windowData.id,
      {
        selectedPhotoIndex: prevIndex,
        urlPath: prevPhoto.urlPath,
        albumPath: prevPhoto.albumPath,
      },
      { skipRouteSync: false }
    );
  }, [photos, selectedPhotoIndex, updateWindow, windowData.id]);

  const handleShare = useCallback(async () => {
    if (!selectedPhoto) return;

    const photoUrl = buildPhotoRoute(selectedPhoto, photos);
    const fullUrl = `${window.location.origin}${photoUrl}`;

    try {
      await navigator.clipboard.writeText(fullUrl);
      showCompactNotification('URL Copied', 'Photo URL copied to clipboard', { type: 'success' });
    } catch (error) {
      console.error('Failed to copy URL:', error);
      showCompactNotification('Error', 'Failed to copy URL');
    }
  }, [selectedPhoto, photos]);

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
