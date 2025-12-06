import { BINARY_FILE_EXTENSIONS } from '@/lib/constants';
import { useContentIndex } from '@/lib/contentIndex';
import type { ContentIndexEntry } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';
import { normalizeUrlPath } from '@/lib/utils';

export interface ResolvedContent {
  entry: ContentIndexEntry;
  content: string;
}

/**
 * Resolves a clean URL path to a content file
 * Returns the content index entry and loaded content
 */
export const resolveUrlToContent = async (urlPath: string): Promise<ResolvedContent> => {
  const normalizedPath = normalizeUrlPath(urlPath);

  const entry = useContentIndex.getState().getEntry(normalizedPath);

  if (!entry) {
    throw new Error(`Content not found for URL: ${normalizedPath}`);
  }

  if (
    BINARY_FILE_EXTENSIONS.includes(
      entry.fileExtension.toLowerCase() as (typeof BINARY_FILE_EXTENSIONS)[number]
    )
  ) {
    return {
      entry,
      content: '',
    };
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
  const normalizedPath = normalizeUrlPath(urlPath);
  return useContentIndex.getState().getEntry(normalizedPath) !== undefined;
};
