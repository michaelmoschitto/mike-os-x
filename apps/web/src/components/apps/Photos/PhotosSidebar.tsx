import { cn } from '@/lib/utils';
import type { AlbumData } from '@/lib/photosContent';

interface PhotosSidebarProps {
  albums: AlbumData[];
  currentAlbumPath?: string;
  onAlbumChange: (albumPath?: string) => void;
}

const PhotosSidebar = ({ albums, currentAlbumPath, onAlbumChange }: PhotosSidebarProps) => {
  return (
    <div className="w-[200px] border-r border-[var(--color-border-subtle)] bg-[var(--color-bg-subtle)] p-2">
      <div className="font-ui mb-2 text-[11px] font-semibold text-[var(--color-text-secondary)]">
        Albums
      </div>
      <div className="space-y-1">
        <button
          className={cn(
            'w-full rounded px-2 py-1 text-left text-[11px] font-ui',
            !currentAlbumPath
              ? 'bg-[var(--color-aqua-blue)]/20 text-[var(--color-aqua-blue)]'
              : 'text-[var(--color-text-primary)] hover:bg-white/20'
          )}
          onClick={() => onAlbumChange(undefined)}
        >
          Recents
        </button>
        {albums.map((album) => (
          <button
            key={album.path}
            className={cn(
              'w-full rounded px-2 py-1 text-left text-[11px] font-ui',
              currentAlbumPath === album.path
                ? 'bg-[var(--color-aqua-blue)]/20 text-[var(--color-aqua-blue)]'
                : 'text-[var(--color-text-primary)] hover:bg-white/20'
            )}
            onClick={() => onAlbumChange(album.path)}
          >
            {album.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default PhotosSidebar;

