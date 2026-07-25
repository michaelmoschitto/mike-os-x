import { useEffect, useRef, useState } from 'react';

import TextEditEditor from '@/components/apps/TextEdit/TextEditEditor';
import Window from '@/components/window/Window';
import { useContentIndex } from '@/lib/contentIndex';
import { loadContentFile } from '@/lib/contentLoader';
import { useWindowLifecycle } from '@/lib/hooks/useWindowLifecycle';
import { type Window as WindowType } from '@/stores/useWindowStore';

interface TextEditWindowProps {
  window: WindowType;
  isActive: boolean;
}

const TextEditWindow = ({ window: windowData, isActive }: TextEditWindowProps) => {
  const { handleClose, handleFocus, handleMinimize, handleDragEnd, handleResize } =
    useWindowLifecycle({
      window: windowData,
      isActive,
    });

  const [sourceText, setSourceText] = useState<string | null>(
    windowData.content ? windowData.content : null
  );
  const [isLoading, setIsLoading] = useState(!windowData.content && Boolean(windowData.urlPath));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const loadRequestRef = useRef(0);
  const isIndexed = useContentIndex((state) => state.isIndexed);
  const documentKey = `${windowData.id}:${windowData.urlPath ?? 'untitled'}`;

  useEffect(() => {
    if (windowData.content) {
      loadRequestRef.current += 1;
      setSourceText(windowData.content);
      setIsLoading(false);
      setLoadError(null);
    }
  }, [windowData.content, windowData.id, windowData.urlPath]);

  useEffect(() => {
    if (windowData.content || !windowData.urlPath) {
      if (!windowData.content && !windowData.urlPath) {
        setSourceText('');
        setIsLoading(false);
      }
      return;
    }

    if (!isIndexed) {
      setIsLoading(true);
      return;
    }

    const requestId = loadRequestRef.current + 1;
    loadRequestRef.current = requestId;
    setIsLoading(true);
    setLoadError(null);

    const loadContent = async () => {
      try {
        const entry = useContentIndex.getState().getEntry(windowData.urlPath ?? '');
        if (!entry) {
          throw new Error('Document could not be found.');
        }

        const loaded = await loadContentFile(entry.filePath);
        if (loadRequestRef.current !== requestId) return;

        setSourceText(loaded.content);
        setIsLoading(false);
      } catch (error) {
        if (loadRequestRef.current !== requestId) return;
        setLoadError(error instanceof Error ? error.message : 'Document could not be loaded.');
        setIsLoading(false);
      }
    };

    void loadContent();
    return () => {
      if (loadRequestRef.current === requestId) {
        loadRequestRef.current += 1;
      }
    };
  }, [isIndexed, loadAttempt, windowData.content, windowData.id, windowData.urlPath]);

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
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
        {isLoading && (
          <div
            aria-live="polite"
            className="absolute inset-0 z-10 flex items-center justify-center bg-white"
            role="status"
          >
            <span className="font-ui text-sm text-gray-500">Loading...</span>
          </div>
        )}
        {loadError && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-white">
            <span className="font-ui text-sm text-red-700" role="alert">
              {loadError}
            </span>
            <button
              className="aqua-button px-3 py-1 text-xs"
              onClick={() => {
                setLoadError(null);
                setLoadAttempt((attempt) => attempt + 1);
              }}
              type="button"
            >
              Retry
            </button>
          </div>
        )}
        {sourceText !== null && !loadError && (
          <TextEditEditor
            documentKey={documentKey}
            initialText={sourceText}
            title={windowData.title}
          />
        )}
      </div>
    </Window>
  );
};

export default TextEditWindow;
