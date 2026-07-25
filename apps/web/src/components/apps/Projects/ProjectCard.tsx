import { useState } from 'react';

import type { ProjectSummary } from '@/lib/projectsContent';

interface ProjectCardProps {
  project: ProjectSummary;
  onSelect: (slug: string) => void;
}

const ProjectCard = ({ project, onSelect }: ProjectCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <button
      type="button"
      className="group overflow-hidden rounded-[5px] border border-[#b8b8b8] bg-white text-left shadow-[0_1px_3px_rgba(0,0,0,0.12)] transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-px hover:border-[#7f9fc7] hover:shadow-[0_4px_12px_rgba(0,0,0,0.16)] focus-visible:ring-2 focus-visible:ring-[var(--color-aqua-blue)] focus-visible:ring-offset-2 focus-visible:outline-none motion-reduce:transform-none motion-reduce:transition-none"
      aria-label={`Open case study: ${project.title}`}
      onClick={() => onSelect(project.slug)}
    >
      <div className="flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-[#c8c8c8] bg-[#eef0f3]">
        {imageFailed ? (
          <span className="font-ui px-4 text-center text-[11px] text-[var(--color-text-secondary)]">
            Preview unavailable
          </span>
        ) : (
          <img
            src={project.thumbnailUrl}
            alt={project.thumbnailAlt}
            className="h-full w-full object-contain"
            loading="lazy"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="p-4">
        <div className="mb-1 flex items-start justify-between gap-3">
          <h2 className="font-ui text-[15px] font-semibold tracking-tight text-[var(--color-text-primary)]">
            {project.title}
          </h2>
          <span className="font-ui flex-shrink-0 text-[10px] text-[var(--color-text-secondary)]">
            {project.timeline}
          </span>
        </div>
        <p className="font-ui text-[11px] font-semibold text-[var(--color-aqua-blue)]">
          {project.role}
        </p>
        <p className="font-ui mt-2 line-clamp-3 text-[12px] leading-[1.55] text-[var(--color-text-secondary)]">
          {project.summary}
        </p>
      </div>
    </button>
  );
};

export default ProjectCard;
