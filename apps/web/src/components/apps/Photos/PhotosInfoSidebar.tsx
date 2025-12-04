import type { PhotoData } from '@/lib/photosContent';

interface PhotosInfoSidebarProps {
  photo: PhotoData;
  currentIndex: number;
  totalPhotos: number;
}

const PhotosInfoSidebar = ({ photo, currentIndex, totalPhotos }: PhotosInfoSidebarProps) => {
  const formatDate = (date?: Date) => {
    if (!date) return '';
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-[250px] border-l border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-4 overflow-y-auto">
      <div className="font-ui mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
        Information
      </div>
      <div className="space-y-4">
        <div>
          <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">Title</div>
          <div className="font-ui text-sm text-[var(--color-text-primary)]">{photo.name}</div>
        </div>
        <div>
          <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">Album</div>
          <div className="font-ui text-sm text-[var(--color-text-primary)]">{photo.albumName}</div>
        </div>
        {photo.dateModified && (
          <div>
            <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">Date Modified</div>
            <div className="font-ui text-sm text-[var(--color-text-primary)]">{formatDate(photo.dateModified)}</div>
          </div>
        )}
        {photo.size && (
          <div>
            <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">Size</div>
            <div className="font-ui text-sm text-[var(--color-text-primary)]">{formatFileSize(photo.size)}</div>
          </div>
        )}
        <div>
          <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">File</div>
          <div className="font-ui text-xs text-[var(--color-text-secondary)] break-all">{photo.path}</div>
        </div>
        {totalPhotos > 1 && (
          <div>
            <div className="font-ui mb-1 text-[10px] font-semibold text-[var(--color-text-secondary)]">Position</div>
            <div className="font-ui text-sm text-[var(--color-text-primary)]">
              {currentIndex + 1} of {totalPhotos}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotosInfoSidebar;

