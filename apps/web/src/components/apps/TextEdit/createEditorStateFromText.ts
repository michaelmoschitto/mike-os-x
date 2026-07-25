import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const createEditorStateFromText = (text: string) => {
  return () => {
    const root = $getRoot();
    root.clear();

    const lines = text.length === 0 ? [''] : text.split(/\r?\n/);
    for (const line of lines) {
      const paragraph = $createParagraphNode();
      if (line.length > 0) {
        paragraph.append($createTextNode(line));
      }
      root.append(paragraph);
    }
  };
};
