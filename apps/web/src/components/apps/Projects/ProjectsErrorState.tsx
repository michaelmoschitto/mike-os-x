import { AquaButton } from '@/components/ui/aqua';

interface ProjectsErrorStateProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

const ProjectsErrorState = ({
  title,
  message,
  actionLabel,
  onAction,
}: ProjectsErrorStateProps) => {
  return (
    <div className="flex h-full flex-1 items-center justify-center bg-white p-8" role="alert">
      <div className="max-w-[420px] text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full border border-[#c5a653] bg-[#fff8d7] text-[20px] text-[#7f651a]">
          !
        </div>
        <h2 className="font-ui text-[15px] font-semibold text-[var(--color-text-primary)]">
          {title}
        </h2>
        <p className="font-ui mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
          {message}
        </p>
        {actionLabel && onAction ? (
          <AquaButton className="mt-4" onClick={onAction}>
            {actionLabel}
          </AquaButton>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectsErrorState;
