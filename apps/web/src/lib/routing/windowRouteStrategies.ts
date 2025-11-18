import type { Window } from '@/stores/useWindowStore';

export interface WindowRouteStrategy {
  getRouteForWindow: (window: Window) => string;
  shouldSyncRoute: (window: Window) => boolean;
}

const browserStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    const browserUrl = window.url && window.url !== 'about:blank' ? window.url : '';
    return browserUrl ? `/browser?url=${encodeURIComponent(browserUrl)}` : '/browser';
  },
  shouldSyncRoute: (window) => window.type === 'browser',
};

const textEditStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    return window.urlPath || '/';
  },
  shouldSyncRoute: (window) => window.type === 'textedit' && !!window.urlPath,
};

const terminalStrategy: WindowRouteStrategy = {
  getRouteForWindow: () => '/',
  shouldSyncRoute: () => false,
};

const pdfViewerStrategy: WindowRouteStrategy = {
  getRouteForWindow: (window) => {
    return window.urlPath || '/';
  },
  shouldSyncRoute: (window) => window.type === 'pdfviewer' && !!window.urlPath,
};

export const windowRouteStrategies: Record<
  'browser' | 'textedit' | 'terminal' | 'pdfviewer',
  WindowRouteStrategy
> = {
  browser: browserStrategy,
  textedit: textEditStrategy,
  terminal: terminalStrategy,
  pdfviewer: pdfViewerStrategy,
};

export const getRouteStrategy = (
  windowType: 'browser' | 'textedit' | 'terminal' | 'pdfviewer'
): WindowRouteStrategy => {
  return windowRouteStrategies[windowType];
};
