import { create } from 'zustand';

import { parseContent } from '@/lib/contentLoader';
import { getAppForFile, type ContentMetadata } from '@/lib/fileToApp';
import { normalizeUrlPath } from '@/lib/utils';

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
  folders: string[];
  isIndexed: boolean;
  setEntries: (entries: Map<string, ContentIndexEntry>) => void;
  setFolders: (folders: string[]) => void;
  setIsIndexed: (isIndexed: boolean) => void;
  getEntry: (urlPath: string) => ContentIndexEntry | undefined;
  getAllEntries: () => ContentIndexEntry[];
}

export const useContentIndex = create<ContentIndexStore>((set, get) => ({
  entries: new Map(),
  folders: [],
  isIndexed: false,
  setEntries: (entries) => set({ entries }),
  setFolders: (folders) => set({ folders }),
  setIsIndexed: (isIndexed) => set({ isIndexed }),
  getEntry: (urlPath) => {
    const normalizedPath = normalizeUrlPath(urlPath);
    return get().entries.get(normalizedPath);
  },
  getAllEntries: () => Array.from(get().entries.values()),
}));

/**
 * Recursively scans the content directory and builds the index
 * In dev, this runs at runtime. In production, this could be pre-built.
 */
type ContentMetadataRecord = Record<
  string,
  { size: number; mtime: string; birthtime: string; kind: string }
>;

/**
 * Loads content metadata from the generated JSON file.
 * Handles both old format (just files) and new format (files + folders).
 */
const loadContentMetadata = async (): Promise<{
  files: ContentMetadataRecord;
  folders: string[];
}> => {
  let contentMetadata: ContentMetadataRecord = {};
  let contentFolders: string[] = [];

  try {
    const metadataModule = await import('@/generated/contentMetadata.json');
    const imported = metadataModule.default || metadataModule;
    if (imported && typeof imported === 'object') {
      if ('files' in imported && 'folders' in imported) {
        contentMetadata = imported.files as ContentMetadataRecord;
        contentFolders = imported.folders as string[];
      } else {
        contentMetadata = imported as ContentMetadataRecord;
      }
    }
  } catch (error) {
    console.warn('Could not load content metadata, continuing without file stats:', error);
  }

  return { files: contentMetadata, folders: contentFolders };
};

export const buildContentIndex = async (): Promise<Map<string, ContentIndexEntry>> => {
  const index = new Map<string, ContentIndexEntry>();

  const { files: contentMetadata } = await loadContentMetadata();

  try {
    const contentModules = import.meta.glob(
      '../../content/**/*.{md,txt,pdf,jpg,jpeg,png,gif,webp,svg,webloc}',
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
        const isBinary = ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(
          fileExtension.toLowerCase()
        );
        const isWebloc = fileExtension.toLowerCase() === '.webloc';

        let parsed: { content: string; metadata: ContentMetadata };

        if (isBinary) {
          // Don't try to load binary files as strings
          parsed = {
            content: '',
            metadata: {},
          };
        } else if (isWebloc) {
          // Parse .webloc JSON files to extract URL
          const rawContent = (await importFn()) as string | { default: string };
          const contentString =
            typeof rawContent === 'string' ? rawContent : rawContent.default || '';
          try {
            const weblocData = JSON.parse(contentString);
            parsed = {
              content: '',
              metadata: {
                url: weblocData.url || '',
              },
            };
          } catch (e) {
            console.warn(`Failed to parse .webloc file ${filePath}:`, e);
            parsed = {
              content: '',
              metadata: {},
            };
          }
        } else {
          const rawContent = (await importFn()) as string | { default: string };
          parsed = parseContent(
            typeof rawContent === 'string' ? rawContent : rawContent.default || ''
          );
        }

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

  const { folders } = await loadContentMetadata();
  useContentIndex.getState().setFolders(folders);

  useContentIndex.getState().setIsIndexed(true);
};
