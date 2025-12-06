import matter from 'gray-matter';

import type { ContentMetadata } from '@/lib/fileToApp';

export interface LoadedContent {
  content: string;
  metadata: ContentMetadata;
}

let globModulesCache: Record<string, () => Promise<string | { default: string }>> | null = null;

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
      const parsed = matter(rawContent);

      return {
        content: parsed.content,
        metadata: {
          title: parsed.data.title,
          slug: parsed.data.slug,
          app: parsed.data.app,
          description: parsed.data.description,
        },
      };
    }

    const fileContent = await importFn();
    const rawContent = typeof fileContent === 'string' ? fileContent : fileContent.default || '';
    const parsed = matter(rawContent);

    return {
      content: parsed.content,
      metadata: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        app: parsed.data.app,
        description: parsed.data.description,
      },
    };
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
    const parsed = matter(rawContent);

    return {
      content: parsed.content,
      metadata: {
        title: parsed.data.title,
        slug: parsed.data.slug,
        app: parsed.data.app,
        description: parsed.data.description,
      },
    };
  } catch (error) {
    return {
      content: rawContent,
      metadata: {},
    };
  }
};
