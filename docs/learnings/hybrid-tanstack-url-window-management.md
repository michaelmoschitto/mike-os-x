# Hybrid TanStack Router & URL-Based Window Management

**Date:** December 11, 2025  
**Context:** Building a Mac OS X desktop experience in the browser with multi-window support  
**Outcome:** URL-addressable windows with full browser history integration and SPA performance

## The Problem

Traditional web application architectures struggle with multi-window experiences:

1. **Single-view limitation** - Most SPAs use route-based navigation that forces users to choose one active view at a time. You can't have a terminal, code editor, and browser open simultaneously.

2. **Modal constraints** - Modal-based UI patterns are limited to one modal at a time. This creates artificial "one thing at a time" constraints that don't match how people actually work.

3. **No shareability** - There's no way to share specific multi-window configurations. If you want to show someone your setup with three windows open, you can't.

4. **Broken browser history** - Browser back/forward buttons don't work intuitively with multi-window state. Each window change should be in history, but traditional routing can't handle this.

5. **Performance trade-offs** - URL serialization with full page reloads works, but causes 100-200ms delays, flickering, and lost React state.

We needed an architecture that supports unlimited simultaneous windows, makes them shareable via URL, integrates with browser history, and maintains SPA performance.

## Architecture Overview

Our solution is a two-part hybrid system:

### Part A: URL Serialization Strategy

Windows are encoded in URL query parameters using a simple format:

```
/?w=terminal&w=browser:https://github.com&w=photos:album:photo
```

For 5+ windows, we switch to a base64-encoded JSON format to avoid URL length limits:

```
/?state=eyJ3aW5kb3dzIjpb...base64EncodedJSON
```

Each window type uses a **Strategy pattern** to define its own serialization logic. This keeps the URL layer decoupled from window-specific details.

### Part B: Window Lifecycle & Reconciliation

The system maintains two sources of truth that must stay synchronized:

1. **Window Store (Zustand)** - Runtime state of all open windows
2. **URL (TanStack Router)** - Serialized representation of visible windows

**Reconciliation** flows URL → Windows (when URL changes, update windows).  
**Synchronization** flows Windows → URL (when windows change, update URL).

We prevent infinite loops using `skipNextRouteSync` flags that break the circular dependency.

## Deep Dive: Window Serialization Technology

Window serialization converts window state into URL-safe identifier strings. Each window type implements its own strategy.

### Strategy Pattern Implementation

```typescript
// apps/web/src/lib/routing/windowTypeStrategies.ts
export interface WindowTypeStrategy {
  serialize: (window: Window) => string | null;
  deserialize: (identifier: string) => WindowOpenConfig | null;
  needsUpdate: (currentWindow: Window, newConfig: Partial<Window>) => boolean;
  getFallbackIdentifier?: (window: Window) => string | null;
}
```

### Window Type Examples

**Terminal** (simplest):

```typescript
// Serializes to: "terminal"
terminalStrategy: {
  serialize: (window) => window.isMinimized ? null : 'terminal',
  deserialize: () => ({ type: 'terminal', ...defaultConfig }),
}
```

**Browser** (URL encoding):

```typescript
// Serializes to: "browser:https%3A%2F%2Fgithub.com"
browserStrategy: {
  serialize: (window) => {
    if (!window.url || window.url === 'about:blank') return null;
    return `browser:${encodeURIComponent(window.url)}`;
  },
  deserialize: (identifier) => {
    const url = decodeURIComponent(identifier.substring(8));
    return { type: 'browser', url, ...defaultConfig };
  },
}
```

**Photos** (hierarchical):

```typescript
// Serializes to: "photos:album:photo" or "photos:album" or "photos"
photosStrategy: {
  serialize: (window) => {
    if (window.selectedPhotoIndex !== undefined) {
      return `photos:${albumName}:${photoName}`;
    }
    if (window.albumPath) {
      return `photos:${albumName}`;
    }
    return 'photos';
  },
}
```

**Extended State** (for 5+ windows):

```typescript
// apps/web/src/lib/routing/windowSerialization.ts
export function serializeExtendedState(windows: Window[]): string {
  const state: ExtendedWindowState = {
    windows: visibleWindows.map((w) => ({
      type: w.type,
      args: [...], // Type-specific args
      position: w.position,
      size: w.size,
      zIndex: w.zIndex,
    })),
    activeIndex: visibleWindows.length - 1,
  };
  return btoa(JSON.stringify(state)); // Base64 encode
}
```

### Serialization Flow

```typescript
// apps/web/src/lib/routing/windowSerialization.ts
export function serializeWindowsToUrl(windows: Window[]): string {
  const visibleWindows = windows.filter((w) => !w.isMinimized);

  if (visibleWindows.length === 0) return '/';

  // Use extended state for 5+ windows
  if (visibleWindows.length >= 5) {
    const state = serializeExtendedState(windows);
    return `/?state=${state}`;
  }

  // Simple format for < 5 windows
  const identifiers = visibleWindows.map(serializeWindow).filter(Boolean);

  const queryParts = identifiers.map((id) => `w=${encodeWindowIdentifier(id)}`);
  return `/?${queryParts.join('&')}`;
}
```

**Key insight:** The Strategy pattern allows each window type to define its own serialization logic without coupling to the URL layer. Adding a new window type requires ~50 lines in one file, with no changes to routing or reconciliation.

## Deep Dive: Window Lifecycle Management

Window lifecycle management ensures URL state and runtime state stay synchronized. This happens through reconciliation (URL → Windows) and synchronization (Windows → URL).

### Reconciliation Algorithm

Reconciliation runs when the URL changes (browser navigation, back/forward, direct URL entry). It compares the URL's window configs against current windows and makes the necessary changes.

```typescript
// apps/web/src/lib/routing/windowReconciliation.ts
export function reconcileWindowsWithUrl(
  urlWindowConfigs: WindowConfig[],
  windowStore: WindowStoreActions
): void {
  // 1. Build maps for efficient lookup
  const urlMap = new Map(urlWindowConfigs.map((c) => [c.identifier, c]));
  const currentMap = new Map(
    visibleWindows.map((w) => [serializeWindow(w), w]).filter(([id]) => id !== null)
  );

  // 2. Handle special windows (e.g., photos - only one instance)
  // ... special reconciliation logic ...

  // 3. Find windows to close (in current, not in URL)
  const toClose = visibleWindows.filter((w) => {
    const id = serializeWindow(w);
    return id && !urlMap.has(id);
  });

  // 4. Find windows to open (in URL, not in current)
  const toOpen = urlWindowConfigs.filter((c) => !currentMap.has(c.identifier));

  // 5. Find windows to update (in both, but state changed)
  const toUpdate = urlWindowConfigs
    .map((c) => {
      const current = currentMap.get(c.identifier);
      return current && needsUpdate(current, c.config)
        ? { window: current, config: c.config }
        : null;
    })
    .filter(Boolean);

  // 6. Apply changes
  toClose.forEach((w) => windowStore.closeWindow(w.id));
  toUpdate.forEach(({ window, config }) =>
    windowStore.updateWindow(window.id, config, { skipRouteSync: true })
  );
  toOpen.forEach((c) => windowStore.openWindow(c.config));

  // 7. Focus last window in URL
  if (urlWindowConfigs.length > 0) {
    const lastId = urlWindowConfigs[urlWindowConfigs.length - 1].identifier;
    // ... focus logic ...
  }
}
```

### URL Synchronization

Synchronization runs when windows change (open, close, update). It watches the window store and updates the URL.

```typescript
// apps/web/src/lib/hooks/useUrlSync.ts
export const useUrlSync = () => {
  const windows = useWindowStore((state) => state.windows);
  const skipNextRouteSync = useWindowStore((state) => state.skipNextRouteSync);
  const { syncWindowsToUrl } = useWindowUrlSync();

  useEffect(() => {
    // Skip on initial mount - URL already set from route loader
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Skip if any windows have skipNextRouteSync flag
    if (Object.keys(skipNextRouteSync).length > 0) {
      Object.keys(skipNextRouteSync).forEach(clearRouteSyncFlag);
      return;
    }

    // Only sync if URL actually changed
    const currentUrl = serializeWindowsToUrl(windows);
    if (currentUrl !== prevUrl) {
      syncWindowsToUrl(windows);
    }
  }, [windows, skipNextRouteSync]);
};
```

### Route Integration

The route component triggers reconciliation when URL search params change:

```typescript
// apps/web/src/routes/index.tsx
export const Route = createFileRoute('/')({
  validateSearch: (search) => ({
    w: search.w as string | string[] | undefined,
    state: typeof search.state === 'string' ? search.state : undefined,
  }),
  loader: async () => {
    // Initialize content index if windows need it
    const windowIdentifiers = parseWindowParams(/* ... */);
    if (windowIdentifiers.some(id => id.startsWith('photos') || /* ... */)) {
      await initializeContentIndex();
    }
    return { initialized: true };
  },
  component: IndexComponent,
});

function IndexComponent() {
  const { w, state } = Route.useSearch();
  const windowConfigs = useMemo(() =>
    deserializeUrlToWindows(new URLSearchParams(/* ... */)),
    [w, state]
  );

  // Trigger reconciliation when URL changes
  useEffect(() => {
    if (!isIndexed) return;
    reconcileWindowsWithUrl(windowConfigs, {
      openWindow,
      closeWindow,
      updateWindow,
      focusWindow,
      windows,
    });
  }, [windowConfigs, isIndexed, /* ... */]);

  return <Desktop />;
}
```

**Key insight:** Reconciliation is unidirectional (URL → Windows) while synchronization is reactive (Windows → URL). This prevents conflicts and ensures a single source of truth (the URL).

## TanStack Router Integration: From Page Reloads to SPA Navigation

### The Migration Story

Before TanStack Router, we had URL serialization working with `window.location.href = newUrl`. This worked but caused full page reloads (~100-200ms), flickering, and lost React state. Every window open/close felt sluggish.

TanStack Router transforms URL changes from expensive full-page operations into cheap state updates. We get the shareability of URLs without sacrificing SPA performance.

### Feature 1: SPA Navigation with `navigate()`

**What:** Client-side navigation that updates the URL without page reload.

**Why:** Eliminates 100-200ms page reload, prevents flickering, preserves React state.

**Implementation:**

```typescript
// apps/web/src/lib/hooks/useWindowUrlSync.ts
export const useWindowUrlSync = () => {
  const navigate = useNavigate();

  const syncWindowsToUrl = (windows: Window[]) => {
    const url = serializeWindowsToUrl(windows);
    const urlObj = new URL(url, window.location.origin);

    navigate({
      to: '/',
      search: {
        w: windowIdentifiers.length > 0 ? windowIdentifiers : undefined,
        state: stateParam || undefined,
      },
      replace: false, // or true for state updates
    });
  };

  return { syncWindowsToUrl };
};
```

**Outcome:** 10ms navigation, smooth transitions, desktop-class feel.

### Feature 2: Search Param Validation

**What:** `validateSearch()` function that type-checks URL params at route level.

**Why:** Ensures invalid URLs don't crash the app, provides early validation.

**Implementation:**

```typescript
// apps/web/src/routes/index.tsx
export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => {
    const w = search.w;
    const state = search.state;

    return {
      w: w as string | string[] | undefined,
      state: typeof state === 'string' ? state : undefined,
    };
  },
});
```

**Outcome:** Defensive routing, graceful degradation for malformed URLs.

### Feature 3: Type-Safe Search Params

**What:** TypeScript types for search params via `Route.useSearch()`.

**Why:** Compile-time safety, autocomplete, prevents typos.

**Implementation:**

```typescript
// apps/web/src/routes/index.tsx
function IndexComponent() {
  const { w: windowParams, state: stateParam } = Route.useSearch();
  // TypeScript knows: windowParams is string | string[] | undefined
  // TypeScript knows: stateParam is string | undefined
}
```

**Outcome:** Fewer bugs, better DX, self-documenting API.

### Feature 4: Custom Search Serialization

**What:** Override `parseSearch`/`stringifySearch` in router config.

**Why:** TanStack's default array serialization didn't match our multi-window needs. We needed to handle edge cases like `w=0=...` (array-like objects).

**Implementation:**

```typescript
// apps/web/src/main.tsx
const router = createRouter({
  routeTree,
  parseSearch: (searchStr) => {
    const params = new URLSearchParams(searchStr);
    const result: { w?: string[]; state?: string } = {};

    // Handle 'w' array - TanStack may serialize as JSON string
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
    // Custom serialization that handles arrays, objects, and edge cases
    const parts: string[] = [];
    let windows: string[] = [];

    // Handle various input formats
    if (Array.isArray(search)) {
      windows = search;
    } else if (search && typeof search === 'object') {
      if (Array.isArray(search.w)) {
        windows = search.w;
      } else if (typeof search.w === 'string') {
        windows = [search.w];
      }
    }

    windows.forEach((w: string) => {
      if (typeof w === 'string' && w.length > 0) {
        const encoded = w.replace(/&/g, '%26').replace(/=/g, '%3D').replace(/ /g, '%20');
        parts.push(`w=${encoded}`);
      }
    });

    return parts.length > 0 ? `?${parts.join('&')}` : '';
  },
});
```

**Outcome:** Full control over URL format, handles TanStack's JSON array serialization quirks.

### Feature 5: Route Loaders

**What:** Async `loader()` function that runs before route renders.

**Why:** Initialize content index before deserializing windows that need it. Prevents race conditions.

**Implementation:**

```typescript
// apps/web/src/routes/index.tsx
export const Route = createFileRoute('/')({
  loader: async () => {
    const windowIdentifiers = parseWindowParams(/* ... */);

    // Check if any windows need content index
    const mightNeedContentIndex = windowIdentifiers.some(
      (id) =>
        id.startsWith('photos') ||
        id.startsWith('finder') ||
        id.startsWith('textedit') ||
        id.startsWith('pdfviewer')
    );

    if (mightNeedContentIndex) {
      const indexState = useContentIndex.getState();
      if (!indexState.isIndexed) {
        await initializeContentIndex();
      }
    }

    return { initialized: true };
  },
});
```

**Outcome:** No race conditions, windows always have data they need.

### Feature 6: Replace vs Push History

**What:** `navigate({ replace: true })` vs default push.

**Why:** Window updates (position, size) shouldn't create new history entries. Only meaningful state changes (open/close) should be in history.

**Implementation:**

```typescript
// apps/web/src/lib/hooks/useWindowUrlSync.ts
const syncWindowsToUrl = (windows: Window[], options?: SyncOptions) => {
  navigate({
    to: '/',
    search: {
      /* ... */
    },
    replace: options?.replace ?? false, // Use replace for state updates
  });
};
```

**Outcome:** Browser back/forward feels natural, not cluttered with every window drag.

### Before vs After Performance

| Action             | Before (window.location.href) | After (TanStack Router) |
| ------------------ | ----------------------------- | ----------------------- |
| Open window        | 150-200ms (full reload)       | ~10ms (SPA nav)         |
| Close window       | 150-200ms (full reload)       | ~10ms (SPA nav)         |
| Browser back       | 150-200ms (full reload)       | ~10ms (SPA nav)         |
| State preservation | ❌ Lost on reload             | ✅ Preserved            |
| Flicker            | ❌ White flash                | ✅ None                 |

**Key Insight:** TanStack Router turns URL changes from expensive full-page operations into cheap state updates. We get the shareability of URLs without sacrificing SPA performance.

## Preventing Sync Loops

### The Challenge

Without careful design, we'd have an infinite loop:

1. URL changes → triggers reconciliation → windows update
2. Windows update → triggers sync → URL changes
3. URL changes → triggers reconciliation → windows update
4. ... infinite loop!

### The Solution: Skip Flags

We use `skipNextRouteSync` flags to break the circular dependency:

```typescript
// apps/web/src/stores/useWindowStore.ts
interface WindowStore {
  skipNextRouteSync: Record<string, boolean>;
  updateWindow: (
    id: string,
    updates: Partial<Window>,
    options?: { skipRouteSync?: boolean }
  ) => void;
  clearRouteSyncFlag: (id: string) => void;
}

updateWindow: (id, updates, options) => {
  const skipRouteSync = options?.skipRouteSync === true;
  const newSkipNextRouteSync = skipRouteSync
    ? { ...state.skipNextRouteSync, [id]: true }
    : state.skipNextRouteSync;

  return {
    windows: state.windows.map((w) => (w.id === id ? { ...w, ...updates } : w)),
    skipNextRouteSync: newSkipNextRouteSync,
  };
};
```

```typescript
// apps/web/src/lib/hooks/useUrlSync.ts
useEffect(() => {
  // Check if any windows have skipNextRouteSync flag set
  const hasSkipFlags = Object.keys(skipNextRouteSync).length > 0;

  if (hasSkipFlags) {
    // Clear all skip flags - they've served their purpose
    Object.keys(skipNextRouteSync).forEach(clearRouteSyncFlag);
    return; // Don't sync this time
  }

  // Normal sync logic
  const currentUrl = serializeWindowsToUrl(windows);
  if (currentUrl !== prevUrl) {
    syncWindowsToUrl(windows);
  }
}, [windows, skipNextRouteSync]);
```

**Flow:**

1. Reconciliation updates windows from URL → sets `skipNextRouteSync` flags
2. `useUrlSync` sees flags → clears them, skips sync
3. Next window change (user action) → no flags → syncs normally

This breaks the loop while keeping URL and windows in sync.

## Product Features: Why This Matters for Users

This architecture enables product features that make the portfolio site more powerful and delightful to use.

### A. Shareable URLs

Users can share exact window configurations with colleagues, bookmark complex multi-window setups, and return to exact state after closing the browser.

**Example:** "Check out my projects with terminal and browser side-by-side: `/?w=terminal&w=browser:https://github.com/mikemoschitto`"

This transforms the portfolio from a static site into a shareable workspace. Users can send someone a URL that opens exactly the setup they want to show.

### B. Multi-Window Workflows

Users can view terminal, code editor, and browser simultaneously. Compare photos side-by-side in separate windows. There's no artificial "one thing at a time" constraint.

This creates a real desktop OS feel in the browser. Users work the way they're used to—with multiple windows open, each showing different content.

### C. Browser History Integration

Back/forward buttons work intuitively. Each meaningful window state change is in history. Users can navigate back to previous window configurations.

This closes the gap between web apps and native desktop apps. Browser history becomes a natural undo/redo system for window state.

### D. Desktop-Class Experience

Windows behave like real OS windows. The URL bar becomes invisible infrastructure that enables shareability without getting in the way.

This gives users the best of both worlds: web shareability (desktop apps can't do this!) plus desktop UX (multiple windows, proper history).

## Design Patterns Used

### Pattern 1: Strategy Pattern

**Problem:** Each window type serializes differently. Terminal is simple (`terminal`), browser needs URL encoding (`browser:https://...`), photos are hierarchical (`photos:album:photo`).

**Solution:** `WindowTypeStrategy` interface with per-type implementations.

```typescript
// apps/web/src/lib/routing/windowTypeStrategies.ts
export interface WindowTypeStrategy {
  serialize: (window: Window) => string | null;
  deserialize: (identifier: string) => WindowOpenConfig | null;
  needsUpdate: (currentWindow: Window, newConfig: Partial<Window>) => boolean;
}

export const windowTypeStrategies: Record<WindowType, WindowTypeStrategy> = {
  terminal: terminalStrategy,
  browser: browserStrategy,
  photos: photosStrategy,
  // ...
};
```

**Benefits:**

- **Open/Closed Principle** - Add new window types without modifying existing code
- **Single Responsibility** - Each strategy handles one window type's logic
- **Testability** - Strategies can be unit tested independently

**Key Insight:** We used the Strategy pattern to encapsulate window-type-specific serialization behavior. This allows us to add new window types (like Finder, Photos viewer) by simply implementing a new strategy, without touching existing code.

### Pattern 2: Reconciliation Pattern

**Problem:** Sync URL state with runtime state. URL says "open these windows" but runtime has different windows open.

**Solution:** React-like diffing algorithm that compares URL configs to current windows.

```typescript
// apps/web/src/lib/routing/windowReconciliation.ts
export function reconcileWindowsWithUrl(
  urlWindowConfigs: WindowConfig[],
  windowStore: WindowStoreActions
): void {
  // Build maps for O(1) lookup
  const urlMap = new Map(urlWindowConfigs.map((c) => [c.identifier, c]));
  const currentMap = new Map(/* current windows */);

  // Diff: find toClose, toOpen, toUpdate
  // Apply changes
}
```

**Benefits:**

- **Declarative** - Describe desired state (URL), system makes it happen
- **Predictable** - Same algorithm every time
- **Testable** - Pure function, easy to test

**Key Insight:** Reconciliation is unidirectional (URL → Windows). This makes the system predictable—the URL is always the source of truth.

### Pattern 3: Hook Composition

**Problem:** Shared lifecycle logic (close, focus, minimize) duplicated across window components.

**Solution:** `useWindowLifecycle` hook that encapsulates shared behaviors.

```typescript
// apps/web/src/lib/hooks/useWindowLifecycle.ts
export const useWindowLifecycle = ({ window, isActive }: Options) => {
  const { closeWindow, focusWindow, minimizeWindow } = useWindowStore();

  const handleClose = () => {
    // Remove from URL, then close
    removeWindow(existingWindows, windowIdentifier);
    closeWindow(window.id);
  };

  return { handleClose, handleFocus, handleMinimize /* ... */ };
};
```

**Benefits:**

- **DRY** - Single source of truth for lifecycle
- **Composition** - Window components compose behavior, don't inherit
- **Consistency** - All windows behave identically

**Key Insight:** We extracted shared window lifecycle logic into a custom hook. Window components become thin wrappers that compose this hook with their app-specific logic.

## Architecture Decisions & Trade-offs

### Decision 1: Query Params vs Path Segments

**Why:** Multiple windows of the same type, order matters. Path segments like `/terminal/browser/photos` don't scale—what if you want two browsers?

**Trade-off:** Longer URLs (`/?w=terminal&w=browser:...&w=browser:...`), but more flexible.

### Decision 2: Base64 for 5+ Windows

**Why:** URL length limits (~2000 chars), readability threshold. `?w=...&w=...&w=...` (5 times) is already long.

**Trade-off:** Not human-readable (`?state=eyJ3aW5kb3dzIjpb...`), but necessary for scale.

### Decision 3: Unidirectional Reconciliation

**Why:** Single source of truth (URL). Reconciliation flows URL → Windows, sync flows Windows → URL. Clear direction prevents conflicts.

**Trade-off:** More complex sync logic (skip flags), but predictable.

### Decision 4: TanStack Router over React Router

**Why:** Type-safe search params, better DX, custom serialization hooks, loader pattern.

**Trade-off:** Less ecosystem support, but better for this use case.

## Building Leverage

### Before: Route-Based Navigation

```typescript
// One route per window type, can't have multiple
<Route path="/browser" element={<BrowserWindow />} />
<Route path="/terminal" element={<TerminalWindow />} />
// ❌ Can't view both simultaneously
// ❌ URLs not shareable (just /browser or /terminal)
// ❌ Browser history broken (back goes to previous route, not window state)
```

### After: URL-Based Windows

```typescript
// Any combination, any order
/?w=terminal&w=browser:url1&w=browser:url2
// ✅ Multiple windows, shareable, back/forward works
// ✅ 10ms navigation (was: 100-200ms page reloads)
```

### Metrics

- **Support for infinite windows** (was: 1 at a time)
- **URLs are shareable** (was: not shareable)
- **Browser history works** (was: broken)
- **10ms navigation** (was: 100-200ms page reloads)
- **No flicker** (was: white flash on every change)
- **State preserved** (was: lost on reload)

## Key Technical Insights

### Insight 1: URL as State Container

The URL becomes a serialized representation of the entire window tree. This enables shareability while maintaining SPA performance. We're not just routing—we're using the URL as a database.

### Insight 2: Reconciliation Prevents Chaos

Without reconciliation, every user action creates conflicts. With it, URL and runtime state stay perfectly in sync. The reconciliation algorithm is the "React diff" for windows.

### Insight 3: Strategy Pattern Scales

Adding a new window type requires ~50 lines of code in one file (`windowTypeStrategies.ts`). No changes to routing, reconciliation, or sync logic. The pattern creates leverage.

### Insight 4: Skip Flags Prevent Loops

Simple boolean flags break the circular dependency between URL changes and window updates. Sometimes the simplest solution is the best.

### Insight 5: TanStack Router Enables SPA Performance

Without TanStack Router, we'd have working URLs but slow page reloads. With it, we get both: shareable URLs and 10ms navigation. The router transforms URL changes from expensive operations into cheap state updates.

## Future Extensibility

This architecture enables:

1. **Window grouping/workspaces** - Serialize groups as URL fragments (`?workspace=dev&w=...`)
2. **Undo/redo** - Browser history is already there, just need UI
3. **Session restore** - URLs are the session format, save/restore is trivial
4. **Deep linking** - Any app state is URL-addressable
5. **A/B testing** - Different URL configs for different users
6. **Window templates** - Pre-configured URL patterns for common setups

## Lessons Learned

1. **URL serialization is powerful** - Treat URL as database, not just routing. It enables shareability, history, bookmarks.

2. **Reconciliation scales** - React's diffing pattern works for windows too. Declarative state updates are predictable.

3. **SPA + History = Magic** - TanStack Router makes this seamless. We get web shareability without sacrificing performance.

4. **Product features emerge** - Shareable URLs weren't the original goal, but became a killer feature. Architecture enables unexpected benefits.

5. **Desktop UX in browser** - Multi-window feels native because it uses browser primitives correctly. URL + history + SPA = desktop-class experience.

6. **Strategy pattern creates leverage** - Each new window type is ~50 lines. The pattern pays dividends as we add more window types.

## Conclusion

The hybrid approach combines:

- **TanStack Router** for SPA navigation and type safety
- **URL serialization** for shareability and persistence
- **Reconciliation algorithm** for state synchronization
- **Strategy pattern** for extensibility

Result: A desktop-class multi-window experience that feels native while leveraging web's superpowers (shareable URLs, history, bookmarks).

This architecture proves you can have both: the UX of a native desktop OS and the distribution advantages of the web. Users get multiple windows, proper browser history, and shareable URLs—all with SPA performance.

The system creates significant leverage: new window types require minimal code, future features can be added once to benefit all windows, and the URL becomes a powerful state container that enables features we didn't originally plan for.

