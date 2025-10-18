/// <reference types="vite/client" />

// Allow importing markdown files as raw text
declare module '*.md?raw' {
  const content: string;
  export default content;
}
