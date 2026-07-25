import { describe, expect, test } from 'vitest';

import { parseContent } from '@/lib/contentLoader';

describe('contentLoader', () => {
  describe('parseContent', () => {
    test('parses content without frontmatter', () => {
      const content = 'Hello world';
      const result = parseContent(content);

      expect(result.content).toBe('Hello world');
      expect(result.metadata).toEqual({});
    });

    test('parses content with frontmatter', () => {
      const content = `---
title: Test Document
slug: test-doc
app: photos
description: A test document
summary: A concise summary
order: 2
role: Product Designer
team: Product and Engineering
timeline: "2025"
tags:
  - Search
  - UI
thumbnail: images/thumbnail.webp
thumbnailAlt: Updated search results
---
Hello world`;

      const result = parseContent(content);

      expect(result.content.trim()).toBe('Hello world');
      expect(result.metadata.title).toBe('Test Document');
      expect(result.metadata.slug).toBe('test-doc');
      expect(result.metadata.app).toBe('photos');
      expect(result.metadata.description).toBe('A test document');
      expect(result.metadata.summary).toBe('A concise summary');
      expect(result.metadata.order).toBe(2);
      expect(result.metadata.role).toBe('Product Designer');
      expect(result.metadata.team).toBe('Product and Engineering');
      expect(result.metadata.timeline).toBe('2025');
      expect(result.metadata.tags).toEqual(['Search', 'UI']);
      expect(result.metadata.thumbnail).toBe('images/thumbnail.webp');
      expect(result.metadata.thumbnailAlt).toBe('Updated search results');
    });

    test('handles empty frontmatter', () => {
      const content = `---
---
Hello world`;

      const result = parseContent(content);

      expect(result.content.trim()).toBe('Hello world');
      expect(result.metadata).toEqual({});
    });

    test('handles malformed frontmatter gracefully', () => {
      const content = `---
title: Test
invalid yaml
---
Hello world`;

      // Should still parse and return content
      const result = parseContent(content);
      expect(result.content).toContain('Hello world');
    });
  });
});
