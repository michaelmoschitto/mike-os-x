import { cn } from '@/lib/utils';
import type { AlbumData } from '@/lib/photosContent';

interface PhotosToolbarProps {
  albums: AlbumData[];
  currentAlbumPath?: string;
  isSlideshow: boolean;
  slideshowPaused: boolean;
  showInfoSidebar: boolean;
  onAlbumChange: (albumPath?: string) => void;
  onViewModeChange: (mode: 'grid' | 'slideshow') => void;
  onSlideshowPause: () => void;
  onToggleInfo: () => void;
}

const PhotosToolbar = ({
  albums,
  currentAlbumPath,
  isSlideshow,
  slideshowPaused,
  showInfoSidebar,
  onAlbumChange,
  onViewModeChange,
  onSlideshowPause,
  onToggleInfo,
}: PhotosToolbarProps) => {
  const currentAlbum = albums.find((a) => a.path === currentAlbumPath) || {
    name: 'All Photos',
    path: undefined,
  };

  return (
    <div className="aqua-pinstripe flex h-[52px] items-center justify-between border-b border-[var(--color-border-subtle)] px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Search"
            className="aqua-input h-[22px] w-[200px] rounded border border-[var(--color-border-subtle)] bg-white/50 px-2 text-[11px] font-ui focus:outline-none focus:ring-1 focus:ring-[var(--color-aqua-blue)]"
          />
        </div>
        <div className="aqua-toolbar-divider h-[24px]" />
        <div className="flex items-center gap-1">
          <select
            value={currentAlbum.path || ''}
            onChange={(e) => onAlbumChange(e.target.value || undefined)}
            className="aqua-button-base h-[22px] rounded border border-[var(--color-border-subtle)] bg-white/50 px-2 text-[11px] font-ui focus:outline-none focus:ring-1 focus:ring-[var(--color-aqua-blue)]"
          >
            <option value="">All Photos</option>
            {albums.map((album) => (
              <option key={album.path} value={album.path}>
                {album.name} ({album.photoCount})
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isSlideshow && (
          <button
            className="aqua-button-base flex h-[22px] items-center gap-1 px-2 text-[11px] font-ui"
            onClick={onSlideshowPause}
            title={slideshowPaused ? 'Resume Slideshow' : 'Pause Slideshow'}
          >
            {slideshowPaused ? (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M2 2h2v8H2V2zm6 0h2v8H8V2z" />
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <path d="M3 2h2v8H3V2zm4 0h2v8H7V2z" />
              </svg>
            )}
            {slideshowPaused ? 'Resume' : 'Pause'}
          </button>
        )}
        <div className="aqua-segmented-group">
          <button
            className={cn(
              'aqua-button-base flex h-[20px] w-[28px] items-center justify-center',
              !isSlideshow && 'aqua-button-blue'
            )}
            onClick={() => onViewModeChange('grid')}
            title="Grid View"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-80">
              <rect x="1" y="1" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1" />
              <rect x="8.5" y="1" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1" />
              <rect x="1" y="8.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1" />
              <rect x="8.5" y="8.5" width="4.5" height="4.5" stroke="currentColor" strokeWidth="1" />
            </svg>
          </button>
          <button
            className={cn(
              'aqua-button-base flex h-[20px] w-[28px] items-center justify-center',
              isSlideshow && 'aqua-button-blue'
            )}
            onClick={() => onViewModeChange('slideshow')}
            title="Slideshow"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-80">
              <path
                d="M3 2L11 7L3 12V2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="currentColor"
              />
            </svg>
          </button>
        </div>
        <div className="aqua-toolbar-divider h-[24px]" />
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'aqua-button-base flex h-[22px] w-[28px] items-center justify-center',
              showInfoSidebar && 'aqua-button-blue'
            )}
            onClick={onToggleInfo}
            title="Show Information"
            type="button"
          >
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-80">
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M7 4V7M7 10H7.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <button
            className="aqua-button-base flex h-[22px] items-center gap-1 px-2 text-[11px] font-ui"
            title="Move View"
            type="button"
          >
            Move View
          </button>
          <button
            className="aqua-button-base flex h-[22px] items-center gap-1 px-2 text-[11px] font-ui"
            title="Slideshow"
            type="button"
          >
            Slideshow
          </button>
          <button
            className="aqua-button-base flex h-[22px] items-center gap-1 px-2 text-[11px] font-ui"
            title="Share"
            type="button"
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhotosToolbar;

