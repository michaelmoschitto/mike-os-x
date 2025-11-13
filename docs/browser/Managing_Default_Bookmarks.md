# Managing Default Bookmarks

## Overview

Default bookmarks are defined in `/apps/web/src/config/defaultBookmarks.ts`. These bookmarks appear automatically in every new browser window.

## How It Works

1. The config file exports `DEFAULT_BOOKMARKS` array
2. The Zustand store (`useWindowStore.ts`) imports this config
3. When opening a new browser window, the store initializes bookmarks from the config

## Adding/Modifying Bookmarks

Edit `/apps/web/src/config/defaultBookmarks.ts`:

### Add a bookmark to an existing folder:

```typescript
{
  type: 'folder',
  title: 'Projects',
  items: [
    {
      title: 'Your Bookmark Title',
      url: 'https://example.com',
    },
    // Add more bookmarks here
  ],
}
```

### Add a new folder:

```typescript
{
  type: 'folder',
  title: 'New Folder Name',
  items: [
    { title: 'Bookmark 1', url: 'https://example.com' },
    { title: 'Bookmark 2', url: 'https://example2.com' },
  ],
}
```

### Add a standalone bookmark (not in a folder):

```typescript
{
  type: 'bookmark',
  title: 'Standalone Bookmark',
  url: 'https://example.com',
}
```

## Current Configuration

- **Projects** folder with "Mezo × LABITCONF" bookmark
- **Previous Work** folder (empty, ready for your bookmarks)

## Notes

- Changes only affect new browser windows
- Existing browser windows keep their current bookmarks
- The store automatically handles bookmark persistence within a session

