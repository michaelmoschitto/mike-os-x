import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import CaseStudyFigure, {
  type ScreenshotDetails,
} from '@/components/apps/Projects/CaseStudyFigure';
import ProjectsErrorState from '@/components/apps/Projects/ProjectsErrorState';
import ProjectsLoadingState from '@/components/apps/Projects/ProjectsLoadingState';
import ScreenshotDialog from '@/components/apps/Projects/ScreenshotDialog';
import {
  loadProjectArticle,
  type ProjectArticle,
  type ProjectSummary,
} from '@/lib/projectsContent';

interface CaseStudyArticleProps {
  project: ProjectSummary;
  onBack: () => void;
}

const CaseStudyArticle = ({ project, onBack }: CaseStudyArticleProps) => {
  const [article, setArticle] = useState<ProjectArticle | null>(null);
  const [error, setError] = useState('');
  const [screenshot, setScreenshot] = useState<ScreenshotDetails | null>(null);

  useEffect(() => {
    let isCancelled = false;

    setArticle(null);
    setError('');

    loadProjectArticle(project.slug)
      .then((loadedArticle) => {
        if (!isCancelled) setArticle(loadedArticle);
      })
      .catch(() => {
        if (!isCancelled) setError('The case study could not be loaded.');
      });

    return () => {
      isCancelled = true;
    };
  }, [project.slug]);

  if (error) {
    return (
      <ProjectsErrorState
        title="Unable to open this case study"
        message={error}
        actionLabel="All Projects"
        onAction={onBack}
      />
    );
  }

  if (!article) {
    return <ProjectsLoadingState message={`Loading ${project.title}…`} />;
  }

  return (
    <>
      <div className="h-full overflow-y-auto bg-white">
        <article>
          <header className="border-b border-[#d5d5d5] bg-[#f8f8f8] px-8 py-8">
            <div className="mx-auto max-w-[720px]">
              <p className="font-ui text-[10px] font-semibold tracking-[0.12em] text-[var(--color-aqua-blue)] uppercase">
                Case Study
              </p>
              <h1 className="font-ui mt-2 text-[28px] leading-[1.2] font-semibold tracking-tight text-[var(--color-text-primary)]">
                {project.title}
              </h1>
              <p className="font-ui mt-3 text-[15px] leading-6 text-[var(--color-text-secondary)]">
                {project.summary}
              </p>

              <dl className="mt-6 grid grid-cols-3 gap-5 border-t border-[#d8d8d8] pt-5">
                <div>
                  <dt className="font-ui text-[9px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                    Role
                  </dt>
                  <dd className="font-ui mt-1 text-[11px] text-[var(--color-text-primary)]">
                    {project.role}
                  </dd>
                </div>
                {project.team ? (
                  <div>
                    <dt className="font-ui text-[9px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                      Team
                    </dt>
                    <dd className="font-ui mt-1 text-[11px] text-[var(--color-text-primary)]">
                      {project.team}
                    </dd>
                  </div>
                ) : null}
                <div>
                  <dt className="font-ui text-[9px] font-semibold tracking-wide text-[var(--color-text-secondary)] uppercase">
                    Timeline
                  </dt>
                  <dd className="font-ui mt-1 text-[11px] text-[var(--color-text-primary)]">
                    {project.timeline}
                  </dd>
                </div>
              </dl>

              {project.tags.length > 0 ? (
                <ul className="mt-5 flex flex-wrap gap-2" aria-label="Project topics">
                  {project.tags.map((tag) => (
                    <li
                      key={tag}
                      className="font-ui rounded-full border border-[#c5c5c5] bg-white px-2.5 py-1 text-[10px] text-[var(--color-text-secondary)]"
                    >
                      {tag}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </header>

          <div className="mx-auto max-w-[720px] px-8 py-8">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => (
                  <h2 className="font-ui mt-10 mb-4 text-[21px] leading-tight font-semibold tracking-tight text-[var(--color-text-primary)] first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="font-ui mt-8 mb-3 text-[16px] leading-tight font-semibold text-[var(--color-text-primary)]">
                    {children}
                  </h3>
                ),
                p: ({ node, children }) => {
                  const firstChild = node?.children[0];
                  const isImageOnly =
                    node?.children.length === 1 &&
                    firstChild?.type === 'element' &&
                    firstChild.tagName === 'img';

                  if (isImageOnly) return <>{children}</>;

                  return (
                    <p className="font-ui my-4 text-[15px] leading-[1.68] text-[#343434]">
                      {children}
                    </p>
                  );
                },
                ul: ({ children }) => (
                  <ul className="font-ui my-4 list-disc space-y-2 pl-6 text-[15px] leading-[1.6] text-[#343434]">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="font-ui my-4 list-decimal space-y-2 pl-6 text-[15px] leading-[1.6] text-[#343434]">
                    {children}
                  </ol>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-6 border-l-[3px] border-[var(--color-aqua-blue)] bg-[#f4f7fb] px-5 py-1">
                    {children}
                  </blockquote>
                ),
                a: ({ href, children }) => {
                  const isExternal = href?.startsWith('http');
                  return (
                    <a
                      href={href}
                      className="font-medium text-[var(--color-aqua-blue)] underline decoration-[#9fc5eb] underline-offset-2 hover:decoration-[var(--color-aqua-blue)]"
                      target={isExternal ? '_blank' : undefined}
                      rel={isExternal ? 'noreferrer' : undefined}
                    >
                      {children}
                    </a>
                  );
                },
                img: ({ src, alt, title }) => (
                  <CaseStudyFigure
                    project={project}
                    src={src}
                    alt={alt}
                    caption={title}
                    onOpen={setScreenshot}
                  />
                ),
                hr: () => <hr className="my-9 border-0 border-t border-[#d5d5d5]" />,
                table: ({ children }) => (
                  <div className="my-6 overflow-x-auto">
                    <table className="font-ui w-full border-collapse text-left text-[12px]">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#c9c9c9] bg-[#ececec] px-3 py-2 font-semibold">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#d5d5d5] px-3 py-2 align-top">{children}</td>
                ),
              }}
            >
              {article.markdown}
            </ReactMarkdown>
          </div>
        </article>
      </div>

      <ScreenshotDialog screenshot={screenshot} onClose={() => setScreenshot(null)} />
    </>
  );
};

export default CaseStudyArticle;
