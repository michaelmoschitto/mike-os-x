# Components Organization

This folder contains all UI components organized by their role in the Mac OS X desktop paradigm.

## 📁 Folder Structure

### `/system` - Core OS Components
The foundational OS-level UI that's always present:
- **MenuBar** - Global menu bar (Apple, File, View, Go, Help)
- **Dock** - Bottom application launcher with icons
- **Desktop** - Desktop background and icon management
- **DesktopIcon/DesktopIcons** - Desktop file/folder icons

**When to add here:** Components that are part of the core OS chrome and always visible.

---

### `/window` - Window Management
Window chrome, controls, and utilities for window behavior:
- **Window** - Base Aqua window with titlebar and content area
- **TrafficLights** - Window control buttons (close, minimize, maximize)
- Future: WindowResizer, WindowManager, WindowTitle, etc.

**When to add here:** Components related to window decoration, controls, or behavior (resize, drag, snap).

---

### `/apps` - Application Components
App-specific components grouped by application:

#### `/apps/TextEdit`
- TextEditWindow - Main TextEdit window wrapper
- TextEditToolbar - Formatting toolbar
- TextEditRuler - Text ruler component

#### Future Apps
- `/apps/Projects` - Portfolio projects browser
- `/apps/Writing` - Blog/writing viewer
- `/apps/Photos` - Photo gallery
- `/apps/Reading` - Reading list/bookshelf
- `/apps/About` - About Me app
- `/apps/AIChat` - AI chat interface

**When to add here:** Components that belong to a specific application. Each app gets its own subfolder with an `index.ts` barrel export.

---

### `/ui` - Aqua UI Primitives
Reusable Aqua-styled building blocks for creating interfaces:
- Future: AquaButton, AquaInput, AquaSelect, AquaTab, AquaScrollbar, AquaCheckbox, etc.

**When to add here:** Generic, reusable UI components styled with the Aqua design system. These are the LEGO blocks for building new interfaces.

**Examples:**
- A gel-style button with proper gradients and hover states
- An Aqua-styled text input with inset borders
- A tabbed interface component
- Custom scrollbars with Aqua styling

---

### `/common` - Shared Cross-Cutting Components
Components used across multiple apps and contexts:
- Future: Palette (⌘K command palette), AboutDialog, ContextMenu, etc.

**When to add here:** Components that don't fit in a single app or the OS chrome, but are used in multiple places.

**Examples:**
- Command Palette (used globally)
- Context menus (used by multiple apps)
- Dialogs/modals (shared UI pattern)
- Loading states or error boundaries

---

## 🎯 Import Guidelines

### Absolute Imports (Preferred)
```typescript
// Import from barrel exports
import { Window, TrafficLights } from '@/components/window';
import { MenuBar, Dock, Desktop } from '@/components/system';
import { TextEditWindow, TextEditToolbar } from '@/components/apps/TextEdit';

// Or import everything
import { Window, MenuBar, TextEditWindow } from '@/components';
```

### Specific Imports (When Needed)
```typescript
// Direct file import for specific use cases
import Window from '@/components/window/Window';
```

---

## 📝 Decision Framework

**Where does my component go?**

1. **Is it part of the OS chrome?** → `/system`
   - Examples: MenuBar, Dock, Desktop, Finder sidebar

2. **Is it about window decoration/behavior?** → `/window`
   - Examples: TrafficLights, WindowResizer, WindowTitle

3. **Is it specific to one app?** → `/apps/[AppName]`
   - Examples: TextEditToolbar, ProjectCard, PhotoGrid

4. **Is it a reusable Aqua-styled UI primitive?** → `/ui`
   - Examples: AquaButton, AquaInput, AquaTab

5. **Is it shared across multiple apps?** → `/common`
   - Examples: Palette, ContextMenu, AboutDialog

---

## 🚀 Best Practices

1. **Each app folder should have:**
   - `index.ts` - Barrel export file
   - Components specific to that app only

2. **Keep it flat within folders:**
   - Avoid deep nesting (e.g., `/apps/TextEdit/components/toolbar/...`)
   - Prefer `/apps/TextEdit/TextEditToolbar.tsx`

3. **Use barrel exports:**
   - Every folder has an `index.ts` that exports its components
   - Makes imports cleaner: `from '@/components/system'` vs `from '@/components/system/MenuBar'`

4. **Name components descriptively:**
   - `TextEditToolbar` not just `Toolbar`
   - `AquaButton` not just `Button`
   - Prevents naming conflicts and improves clarity

5. **Co-locate related code:**
   - If a component has tests, styles, or hooks specific to it, keep them in the same folder:
     ```
     /window
       Window.tsx
       Window.test.tsx
       useWindowDrag.ts
     ```

---

## 🔮 Future Additions

As the project grows, we may add:
- `/system/Finder` - Finder-specific chrome components
- `/ui/forms` - Form-related Aqua components
- `/ui/feedback` - Loading, error, toast components
- `/animations` - Shared Framer Motion variants

