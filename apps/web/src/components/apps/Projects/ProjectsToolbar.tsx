import { cn } from '@/lib/utils';

interface ProjectsToolbarProps {
  hasSelectedProject: boolean;
  showSidebar: boolean;
  onShowAll: () => void;
  onToggleSidebar: () => void;
  onCopyLink: () => void;
  onLock: () => void;
}

const ProjectsToolbar = ({
  hasSelectedProject,
  showSidebar,
  onShowAll,
  onToggleSidebar,
  onCopyLink,
  onLock,
}: ProjectsToolbarProps) => {
  return (
    <div className="aqua-pinstripe flex h-[46px] flex-shrink-0 items-center justify-between border-b border-[var(--color-border-subtle)] px-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          className={cn(
            'aqua-button-base flex h-[22px] w-[28px] items-center justify-center',
            showSidebar && 'aqua-button-blue'
          )}
          aria-label={showSidebar ? 'Hide project sidebar' : 'Show project sidebar'}
          title={showSidebar ? 'Hide Sidebar' : 'Show Sidebar'}
          onClick={onToggleSidebar}
        >
          <svg width="13" height="12" viewBox="0 0 13 12" fill="none" aria-hidden="true">
            <rect x="1" y="1" width="11" height="10" rx="1" stroke="currentColor" />
            <path d="M4.5 1V11" stroke="currentColor" />
          </svg>
        </button>
        <div className="aqua-toolbar-divider h-[24px]" />
        <button
          type="button"
          className="aqua-button-base font-ui flex h-[22px] items-center gap-1 px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedProject}
          onClick={onShowAll}
        >
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path
              d="M7.5 9L4.5 6L7.5 3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          All Projects
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="aqua-button-base font-ui h-[22px] px-2 text-[11px] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!hasSelectedProject}
          onClick={onCopyLink}
        >
          Copy Link
        </button>
        <button
          type="button"
          className="aqua-button-base font-ui h-[22px] px-2 text-[11px]"
          onClick={onLock}
        >
          Lock
        </button>
      </div>
    </div>
  );
};

export default ProjectsToolbar;
