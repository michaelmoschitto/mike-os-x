import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from '@tanstack/react-router';

import PhotosGrid from '@/components/apps/Photos/PhotosGrid';
import PhotosInfoSidebar from '@/components/apps/Photos/PhotosInfoSidebar';
import PhotosSidebar from '@/components/apps/Photos/PhotosSidebar';
import PhotosSingleView from '@/components/apps/Photos/PhotosSingleView';
import PhotosToolbar from '@/components/apps/Photos/PhotosToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { getPhotoAlbums, getAlbumPhotos, type PhotoData } from '@/lib/photosContent';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface PhotosWindowProps {
  window: WindowType;
  isActive: boolean;
}

const buildPhotoUrl = (photo: PhotoData): string => {
  const urlPath = photo.urlPath.startsWith('/') ? photo.urlPath.slice(1) : photo.urlPath;
  const pathParts = urlPath.split('/').filter(Boolean);
  
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
  
  return `/photos?photo=${encodeURIComponent(photo.urlPath)}`;
};

const buildAlbumUrl = (albumPath?: string): string => {
  if (!albumPath) {
    return '/photos';
  }
  
  const normalizedAlbumPath = albumPath.startsWith('/') ? albumPath.slice(1) : albumPath;
  const pathParts = normalizedAlbumPath.split('/').filter(Boolean);
  
  if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
    const albumName = pathParts[2];
    return `/photos/${albumName}`;
  }
  
  return `/photos?album=${encodeURIComponent(albumPath)}`;
};

const PhotosWindow = ({ window: windowData, isActive }: PhotosWindowProps) => {
  const navigate = useNavigate();
  const { updateWindow, closeWindow, focusWindow, minimizeWindow, updateWindowPosition, updateWindowSize } = useWindowStore();
  
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

  const handlePhotoClick = (photo: PhotoData) => {
    const route = buildPhotoUrl(photo);
    navigate({ to: route });
  };

  const handleCloseSingleView = () => {
    const route = buildAlbumUrl(albumPath);
    navigate({ to: route });
  };

  const handleAlbumChange = (newAlbumPath?: string) => {
    const route = buildAlbumUrl(newAlbumPath);
    navigate({ to: route });
  };

  const handleViewModeChange = (mode: 'grid' | 'slideshow') => {
    if (mode === 'slideshow' && photos.length > 0 && selectedPhotoIndex === null) {
      const firstPhoto = photos[0];
      const route = buildPhotoUrl(firstPhoto);
      navigate({ to: route });
    } else if (mode === 'grid') {
      updateWindow(windowData.id, { isSlideshow: false }, { skipRouteSync: true });
    }
  };

  const handleNextPhoto = () => {
    if (photos.length === 0) return;
    const nextIndex = selectedPhotoIndex === null ? 0 : (selectedPhotoIndex + 1) % photos.length;
    const nextPhoto = photos[nextIndex];
    const route = buildPhotoUrl(nextPhoto);
    navigate({ to: route });
  };

  const handlePreviousPhoto = () => {
    if (photos.length === 0) return;
    const prevIndex =
      selectedPhotoIndex === null ? photos.length - 1 : (selectedPhotoIndex - 1 + photos.length) % photos.length;
    const prevPhoto = photos[prevIndex];
    const route = buildPhotoUrl(prevPhoto);
    navigate({ to: route });
  };

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
  }, [isSlideshow, slideshowPaused, selectedPhotoIndex, photos.length]);

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
          onAlbumChange={handleAlbumChange}
          onViewModeChange={handleViewModeChange}
          onSlideshowPause={() => setSlideshowPaused(!slideshowPaused)}
          onToggleInfo={() => setShowInfoSidebar(!showInfoSidebar)}
        />
        <div className="flex flex-1 overflow-hidden">
          <PhotosSidebar
            albums={albums}
            currentAlbumPath={albumPath}
            onAlbumChange={handleAlbumChange}
          />
          <div className="flex flex-1 flex-col overflow-hidden">
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
            <PhotosGrid photos={photos} onPhotoClick={handlePhotoClick} />
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
