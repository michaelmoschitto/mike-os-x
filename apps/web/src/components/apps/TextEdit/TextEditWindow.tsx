import { useEffect, useRef, useState } from 'react';

import TextEditRuler from '@/components/apps/TextEdit/TextEditRuler';
import TextEditToolbar from '@/components/apps/TextEdit/TextEditToolbar';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { useWindowStore, type Window as WindowType } from '@/stores/useWindowStore';

interface TextEditWindowProps {
  window: WindowType;
  isActive: boolean;
}

const TextEditWindow = ({ window: windowData, isActive }: TextEditWindowProps) => {
  const { updateWindowContent, updateWindow } = useWindowStore();

  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const [alignment, setAlignment] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [fontSize, setFontSize] = useState(12);
  const [lineHeight, setLineHeight] = useState(1.5);
  const [isLoading, setIsLoading] = useState(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const hasLoadedRef = useRef(false);

  // Subscribe to content index state
  const isIndexed = useContentIndex((state) => state.isIndexed);

  // Load content from urlPath if content is empty
  useEffect(() => {
    // Skip if already loaded or no urlPath or content exists
    if (hasLoadedRef.current || !windowData.urlPath || windowData.content) {
      return;
    }

    if (!isIndexed) {
      return;
    }

    hasLoadedRef.current = true;
    setIsLoading(true);

    const loadContent = async () => {
      try {
        if (!windowData.urlPath) return;
        const entry = useContentIndex.getState().getEntry(windowData.urlPath);
        if (entry) {
          const loaded = await loadContentFile(entry.filePath);
          updateWindow(windowData.id, { content: loaded.content }, { skipRouteSync: true });
        }
      } catch (error) {
        console.error('[TextEdit] Failed to load content:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [windowData.urlPath, windowData.content, windowData.id, updateWindow, isIndexed]);

  useEffect(() => {
    if (editorRef.current && windowData.content) {
      const htmlContent = windowData.content.replace(/\n/g, '<br>');
      editorRef.current.innerHTML = htmlContent;
    }
  }, [windowData.content]);

  useEffect(() => {
    if (!isLoading && editorRef.current && windowData.content && !editorRef.current.innerHTML) {
      const htmlContent = windowData.content.replace(/\n/g, '<br>');
      editorRef.current.innerHTML = htmlContent;
    }
  }, [isLoading, windowData.content]);

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
      <div className="relative flex-1 overflow-auto bg-white">
        {isLoading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
            <span className="font-ui text-sm text-gray-500">Loading...</span>
          </div>
        )}
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
