import { type ContentIndexEntry, useContentIndex } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';

const PROJECT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CONTENT_PREFIX_PATTERN = /^\.\.\/\.\.\/content\//;

export interface ProjectSummary {
  slug: string;
  title: string;
  summary: string;
  order: number;
  role: string;
  team?: string;
  timeline: string;
  tags: string[];
  thumbnailUrl: string;
  thumbnailAlt: string;
  contentDirectory: string;
  entry: ContentIndexEntry;
}

export interface ProjectArticle {
  project: ProjectSummary;
  markdown: string;
}

const getRouteSlug = (entry: ContentIndexEntry): string => {
  const slug = entry.metadata.slug ?? entry.urlPath;
  const normalizedSlug = slug.replace(/^\/+/, '').replace(/^projects\//, '');
  return PROJECT_SLUG_PATTERN.test(normalizedSlug) ? normalizedSlug : '';
};

const getContentDirectory = (entry: ContentIndexEntry): string => {
  const relativePath = entry.filePath.replace(CONTENT_PREFIX_PATTERN, '');
  const pathSegments = relativePath.split('/');
  pathSegments.pop();
  return pathSegments.join('/');
};

const getRequiredString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmedValue = value.trim();
  return trimmedValue.length > 0 ? trimmedValue : null;
};

export const resolveProjectAssetUrl = (
  project: Pick<ProjectSummary, 'contentDirectory'>,
  relativePath: string
): string | null => {
  if (!relativePath || relativePath.startsWith('/') || relativePath.includes('\\')) return null;

  const pathSegments = relativePath.split('/');
  const hasUnsafeSegment = pathSegments.some(
    (segment) => segment.length === 0 || segment === '.' || segment === '..'
  );
  if (hasUnsafeSegment) return null;

  const encodedPath = [...project.contentDirectory.split('/'), ...pathSegments]
    .map((segment) => encodeURIComponent(segment))
    .join('/');

  return `/content/${encodedPath}`;
};

const entryToProject = (entry: ContentIndexEntry): ProjectSummary | null => {
  if (entry.appType !== 'projects') return null;

  const slug = getRouteSlug(entry);
  const title = getRequiredString(entry.metadata.title);
  const summary = getRequiredString(entry.metadata.summary);
  const role = getRequiredString(entry.metadata.role);
  const timeline = getRequiredString(entry.metadata.timeline);
  const thumbnail = getRequiredString(entry.metadata.thumbnail);
  const thumbnailAlt = getRequiredString(entry.metadata.thumbnailAlt);
  const order = entry.metadata.order;
  const contentDirectory = getContentDirectory(entry);

  if (
    !slug ||
    !title ||
    !summary ||
    !role ||
    !timeline ||
    !thumbnail ||
    !thumbnailAlt ||
    typeof order !== 'number' ||
    !Number.isFinite(order) ||
    !contentDirectory
  ) {
    console.warn(`[Projects] Skipping invalid project entry: ${entry.filePath}`);
    return null;
  }

  const projectBase = { contentDirectory };
  const thumbnailUrl = resolveProjectAssetUrl(projectBase, thumbnail);
  if (!thumbnailUrl) {
    console.warn(`[Projects] Skipping project with unsafe thumbnail path: ${entry.filePath}`);
    return null;
  }

  return {
    slug,
    title,
    summary,
    order,
    role,
    team: getRequiredString(entry.metadata.team) ?? undefined,
    timeline,
    tags: entry.metadata.tags ?? [],
    thumbnailUrl,
    thumbnailAlt,
    contentDirectory,
    entry,
  };
};

export const getProjects = (): ProjectSummary[] => {
  return useContentIndex
    .getState()
    .getAllEntries()
    .map(entryToProject)
    .filter((project): project is ProjectSummary => project !== null)
    .sort((firstProject, secondProject) => {
      return (
        firstProject.order - secondProject.order ||
        firstProject.title.localeCompare(secondProject.title)
      );
    });
};

export const getProjectBySlug = (slug: string): ProjectSummary | undefined => {
  if (!PROJECT_SLUG_PATTERN.test(slug)) return undefined;
  return getProjects().find((project) => project.slug === slug);
};

export const loadProjectArticle = async (slug: string): Promise<ProjectArticle> => {
  const project = getProjectBySlug(slug);
  if (!project) {
    throw new Error(`Project not found: ${slug}`);
  }

  const loadedContent = await loadContentFile(project.entry.filePath);
  return {
    project,
    markdown: loadedContent.content,
  };
};
