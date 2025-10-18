interface TextEditToolbarProps {
  alignment: 'left' | 'center' | 'right' | 'justify';
  fontSize: number;
  lineHeight: number;
  onAlignmentChange: (alignment: 'left' | 'center' | 'right' | 'justify') => void;
  onFontSizeChange: (size: number) => void;
  onLineHeightChange: (lineHeight: number) => void;
}

const FONT_SIZES = [9, 10, 11, 12, 13, 14, 18, 24, 36, 48, 64, 72, 96];

// Divider component for toolbar
const ToolbarDivider = () => <div className="mx-1 h-[18px] w-px bg-[#999]" />;

const TextEditToolbar = ({
  alignment,
  fontSize,
  lineHeight,
  onAlignmentChange,
  onFontSizeChange,
  onLineHeightChange,
}: TextEditToolbarProps) => {
  return (
    <div
      className="relative flex h-[32px] items-center justify-between px-2"
      style={{
        background: '#d9d9d9',
        borderTop: '1px solid #f8f8f8',
        borderBottom: '1px solid #8a8a8a',
      }}
    >
      {/* Left: Alignment buttons */}
      <div className="flex items-center gap-[2px]">
        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: alignment === 'left' ? '#c8c8c8' : '#e5e5e5',
            border: '1px solid #999',
            borderTopLeftRadius: '2px',
            borderBottomLeftRadius: '2px',
            borderRight: 'none',
            boxShadow:
              alignment === 'left'
                ? 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9'
                : 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onAlignmentChange('left')}
          title="Align Left"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="11" x2="7" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: alignment === 'center' ? '#c8c8c8' : '#e5e5e5',
            border: '1px solid #999',
            borderLeft: 'none',
            borderRight: 'none',
            boxShadow:
              alignment === 'center'
                ? 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9'
                : 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onAlignmentChange('center')}
          title="Align Center"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1" />
            <line x1="3" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1" />
            <line x1="2" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="1" />
            <line x1="4" y1="11" x2="10" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: alignment === 'right' ? '#c8c8c8' : '#e5e5e5',
            border: '1px solid #999',
            borderLeft: 'none',
            borderRight: 'none',
            boxShadow:
              alignment === 'right'
                ? 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9'
                : 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onAlignmentChange('right')}
          title="Align Right"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1" />
            <line x1="5" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" />
            <line x1="3" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1" />
            <line x1="7" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: alignment === 'justify' ? '#c8c8c8' : '#e5e5e5',
            border: '1px solid #999',
            borderLeft: 'none',
            borderTopRightRadius: '2px',
            borderBottomRightRadius: '2px',
            boxShadow:
              alignment === 'justify'
                ? 'inset 1px 1px 0 #777, inset -1px -1px 0 #f9f9f9'
                : 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onAlignmentChange('justify')}
          title="Justify"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="2" x2="13" y2="2" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="5" x2="13" y2="5" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1" />
            <line x1="1" y1="11" x2="13" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <ToolbarDivider />

        {/* Line spacing buttons */}
        <button
          className="toolbar-button font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: '#e5e5e5',
            border: '1px solid #999',
            borderTopLeftRadius: '2px',
            borderBottomLeftRadius: '2px',
            borderRight: 'none',
            boxShadow: 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onLineHeightChange(Math.min(lineHeight + 0.1, 3))}
          title="Increase Line Spacing"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 3 L10 6 L4 6 Z" fill="currentColor" />
            <line x1="2" y1="9" x2="12" y2="9" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="toolbar-button font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: '#e5e5e5',
            border: '1px solid #999',
            borderLeft: 'none',
            borderTopRightRadius: '2px',
            borderBottomRightRadius: '2px',
            boxShadow: 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          onClick={() => onLineHeightChange(Math.max(lineHeight - 0.1, 1))}
          title="Decrease Line Spacing"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M7 11 L10 8 L4 8 Z" fill="currentColor" />
            <line x1="2" y1="5" x2="12" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <ToolbarDivider />

        {/* List buttons */}
        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: '#e5e5e5',
            border: '1px solid #999',
            borderTopLeftRadius: '2px',
            borderBottomLeftRadius: '2px',
            borderRight: 'none',
            boxShadow: 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          title="Bulleted List"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="3" cy="3" r="1" fill="currentColor" />
            <circle cx="3" cy="7" r="1" fill="currentColor" />
            <circle cx="3" cy="11" r="1" fill="currentColor" />
            <line x1="6" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1" />
            <line x1="6" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1" />
            <line x1="6" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>

        <button
          className="font-ui relative flex h-[22px] w-[24px] items-center justify-center text-xs transition-all"
          style={{
            background: '#e5e5e5',
            border: '1px solid #999',
            borderLeft: 'none',
            borderTopRightRadius: '2px',
            borderBottomRightRadius: '2px',
            boxShadow: 'inset 1px 1px 0 #f8f8f8, inset -1px -1px 0 #888',
          }}
          title="Numbered List"
          type="button"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <text x="1" y="5" fontSize="5" fill="currentColor">
              1.
            </text>
            <text x="1" y="9" fontSize="5" fill="currentColor">
              2.
            </text>
            <text x="1" y="13" fontSize="5" fill="currentColor">
              3.
            </text>
            <line x1="6" y1="3" x2="12" y2="3" stroke="currentColor" strokeWidth="1" />
            <line x1="6" y1="7" x2="12" y2="7" stroke="currentColor" strokeWidth="1" />
            <line x1="6" y1="11" x2="12" y2="11" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>

      {/* Center: Font size dropdown */}
      <div className="absolute left-1/2 -translate-x-1/2">
        <select
          className="font-ui h-[22px] rounded-sm px-2.5 pr-5 text-[10px] transition-all focus:ring-1 focus:ring-blue-400 focus:outline-none"
          style={{
            background: '#e5e5e5',
            border: '1px solid #999',
            borderRadius: '2px',
            boxShadow: 'inset 1px 1px 2px rgba(0, 0, 0, 0.15), inset -1px -1px 0 #f8f8f8',
          }}
          value={fontSize}
          onChange={(e) => onFontSizeChange(Number(e.target.value))}
        >
          {FONT_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Right: Empty space for symmetry */}
      <div />
    </div>
  );
};

export default TextEditToolbar;
