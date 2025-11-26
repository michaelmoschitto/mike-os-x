import { create } from 'zustand';

import { parseContent } from '@/lib/contentLoader';
import { getAppForFile, type ContentMetadata } from '@/lib/fileToApp';

export interface ContentIndexEntry {
  urlPath: string; // Clean URL path without extension (e.g., "/ProjectWriteups/mezo")
  filePath: string; // Glob key for importing (e.g., "../../content/README.md")
  fileExtension: string; // File extension (e.g., ".md")
  appType: string; // App type that should open this file
  metadata: ContentMetadata;
  fileSize?: number; // bytes
  dateModified?: Date; // mtime
  dateCreated?: Date; // birthtime
  kind?: string; // "PDF Document", "Markdown File", etc.
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

  type ContentMetadataRecord = Record<
    string,
    { size: number; mtime: string; birthtime: string; kind: string }
  >;

  let contentMetadata: ContentMetadataRecord = {};
  try {
    const metadataModule = await import('@/generated/contentMetadata.json');
    const imported = metadataModule.default || metadataModule;
    if (imported && typeof imported === 'object') {
      contentMetadata = imported as ContentMetadataRecord;
    }
  } catch (error) {
    console.warn('Could not load content metadata, continuing without file stats:', error);
  }

  try {
    const contentModules = import.meta.glob(
      '../../content/**/*.{md,txt,pdf,jpg,jpeg,png,gif,webp,svg}',
      {
        eager: false,
        query: '?raw',
        import: 'default',
      }
    );

    for (const [filePath, importFn] of Object.entries(contentModules)) {
      const globKey = filePath;
      const relativePath = filePath.replace(/^\.\.\/\.\.\/content\//, '');
      const extensionMatch = relativePath.match(/\.([^.]+)$/);
      const fileExtension = extensionMatch ? `.${extensionMatch[1]}` : '';
      const urlPath = generateUrlPath(relativePath);

      try {
        const rawContent = (await importFn()) as string | { default: string };
        const parsed = parseContent(
          typeof rawContent === 'string' ? rawContent : rawContent.default || ''
        );

        const appType = getAppForFile(fileExtension, parsed.metadata);
        const finalUrlPath = parsed.metadata.slug ? `/${parsed.metadata.slug}` : urlPath;

        const fileMetadata =
          contentMetadata[relativePath] || contentMetadata[relativePath.replace(/^\.\//, '')];

        const entry: ContentIndexEntry = {
          urlPath: finalUrlPath,
          filePath: globKey,
          fileExtension,
          appType,
          metadata: parsed.metadata,
          fileSize: fileMetadata?.size,
          dateModified: fileMetadata?.mtime ? new Date(fileMetadata.mtime) : undefined,
          dateCreated: fileMetadata?.birthtime ? new Date(fileMetadata.birthtime) : undefined,
          kind: fileMetadata?.kind,
        };

        const existing = index.get(finalUrlPath);
        if (existing) {
          if (fileExtension === '.md' && existing.fileExtension !== '.md') {
            index.set(finalUrlPath, entry);
          }
        } else {
          index.set(finalUrlPath, entry);
        }
      } catch (error) {
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
  const withoutExt = relativePath.replace(/\.[^.]+$/, '');
  return withoutExt.startsWith('/') ? withoutExt : `/${withoutExt}`;
};

/**
 * Initialize the content index
 * Call this on app startup
 */
export const initializeContentIndex = async (): Promise<void> => {
  const index = await buildContentIndex();
  useContentIndex.getState().setEntries(index);
  useContentIndex.getState().setIsIndexed(true);
};
