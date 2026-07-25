import { createEditor, $getRoot } from 'lexical';
import { describe, expect, test } from 'vitest';

import { createEditorStateFromText } from '@/components/apps/TextEdit/createEditorStateFromText';

describe('createEditorStateFromText', () => {
  test('creates one paragraph per line with literal text', () => {
    const editor = createEditor();
    editor.update(createEditorStateFromText('hello\nworld'), { discrete: true });

    editor.getEditorState().read(() => {
      const paragraphs = $getRoot().getChildren();
      expect(paragraphs).toHaveLength(2);
      expect(paragraphs[0].getTextContent()).toBe('hello');
      expect(paragraphs[1].getTextContent()).toBe('world');
    });
  });

  test('treats markup characters as literal text', () => {
    const editor = createEditor();
    editor.update(createEditorStateFromText('<b>bold</b>'), { discrete: true });

    editor.getEditorState().read(() => {
      expect($getRoot().getTextContent()).toBe('<b>bold</b>');
    });
  });

  test('creates an empty paragraph for empty documents', () => {
    const editor = createEditor();
    editor.update(createEditorStateFromText(''), { discrete: true });

    editor.getEditorState().read(() => {
      const paragraphs = $getRoot().getChildren();
      expect(paragraphs).toHaveLength(1);
      expect(paragraphs[0].getTextContent()).toBe('');
    });
  });
});
