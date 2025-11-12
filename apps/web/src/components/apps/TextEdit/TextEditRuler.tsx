const TextEditRuler = () => {
  // Generate tick marks for ruler (every inch, with half-inch marks)
  const ticks = [];
  const totalInches = 7; // 0 to 7 inches
  const pixelsPerInch = 72; // Standard screen DPI
  const startOffset = 12; // Offset from left edge for first tick

  for (let i = 0; i <= totalInches; i++) {
    const left = startOffset + i * pixelsPerInch;

    // Main inch mark with number
    ticks.push(
      <div
        key={`inch-${i}`}
        className="absolute flex flex-col items-center"
        style={{ left: `${left}px`, top: 0 }}
      >
        <div className="h-[8px] w-px bg-black" />
        {i > 0 && (
          <span className="font-ui absolute top-[9px] text-[8px] leading-none text-[#222]">
            {i}
          </span>
        )}
      </div>
    );

    // Half-inch mark
    if (i < totalInches) {
      ticks.push(
        <div
          key={`half-${i}`}
          className="absolute"
          style={{ left: `${left + pixelsPerInch / 2}px`, top: 0 }}
        >
          <div className="h-[5px] w-px bg-[#555]" />
        </div>
      );
    }
  }

  return (
    <div
      className="relative h-[24px]"
      style={{
        backgroundImage:
          'repeating-linear-gradient(90deg, #f2f2f2 0px, #f2f2f2 1px, #e5e5e5 1px, #e5e5e5 2px)',
        borderTop: '1px solid #777',
        borderBottom: '1px solid #ccc',
      }}
    >
      {/* Left margin indicator - downward pointing triangle */}
      <div
        className="absolute z-10 flex items-start"
        style={{ left: '2px', top: '2px', filter: 'drop-shadow(1px 1px 0 #999)' }}
      >
        <svg width="8" height="7" viewBox="0 0 8 7" className="cursor-ew-resize">
          <path d="M 4 7 L 0 0 L 8 0 Z" fill="#000" />
        </svg>
      </div>

      {/* Ruler ticks - start from offset */}
      <div className="absolute top-0 left-0 h-full">{ticks}</div>

      {/* Right margin indicator - downward pointing triangle */}
      <div
        className="absolute z-10 flex items-start"
        style={{ right: '2px', top: '2px', filter: 'drop-shadow(1px 1px 0 #999)' }}
      >
        <svg width="8" height="7" viewBox="0 0 8 7" className="cursor-ew-resize">
          <path d="M 4 7 L 0 0 L 8 0 Z" fill="#000" />
        </svg>
      </div>
    </div>
  );
};

export default TextEditRuler;
