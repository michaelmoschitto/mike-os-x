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

const router = createRouter({ routeTree });

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
