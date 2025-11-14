import { describe, expect, test } from 'vitest';

import { getAppForFile, type ContentMetadata } from '@/lib/fileToApp';

describe('fileToApp', () => {
  describe('getAppForFile', () => {
    test('maps .md files to textedit', () => {
      expect(getAppForFile('.md')).toBe('textedit');
      expect(getAppForFile('md')).toBe('textedit');
    });

    test('maps .txt files to textedit', () => {
      expect(getAppForFile('.txt')).toBe('textedit');
      expect(getAppForFile('txt')).toBe('textedit');
    });

    test('maps .pdf files to pdfviewer', () => {
      expect(getAppForFile('.pdf')).toBe('pdfviewer');
    });

    test('maps image files to photos', () => {
      expect(getAppForFile('.jpg')).toBe('photos');
      expect(getAppForFile('.jpeg')).toBe('photos');
      expect(getAppForFile('.png')).toBe('photos');
      expect(getAppForFile('.gif')).toBe('photos');
      expect(getAppForFile('.webp')).toBe('photos');
      expect(getAppForFile('.svg')).toBe('photos');
    });

    test('defaults to textedit for unknown extensions', () => {
      expect(getAppForFile('.unknown')).toBe('textedit');
      expect(getAppForFile('')).toBe('textedit');
    });

    test('allows metadata to override app type', () => {
      const metadata: ContentMetadata = { app: 'photos' };
      expect(getAppForFile('.md', metadata)).toBe('photos');
    });

    test('case insensitive extension matching', () => {
      expect(getAppForFile('.MD')).toBe('textedit');
      expect(getAppForFile('.PNG')).toBe('photos');
    });
  });
});
