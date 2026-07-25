import { ListItemNode, ListNode } from '@lexical/list';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';

import { createEditorStateFromText } from '@/components/apps/TextEdit/createEditorStateFromText';
import PlainTextPastePlugin from '@/components/apps/TextEdit/PlainTextPastePlugin';
import TextEditRuler from '@/components/apps/TextEdit/TextEditRuler';
import { textEditTheme } from '@/components/apps/TextEdit/textEditTheme';
import TextEditToolbarPlugin from '@/components/apps/TextEdit/TextEditToolbarPlugin';

interface TextEditEditorProps {
  documentKey: string;
  initialText: string;
  title: string;
}

const TextEditEditor = ({ documentKey, initialText, title }: TextEditEditorProps) => {
  const initialConfig = {
    namespace: `TextEdit-${documentKey}`,
    theme: textEditTheme,
    nodes: [ListNode, ListItemNode],
    onError: (error: Error) => {
      console.error('[TextEdit] Lexical error:', error);
    },
    editorState: createEditorStateFromText(initialText),
  };

  return (
    <LexicalComposer key={documentKey} initialConfig={initialConfig}>
      <div className="flex min-h-0 flex-1 flex-col">
        <TextEditToolbarPlugin />
        <TextEditRuler />
        <div className="relative flex-1 overflow-auto bg-white">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                aria-label={title}
                aria-multiline="true"
                className="textedit-editor font-ui min-h-full p-6 text-[12px] leading-[1.5] text-black focus:outline-none"
                role="textbox"
                spellCheck
              />
            }
            placeholder={null}
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
      </div>
      <HistoryPlugin />
      <ListPlugin />
      <PlainTextPastePlugin />
    </LexicalComposer>
  );
};

export default TextEditEditor;
