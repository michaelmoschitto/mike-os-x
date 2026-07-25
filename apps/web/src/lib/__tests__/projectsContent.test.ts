import { beforeEach, describe, expect, test } from 'vitest';

import { type ContentIndexEntry, useContentIndex } from '@/lib/contentIndex';
import {
  getProjectBySlug,
  getProjects,
  resolveProjectAssetUrl,
} from '@/lib/projectsContent';

const createProjectEntry = (
  slug: string,
  order: number,
  overrides: Partial<ContentIndexEntry['metadata']> = {}
): ContentIndexEntry => ({
  urlPath: `/projects/${slug}`,
  filePath: `../../content/projects/${slug}/index.md`,
  fileExtension: '.md',
  appType: 'projects',
  metadata: {
    app: 'projects',
    slug: `projects/${slug}`,
    title: `${slug} title`,
    summary: `${slug} summary`,
    order,
    role: 'Product Designer',
    timeline: '2025',
    thumbnail: 'images/thumbnail.webp',
    thumbnailAlt: `${slug} thumbnail`,
    ...overrides,
  },
});

describe('projectsContent', () => {
  beforeEach(() => {
    useContentIndex.setState({
      entries: new Map(),
      folders: [],
      isIndexed: true,
    });
  });

  test('returns valid projects in configured order', () => {
    const laterProject = createProjectEntry('later-project', 2);
    const firstProject = createProjectEntry('first-project', 1);
    useContentIndex
      .getState()
      .setEntries(
        new Map([
          [laterProject.urlPath, laterProject],
          [firstProject.urlPath, firstProject],
        ])
      );

    expect(getProjects().map((project) => project.slug)).toEqual([
      'first-project',
      'later-project',
    ]);
  });

  test('skips projects with incomplete metadata', () => {
    const invalidProject = createProjectEntry('invalid-project', 1, { thumbnailAlt: undefined });
    useContentIndex
      .getState()
      .setEntries(new Map([[invalidProject.urlPath, invalidProject]]));

    expect(getProjects()).toEqual([]);
  });

  test('looks up projects by safe route slug', () => {
    const project = createProjectEntry('search-redesign', 1);
    useContentIndex.getState().setEntries(new Map([[project.urlPath, project]]));

    expect(getProjectBySlug('search-redesign')?.title).toBe('search-redesign title');
    expect(getProjectBySlug('../search-redesign')).toBeUndefined();
  });

  test('resolves project-relative asset URLs', () => {
    expect(
      resolveProjectAssetUrl(
        { contentDirectory: 'projects/search-redesign' },
        'images/results.webp'
      )
    ).toBe('/content/projects/search-redesign/images/results.webp');
  });

  test('rejects unsafe asset paths', () => {
    const project = { contentDirectory: 'projects/search-redesign' };

    expect(resolveProjectAssetUrl(project, '../secret.webp')).toBeNull();
    expect(resolveProjectAssetUrl(project, '/images/result.webp')).toBeNull();
    expect(resolveProjectAssetUrl(project, 'images\\result.webp')).toBeNull();
  });
});
