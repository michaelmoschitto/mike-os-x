import { load } from 'js-yaml';

import type { AppType, ContentMetadata } from '@/lib/fileToApp';

export interface LoadedContent {
  content: string;
  metadata: ContentMetadata;
}

let globModulesCache: Record<string, () => Promise<string | { default: string }>> | null = null;

interface ParsedContent {
  content: string;
  data: Record<string, unknown>;
}

const parseFrontmatter = (rawContent: string): ParsedContent => {
  const match = rawContent.match(/^---\r?\n([\s\S]*?)^---[ \t]*(?:\r?\n|$)/m);
  if (!match) {
    return { content: rawContent, data: {} };
  }

  const parsedData = match[1].trim() ? load(match[1]) : {};
  const data =
    parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)
      ? (parsedData as Record<string, unknown>)
      : {};

  return {
    content: rawContent.slice(match[0].length),
    data,
  };
};

const getOptionalString = (value: unknown): string | undefined => {
  return typeof value === 'string' ? value : undefined;
};

const getAppType = (value: unknown): AppType | undefined => {
  const appTypes: AppType[] = ['textedit', 'browser', 'pdfviewer', 'photos', 'finder', 'shortcut'];
  return typeof value === 'string' && appTypes.includes(value as AppType)
    ? (value as AppType)
    : undefined;
};

const toLoadedContent = ({ content, data }: ParsedContent): LoadedContent => {
  return {
    content,
    metadata: {
      title: getOptionalString(data.title),
      slug: getOptionalString(data.slug),
      app: getAppType(data.app),
      description: getOptionalString(data.description),
    },
  };
};

const getGlobModules = (): Record<string, () => Promise<string | { default: string }>> => {
  if (!globModulesCache) {
    // Only import text files with ?raw - images and PDFs should not be loaded as strings
    // Images are served as static files from public/content/
    globModulesCache = import.meta.glob('../../content/**/*.{md,txt}', {
      eager: false,
      query: '?raw',
      import: 'default',
    }) as Record<string, () => Promise<string | { default: string }>>;
  }
  return globModulesCache;
};

/**
 * Loads a content file using the glob import pattern
 * @param globKey - The glob key from import.meta.glob (e.g., "../../content/README.md")
 */
export const loadContentFile = async (globKey: string): Promise<LoadedContent> => {
  try {
    const contentModules = getGlobModules();
    const importFn = contentModules[globKey];

    if (!importFn) {
      const normalizedKey = Object.keys(contentModules).find(
        (key) => key === globKey || key.endsWith(globKey.replace(/^\.\.\/\.\.\/content\//, ''))
      );

      if (!normalizedKey) {
        throw new Error(
          `File not found in glob: ${globKey}. Available keys: ${Object.keys(contentModules).slice(0, 5).join(', ')}...`
        );
      }

      const fileContent = await contentModules[normalizedKey]();
      const rawContent = typeof fileContent === 'string' ? fileContent : fileContent.default || '';
      return toLoadedContent(parseFrontmatter(rawContent));
    }

    const fileContent = await importFn();
    const rawContent = typeof fileContent === 'string' ? fileContent : fileContent.default || '';
    return toLoadedContent(parseFrontmatter(rawContent));
  } catch (error) {
    console.error('[ContentLoader] Error loading file:', error);
    throw new Error(`Failed to load content file: ${globKey}`, { cause: error });
  }
};

/**
 * Synchronously loads content (for cases where we already have the raw content)
 */
export const parseContent = (rawContent: string): LoadedContent => {
  try {
    return toLoadedContent(parseFrontmatter(rawContent));
  } catch (error) {
    return {
      content: rawContent,
      metadata: {},
    };
  }
};
