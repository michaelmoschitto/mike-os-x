import { create } from 'zustand';

import { parseContent } from '@/lib/contentLoader';
import { getAppForFile, type ContentMetadata } from '@/lib/fileToApp';

export interface ContentIndexEntry {
  urlPath: string; // Clean URL path without extension (e.g., "/ProjectWriteups/mezo")
  filePath: string; // Glob key for importing (e.g., "../../content/README.md")
  fileExtension: string; // File extension (e.g., ".md")
  appType: string; // App type that should open this file
  metadata: ContentMetadata;
}

interface ContentIndexStore {
  entries: Map<string, ContentIndexEntry>;
  isIndexed: boolean;
  setEntries: (entries: Map<string, ContentIndexEntry>) => void;
  setIsIndexed: (isIndexed: boolean) => void;
  getEntry: (urlPath: string) => ContentIndexEntry | undefined;
  getAllEntries: () => ContentIndexEntry[];
}

export const useContentIndex = create<ContentIndexStore>((set, get) => ({
  entries: new Map(),
  isIndexed: false,
  setEntries: (entries) => set({ entries }),
  setIsIndexed: (isIndexed) => set({ isIndexed }),
  getEntry: (urlPath) => {
    const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;
    return get().entries.get(normalizedPath);
  },
  getAllEntries: () => Array.from(get().entries.values()),
}));

/**
 * Recursively scans the content directory and builds the index
 * In dev, this runs at runtime. In production, this could be pre-built.
 */
export const buildContentIndex = async (): Promise<Map<string, ContentIndexEntry>> => {
  const index = new Map<string, ContentIndexEntry>();

  try {
    // Use Vite's glob import to discover all content files
    // Path is relative to the src/lib directory
    // Store the glob modules map for later use in loading
    const contentModules = import.meta.glob(
      '../../content/**/*.{md,txt,pdf,jpg,jpeg,png,gif,webp,svg}',
      {
        eager: false,
        query: '?raw',
        import: 'default',
      }
    );

    console.log('[ContentIndex] Found files:', Object.keys(contentModules));

    // Store glob modules in a way we can access them later
    // We'll need to pass the import function through the entry

    // Process each discovered file
    for (const [filePath, importFn] of Object.entries(contentModules)) {
      // The filePath from glob is the key we'll use for importing
      // It's relative to this file (src/lib/contentIndex.ts)
      // Example: "../../content/README.md"
      const globKey = filePath;

      // Extract the relative path from ../../content/... for URL generation
      const relativePath = filePath.replace(/^\.\.\/\.\.\/content\//, '');

      // Get file extension
      const extensionMatch = relativePath.match(/\.([^.]+)$/);
      const fileExtension = extensionMatch ? `.${extensionMatch[1]}` : '';

      // Generate clean URL path (remove extension, use folder structure)
      const urlPath = generateUrlPath(relativePath);

      // Load and parse the file to get metadata
      try {
        const rawContent = (await importFn()) as string | { default: string };
        const parsed = parseContent(
          typeof rawContent === 'string' ? rawContent : rawContent.default || ''
        );

        // Determine app type
        const appType = getAppForFile(fileExtension, parsed.metadata);

        // Use slug override if provided, otherwise use generated URL path
        const finalUrlPath = parsed.metadata.slug ? `/${parsed.metadata.slug}` : urlPath;

        console.log(`[ContentIndex] Indexed: ${globKey} -> ${finalUrlPath}`, {
          fileExtension,
          appType,
          metadata: parsed.metadata,
        });

        const entry: ContentIndexEntry = {
          urlPath: finalUrlPath,
          filePath: globKey, // Store glob key for importing
          fileExtension,
          appType,
          metadata: parsed.metadata,
        };

        // Handle conflicts: if URL already exists, prefer .md files
        const existing = index.get(finalUrlPath);
        if (existing) {
          // If current file is .md and existing is not, replace
          if (fileExtension === '.md' && existing.fileExtension !== '.md') {
            index.set(finalUrlPath, entry);
          }
          // Otherwise, keep existing (first one wins, or prefer .md)
        } else {
          index.set(finalUrlPath, entry);
        }
      } catch (error) {
        // Skip files that can't be loaded
        console.warn(`Failed to index ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to build content index:', error);
  }

  return index;
};

/**
 * Generates a clean URL path from a file path
 * Example: "ProjectWriteups/mezo.md" -> "/ProjectWriteups/mezo"
 */
const generateUrlPath = (relativePath: string): string => {
  // Remove file extension
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');

  // Ensure it starts with /
  return withoutExt.startsWith('/') ? withoutExt : `/${withoutExt}`;
};

/**
 * Initialize the content index
 * Call this on app startup
 */
export const initializeContentIndex = async (): Promise<void> => {
  const index = await buildContentIndex();
  console.log('[ContentIndex] Built index with entries:', Array.from(index.keys()));
  useContentIndex.getState().setEntries(index);
  useContentIndex.getState().setIsIndexed(true);
};
