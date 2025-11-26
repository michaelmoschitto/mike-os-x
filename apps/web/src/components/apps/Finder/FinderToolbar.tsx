import { cn } from '@/lib/utils';

interface FinderToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  viewMode: 'icon' | 'list' | 'column';
  onBack: () => void;
  onForward: () => void;
  onViewModeChange: (mode: 'icon' | 'list' | 'column') => void;
}

const FinderToolbar = ({
  canGoBack,
  canGoForward,
  viewMode,
  onBack,
  onForward,
  onViewModeChange,
}: FinderToolbarProps) => {
  return (
    <div className="aqua-pinstripe flex h-[52px] items-center gap-2 border-b border-[var(--color-border-subtle)] px-3">
      <div className="flex items-center gap-1">
        <button
          className={cn(
            'aqua-button-base flex h-[28px] w-[28px] items-center justify-center',
            !canGoBack && 'cursor-not-allowed opacity-50'
          )}
          onClick={onBack}
          disabled={!canGoBack}
          title="Back"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M7.5 9L4.5 6L7.5 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        <button
          className={cn(
            'aqua-button-base flex h-[28px] w-[28px] items-center justify-center',
            !canGoForward && 'cursor-not-allowed opacity-50'
          )}
          onClick={onForward}
          disabled={!canGoForward}
          title="Forward"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M4.5 3L7.5 6L4.5 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
      <div className="aqua-toolbar-divider" />
      <div className="flex items-center gap-1">
        <button
          className={cn(
            'aqua-button-base flex h-[28px] w-[28px] items-center justify-center',
            viewMode === 'icon' && 'bg-[var(--color-highlight)] text-white'
          )}
          onClick={() => onViewModeChange('icon')}
          title="Icon View"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1" />
            <rect x="7" y="1" width="4" height="4" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1" />
            <rect x="7" y="7" width="4" height="4" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          className={cn(
            'aqua-button-base flex h-[28px] w-[28px] items-center justify-center',
            viewMode === 'list' && 'bg-[var(--color-highlight)] text-white'
          )}
          onClick={() => onViewModeChange('list')}
          title="List View"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="12" height="2" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="5" width="12" height="2" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="9" width="12" height="2" stroke="currentColor" strokeWidth="1" />
            <rect x="1" y="13" width="12" height="2" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          className={cn(
            'aqua-button-base flex h-[28px] w-[28px] items-center justify-center',
            viewMode === 'column' && 'bg-[var(--color-highlight)] text-white'
          )}
          onClick={() => onViewModeChange('column')}
          title="Column View"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
            <rect x="6" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
            <rect x="11" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FinderToolbar;
