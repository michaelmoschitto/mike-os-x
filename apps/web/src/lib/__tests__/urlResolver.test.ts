import { describe, expect, test, beforeEach } from 'vitest';

import { useContentIndex, type ContentIndexEntry } from '@/lib/contentIndex';
import { urlPathExists } from '@/lib/urlResolver';

describe('urlResolver', () => {
  beforeEach(() => {
    // Reset the content index before each test
    useContentIndex.setState({
      entries: new Map(),
      isIndexed: false,
    });
  });

  describe('urlPathExists', () => {
    test('returns false for non-existent paths', () => {
      expect(urlPathExists('/nonexistent')).toBe(false);
      expect(urlPathExists('nonexistent')).toBe(false);
    });

    test('returns true for existing paths', () => {
      const entry: ContentIndexEntry = {
        urlPath: '/test',
        filePath: '../../content/test.md',
        fileExtension: '.md',
        appType: 'textedit',
        metadata: {},
      };

      useContentIndex.getState().setEntries(new Map([['/test', entry]]));
      useContentIndex.getState().setIsIndexed(true);

      expect(urlPathExists('/test')).toBe(true);
      expect(urlPathExists('test')).toBe(true);
    });

    test('normalizes paths correctly', () => {
      const entry: ContentIndexEntry = {
        urlPath: '/ProjectWriteups/mezo',
        filePath: '../../content/ProjectWriteups/mezo.md',
        fileExtension: '.md',
        appType: 'textedit',
        metadata: {},
      };

      useContentIndex.getState().setEntries(new Map([['/ProjectWriteups/mezo', entry]]));
      useContentIndex.getState().setIsIndexed(true);

      expect(urlPathExists('/ProjectWriteups/mezo')).toBe(true);
      expect(urlPathExists('ProjectWriteups/mezo')).toBe(true);
    });
  });
});
