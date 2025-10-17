# 🧭 Project Overview

**Goal:** build a highly usable, OS-themed personal site that feels like **Mac OS X (2000 Aqua era)** — but structured like [PostHog.com](https://posthog.com).  
Each section of the portfolio (Projects, Writing, Photos, Reading, About, AI Chat) behaves like an “app” inside a single, consistent window shell.  
The design evokes nostalgia but prioritizes usability.

---

## 🎨 Product Vision

| Element                   | Description                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| **Global Menu Bar**       | Apple menu (About Me), File (Resume, vCard), View (Theme), Go (Sections), Help (⌘ K palette)              |
| **Dock**                  | Primary navigation icons: Projects, Writing, Photos, Reading, About, AI                                   |
| **Window Shell**          | Aqua-style title bar with traffic-light controls, toolbar, and pin-striped background; wraps page content |
| **Command Palette (⌘ K)** | Global search across local content + “Ask my portfolio” AI                                                |
| **Content**               | Authored as Markdown/MDX files under `/content`; compiled to JSON index at build time                     |
| **Design Feel**           | OS X 10.0–10.3 (Aqua Blue, Lucida Grande, pinstripes, gel buttons)                                        |
| Layer                     | Tech                                                                                                      | Reason                                                               |
| --------                  | ------                                                                                                    | --------                                                             |
| **Frontend Framework**    | **React + Vite**                                                                                          | Fast dev loop, full control, minimal boilerplate                     |
| **Styling**               | **Tailwind CSS + custom Aqua tokens**                                                                     | Simple to theme 1-px borders + gradients                             |
| **Animation**             | **Framer Motion**                                                                                         | Smooth window + palette transitions                                  |
| **Routing**               | **TanStack Router (React Router ok)**                                                                     | File-based route mappings, lightweight                               |
| **State Management**      | **Zustand**                                                                                               | Track active app, palette open, theme                                |
| **Content Format**        | **MDX + frontmatter YAML**                                                                                | “Content as files” → fast authoring + versioning                     |
| **Search**                | **Fuse.js**                                                                                               | Client-side fuzzy search over `contentIndex.json`                    |
| **AI / API**              | **Express (TypeScript)**                                                                                  | Simple, familiar server for `/api/ai`, `/api/search`, `/api/contact` |
| **Hosting**               | **Railway**                                                                                               | Serves static Vite build + Express backend in one service            |

---

## 🗂️ Repository Structure

```
/apps
  /web                # Vite React frontend
    /src
      /components     # MenuBar, Dock, Window, Palette, AquaControls
      /features       # ProjectsList, ReadingGrid, AIChat, etc.
      /routes         # /projects, /writing, /photos, /reading, /about
      /styles         # tailwind.css, aqua-tokens.css
      /lib            # useUI (Zustand), search client, utils
    /content          # MDX files (Projects, Writing, Reading)
    /public           # cursors, fonts, sounds, images
  /api                # Express TypeScript backend
    /src
      index.ts        # app entry, mounts routes
      routes/
        ai.ts         # AI proxy endpoint
        search.ts     # Fuse-based search endpoint
        contact.ts    # optional contact handler
    embeddings.json   # (future) RAG index over MDX
/scripts
  build-content.ts    # parses /content → contentIndex.json (+ embeddings)
```

---

## 📄 Content as Files

**Example:** `/content/projects/osx-site.mdx`

```md
---
title: "Building My OS X Portfolio"
date: "2025-10-17"
tags: ["design", "retro", "web"]
summary: "How I rebuilt my portfolio to look like Mac OS X."
---

The idea started when I saw the PostHog OS design...
```

**Build script output → `contentIndex.json`:**

```json
[
  {
    "slug": "projects/osx-site",
    "title": "Building My OS X Portfolio",
    "date": "2025-10-17",
    "tags": ["design", "retro", "web"],
    "summary": "How I rebuilt my portfolio to look like Mac OS X.",
    "body": "The idea started when I saw..."
  }
]
```

Later, this same corpus becomes the knowledge base for RAG (“Ask about my experience”).

---

## 🧩 Key UI Components

| Component         | Role                                                           |
| ----------------- | -------------------------------------------------------------- |
| **`<AppChrome>`** | Wraps everything; renders MenuBar + Dock + Window shell        |
| **`<Window>`**    | Aqua frame with titlebar & traffic-lights; hosts route content |
| **`<Palette>`**   | Command palette modal (search + AI)                            |
| **`<Dock>`**      | Bottom icon bar with tooltips / active app highlight           |
| **`<MenuBar>`**   | Global OS-style menubar (About • File • View • Help)           |

---

## 🎨 Aqua Design Tokens

```css
:root {
  --aqua-blue: #3b9cff;
  --pinstripe: repeating-linear-gradient(0deg, #e9edf3 0 2px, #f7f9fc 2px 6px);
  --bezel-dark: #7b7b7b;
  --bezel-light: #ffffff;
  --font-ui: "Lucida Grande", sans-serif;
}
.win {
  border: 1px solid #6b6b6b;
  border-radius: 10px;
  background: linear-gradient(#f6f8fb, #e7ebf3);
  box-shadow: 0 1px 0 #fff inset, 0 8px 24px rgba(0, 0, 0, 0.15);
}
.win-titlebar {
  height: 28px;
  border-bottom: 1px solid #bfc6d2;
  background: linear-gradient(#fdfefe, #ecf1f7);
}
.pinstripe {
  background: var(--pinstripe);
}
```

---

## 🔍 Search and AI (Present + Future)

**Now:**

- Fuse.js searches `contentIndex.json` for titles, tags, body excerpts.
- Results feed the Command Palette.

**Later (RAG):**

- Build script generates chunked embeddings → `embeddings.json`.
- `/api/ask` retrieves top-k chunks, builds context, and queries model.
- Enables “Ask about my experience” with no schema changes.

---

## 🧠 State Management (Zustand)

```ts
import { create } from "zustand";
type UI = {
  activeApp: "projects" | "writing" | "photos" | "reading" | "about" | "ai";
  paletteOpen: boolean;
  theme: "aqua" | "graphite";
  setApp: (a: UI["activeApp"]) => void;
  togglePalette: () => void;
};
export const useUI = create<UI>((set) => ({
  activeApp: "projects",
  paletteOpen: false,
  theme: "aqua",
  setApp: (a) => set({ activeApp: a }),
  togglePalette: () => set((s) => ({ paletteOpen: !s.paletteOpen })),
}));
```

---

## 🚀 Build & Deploy Pipeline

1. `pnpm build:content` → generate `contentIndex.json` (+ embeddings later)
2. `pnpm build:web` → Vite bundles static assets
3. Express serves `/dist` and API routes
4. Deploy on **Railway** (one service)

Optional later: split to `web` (static) + `api` (Node server + Python microservice).

---

## 🧱 MVP Checklist

| Feature                            | Status |
| ---------------------------------- | ------ |
| ✅ Aqua theme + MenuBar + Dock     |        |
| ✅ Window shell per route          |        |
| ✅ Command palette (⌘ K) search    |        |
| ✅ MDX content → contentIndex.json |        |
| ✅ Express API (search + ai stub)  |        |
| ⬜ AI RAG integration (future)     |        |
| ⬜ Theme toggle (Aqua/Graphite)    |        |

---

## 🪄 Future Expansions

- “Ask about my experience” RAG endpoint over `/content`
- Analytics / logging via PostHog SDK
- Project gallery with Aqua icon previews
- Theme selector (Blue / Graphite)
- Easter egg: Classic boot chime + About This Mac dialog

---

### TL;DR

- Content lives in files → simple authoring + future RAG-ready
- React + Vite + Express stack for speed and control
- Aqua OS X visual shell inspired by PostHog’s structure
- Fully extensible for AI and future tools
