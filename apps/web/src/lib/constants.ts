/**
 * Standard window dimensions for different window types
 */
export const WINDOW_DIMENSIONS = {
  finder: {
    width: 800,
    height: 600,
  },
  browser: {
    width: 1100,
    height: 640,
  },
  terminal: {
    width: 649,
    height: 436,
  },
  textedit: {
    width: 600,
    height: 500,
  },
  pdfviewer: {
    width: 800,
    height: 700,
  },
} as const;

/**
 * System UI dimensions
 */
export const UI_DIMENSIONS = {
  menuBarHeight: 22,
  dockHeight: 60,
} as const;

/**
 * Calculates centered window position accounting for menu bar and dock
 */
export const getCenteredWindowPosition = (
  width: number,
  height: number
): { x: number; y: number } => {
  const centerX = (window.innerWidth - width) / 2;
  const centerY =
    (window.innerHeight - height - UI_DIMENSIONS.menuBarHeight - UI_DIMENSIONS.dockHeight) / 2;
  return {
    x: centerX,
    y: centerY + UI_DIMENSIONS.menuBarHeight,
  };
};
