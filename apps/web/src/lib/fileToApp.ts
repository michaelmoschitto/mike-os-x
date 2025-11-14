export type AppType = 'textedit' | 'browser' | 'pdfviewer' | 'photos' | 'finder';

export interface ContentMetadata {
  app?: AppType;
  title?: string;
  slug?: string;
  description?: string;
}

/**
 * Maps file extensions to app types
 */
const EXTENSION_TO_APP: Record<string, AppType> = {
  '.md': 'textedit',
  '.txt': 'textedit',
  '.pdf': 'pdfviewer',
  '.jpg': 'photos',
  '.jpeg': 'photos',
  '.png': 'photos',
  '.gif': 'photos',
  '.webp': 'photos',
  '.svg': 'photos',
};

/**
 * Determines which app should open a file based on its extension and optional metadata override
 */
export const getAppForFile = (fileExtension: string, metadata?: ContentMetadata): AppType => {
  // Allow frontmatter to override default mapping
  if (metadata?.app) {
    return metadata.app;
  }

  // Normalize extension (ensure it starts with a dot)
  const normalizedExt = fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`;

  // Look up app type from extension mapping
  const appType = EXTENSION_TO_APP[normalizedExt.toLowerCase()];

  // Default to textedit if extension not found
  return appType || 'textedit';
};
