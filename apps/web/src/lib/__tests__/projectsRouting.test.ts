import { beforeAll, describe, expect, test } from 'vitest';

import {
  deserializeWindow,
  parseWindowParams,
  serializeWindow,
} from '@/lib/routing/windowSerialization';
import type { Window } from '@/stores/useWindowStore';

beforeAll(() => {
  Object.defineProperty(globalThis, 'window', {
    value: { innerWidth: 1440, innerHeight: 900 },
    configurable: true,
  });
});

const createProjectsWindow = (projectSlug?: string): Window => ({
  id: 'projects-window',
  type: 'projects',
  appName: 'Selected Work',
  title: 'Selected Work',
  content: '',
  position: { x: 200, y: 100 },
  size: { width: 1000, height: 680 },
  zIndex: 100,
  isMinimized: false,
  projectSlug,
});

describe('Projects window routing', () => {
  test('serializes the project overview', () => {
    expect(serializeWindow(createProjectsWindow())).toBe('projects');
  });

  test('serializes a selected project', () => {
    expect(serializeWindow(createProjectsWindow('search-redesign'))).toBe(
      'projects:search-redesign'
    );
  });

  test('deserializes a selected project', () => {
    expect(deserializeWindow('projects:search-redesign')).toMatchObject({
      type: 'projects',
      projectSlug: 'search-redesign',
      title: 'Selected Work',
      size: { width: 1000, height: 680 },
    });
  });

  test('filters invalid project identifiers', () => {
    expect(
      parseWindowParams(['projects:search-redesign', 'projects:../private', 'projects:BadSlug'])
    ).toEqual(['projects:search-redesign']);
  });
});
