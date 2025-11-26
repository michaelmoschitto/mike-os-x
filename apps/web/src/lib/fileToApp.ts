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
  '.jpg': 'browser',
  '.jpeg': 'browser',
  '.png': 'browser',
  '.gif': 'browser',
  '.webp': 'browser',
  '.svg': 'browser',
};

/**
 * Determines which app should open a file based on its extension and optional metadata override
 */
export const getAppForFile = (fileExtension: string, metadata?: ContentMetadata): AppType => {
  if (metadata?.app) {
    return metadata.app;
  }

  const normalizedExt = fileExtension.startsWith('.') ? fileExtension : `.${fileExtension}`;
  const appType = EXTENSION_TO_APP[normalizedExt.toLowerCase()];

  return appType || 'textedit';
};
