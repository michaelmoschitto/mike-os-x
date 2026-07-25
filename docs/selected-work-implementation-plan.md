# Selected Work: Implementation Plan

## Status

Accepted implementation plan for a long-form UI portfolio inside the existing Mac OS X Aqua desktop experience.

This revision intentionally stores portfolio Markdown and screenshots as plaintext in the public repository. The password is a presentation gate for interview sharing, not a security boundary.

No feature code has been written yet.

## Summary

Build a first-class `projects` desktop app with the user-facing title **Selected Work**. It will provide:

- A lightweight password screen
- An ordered project overview
- Long-form Markdown case studies
- Inline UI screenshots with captions
- An uncropped screenshot viewer
- Deep links to individual projects
- Aqua window chrome around a restrained, professional reading surface

Case studies will live under `apps/web/content/projects` and use the site's existing content pipeline. This removes the encryption compiler, browser decryption, key lifecycle, encrypted asset handling, and separate private-source workflow from the previous plan.

## Accepted Tradeoff

The repository is public. Files committed under `apps/web/content` are visible through GitHub and are copied or bundled into the deployed Vite application by:

- `apps/web/vite.config.ts`
- `scripts/buildContentMetadata.mjs`
- `apps/web/src/lib/contentIndex.ts`

The project accepts that:

- Someone can browse the case-study source on GitHub.
- Someone can access screenshots directly if they know or discover the URL.
- Someone can bypass the password screen with developer tools.
- Search engines or source-indexing services may discover the content.

The password still has practical value: normal visitors and interview reviewers receive an intentional entry experience, while casual navigation does not expose the portfolio immediately.

### Why not hide the files from GitHub?

The common low-effort options do not solve the complete problem:

- `.gitignore` prevents files from reaching GitHub, but also prevents Railway from receiving them during its repository build.
- Git LFS stores large files differently, but files in a public repository remain publicly accessible.
- Obscure filenames reduce accidental discovery but do not provide access control.
- `robots.txt` can discourage compliant crawlers but does not protect files.
- Making the repository private hides source from GitHub visitors, but the deployed static asset URLs remain public.
- A private companion repository requires authenticated checkout during deployment and changes the current Railway build flow.
- Private object storage requires upload tooling, credentials, and authenticated asset delivery.

The last two options are valid future upgrades, but they are not justified for content that is approved for public exposure.

## Goals

### Product goals

- Present UI work as a professional case-study collection.
- Make outcomes, responsibilities, constraints, and decisions easy to scan.
- Place screenshots beside the text that explains them.
- Preserve the Mac OS X identity without reducing readability.
- Make direct project links reliable for interview sharing.
- Make adding future projects predictable.

### Engineering goals

- Reuse the existing window, routing, Zustand, Vite, and content systems.
- Keep the password implementation intentionally small.
- Load full articles and large images only when needed.
- Give each implementation slice an independent verification gate.
- Keep the site functional when project content is missing or malformed.

## Non-goals

- Secure authentication or authorization
- User accounts or per-viewer passwords
- Hiding content from GitHub
- Preventing direct asset access
- Finder integration for project source files
- Command palette search
- Multiple Projects windows
- MDX components
- Analytics
- AI or RAG indexing
- Editing case studies in the browser

## Architecture

```text
apps/web/content/projects
  -> existing metadata build
  -> existing Vite content glob and asset copy
  -> Projects content helpers
  -> Projects Zustand/UI state
  -> ProjectsWindow
```

The feature remains entirely inside `apps/web`.

Unchanged:

- FastAPI
- Redis
- Terminal WebSocket
- Railway API service
- EC2 and Pulumi
- Docker Compose

## Existing Repository Integration Points

| Concern | Existing file | Required change |
| --- | --- | --- |
| Window state | `apps/web/src/stores/useWindowStore.ts` | Add `projects` and `projectSlug` |
| Default size | `apps/web/src/lib/constants.ts` | Add `projects: 1000 × 680` |
| Window URL strategy | `apps/web/src/lib/routing/windowTypeStrategies.ts` | Add singleton Projects strategy |
| URL validation | `apps/web/src/lib/routing/windowSerialization.ts` | Accept and serialize Projects identifiers |
| URL reconciliation | `apps/web/src/lib/routing/windowReconciliation.ts` | Use the existing singleton mechanism |
| Route startup | `apps/web/src/routes/index.tsx` | Ensure Projects URLs initialize and reconcile |
| Friendly routes | `apps/web/src/routes/$.tsx` | Redirect `/projects/:slug` explicitly |
| Window rendering | `apps/web/src/components/system/Desktop.tsx` | Render `ProjectsWindow` |
| Dock navigation | `apps/web/src/components/system/Dock.tsx` | Add Projects icon and identifier |
| App activation | `apps/web/src/lib/store.ts` | Reuse existing `projects` value |
| Content app type | `apps/web/src/lib/fileToApp.ts` | Add `projects` |
| Content metadata | `apps/web/src/lib/contentLoader.ts` | Parse project frontmatter |
| Content discovery | `apps/web/src/lib/contentIndex.ts` | Reuse existing index |
| Window chrome | `apps/web/src/components/window/Window.tsx` | Reuse unchanged |
| Aqua controls | `apps/web/src/components/ui/aqua/` | Reuse existing components |
| Focus-managed dialogs | `@radix-ui/react-dialog` | Use for password and screenshot dialogs |
| Styling tokens | `apps/web/src/styles/index.css` | Reuse existing tokens |

Do not use TextEdit or Photos as the case-study renderer:

- TextEdit is editable and renders raw text rather than publication-quality Markdown.
- Photos uses square `object-cover` thumbnails that can crop UI screenshots.
- A dedicated app preserves project navigation and article context.

## Content Structure

```text
apps/web/content/projects/
  search-redesign/
    index.md
    images/
      thumbnail.webp
      results.webp
      filters.webp
  design-system/
    index.md
    images/
      thumbnail.webp
      components.webp
```

Each project is self-contained. Adding a project requires copying one folder and supplying its metadata, article, and images.

### Frontmatter

```yaml
---
app: projects
slug: projects/search-redesign
title: Search Experience Redesign
summary: Improving retrieval clarity for a technical workflow.
order: 1
role: Product Designer
team: Product and Engineering
timeline: "2025"
tags:
  - Search
  - UI
  - Design Systems
thumbnail: images/thumbnail.webp
thumbnailAlt: Updated search results interface
---
```

Required:

- `app`
- `slug`
- `title`
- `summary`
- `order`
- `role`
- `timeline`
- `thumbnail`
- `thumbnailAlt`

Optional:

- `team`
- `tags`

Do not add speculative fields until real content needs them.

### Article format

The Markdown body starts below the generated project header:

```markdown
## Outcome

The revised hierarchy made high-confidence results easier to identify.

![Search results organized by confidence](images/results.webp "The final hierarchy separates primary matches from supporting context.")
```

Image rules:

- Alt text is required.
- The optional Markdown image title becomes the visible caption.
- Image paths are relative to the project folder.
- Screenshots use WebP unless transparency or fidelity testing justifies PNG.
- Remote image URLs are not used for the first version.
- Screenshots should be no wider than necessary for readable display.

### Content metadata types

Extend `ContentMetadata` in `apps/web/src/lib/fileToApp.ts`:

```typescript
export interface ContentMetadata {
  app?: AppType;
  title?: string;
  slug?: string;
  description?: string;
  url?: string;
  summary?: string;
  order?: number;
  role?: string;
  team?: string;
  timeline?: string;
  tags?: string[];
  thumbnail?: string;
  thumbnailAlt?: string;
}
```

Add `projects` to `AppType`.

Refactor the duplicated frontmatter mapping in `contentLoader.ts` into one small parser while extending it. This prevents `parseContent` and `loadContentFile` from drifting.

## Password Presentation Gate

### Behavior

Opening either the overview or a project deep link displays an Aqua password dialog unless the current tab has already been unlocked.

The dialog includes:

- Title: “Selected Work”
- A short explanation that the work is shared for portfolio review
- Labelled password input
- Unlock button
- Cancel button
- Inline wrong-password message

Interaction:

- Enter submits.
- Escape cancels and returns to the desktop.
- Focus begins in the password field.
- Radix Dialog traps and restores focus.
- A successful unlock is remembered in `sessionStorage`.
- A deep-linked project remains selected after unlock.
- Lock clears the session flag.

### Password comparison

Use a build-time environment variable:

```text
VITE_PORTFOLIO_PASSWORD_HASH
```

The value is a lowercase hexadecimal SHA-256 digest of the intended password.

The browser:

1. Encodes the submitted password with `TextEncoder`.
2. Hashes it with `crypto.subtle.digest('SHA-256', ...)`.
3. Compares the resulting hexadecimal digest with the build-time value.
4. Stores only an unlocked boolean in `sessionStorage`.

This avoids committing the plaintext password, but it does not provide secure authentication. The digest is present in the built JavaScript and can be brute-forced or bypassed.

### Missing configuration

Development and production behavior must fail clearly:

- If no hash is configured, show “Portfolio access is not configured.”
- Do not silently accept every password.
- Do not include a default production password.

Provide a small local command for generating the hash:

```text
bun run portfolio:hash-password
```

The command prompts without echoing and prints the digest. It must not accept the password as a command-line argument.

## User Experience Specification

### Window

- Title: **Selected Work**
- Default dimensions: `1000 × 680`
- Singleton behavior: opening another project updates and focuses the existing Projects window
- Content background: white or a very subtle neutral
- Pinstripes: toolbar, sidebar chrome, dialog chrome, and empty states only

### Overview

The unlocked overview contains:

- A 200px source-list sidebar
- “All Projects” as the first sidebar item
- Projects ordered by the explicit `order` field
- Two-column landscape project cards
- Thumbnail, title, summary, role, and timeline

Cards preserve the thumbnail's aspect ratio and do not crop important UI.

### Article

The article view contains:

- Back to All Projects
- Project title and one-sentence outcome
- Role, team, timeline, and tags
- Centered article column between 680px and 720px
- 15px–16px body text
- Approximately 1.6 line height
- Clear heading hierarchy
- Inline screenshots and captions
- Copy Link action
- Lock action

Recommended editorial structure:

1. Outcome
2. At a glance
3. Context
4. Constraints
5. Key decisions
6. Interface walkthrough
7. Tradeoffs and iteration
8. Reflection

### Screenshot viewer

- Open by activating an inline figure.
- Preserve the full screenshot with `object-contain`.
- Show the article caption.
- Close with Escape or an explicit button.
- Restore focus to the triggering figure.
- Use a neutral dark viewing surface inside Aqua dialog chrome.

Previous/next gallery navigation is deferred until real case studies demonstrate a need for it.

## Routing Model

Supported URLs:

```text
/?w=projects
/?w=projects:search-redesign
/projects/search-redesign
```

Window state:

```typescript
interface Window {
  // Existing fields...
  type: ExistingWindowType | 'projects';
  projectSlug?: string;
}
```

Serialization:

```text
projects                    -> overview
projects:<safe-slug>        -> project article
```

Slug grammar:

```text
[a-z0-9]+(?:-[a-z0-9]+)*
```

Screenshot dialog state remains local component state and is not represented in the URL.

### Route implementation notes

`apps/web/src/routes/index.tsx` currently waits for the public content index before reconciling windows. Add `projects` to the identifiers that trigger index initialization. A broader routing refactor is unrelated to this feature.

`apps/web/src/routes/$.tsx` currently has mismatched `photo`/`pdf` checks compared with the actual `photos`/`pdfviewer` app types. Correct those checks while adding explicit handling for:

```text
/projects
/projects/:slug
```

## Content Helpers

Create `apps/web/src/lib/projectsContent.ts`.

Suggested interfaces:

```typescript
export interface ProjectSummary {
  slug: string;
  title: string;
  summary: string;
  order: number;
  role: string;
  team?: string;
  timeline: string;
  tags: string[];
  thumbnailUrl: string;
  thumbnailAlt: string;
  entry: ContentIndexEntry;
}

export interface ProjectArticle {
  project: ProjectSummary;
  markdown: string;
  contentBaseUrl: string;
}
```

Suggested functions:

```typescript
getProjects(): ProjectSummary[]
getProjectBySlug(slug: string): ProjectSummary | undefined
loadProjectArticle(slug: string): Promise<ProjectArticle>
resolveProjectAssetUrl(project: ProjectSummary, relativePath: string): string
```

Responsibilities:

- Filter content entries where `appType === 'projects'`.
- Validate required metadata at the boundary.
- Sort by `order`, then title for deterministic fallback.
- Convert `slug: projects/search-redesign` into the route slug `search-redesign`.
- Resolve `images/foo.webp` to `/content/projects/search-redesign/images/foo.webp`.
- Reject absolute paths, traversal, and unsupported image schemes.

## Frontend State

### Access store

Create `apps/web/src/stores/usePortfolioAccessStore.ts`:

```typescript
type PortfolioAccessStatus = 'locked' | 'checking' | 'unlocked' | 'misconfigured';

interface PortfolioAccessStore {
  status: PortfolioAccessStatus;
  initialize: () => void;
  unlock: (password: string) => Promise<boolean>;
  lock: () => void;
}
```

Storage key:

```text
selected-work-unlocked-v1
```

The store contains no project data and no password.

### Project state

Keep the selected project in the existing window store through `projectSlug`.

Keep screenshot-dialog state inside the article component. Do not add another global store.

## Frontend Files

### Create

```text
scripts/hashPortfolioPassword.ts

apps/web/src/lib/projectsContent.ts
apps/web/src/lib/portfolioPassword.ts
apps/web/src/stores/usePortfolioAccessStore.ts

apps/web/src/components/apps/Projects/ProjectsWindow.tsx
apps/web/src/components/apps/Projects/ProjectsToolbar.tsx
apps/web/src/components/apps/Projects/PortfolioPasswordDialog.tsx
apps/web/src/components/apps/Projects/ProjectsOverview.tsx
apps/web/src/components/apps/Projects/ProjectCard.tsx
apps/web/src/components/apps/Projects/ProjectsSidebar.tsx
apps/web/src/components/apps/Projects/CaseStudyArticle.tsx
apps/web/src/components/apps/Projects/CaseStudyFigure.tsx
apps/web/src/components/apps/Projects/ScreenshotDialog.tsx
apps/web/src/components/apps/Projects/ProjectsLoadingState.tsx
apps/web/src/components/apps/Projects/ProjectsErrorState.tsx
apps/web/src/components/apps/Projects/index.ts

apps/web/public/icons/projects.png
```

### Modify

```text
package.json
apps/web/package.json
apps/web/src/stores/useWindowStore.ts
apps/web/src/lib/constants.ts
apps/web/src/lib/fileToApp.ts
apps/web/src/lib/contentLoader.ts
apps/web/src/lib/routing/windowTypeStrategies.ts
apps/web/src/lib/routing/windowSerialization.ts
apps/web/src/components/system/Desktop.tsx
apps/web/src/components/system/Dock.tsx
apps/web/src/routes/index.tsx
apps/web/src/routes/$.tsx
Dockerfile
.github/workflows/deploy-infrastructure.yml
.github/workflows/ci.yml
```

Only modify `apps/web/src/styles/index.css` if existing Aqua tokens and Tailwind utilities cannot express a required state. Article elements should normally be styled through ReactMarkdown component mappings.

### Do not modify

```text
apps/api/
iac/
docker-compose.yml
docker-compose.dev.yml
```

## Component Responsibilities

### `ProjectsWindow`

- Reuse `Window`.
- Use `useWindowLifecycle`.
- Initialize the access store.
- Select overview or article from `projectSlug`.
- Coordinate sidebar visibility.
- Render locked, loading, error, overview, and article states.
- Update the window title for selected projects.

### `PortfolioPasswordDialog`

- Use Radix Dialog.
- Own only password field and form-error state.
- Delegate comparison to the access store.
- Announce errors through an `aria-live` region.

### `ProjectsOverview`

- Render ordered project summaries.
- Handle empty state.
- Avoid loading article bodies.

### `CaseStudyArticle`

- Load one Markdown file.
- Render explicit Markdown component mappings.
- Do not enable raw HTML.
- Resolve project-relative images through `CaseStudyFigure`.

### `CaseStudyFigure`

- Render semantic `<figure>` and `<figcaption>`.
- Preserve image aspect ratio.
- Use lazy image loading.
- Open `ScreenshotDialog`.
- Render a useful failure state for missing images.

### `ScreenshotDialog`

- Use Radix Dialog.
- Show one full screenshot.
- Handle Escape and focus restoration.
- Display alt text and caption correctly.

## Dependencies

Add the latest package-manager-resolved versions to `apps/web/package.json`:

```text
react-markdown
remark-gfm
```

Add Playwright only during the integration slice:

```text
@playwright/test
```

Do not add:

- MDX
- A Tailwind typography plugin
- A cryptography package
- A validation framework solely for this feature

## Implementation Slices

The slices are large enough to move quickly while retaining clear verification boundaries.

### Slice 1: Content model, helpers, and access gate

Scope:

- Extend content metadata and app mapping.
- Refactor frontmatter parsing.
- Add one fixture case study.
- Implement project discovery and asset resolution.
- Implement SHA-256 password comparison.
- Implement session-scoped access state.
- Add the password-hash helper command.

Acceptance:

- Fixture metadata is parsed correctly.
- Projects are filtered and ordered correctly.
- Relative screenshot URLs resolve correctly.
- Traversal and absolute image paths are rejected.
- Correct password unlocks.
- Wrong password remains locked.
- Missing hash produces `misconfigured`.
- Reload in the same tab preserves the unlocked state.
- New tab starts locked.

### Slice 2: Projects window, routing, and overview

Scope:

- Add `projects` window type.
- Add URL strategy and validation.
- Add Dock entry and icon.
- Render `ProjectsWindow`.
- Add friendly routes.
- Build toolbar, sidebar, overview, and cards.
- Connect the access dialog.

Acceptance:

- Dock opens and focuses one Projects window.
- `/?w=projects` round-trips through serialization.
- `/?w=projects:search-redesign` selects the fixture.
- `/projects/search-redesign` redirects correctly.
- Cards appear in configured order.
- Card thumbnails preserve aspect ratio.
- Existing window types still serialize and reconcile.

### Slice 3: Article reader and screenshot viewer

Scope:

- Add Markdown dependencies.
- Build the article header and typography.
- Render headings, lists, links, and figures.
- Build the screenshot dialog.
- Add Copy Link and Lock.
- Add loading, missing-project, and image-error states.

Acceptance:

- Article body loads only after selecting a project.
- Markdown does not render raw HTML.
- Relative screenshots load from `/content/projects`.
- External links use safe target and rel behavior.
- Screenshots are never cropped.
- Captions and alt text render correctly.
- Dialog focus is trapped and restored.
- Lock returns to the password state.

### Slice 4: CI, deployment, and real content

Scope:

- Pass the password digest into the Vite build.
- Configure the Railway web variable.
- Run frontend unit tests in CI.
- Build the root web Docker image in CI.
- Add focused Playwright flows.
- Add real case-study folders.
- Complete editorial, visual, accessibility, and performance review.

Acceptance:

- CI runs unit tests, type checking, linting, Vite build, and web Docker build.
- Production shows a clear error if the password hash is absent.
- Production unlock works with the configured password.
- Real content renders at target viewport sizes.
- Direct links work after unlocking.
- Existing public apps remain functional.

## Test Plan

### Unit tests

Add tests for:

- Extended frontmatter parsing
- `app: projects` mapping
- Required metadata validation
- Stable project ordering
- Route slug extraction
- Asset URL resolution
- Path traversal rejection
- Password hashing and comparison
- Access-store initialization, unlock, and lock
- Projects URL strategy

### End-to-end tests

Use a test-only digest during CI.

Flows:

1. Open Projects from the Dock, unlock, and see the overview.
2. Submit a wrong password and recover.
3. Open a direct project URL, unlock, and see that article.
4. Open and close a screenshot with keyboard controls.
5. Lock and unlock again.
6. Load an invalid project slug and return to overview.
7. Verify thumbnails and article images have alt text.

Avoid visual snapshot tests initially. Cross-platform fonts and Aqua gradients would make them brittle.

### Manual visual review

Review:

- 1280×800
- 1440×900
- Default and expanded window sizes
- Sidebar open and closed
- Short and long articles
- Portrait and landscape screenshots
- Long project titles
- Slow image loading
- Missing screenshot
- Missing or invalid project metadata

## Performance Budgets

- Project overview should not load article bodies.
- Card thumbnails target below 100KB.
- Display screenshots target below 500KB where practical.
- Images use `loading="lazy"`.
- Article text is loaded only for the selected project.
- No case-study body is imported into the initial application chunk.

The existing content index currently imports text modules while building its runtime index. If bundle inspection shows that this eagerly transfers every case study, move project summaries into generated metadata or add a project-specific lazy index. Do not optimize this speculatively.

## Accessibility Requirements

- Semantic headings in document order
- `<article>`, `<figure>`, and `<figcaption>` elements
- Labelled password input
- `aria-live` unlock errors
- Visible focus indicators
- Radix-managed focus trapping
- Escape closes dialogs
- Focus returns to dialog trigger
- Keyboard activation for project cards and figures
- Meaningful screenshot alt text
- Decorative interface elements hidden from assistive technology
- Motion reduced when `prefers-reduced-motion` is enabled

## Environment and Deployment

### Local

Add to `apps/web/.env.local`:

```text
VITE_PORTFOLIO_PASSWORD_HASH=<sha256-hex>
```

Generate it with:

```bash
bun run portfolio:hash-password
```

### Docker

Extend the root `Dockerfile`:

```dockerfile
ARG VITE_PORTFOLIO_PASSWORD_HASH
ENV VITE_PORTFOLIO_PASSWORD_HASH=$VITE_PORTFOLIO_PASSWORD_HASH
```

### Railway

Add a Railway web-service variable:

```text
VITE_PORTFOLIO_PASSWORD_HASH
```

Update `.github/workflows/deploy-infrastructure.yml` to set it from a GitHub secret without printing the value.

No API or infrastructure service changes are required.

## Authoring Workflow

For each project:

1. Create `apps/web/content/projects/<slug>`.
2. Add `index.md`.
3. Add optimized screenshots under `images`.
4. Validate metadata, alt text, and captions.
5. Preview the overview.
6. Read the case study from beginning to end.
7. Test the project deep link.

Commands:

```bash
node scripts/buildContentMetadata.mjs
cd apps/web && bun run test
cd apps/web && bun run lint
cd apps/web && bun run build
```

## Verification Commands

```bash
node scripts/buildContentMetadata.mjs
cd apps/web && bun run test
cd apps/web && bun run lint
cd apps/web && bun run format:check
cd apps/web && bun run build
docker build -f Dockerfile .
```

## Security Disclosure

The implementation should describe itself accurately in code and documentation:

- Call it an access screen or presentation gate.
- Do not call it secure authentication.
- Do not claim that screenshots are private.
- Do not place additional secrets in frontmatter or Markdown.
- Keep customer data, credentials, private URLs, and sensitive metrics out of screenshots even when authorized to show the overall work.

If stronger protection is needed later, migrate to:

```text
Private object storage
  -> FastAPI login and session
  -> authenticated project and asset endpoints
  -> same Projects UI and Markdown renderer
```

## Definition of Done

- Projects app opens from the Dock.
- Access screen uses a build-time password digest and session-scoped unlock.
- Overview clearly organizes projects.
- Project deep links survive unlock.
- Articles are readable and visually restrained.
- Screenshots preserve their complete UI.
- Captions and alt text are present.
- Lock clears the session state.
- Existing window behavior remains intact.
- Unit and end-to-end tests pass.
- Web Docker image builds in CI.
- Production password configuration is documented.
- The public-content tradeoff is documented and accepted.
