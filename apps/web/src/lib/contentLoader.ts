import matter from 'gray-matter';

import type { ContentMetadata } from '@/lib/fileToApp';

export interface LoadedContent {
  content: string;
  metadata: ContentMetadata;
}

// Cache the glob modules so we can reuse them
let globModulesCache: Record<string, () => Promise<string | { default: string }>> | null = null;

const getGlobModules = (): Record<string, () => Promise<string | { default: string }>> => {
  if (!globModulesCache) {
    globModulesCache = import.meta.glob(
      '../../content/**/*.{md,txt,pdf,jpg,jpeg,png,gif,webp,svg}',
      {
        eager: false,
        query: '?raw',
        import: 'default',
      }
    ) as Record<string, () => Promise<string | { default: string }>>;
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
    console.log('[ContentLoader] Looking for:', globKey);
    console.log('[ContentLoader] Available glob keys:', Object.keys(contentModules));
    console.log('[ContentLoader] Full glob object:', contentModules);

    const importFn = contentModules[globKey];
    console.log('[ContentLoader] Import function:', importFn, 'Type:', typeof importFn);

    if (!importFn) {
      // Try to find the file with a different key format
      const normalizedKey = Object.keys(contentModules).find(
        (key) => key === globKey || key.endsWith(globKey.replace(/^\.\.\/\.\.\/content\//, ''))
      );

      console.log('[ContentLoader] Normalized key found:', normalizedKey);

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

    // Call the import function to get the raw content
    console.log('[ContentLoader] Calling import function...');
    const fileContent = await importFn();
    console.log('[ContentLoader] File content loaded:', typeof fileContent, fileContent);
    const rawContent = typeof fileContent === 'string' ? fileContent : fileContent.default || '';
    console.log('[ContentLoader] Raw content:', rawContent?.substring(0, 100));

    // Parse frontmatter using gray-matter
    const parsed = matter(rawContent);
    console.log('[ContentLoader] Parsed metadata:', parsed.data);

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
    // If file doesn't exist or can't be loaded, throw error
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
    // If parsing fails, return content without metadata
    return {
      content: rawContent,
      metadata: {},
    };
  }
};
