import type { EditorThemeClasses } from 'lexical';

export const textEditTheme: EditorThemeClasses = {
  paragraph: 'textedit-paragraph',
  text: {
    bold: 'textedit-text-bold',
    italic: 'textedit-text-italic',
    underline: 'textedit-text-underline',
  },
  list: {
    ul: 'textedit-list-ul',
    ol: 'textedit-list-ol',
    listitem: 'textedit-list-item',
    nested: {
      listitem: 'textedit-nested-list-item',
    },
  },
};
