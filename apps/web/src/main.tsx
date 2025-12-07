import { Buffer } from 'buffer';

import { RouterProvider, createRouter } from '@tanstack/react-router';
import React from 'react';
import ReactDOM from 'react-dom/client';

// Polyfill Buffer for gray-matter in browser
if (typeof window !== 'undefined') {
  (window as unknown as Window & { Buffer: typeof Buffer }).Buffer = Buffer;
}

import '@/styles/index.css';
import { routeTree } from '@/routeTree.gen';

const router = createRouter({
  routeTree,
  parseSearch: (searchStr) => {
    // Defensive: strip '?' if present (router might pass it)
    const cleanStr = searchStr.startsWith('?') ? searchStr.slice(1) : searchStr;
    const params = new URLSearchParams(cleanStr);
    const result: {
      w?: string[];
      state?: string;
    } = {};

    // Handle 'w' array
    const w = params.getAll('w');
    if (w.length > 0) {
      result.w = w;
    }

    const state = params.get('state');
    if (state) {
      result.state = state;
    }

    return result;
  },
  stringifySearch: (search) => {
    const parts: string[] = [];

    let windows: string[] = [];
    let stateValue: string | undefined;

    if (Array.isArray(search)) {
      windows = search;
    } else if (search && typeof search === 'object') {
      if (Array.isArray(search.w)) {
        windows = search.w;
      } else if (typeof search.w === 'string') {
        windows = [search.w];
      } else if (search.w && typeof search.w === 'object') {
        windows = Object.values(search.w);
      }

      if (search.state) {
        stateValue = String(search.state);
      }
    }

    windows.forEach((w: string) => {
      if (typeof w === 'string' && w.length > 0) {
        const encoded = w.replace(/&/g, '%26').replace(/=/g, '%3D').replace(/ /g, '%20');
        parts.push(`w=${encoded}`);
      }
    });

    if (stateValue) {
      parts.push(`state=${encodeURIComponent(stateValue)}`);
    }

    const result = parts.join('&');
    return result ? `?${result}` : '';
  },
});

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
