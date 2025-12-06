import { useEffect, useRef, useState } from 'react';

import TextEditRuler from '@/components/apps/TextEdit/TextEditRuler';
import TextEditToolbar from '@/components/apps/TextEdit/TextEditToolbar';
import Window from '@/components/window/Window';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface TextEditWindowProps {
  window: WindowType;
  isActive: boolean;
}

const TextEditWindow = ({ window: windowData, isActive }: TextEditWindowProps) => {
  const { updateWindowContent } = useWindowStore();

  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.5);

  const editorRef = useRef<HTMLDivElement>(null);

  // Initialize content
  useEffect(() => {
    if (editorRef.current && windowData.content) {
      // Convert line breaks to HTML breaks for proper display
      const htmlContent = windowData.content.replace(/\n/g, '<br>');
      editorRef.current.innerHTML = htmlContent;
    }
  }, [windowData.content]);

  const handleContentChange = () => {
    if (editorRef.current) {
      updateWindowContent(windowData.id, editorRef.current.innerHTML);
    }
  };

  const handleAlignmentChange = (newAlignment: 'left' | 'center' | 'right' | 'justify') => {
    setAlignment(newAlignment);
  };

  const handleFontSizeChange = (size: number) => {
    setFontSize(size);
  };

  const handleLineHeightChange = (newLineHeight: number) => {
    setLineHeight(newLineHeight);
  };

  const handleBulletedList = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertUnorderedList', false);
    }
  };

  const handleNumberedList = () => {
    if (editorRef.current) {
      editorRef.current.focus();
      document.execCommand('insertOrderedList', false);
    }
  };

  // Keyboard shortcuts for formatting
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isActive) return;

      // Cmd/Ctrl + B for bold
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        document.execCommand('bold');
      }
      // Cmd/Ctrl + I for italic
      if ((e.metaKey || e.ctrlKey) && e.key === 'i') {
        e.preventDefault();
        document.execCommand('italic');
      }
      // Cmd/Ctrl + U for underline
      if ((e.metaKey || e.ctrlKey) && e.key === 'u') {
        e.preventDefault();
        document.execCommand('underline');
      }
    };

    globalThis.window.addEventListener('keydown', handleKeyDown);
    return () => globalThis.window.removeEventListener('keydown', handleKeyDown);
  }, [isActive]);

  return (
    <Window
      id={windowData.id}
      title={windowData.title}
      isActive={isActive}
      position={windowData.position}
      size={windowData.size}
      zIndex={windowData.zIndex}
      onClose={handleClose}
      onMinimize={handleMinimize}
      onFocus={handleFocus}
      onDragEnd={handleDragEnd}
      onResize={handleResize}
    >
      {/* Toolbar */}
      <TextEditToolbar
        alignment={alignment}
        fontSize={fontSize}
        lineHeight={lineHeight}
        onAlignmentChange={handleAlignmentChange}
        onFontSizeChange={handleFontSizeChange}
        onLineHeightChange={handleLineHeightChange}
        onBulletedList={handleBulletedList}
        onNumberedList={handleNumberedList}
      />

      {/* Ruler */}
      <TextEditRuler />

      {/* Text Editor */}
      <div className="flex-1 overflow-auto bg-white">
        <div
          ref={editorRef}
          className="font-ui min-h-full p-6 focus:outline-none"
          contentEditable
          suppressContentEditableWarning
          onInput={handleContentChange}
          style={{
            fontSize: `${fontSize}px`,
            textAlign: alignment,
            lineHeight: lineHeight.toFixed(1),
            color: '#000',
          }}
        />
      </div>
    </Window>
  );
};

export default TextEditWindow;
