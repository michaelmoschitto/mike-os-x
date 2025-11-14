import { useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';

export interface ResolvedContent {
  entry: ContentIndexEntry;
  content: string;
}

/**
 * Resolves a clean URL path to a content file
 * Returns the content index entry and loaded content
 */
export const resolveUrlToContent = async (urlPath: string): Promise<ResolvedContent> => {
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  const entry = useContentIndex.getState().getEntry(normalizedPath);

  if (!entry) {
    throw new Error(`Content not found for URL: ${normalizedPath}`);
  }

  const loaded = await loadContentFile(entry.filePath);

  return {
    entry,
    content: loaded.content,
  };
};

/**
 * Checks if a URL path exists in the content index
 */
export const urlPathExists = (urlPath: string): boolean => {
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
  return useContentIndex.getState().getEntry(normalizedPath) !== undefined;
};
