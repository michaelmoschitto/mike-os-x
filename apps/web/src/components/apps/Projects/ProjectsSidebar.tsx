import type { ProjectSummary } from '@/lib/projectsContent';
import { cn } from '@/lib/utils';

interface ProjectsSidebarProps {
  projects: ProjectSummary[];
  selectedSlug?: string;
  onSelectProject: (slug?: string) => void;
}

const ProjectsSidebar = ({ projects, selectedSlug, onSelectProject }: ProjectsSidebarProps) => {
  return (
    <aside className="aqua-pinstripe w-[200px] flex-shrink-0 overflow-y-auto border-r border-[var(--color-border-subtle)] p-2">
      <p className="font-ui px-2 pt-1 pb-2 text-[10px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
        Projects
      </p>
      <nav aria-label="Selected Work projects" className="space-y-1">
        <button
          type="button"
          className={cn(
            'font-ui w-full rounded px-2 py-1.5 text-left text-[11px] focus-visible:ring-2 focus-visible:ring-[var(--color-aqua-blue)] focus-visible:outline-none',
            !selectedSlug
              ? 'bg-[var(--color-highlight)] text-white'
              : 'text-[var(--color-text-primary)] hover:bg-white/60'
          )}
          onClick={() => onSelectProject()}
        >
          All Projects
        </button>
        {projects.map((project) => (
          <button
            key={project.slug}
            type="button"
            className={cn(
              'font-ui w-full rounded px-2 py-1.5 text-left text-[11px] focus-visible:ring-2 focus-visible:ring-[var(--color-aqua-blue)] focus-visible:outline-none',
              selectedSlug === project.slug
                ? 'bg-[var(--color-highlight)] text-white'
                : 'text-[var(--color-text-primary)] hover:bg-white/60'
            )}
            onClick={() => onSelectProject(project.slug)}
          >
            <span className="block truncate">{project.title}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default ProjectsSidebar;
