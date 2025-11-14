import { describe, expect, test, beforeEach } from 'vitest';

import { useContentIndex } from '@/lib/contentIndex';

describe('contentIndex', () => {
  beforeEach(() => {
    // Reset the content index before each test
    useContentIndex.setState({
      entries: new Map(),
      isIndexed: false,
    });
  });

  describe('useContentIndex store', () => {
    test('initializes with empty entries', () => {
      const state = useContentIndex.getState();
      expect(state.entries.size).toBe(0);
      expect(state.isIndexed).toBe(false);
    });

    test('getEntry returns undefined for non-existent paths', () => {
      expect(useContentIndex.getState().getEntry('/nonexistent')).toBeUndefined();
    });

    test('getEntry normalizes paths', () => {
      const entry = {
        urlPath: '/test',
        filePath: '../../content/test.md',
        fileExtension: '.md',
        appType: 'textedit',
        metadata: {},
      };

      useContentIndex.getState().setEntries(new Map([['/test', entry]]));

      expect(useContentIndex.getState().getEntry('/test')).toEqual(entry);
      expect(useContentIndex.getState().getEntry('test')).toEqual(entry);
    });

    test('getAllEntries returns all entries', () => {
      const entry1 = {
        urlPath: '/test1',
        filePath: '../../content/test1.md',
        fileExtension: '.md',
        appType: 'textedit',
        metadata: {},
      };

      const entry2 = {
        urlPath: '/test2',
        filePath: '../../content/test2.md',
        fileExtension: '.md',
        appType: 'textedit',
        metadata: {},
      };

      useContentIndex.getState().setEntries(
        new Map([
          ['/test1', entry1],
          ['/test2', entry2],
        ])
      );

      const allEntries = useContentIndex.getState().getAllEntries();
      expect(allEntries).toHaveLength(2);
      expect(allEntries).toContainEqual(entry1);
      expect(allEntries).toContainEqual(entry2);
    });
  });
});
