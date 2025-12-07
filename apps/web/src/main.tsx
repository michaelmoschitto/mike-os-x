import { Buffer } from 'buffer';

import {
  RouterProvider,
  createRouter,
  parseSearchWith,
  stringifySearchWith,
} from '@tanstack/react-router';
import qs from 'query-string';
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
  parseSearch: parseSearchWith((value) =>
    qs.parse(value, {
      arrayFormat: 'none',
      parseBooleans: false,
      parseNumbers: false,
    })
  ),
  stringifySearch: stringifySearchWith((value) =>
    qs.stringify(value, {
      arrayFormat: 'none',
      skipNull: true,
      skipEmptyString: true,
    })
  ),
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
