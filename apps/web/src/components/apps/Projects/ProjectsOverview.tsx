import ProjectCard from '@/components/apps/Projects/ProjectCard';
import type { ProjectSummary } from '@/lib/projectsContent';

interface ProjectsOverviewProps {
  projects: ProjectSummary[];
  onSelectProject: (slug: string) => void;
}

const ProjectsOverview = ({ projects, onSelectProject }: ProjectsOverviewProps) => {
  if (projects.length === 0) {
    return (
      <div className="flex h-full items-center justify-center bg-white p-8">
        <div className="max-w-[420px] text-center">
          <h1 className="font-ui text-[18px] font-semibold text-[var(--color-text-primary)]">
            Selected Work
          </h1>
          <p className="font-ui mt-2 text-[12px] leading-5 text-[var(--color-text-secondary)]">
            Case studies are being prepared. Check back soon for product and interface work.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#f8f8f8]">
      <header className="border-b border-[#d2d2d2] bg-white px-8 py-7">
        <p className="font-ui text-[10px] font-semibold tracking-[0.12em] text-[var(--color-aqua-blue)] uppercase">
          Portfolio
        </p>
        <h1 className="font-ui mt-1 text-[24px] font-semibold tracking-tight text-[var(--color-text-primary)]">
          Selected Work
        </h1>
        <p className="font-ui mt-2 max-w-[620px] text-[13px] leading-5 text-[var(--color-text-secondary)]">
          Product and interface case studies focused on clear systems, thoughtful interaction, and
          practical outcomes.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-5 p-6">
        {projects.map((project) => (
          <ProjectCard key={project.slug} project={project} onSelect={onSelectProject} />
        ))}
      </div>
    </div>
  );
};

export default ProjectsOverview;
