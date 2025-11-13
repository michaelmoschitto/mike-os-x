import { useCallback, useEffect, useRef, useState } from 'react';

interface BrowserContentProps {
  url: string;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onUrlChange?: (newUrl: string) => void;
}

const LOADING_TIMEOUT_MS = 2000;

const BrowserContent = ({ url, onLoadStart, onLoadEnd, onUrlChange }: BrowserContentProps) => {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastKnownUrlRef = useRef<string>(url);
  const isInternalNavigationRef = useRef(false);

  const checkIframeUrl = useCallback(() => {
    if (iframeRef.current?.contentWindow) {
      try {
        const iframeUrl = iframeRef.current.contentWindow.location.href;
        if (iframeUrl && iframeUrl !== lastKnownUrlRef.current) {
          lastKnownUrlRef.current = iframeUrl;
          // Mark as internal navigation so we don't reload the iframe
          isInternalNavigationRef.current = true;
          onUrlChange?.(iframeUrl);
        }
      } catch (e) {
        // Cross-origin restriction - expected for most websites
      }
    }
  }, [onUrlChange]);

  useEffect(() => {
    // If URL change came from internal navigation (iframe redirect), check if reload is needed
    if (isInternalNavigationRef.current) {
      isInternalNavigationRef.current = false;
      if (iframeRef.current?.contentWindow) {
        try {
          const currentIframeUrl = iframeRef.current.contentWindow.location.href;
          if (currentIframeUrl === url) {
            return;
          }
        } catch (e) {
          // Cross-origin - can't check, reload to be safe
        }
      }
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    lastKnownUrlRef.current = url;

    if (url && url !== 'about:blank') {
      setError(null);
      setIsLoading(true);
      onLoadStart();

      // Set a timeout - for cross-origin iframes, onLoad might not fire reliably
      // After the timeout, hide the loading spinner but let the iframe continue loading
      timeoutRef.current = window.setTimeout(() => {
        setIsLoading(false);
        onLoadEnd();
        checkIframeUrl();
      }, LOADING_TIMEOUT_MS);
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

  useEffect(() => {
    if (!url || url === 'about:blank') return;

    // Only works for same-origin iframes due to security restrictions
    const intervalId = setInterval(() => {
      checkIframeUrl();
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [url, checkIframeUrl]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (iframeRef.current?.contentWindow === event.source) {
        if (event.data && typeof event.data === 'object' && event.data.type === 'url-change') {
          const newUrl = event.data.url;
          if (newUrl && newUrl !== lastKnownUrlRef.current) {
            lastKnownUrlRef.current = newUrl;
            onUrlChange?.(newUrl);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [onUrlChange]);

  const handleIframeLoad = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
    setError(null);
    onLoadEnd();

    // Small delay to ensure iframe has finished navigating
    setTimeout(() => {
      checkIframeUrl();
    }, 100);
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
          <div
            className="aqua-titlebar flex items-center justify-center px-2.5"
            style={{ height: '22px' }}
          >
            <span className="font-ui text-[11px] font-semibold tracking-tight text-black/80">
              Cannot Open Page
            </span>
          </div>

          <div className="bg-white p-6">
            <div className="mb-4 flex items-start gap-3">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className="flex-shrink-0">
                <circle cx="24" cy="24" r="20" fill="#FFD700" />
                <path d="M24 14 L24 28" stroke="#000" strokeWidth="3" strokeLinecap="round" />
                <circle cx="24" cy="34" r="2" fill="#000" />
              </svg>

              <div className="font-ui flex-1 text-sm">
                <p className="mb-2 font-semibold">Internet Explorer cannot display this webpage.</p>
                <p className="text-gray-600">{error}</p>
                <p className="mt-2 text-gray-600">
                  Most websites block embedding in iframes for security reasons (X-Frame-Options).
                  This is normal behavior, not a bug.
                </p>
                <p className="mt-2 text-gray-600">
                  You can click "Open in Real Browser" to view the page in your default browser.
                </p>
              </div>
            </div>

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
      {/* 
        Iframe sandbox permissions explained:
        - allow-same-origin: Allows the iframe to access its origin (needed for cookies, localStorage, etc.)
        - allow-scripts: Allows JavaScript execution (required for most websites)
        - allow-popups: Allows window.open() to create popups
        - allow-forms: Allows form submission
        - allow-popups-to-escape-sandbox: Allows popups to escape sandbox restrictions
        - allow-top-navigation: Allows navigation of the top-level browsing context (parent window)
          ⚠️ SECURITY NOTE: This allows embedded pages to navigate the parent window. 
          This is necessary for some websites to function properly, but could be a security concern.
          Consider removing if not needed for your use case.
      */}
    </div>
  );
};

export default BrowserContent;
