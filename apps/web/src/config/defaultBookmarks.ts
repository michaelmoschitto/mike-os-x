/**
 * Default bookmarks configuration
 * 
 * This file defines the default bookmarks and folders that appear when a new browser window is opened.
 * You can add, remove, or modify bookmarks here without touching the store logic.
 * 
 * Structure:
 * - type: 'folder' creates a folder that can contain multiple bookmarks
 * - type: 'bookmark' creates a standalone bookmark (not in a folder)
 * - items: array of bookmarks within a folder (each with title and url)
 */

import type { BookmarkItem } from '@/stores/useWindowStore';

export const DEFAULT_BOOKMARKS: BookmarkItem[] = [
  {
    type: 'folder',
    title: 'Projects',
    items: [
      {
        title: 'Mezo × LABITCONF',
        url: 'https://labitconf.mezo.org/en',
      },
    ],
  },
  {
    type: 'folder',
    title: 'Previous Work',
    items: [],
  },
];


