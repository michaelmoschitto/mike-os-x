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
  // Normalize URL path (ensure it starts with /)
  const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

  console.log('[UrlResolver] Looking up:', normalizedPath);
  console.log(
    '[UrlResolver] Available entries:',
    Array.from(useContentIndex.getState().entries.keys())
  );

  // Look up in content index
  const entry = useContentIndex.getState().getEntry(normalizedPath);

  if (!entry) {
    throw new Error(`Content not found for URL: ${normalizedPath}`);
  }

  console.log('[UrlResolver] Found entry:', entry);

  // Load the actual file content
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
