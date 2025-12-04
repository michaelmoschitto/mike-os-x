import { useNavigate } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import PhotosGrid from '@/components/apps/Photos/PhotosGrid';
import PhotosInfoSidebar from '@/components/apps/Photos/PhotosInfoSidebar';
import PhotosSidebar from '@/components/apps/Photos/PhotosSidebar';
import PhotosSingleView from '@/components/apps/Photos/PhotosSingleView';
import PhotosToolbar from '@/components/apps/Photos/PhotosToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { getPhotoAlbums, getAlbumPhotos, type PhotoData } from '@/lib/photosContent';
import { buildPhotoRoute, buildAlbumRoute } from '@/lib/photosRouting';
import { cn } from '@/lib/utils';
import { showCompactNotification } from '@/stores/notificationHelpers';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface PhotosWindowProps {
  window: WindowType;
  isActive: boolean;
}

const PhotosWindow = ({ window: windowData, isActive }: PhotosWindowProps) => {
  const navigate = useNavigate();
  const {
    updateWindow,
    closeWindow,
    focusWindow,
    minimizeWindow,
    updateWindowPosition,
    updateWindowSize,
  } = useWindowStore();
  const selectedPhotoIndex = windowData.selectedPhotoIndex ?? null;
  const isSlideshow = windowData.isSlideshow ?? false;

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
      navigate({ to: route });
    },
    [navigate]
  );

  const handleCloseSingleView = useCallback(() => {
    const route = buildAlbumRoute(albumPath);
    navigate({ to: route });
  }, [albumPath, navigate]);

  const handleAlbumChange = useCallback(
    (newAlbumPath?: string) => {
      const route = buildAlbumRoute(newAlbumPath);
      navigate({ to: route });
    },
    [navigate]
  );

  const handleViewModeChange = useCallback(
    (mode: 'grid' | 'slideshow') => {
      if (mode === 'slideshow' && photos.length > 0 && selectedPhotoIndex === null) {
        const firstPhoto = photos[0];
        const route = buildPhotoRoute(firstPhoto);
        navigate({ to: route });
      } else if (mode === 'grid') {
        updateWindow(windowData.id, { isSlideshow: false }, { skipRouteSync: true });
      }
    },
    [photos, selectedPhotoIndex, navigate, updateWindow, windowData.id]
  );

  const handleNextPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const nextIndex = selectedPhotoIndex === null ? 0 : (selectedPhotoIndex + 1) % photos.length;
    const nextPhoto = photos[nextIndex];
    const route = buildPhotoRoute(nextPhoto);
    navigate({ to: route });
  }, [photos, selectedPhotoIndex, navigate]);

  const handlePreviousPhoto = useCallback(() => {
    if (photos.length === 0) return;
    const prevIndex =
      selectedPhotoIndex === null
        ? photos.length - 1
        : (selectedPhotoIndex - 1 + photos.length) % photos.length;
    const prevPhoto = photos[prevIndex];
    const route = buildPhotoRoute(prevPhoto);
    navigate({ to: route });
  }, [photos, selectedPhotoIndex, navigate]);

  const handleClose = () => {
    closeWindow(windowData.id);
  };

  const handleFocus = () => {
    focusWindow(windowData.id);
  };

  const handleMinimize = () => {
    minimizeWindow(windowData.id);
  };

  const handleDragEnd = (position: { x: number; y: number }) => {
    updateWindowPosition(windowData.id, position);
  };

  const handleResize = (size: { width: number; height: number }) => {
    updateWindowSize(windowData.id, size);
  };

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
            <div className={cn(showSingleView && 'h-[200px] flex-shrink-0')}>
              <PhotosGrid photos={photos} onPhotoClick={handlePhotoClick} />
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
