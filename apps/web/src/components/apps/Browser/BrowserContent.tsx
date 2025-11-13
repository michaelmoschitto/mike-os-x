import { useEffect, useRef, useState } from 'react';

interface BrowserContentProps {
  url: string;
  onLoadStart: () => void;
  onLoadEnd: () => void;
}

const BrowserContent = ({ url, onLoadStart, onLoadEnd }: BrowserContentProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (url && url !== 'about:blank') {
      setError(null);
      setIsLoading(true);
      onLoadStart();

      // Set a shorter timeout - for cross-origin iframes, onLoad might not fire reliably
      // After 2 seconds, hide the loading spinner but let the iframe continue loading
      timeoutRef.current = window.setTimeout(() => {
        setIsLoading(false);
        onLoadEnd();
      }, 2000);
    } else {
      setIsLoading(false);
      onLoadEnd();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const handleIframeLoad = () => {
    // Clear timeout if page loads successfully
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setError(null);
    onLoadEnd();
  };

  const handleIframeError = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setError('Unable to load this page. The site may not allow embedding.');
    setIsLoading(false);
    onLoadEnd();
  };

  const handleOpenInBrowser = () => {
    if (url) {
      globalThis.window.open(url, '_blank');
    }
  };

  if (!url) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white">
        <div className="text-center">
          <div className="mb-4">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" className="mx-auto">
              <circle cx="32" cy="32" r="28" stroke="#ccc" strokeWidth="2" fill="none" />
              <path
                d="M20 32 L32 20 L44 32 L44 44 L36 44 L36 34 L28 34 L28 44 L20 44 Z"
                stroke="#ccc"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </div>
          <p className="font-ui text-sm text-gray-500">Enter a URL to start browsing</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-white">
        <div
          className="aqua-window max-w-md overflow-hidden"
          style={{
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
          }}
        >
          {/* Dialog Titlebar */}
          <div
            className="aqua-titlebar flex items-center justify-center px-2.5"
            style={{ height: '22px' }}
          >
            <span className="font-ui text-[11px] font-semibold tracking-tight text-black/80">
              Cannot Open Page
            </span>
          </div>

          {/* Dialog Content */}
          <div className="bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              {/* Warning icon */}
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="flex-shrink-0">
                <circle cx="24" cy="24" r="20" fill="#FFD700" />
                <path d="M24 14 L24 28" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                <circle cx="24" cy="34" r="2" fill="#000" />
              </svg>

              {/* Error message */}
              <div className="font-ui flex-1 text-sm">
                <p className="mb-2 font-semibold">Internet Explorer cannot display this webpage.</p>
                <p className="text-gray-600">{error}</p>
                <p className="mt-2 text-gray-600">
                  Most websites block embedding in iframes for security reasons (X-Frame-Options). This is normal behavior, not a bug.
                </p>
                <p className="mt-2 text-gray-600">
                  You can click "Open in Real Browser" to view the page in your default browser.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex justify-end gap-2">
              <button
                className="font-ui aqua-button px-4 py-1.5 text-[11px]"
                onClick={handleOpenInBrowser}
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #e0e0e0 100%)',
                  border: '1px solid #999',
                  borderRadius: '4px',
                  boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.8)',
                }}
              >
                Open in Real Browser
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-white">
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white">
          <div className="flex flex-col items-center gap-3">
            {/* Loading spinner */}
            <div className="relative h-8 w-8">
              <div
                className="absolute inset-0 animate-spin rounded-full border-2 border-gray-300 border-t-blue-500"
                style={{ animationDuration: '0.8s' }}
              />
            </div>
            <p className="font-ui text-sm text-gray-500">Loading...</p>
          </div>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        title="Browser Content"
        className="h-full w-full border-0"
        sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation"
        onLoad={handleIframeLoad}
        onError={handleIframeError}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
};

export default BrowserContent;

