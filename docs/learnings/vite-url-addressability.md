# URL Addressability in Vite: Dynamic Content Routing

**Date:** 2024-12-19  
**Context:** Implementing URL-addressable content files (MDX/MD) in a Vite + React app  
**Key Tech:** TanStack Router + Vite's `import.meta.glob` + Route Loaders

## The Challenge

Vite doesn't have built-in routing like Next.js. To make content files accessible via clean URLs (e.g., `/ProjectWriteups/mezo`), you need:

1. **A router library** (we used TanStack Router)
2. **Dynamic file discovery** (Vite's `import.meta.glob`)
3. **Route loaders** (data fetching before render)
4. **Content indexing** (map URLs to file paths)

## How It Works

### 1. File Discovery with `import.meta.glob`

Vite's `import.meta.glob` discovers files at build time and returns a map of import functions:

```typescript
const contentModules = import.meta.glob(
  '../../content/**/*.{md,txt,pdf}',
  {
    eager: false,  // Lazy load files
    query: '?raw', // Import as raw string
    import: 'default',
  }
);

// Returns: { 
//   "../../content/README.md": () => Promise<string>,
//   "../../content/ProjectWriteups/mezo.md": () => Promise<string>,
//   ...
// }
```

**Key insight:** The glob pattern runs at build time, not runtime. Vite statically analyzes your file structure and creates import functions for each match.

### 2. Content Indexing

Build a runtime index that maps clean URLs to file paths:

```typescript
// Scan all files, extract metadata, generate URL paths
const index = new Map<string, ContentIndexEntry>();

for (const [filePath, importFn] of Object.entries(contentModules)) {
  const urlPath = generateUrlPath(filePath); // "/ProjectWriteups/mezo"
  const rawContent = await importFn();
  const parsed = parseContent(rawContent); // Extract frontmatter
  
  index.set(urlPath, {
    urlPath,
    filePath, // Store glob key for later loading
    metadata: parsed.metadata,
  });
}
```

**Why this matters:** You can't query the filesystem in the browser. The index is your lookup table.

### 3. Dynamic Route with Loader

TanStack Router's `$path` route catches all paths. The loader resolves URLs to content:

```typescript
export const Route = createFileRoute('/$path')({
  loader: async ({ params }) => {
    // Ensure index is built
    if (!isIndexed) await initializeContentIndex();
    
    // Resolve URL to content
    const entry = contentIndex.getEntry(params.path);
    const content = await loadContentFile(entry.filePath);
    
    return { entry, content };
  },
  component: PathComponent,
});
```

**Critical detail:** Loaders run before the component renders. This is where async data fetching happens.

### 4. Content Loading

When a URL is requested, use the stored glob key to load the file:

```typescript
const loadContentFile = async (globKey: string) => {
  const contentModules = getGlobModules(); // Cached glob map
  const importFn = contentModules[globKey];
  const rawContent = await importFn(); // Actually loads the file
  return parseContent(rawContent); // Extract frontmatter
};
```

## Key Learnings

### `import.meta.glob` Behavior

- **Build-time analysis:** Glob patterns are analyzed during Vite's build, not at runtime
- **Lazy by default:** With `eager: false`, files aren't loaded until you call the import function
- **Path format:** Glob keys are relative to the file where `import.meta.glob` is called
- **Type safety:** TypeScript doesn't know about dynamic glob keys—you handle runtime lookups

### Route Loaders vs Component Effects

**Loaders (TanStack Router):**
- Run before component render
- Can block navigation until data loads
- Perfect for "this route needs data to render"
- Errors can be caught and returned to component

**useEffect:**
- Runs after render
- Can't block navigation
- Good for side effects, not data dependencies

**Use loaders for:** Content that must exist before showing the page  
**Use effects for:** Opening windows, analytics, non-critical data

### Buffer Polyfill for Browser

`gray-matter` (frontmatter parser) uses Node's `Buffer` API. In the browser, you need:

```typescript
// vite.config.ts
resolve: {
  alias: { buffer: 'buffer' }
},
define: { global: 'globalThis' },
```

**Why:** Browser doesn't have `Buffer`. The polyfill provides it globally.

### URL Path Normalization

Always normalize paths consistently:

```typescript
const normalized = path.startsWith('/') ? path : `/${path}`;
```

**Problem:** Users might navigate to `/ProjectWriteups/mezo` or `ProjectWriteups/mezo`. Your index needs consistent keys.

## Comparison: Vite vs Next.js

### Next.js Approach

```typescript
// pages/[...path].tsx
export async function getStaticPaths() {
  const files = fs.readdirSync('./content');
  return { paths: files.map(f => ({ params: { path: f } })) };
}

export async function getStaticProps({ params }) {
  const content = fs.readFileSync(`./content/${params.path}.md`);
  return { props: { content } };
}
```

**Differences:**

| Feature | Vite | Next.js |
|---------|------|---------|
| **Routing** | External library (TanStack Router) | Built-in file-based routing |
| **File Discovery** | `import.meta.glob` (build-time) | `fs.readdirSync` (build-time) |
| **Data Loading** | Route loaders (client-side) | `getStaticProps` (server-side) |
| **Dynamic Routes** | `$path` catch-all | `[...path].tsx` catch-all |
| **Runtime** | Client-side only | Server + Client (SSR/SSG) |
| **Type Safety** | Manual (runtime lookups) | Better (static analysis) |

### When to Use Each

**Vite + TanStack Router:**
- Client-side only apps (SPAs)
- Content that doesn't need SSR
- When you want full control over routing
- Smaller bundle (no Next.js runtime)

**Next.js:**
- Need SSR/SSG for SEO
- Want built-in routing (less setup)
- Server-side data fetching
- Static site generation at build time

## Interview Answer: "How did you implement URL addressability in Vite?"

**Short version:**
"We used TanStack Router for routing and Vite's `import.meta.glob` to discover content files at build time. We built a runtime index mapping clean URLs to file paths, then used route loaders to fetch content before rendering. The glob pattern returns import functions that we call on-demand when a URL is requested."

**Key points to mention:**
1. `import.meta.glob` discovers files at build time
2. Content index maps URLs to file paths (can't query filesystem in browser)
3. Route loaders fetch data before component render
4. Dynamic `$path` route catches all paths
5. Buffer polyfill needed for frontmatter parsing in browser

## Gotchas

1. **Glob keys are relative:** `../../content/file.md` relative to where `import.meta.glob` is called
2. **Cache glob modules:** Don't call `import.meta.glob` multiple times—cache the result
3. **Path normalization:** Always normalize URLs consistently (leading slash)
4. **Error handling:** Loaders can return errors—handle them in the component
5. **Type safety:** TypeScript won't help with dynamic glob keys—runtime validation needed

## Performance Considerations

- **Index building:** Happens once on app start (or can be pre-built)
- **File loading:** Lazy—files only load when URL is accessed
- **Caching:** Glob modules are cached, but file content isn't—consider memoization
- **Bundle size:** Only files that are actually accessed get bundled (code splitting)

