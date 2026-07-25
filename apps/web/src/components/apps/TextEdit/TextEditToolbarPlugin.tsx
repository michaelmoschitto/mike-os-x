import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  $isListItemNode,
} from '@lexical/list';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelectionStyleValueForProperty,
  $patchStyleText,
  getCSSFromStyleObject,
  getStyleObjectFromCSS,
} from '@lexical/selection';
import { $findMatchingParent } from '@lexical/utils';
import {
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  FORMAT_ELEMENT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  type ElementFormatType,
} from 'lexical';
import { useCallback, useEffect, useState } from 'react';

import TextEditToolbar from '@/components/apps/TextEdit/TextEditToolbar';

const DEFAULT_FONT_SIZE = 12;
const DEFAULT_LINE_HEIGHT = 1.5;
const FONT_SIZES = [9, 10, 11, 12, 13, 14, 18, 24, 36, 48, 64, 72, 96];

type Alignment = 'left' | 'center' | 'right' | 'justify';

interface ToolbarState {
  alignment: Alignment;
  fontSize: number;
  lineHeight: number;
}

const normalizeAlignment = (format: ElementFormatType | ''): Alignment => {
  if (format === 'center' || format === 'right' || format === 'justify') {
    return format;
  }
  return 'left';
};

const parseFontSize = (value: string): number => {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return DEFAULT_FONT_SIZE;
  const match = FONT_SIZES.find((size) => Math.abs(size - parsed) < 0.01);
  return match ?? Math.round(parsed);
};

const parseLineHeight = (style: string): number => {
  const styles = getStyleObjectFromCSS(style);
  const value = styles['line-height'];
  if (!value) return DEFAULT_LINE_HEIGHT;
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? Number(parsed.toFixed(1)) : DEFAULT_LINE_HEIGHT;
};

const TextEditToolbarPlugin = () => {
  const [editor] = useLexicalComposerContext();
  const [toolbarState, setToolbarState] = useState<ToolbarState>({
    alignment: 'left',
    fontSize: DEFAULT_FONT_SIZE,
    lineHeight: DEFAULT_LINE_HEIGHT,
  });

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;

    const fontSizeValue = $getSelectionStyleValueForProperty(
      selection,
      'font-size',
      `${DEFAULT_FONT_SIZE}px`
    );

    const anchorNode = selection.anchor.getNode();
    const element =
      anchorNode.getKey() === 'root'
        ? anchorNode
        : $findMatchingParent(anchorNode, (node) => $isElementNode(node) && !node.isInline());

    let alignment: Alignment = 'left';
    let lineHeight = DEFAULT_LINE_HEIGHT;

    if ($isElementNode(element)) {
      alignment = normalizeAlignment(element.getFormatType());
      lineHeight = parseLineHeight(element.getStyle());
    }

    const listItem = $findMatchingParent(anchorNode, $isListItemNode);
    if (listItem && $isElementNode(listItem) && listItem.getStyle().includes('line-height')) {
      lineHeight = parseLineHeight(listItem.getStyle());
    }

    setToolbarState({
      alignment,
      fontSize: parseFontSize(fontSizeValue),
      lineHeight,
    });
  }, []);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      () => {
        updateToolbar();
        return false;
      },
      COMMAND_PRIORITY_CRITICAL
    );
  }, [editor, updateToolbar]);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  const handleAlignmentChange = (alignment: Alignment) => {
    editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, alignment);
  };

  const handleFontSizeChange = (size: number) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        $patchStyleText(selection, { 'font-size': `${size}px` });
      }
    });
    editor.focus();
  };

  const handleLineHeightChange = (lineHeight: number) => {
    const nextLineHeight = Number(Math.min(3, Math.max(1, lineHeight)).toFixed(1));
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const nodes = selection.getNodes();
      const blocks = new Set(
        nodes
          .map((node) =>
            $findMatchingParent(
              node,
              (candidate) =>
                ($isElementNode(candidate) && !candidate.isInline()) || $isListItemNode(candidate)
            )
          )
          .filter((node): node is NonNullable<typeof node> => node != null)
      );

      if (blocks.size === 0) {
        const anchorNode = selection.anchor.getNode();
        const block = $findMatchingParent(
          anchorNode,
          (candidate) =>
            ($isElementNode(candidate) && !candidate.isInline()) || $isListItemNode(candidate)
        );
        if (block && $isElementNode(block)) {
          blocks.add(block);
        }
      }

      blocks.forEach((block) => {
        if (!$isElementNode(block)) return;
        const styles = getStyleObjectFromCSS(block.getStyle());
        styles['line-height'] = String(nextLineHeight);
        block.setStyle(getCSSFromStyleObject(styles));
      });
    });
  };

  const handleBulletedList = () => {
    editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
  };

  const handleNumberedList = () => {
    editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
  };

  return (
    <TextEditToolbar
      alignment={toolbarState.alignment}
      fontSize={toolbarState.fontSize}
      lineHeight={toolbarState.lineHeight}
      onAlignmentChange={handleAlignmentChange}
      onFontSizeChange={handleFontSizeChange}
      onLineHeightChange={handleLineHeightChange}
      onBulletedList={handleBulletedList}
      onNumberedList={handleNumberedList}
    />
  );
};

export default TextEditToolbarPlugin;
