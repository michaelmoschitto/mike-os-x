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
    <div className="aqua-pinstripe flex h-[52px] items-center justify-between border-b border-[var(--color-border-subtle)] px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <button
            className={cn(
              'aqua-button-base flex h-[22px] w-[22px] items-center justify-center',
              !canGoBack && 'cursor-not-allowed opacity-50'
            )}
            onClick={onBack}
            disabled={!canGoBack}
            title="Back"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
              'aqua-button-base flex h-[22px] w-[22px] items-center justify-center',
              !canGoForward && 'cursor-not-allowed opacity-50'
            )}
            onClick={onForward}
            disabled={!canGoForward}
            title="Forward"
          >
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
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
        <div className="aqua-toolbar-divider h-[24px]" />
      </div>
      <div className="aqua-segmented-group">
        <button
          className={cn(
            'aqua-button-base flex h-[20px] w-[28px] items-center justify-center',
            viewMode === 'icon' && 'aqua-button-blue'
          )}
          onClick={() => onViewModeChange('icon')}
          title="Icon View"
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
            viewMode === 'list' && 'aqua-button-blue'
          )}
          onClick={() => onViewModeChange('list')}
          title="List View"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-80">
            <line x1="1" y1="2.5" x2="13" y2="2.5" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="8.5" x2="13" y2="8.5" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="11.5" x2="13" y2="11.5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          className={cn(
            'aqua-button-base flex h-[20px] w-[28px] items-center justify-center',
            viewMode === 'column' && 'aqua-button-blue'
          )}
          onClick={() => onViewModeChange('column')}
          title="Column View"
        >
          <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="opacity-80">
            <rect x="1" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
            <rect x="5.5" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
            <rect x="10" y="1" width="3" height="12" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default FinderToolbar;
