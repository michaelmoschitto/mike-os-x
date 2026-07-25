interface ProjectsLoadingStateProps {
  message?: string;
}

const ProjectsLoadingState = ({
  message = 'Loading selected work…',
}: ProjectsLoadingStateProps) => {
  return (
    <div
      className="flex h-full flex-1 items-center justify-center bg-white"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--color-border-subtle)] border-t-[var(--color-aqua-blue)] motion-reduce:animate-none" />
        <p className="font-ui text-[12px] text-[var(--color-text-secondary)]">{message}</p>
      </div>
    </div>
  );
};

export default ProjectsLoadingState;
