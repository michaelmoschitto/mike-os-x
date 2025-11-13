import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { BookmarkItem } from '@/stores/useWindowStore';

/**
 * Utility function to merge Tailwind CSS classes with clsx
 */
export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

/**
 * Validates and normalizes a URL string.
 * Adds https:// protocol if missing, validates the URL, and returns the normalized URL.
 * Returns null if the URL is invalid.
 */
export const validateAndNormalizeUrl = (urlString: string): string | null => {
  if (!urlString || !urlString.trim()) {
    return null;
  }

  const trimmed = urlString.trim();

  // If URL already has a protocol, validate it directly
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      new URL(trimmed);
      return trimmed;
    } catch {
      return null;
    }
  }

  // Try adding https:// protocol
  try {
    const urlWithProtocol = `https://${trimmed}`;
    new URL(urlWithProtocol);
    return urlWithProtocol;
  } catch {
    return null;
  }
};

/**
 * Safely extracts the hostname from a URL string.
 * Returns the hostname if valid, otherwise returns the original string.
 */
export const getHostnameFromUrl = (urlString: string): string => {
  if (!urlString) return '';
  try {
    return new URL(urlString).hostname;
  } catch {
    return urlString;
  }
};

/**
 * Safely extracts the domain from a URL string for display purposes.
 * Returns the hostname if valid, otherwise returns the original string.
 */
export const getDomainFromUrl = (urlString: string): string => {
  return getHostnameFromUrl(urlString);
};

/**
 * Checks if a URL is bookmarked in the given bookmarks array.
 * Searches both regular bookmarks and bookmarks within folders.
 */
export const isUrlBookmarked = (url: string, bookmarks: BookmarkItem[]): boolean => {
  if (!url) return false;

  // Check regular bookmarks
  const regularBookmarks = bookmarks.filter((item) => item.type === 'bookmark');
  if (regularBookmarks.some((b) => b.url === url)) {
    return true;
  }

  // Check folders
  const folders = bookmarks.filter((item) => item.type === 'folder');
  for (const folder of folders) {
    if (folder.items.some((b) => b.url === url)) {
      return true;
    }
  }

  return false;
};

/**
 * Finds the location of a bookmark in the bookmarks array.
 * Returns an object with folderName if found in a folder, or empty object if found as regular bookmark.
 * Returns null if not found.
 */
export const findBookmarkLocation = (
  url: string,
  bookmarks: BookmarkItem[]
): { folderName?: string } | null => {
  if (!url) return null;

  // Check regular bookmarks
  const regularBookmarks = bookmarks.filter((item) => item.type === 'bookmark');
  if (regularBookmarks.some((b) => b.url === url)) {
    return {};
  }

  // Check folders
  const folders = bookmarks.filter((item) => item.type === 'folder');
  for (const folder of folders) {
    if (folder.items.some((b) => b.url === url)) {
      return { folderName: folder.title };
    }
  }

  return null;
};
