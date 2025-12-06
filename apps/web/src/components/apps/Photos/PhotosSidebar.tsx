import type { AlbumData } from '@/lib/photosContent';
import { cn } from '@/lib/utils';

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
      <div className="flex flex-col overflow-y-auto max-h-full space-y-1">
        <button
          className={cn(
            'font-ui w-full rounded px-2 py-1 text-left text-[11px] flex-shrink-0',
            !currentAlbumPath
              ? 'bg-[var(--color-highlight)] text-white'
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
              'font-ui w-full rounded px-2 py-1 text-left text-[11px] flex-shrink-0',
              currentAlbumPath === album.path
                ? 'bg-[var(--color-highlight)] text-white'
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
