/// <reference types="vite/client" />

// Allow importing markdown files as raw text
declare module '*.md?raw' {
  const content: string;
  export default content;
}

// Allow importing JSON files
declare module '*.json' {
  const content: unknown;
  export default content;
}

// Extend Window interface for Buffer polyfill
declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}
