import { useEffect, useRef, useState } from 'react';
import { HistoryEntry } from '@/stores/useWindowStore';

interface BrowserToolbarProps {
  url: string;
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  browsingHistory?: HistoryEntry[];
  onNavigate: (url: string) => void;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onStop: () => void;
  onHome: () => void;
  onBookmarksClick: () => void;
  bookmarkButtonRef?: (node: HTMLButtonElement | null) => void;
  onAddressBarValueChange?: (value: string) => void;
}

const BrowserToolbar = ({
  url,
  canGoBack,
  canGoForward,
  isLoading,
  browsingHistory = [],
  onNavigate,
  onBack,
  onForward,
  onRefresh,
  onStop,
  onHome,
  onBookmarksClick,
  bookmarkButtonRef,
  onAddressBarValueChange,
}: BrowserToolbarProps) => {
  const [addressBarValue, setAddressBarValue] = useState(url);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [suggestions, setSuggestions] = useState<HistoryEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const isUserTypingRef = useRef(false);

  useEffect(() => {
    // Only update address bar value if user isn't actively typing
    // This prevents autocomplete from showing on programmatic navigation
    if (!isUserTypingRef.current) {
      setAddressBarValue(url);
      setShowSuggestions(false);
    }
  }, [url]);

  // Notify parent of address bar value changes
  useEffect(() => {
    onAddressBarValueChange?.(addressBarValue);
  }, [addressBarValue, onAddressBarValueChange]);

  // Filter history based on input - only when user is typing
  useEffect(() => {
    // Only show suggestions if user is actively typing
    if (!isUserTypingRef.current) {
      return;
    }

    const value = addressBarValue.trim().toLowerCase();
    
    if (value.length === 0) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Filter history entries that match the input
    const filtered = browsingHistory
      .filter((entry) => {
        const urlMatch = entry.url.toLowerCase().includes(value);
        const titleMatch = entry.title.toLowerCase().includes(value);
        return urlMatch || titleMatch;
      })
      .slice(0, 8); // Show max 8 suggestions

    setSuggestions(filtered);
    setShowSuggestions(filtered.length > 0);
    setSelectedIndex(-1);
  }, [addressBarValue, browsingHistory]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(event.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSuggestions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let processedUrl = addressBarValue.trim();
    
    // If a suggestion is selected, use that URL
    if (selectedIndex >= 0 && suggestions[selectedIndex]) {
      processedUrl = suggestions[selectedIndex].url;
    } else {
      // Add https:// if no protocol specified
      if (processedUrl && !processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
        processedUrl = 'https://' + processedUrl;
      }
    }
    
    isUserTypingRef.current = false;
    onNavigate(processedUrl);
    setShowSuggestions(false);
  };

  const handleFocus = () => {
    // Select all text when focusing address bar (classic browser behavior)
    inputRef.current?.select();
    // Only show suggestions if user has typed something (not programmatic updates)
    // We check if the current value matches the URL prop - if it does, it's likely programmatic
    if (addressBarValue.trim().length > 0 && addressBarValue.trim() !== url) {
      isUserTypingRef.current = true;
      const value = addressBarValue.trim().toLowerCase();
      const filtered = browsingHistory
        .filter((entry) => {
          const urlMatch = entry.url.toLowerCase().includes(value);
          const titleMatch = entry.title.toLowerCase().includes(value);
          return urlMatch || titleMatch;
        })
        .slice(0, 8);
      if (filtered.length > 0) {
        setSuggestions(filtered);
        setShowSuggestions(true);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = suggestions[selectedIndex];
      if (selected) {
        isUserTypingRef.current = false;
        setAddressBarValue(selected.url);
        onNavigate(selected.url);
        setShowSuggestions(false);
      }
    }
  };

  const handleSuggestionClick = (entry: HistoryEntry) => {
    isUserTypingRef.current = false;
    setAddressBarValue(entry.url);
    onNavigate(entry.url);
    setShowSuggestions(false);
  };

  const getDomainFromUrl = (urlString: string) => {
    try {
      return new URL(urlString).hostname;
    } catch {
      return urlString;
    }
  };

  return (
    <div
      className="aqua-pinstripe relative flex h-[52px] items-center gap-2 px-3"
      style={{
        background: 'repeating-linear-gradient(0deg, #f0f0f0, #f0f0f0 1px, #e4e4e4 1px, #e4e4e4 2px)',
        borderBottom: '1px solid #999999',
        boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.9), 0 1px 2px rgba(0, 0, 0, 0.1)',
      }}
    >
      {/* Navigation buttons */}
      <div className="flex items-center gap-1">
        <ToolbarButton
          onClick={onBack}
          disabled={!canGoBack}
          title="Back"
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M12 4 L6 10 L12 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        <ToolbarButton
          onClick={onForward}
          disabled={!canGoForward}
          title="Forward"
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M8 4 L14 10 L8 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
        {isLoading ? (
          <ToolbarButton
            onClick={onStop}
            title="Stop"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="6" y="6" width="8" height="8" fill="currentColor" rx="1" />
              </svg>
            }
          />
        ) : (
          <ToolbarButton
            onClick={onRefresh}
            title="Refresh"
            icon={
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path
                  d="M16 10 C16 13.3 13.3 16 10 16 C6.7 16 4 13.3 4 10 C4 6.7 6.7 4 10 4 C11.8 4 13.4 4.8 14.5 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  fill="none"
                />
                <path d="M14 3 L14 6 L11 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            }
          />
        )}
        <ToolbarButton
          onClick={onHome}
          title="Home"
          icon={
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 10 L10 4 L16 10 L16 16 L12 16 L12 12 L8 12 L8 16 L4 16 Z"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
      </div>

      {/* Divider */}
      <div className="h-[32px] w-px" style={{ background: 'linear-gradient(180deg, transparent, #999 0%, #999 50%, transparent 100%)' }} />

      {/* Address bar with autocomplete */}
      <form onSubmit={handleSubmit} className="relative flex flex-1 items-center gap-2">
        <span className="font-ui text-[11px] font-medium text-gray-800 select-none">Address:</span>
        <div className="relative flex-1">
          <input
            ref={inputRef}
            type="text"
            value={addressBarValue}
            onChange={(e) => {
              isUserTypingRef.current = true;
              setAddressBarValue(e.target.value);
            }}
            onFocus={handleFocus}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Reset typing flag after a short delay to allow for programmatic updates
              setTimeout(() => {
                isUserTypingRef.current = false;
              }, 100);
            }}
            placeholder="Enter URL"
            className="font-ui h-[24px] w-full px-2 text-[12px] focus:outline-none"
            style={{
              background: '#fff',
              border: '1px solid #8a8a8a',
              borderRadius: '3px',
              boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.1)',
            }}
          />
          
          {/* Autocomplete suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute left-0 right-0 top-full z-50 mt-1 max-h-[300px] overflow-y-auto"
              style={{
                background: 'linear-gradient(180deg, #f5f5f5 0%, #e8e8e8 100%)',
                border: '1px solid #999',
                borderRadius: '4px',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.6)',
              }}
            >
              {suggestions.map((entry, index) => (
                <button
                  key={`${entry.url}-${entry.visitTime}`}
                  onClick={() => handleSuggestionClick(entry)}
                  className="font-ui w-full px-3 py-2 text-left text-[11px] hover:bg-blue-500 hover:text-white"
                  style={{
                    background: selectedIndex === index ? 'rgba(59, 156, 255, 0.2)' : 'transparent',
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  type="button"
                >
                  <div className="flex items-center gap-2">
                    {/* History icon */}
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="flex-shrink-0">
                      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5" fill="none" />
                      <path d="M8 4 L8 8 L11 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <div className="truncate font-medium">{entry.title}</div>
                      <div className="truncate text-[10px] opacity-70">{getDomainFromUrl(entry.url)}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </form>

      {/* Divider */}
      <div className="h-[32px] w-px" style={{ background: 'linear-gradient(180deg, transparent, #999 0%, #999 50%, transparent 100%)' }} />

      {/* Bookmarks button */}
      <ToolbarButton
        buttonRef={bookmarkButtonRef}
        onClick={onBookmarksClick}
        title="Favorites"
        icon={
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path
              d="M6 3 L14 3 L14 18 L10 15 L6 18 Z"
              stroke="currentColor"
              strokeWidth="1.5"
              fill="none"
              strokeLinejoin="round"
            />
            <path d="M6 3 L14 3 L14 18 L10 15 L6 18 Z" fill="currentColor" opacity="0.2" />
          </svg>
        }
      />
    </div>
  );
};

interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  icon: React.ReactNode;
  buttonRef?: (node: HTMLButtonElement | null) => void;
}

const ToolbarButton = ({ onClick, disabled = false, title, icon, buttonRef }: ToolbarButtonProps) => {
  return (
    <button
      ref={buttonRef}
      className="font-ui relative flex h-[28px] w-[28px] items-center justify-center text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: disabled
          ? 'linear-gradient(to bottom, #d0d0d0 0%, #b8b8b8 100%)'
          : 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)',
        border: '1px solid #a0a0a0',
        borderRadius: '4px',
        boxShadow: disabled
          ? 'inset 0 1px 2px rgba(0, 0, 0, 0.2)'
          : '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)',
        color: disabled ? '#666' : '#2c2c2c',
      }}
      onClick={onClick}
      disabled={disabled}
      title={title}
      type="button"
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(to bottom, #ffffff 0%, #e8e8e8 100%)';
        }
      }}
      onMouseDown={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(to bottom, #e0e0e0 0%, #d8d8d8 100%)';
          e.currentTarget.style.boxShadow = 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9';
        }
      }}
      onMouseUp={(e) => {
        if (!disabled) {
          e.currentTarget.style.background = 'linear-gradient(to bottom, #f8f8f8 0%, #e0e0e0 100%)';
          e.currentTarget.style.boxShadow = '0 1px 2px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8)';
        }
      }}
    >
      {icon}
    </button>
  );
};

export default BrowserToolbar;
