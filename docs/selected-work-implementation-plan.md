# Selected Work: Implementation Plan

## Status

Proposed implementation plan for a password-gated, long-form UI portfolio inside the existing Mac OS X Aqua desktop experience.

This document is implementation-ready, but no feature code has been written yet.

## Summary

Build a first-class `projects` desktop app with the user-facing title **Selected Work**. It will provide:

- A password prompt before project metadata is shown
- An ordered project overview
- Long-form Markdown case studies
- Inline UI screenshots with captions
- An uncropped screenshot viewer
- Deep links to individual projects
- Aqua window chrome around a restrained, professional reading surface

The portfolio source files will remain local and gitignored. A build command will validate, optimize, and encrypt the portfolio into a static package. Only encrypted output will be committed and deployed.

## Plan Review and Decisions

The initial plan was reviewed against the current repository, deployment model, and repository visibility. The following decisions resolve the major implementation risks.

### 1. Do not store private source content in the repository

The repository is public. Runtime authentication cannot protect files committed under either:

- `apps/web/content`
- `apps/api/content`

Files under `apps/web/content` are also copied or bundled into the public Vite application by:

- `apps/web/vite.config.ts`
- `scripts/buildContentMetadata.mjs`
- `apps/web/src/lib/contentIndex.ts`

Therefore, real project Markdown and screenshots must never enter the existing content tree or any other committed plaintext path.

### 2. Use an encrypted static package for the first version

Password protection is a convenience boundary, not an authorization boundary for confidential material. A browser-decrypted static package is the simplest implementation that provides more than a cosmetic password check.

This choice avoids adding:

- Private object storage
- Upload tooling
- New Railway volumes
- New API endpoints
- Cross-origin cookie handling
- Redis-backed sessions
- New Pulumi resources

If stronger protection is required later, the encrypted package can be replaced by an authenticated API backed by private object storage without redesigning the Projects UI.

### 3. Use `projects` consistently

The internal window type will be `projects`.

This matches:

- The existing `projects` value in `apps/web/src/lib/store.ts`
- The terminology in `docs/OSX_Portfolio_Spec.md`
- The intended Dock navigation

The user-facing app name will be **Selected Work**.

### 4. Use Markdown, not MDX

The case studies need headings, lists, links, and figures, but do not currently require executable embeds.

Plain Markdown is preferred because it:

- Is easier to author
- Has a smaller implementation surface
- Can be rendered safely without raw HTML
- Supports inline screenshots through normal image syntax
- Avoids compiling private executable content

Use `react-markdown` with `remark-gfm`. Do not enable raw HTML.

### 5. Keep the first image viewer simple

The first version will provide click-to-zoom, Escape-to-close, focus restoration, alt text, and captions.

Previous/next gallery navigation is deferred until real case studies demonstrate that it improves the reading experience. This avoids introducing screenshot indexing and article parsing solely for a speculative interaction.

### 6. Keep the decryption key in memory

The password and derived key will not be stored in `localStorage` or `sessionStorage`.

Refreshing the page will lock the portfolio again. This is a reasonable tradeoff for an interview portfolio and avoids persisting the equivalent of the password in browser-accessible storage.

## Goals

### Product goals

- Present UI work as a professional case-study collection
- Make outcomes, responsibilities, constraints, and decisions easy to scan
- Allow screenshots to appear beside the text that explains them
- Preserve the Mac OS X identity without reducing readability
- Make direct project links reliable for interview sharing
- Make adding future projects predictable

### Engineering goals

- Fit the existing window, routing, Zustand, Vite, and Railway architecture
- Keep private source files out of Git and production plaintext
- Load articles and images only when needed
- Give each implementation slice an independent verification gate
- Keep the public site functional when portfolio content is missing or corrupt

## Non-goals

- User accounts or per-viewer passwords
- Strong revocation of previously published encrypted content
- Finder integration for private project files
- Command palette search
- Public project teaser pages
- Multiple Projects windows
- MDX components
- Analytics
- AI or RAG indexing
- Editing case studies in the browser
- A general-purpose encrypted content management system

## Existing Repository Integration Points

| Concern | Existing file | Required change |
| --- | --- | --- |
| Window state | `apps/web/src/stores/useWindowStore.ts` | Add `projects` and `projectSlug` |
| Default size | `apps/web/src/lib/constants.ts` | Add `projects: 1000 × 680` |
| Window URL strategy | `apps/web/src/lib/routing/windowTypeStrategies.ts` | Add singleton Projects strategy |
| URL validation | `apps/web/src/lib/routing/windowSerialization.ts` | Accept and serialize Projects identifiers |
| URL reconciliation | `apps/web/src/lib/routing/windowReconciliation.ts` | Use the existing singleton mechanism |
| Route startup | `apps/web/src/routes/index.tsx` | Ensure Projects URLs reconcile |
| Friendly routes | `apps/web/src/routes/$.tsx` | Redirect `/projects/:slug` explicitly |
| Window rendering | `apps/web/src/components/system/Desktop.tsx` | Render `ProjectsWindow` |
| Dock navigation | `apps/web/src/components/system/Dock.tsx` | Add Projects icon and identifier |
| Window chrome | `apps/web/src/components/window/Window.tsx` | Reuse unchanged |
| Aqua controls | `apps/web/src/components/ui/aqua/` | Reuse buttons and tokens |
| Focus-managed dialogs | `@radix-ui/react-dialog` | Use for password and screenshot dialogs |
| Styling tokens | `apps/web/src/styles/index.css` | Reuse; add tokens only if necessary |
| Photos behavior | `apps/web/src/components/apps/Photos/PhotosSingleView.tsx` | Reuse interaction ideas, not the component |

The existing TextEdit and Photos apps should not be used as the case-study renderer:

- TextEdit is editable and renders raw text rather than publication-quality Markdown.
- Photos uses square `object-cover` thumbnails that can crop UI screenshots.
- A dedicated app can preserve project navigation and article context.

## User Experience Specification

### Window

- Title: **Selected Work**
- Default dimensions: `1000 × 680`
- Singleton behavior: opening a second project updates and focuses the existing Projects window
- Content background: white or a very subtle neutral
- Pinstripes: toolbar, sidebar chrome, dialogs, and empty states only

### Locked state

Opening either the overview or a project deep link displays an Aqua password dialog.

The dialog includes:

- Title: “Selected Work”
- One sentence explaining that access is shared for portfolio review
- Labelled password input
- Unlock button
- Cancel button
- Inline wrong-password error
- Progress state while deriving the key and decrypting the index

Behavior:

- Enter submits
- Escape cancels and returns to the desktop
- Focus starts in the password field
- Focus cannot escape the dialog while open
- A deep-linked project remains selected after unlock

### Overview

The unlocked overview contains:

- A 200px source-list sidebar
- “All Projects” as the first sidebar item
- Projects ordered by the explicit `order` field
- Two-column landscape project cards
- Thumbnail, title, summary, role, and date or timeline

Cards must preserve the thumbnail's aspect ratio and must not crop important UI.

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

- Open by activating an inline figure
- Preserve the full screenshot with `object-contain`
- Show the article caption
- Close with Escape or an explicit button
- Restore focus to the triggering figure
- Use a neutral dark viewing surface inside Aqua dialog chrome

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

Serialization rules:

```text
projects                    -> overview
projects:<safe-slug>        -> project article
```

Slug grammar:

```text
[a-z0-9]+(?:-[a-z0-9]+)*
```

Screenshot dialog state will remain local component state and will not be represented in the URL for the first version.

### Route-specific implementation notes

`apps/web/src/routes/index.tsx` currently waits for the public content index before reconciling windows. Projects does not use that index. Implementation should either:

1. Add `projects` to the set that initializes the index, as the smallest change; or
2. Remove the unconditional `isIndexed` dependency from reconciliation, if tests show that doing so is safe for all window types.

Prefer option 1 for this feature. The broader reconciliation cleanup is unrelated.

`apps/web/src/routes/$.tsx` must handle `/projects` and `/projects/:slug` before calling the existing public content resolver.

## Source Content

Real source content lives in a gitignored root directory:

```text
.portfolio/
  projects/
    search-redesign/
      project.json
      article.md
      images/
        thumbnail.png
        results.png
        filters.png
```

Add this rule to `.gitignore`:

```gitignore
# Unencrypted portfolio source
.portfolio/
```

### Project metadata

`project.json`:

```json
{
  "slug": "search-redesign",
  "title": "Search Experience Redesign",
  "summary": "Improving retrieval clarity for a technical workflow.",
  "order": 1,
  "role": "Product Designer",
  "team": "Product and Engineering",
  "timeline": "2025",
  "tags": ["Search", "UI", "Design Systems"],
  "thumbnail": "images/thumbnail.png",
  "thumbnailAlt": "Updated search results interface"
}
```

Required:

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

Do not add speculative fields until actual project content needs them.

### Article format

`article.md` starts below the generated project header:

```markdown
## Outcome

The revised hierarchy made high-confidence results easier to identify.

![Search results organized by confidence](images/results.png "The final results hierarchy separates primary matches from supporting context.")
```

Image convention:

- Alt text is required.
- The optional Markdown image title becomes the visible caption.
- Image paths must be relative to the project directory.
- Remote images and absolute filesystem paths are rejected.

## Generated Package

Only encrypted output is committed:

```text
apps/web/public/portfolio/
  manifest.json
  index.<ciphertext-hash>.enc
  resources/
    <ciphertext-hash>.enc
    <ciphertext-hash>.enc
```

Vite copies `public/portfolio` directly into the production build. It is intentionally separate from `apps/web/content` and the existing content index.

### Public manifest

`manifest.json` contains cryptographic bootstrapping data only:

```json
{
  "schemaVersion": 1,
  "kdf": {
    "name": "PBKDF2",
    "hash": "SHA-256",
    "iterations": 600000,
    "salt": "<base64>"
  },
  "index": {
    "path": "index.<hash>.enc",
    "iv": "<base64>",
    "aad": "portfolio:v1:index"
  }
}
```

The exact PBKDF2 iteration count must be benchmarked during implementation. Target an unlock cost of roughly 300ms–700ms on a typical interviewer's laptop.

The public manifest must not contain:

- Project titles
- Slugs
- Article text
- Original filenames
- Captions
- MIME types
- Asset relationships

### Encrypted index

After decryption, the index contains:

```typescript
interface PortfolioIndex {
  schemaVersion: 1;
  projects: PortfolioProjectSummary[];
  resources: Record<string, EncryptedResource>;
}

interface PortfolioProjectSummary {
  slug: string;
  title: string;
  summary: string;
  order: number;
  role: string;
  team?: string;
  timeline: string;
  tags: string[];
  thumbnailResourceId: string;
  thumbnailAlt: string;
  articleResourceId: string;
  assetResourceIds: Record<string, string>;
}

interface EncryptedResource {
  path: string;
  iv: string;
  aad: string;
  mimeType: string;
  byteLength: number;
}
```

Each `.enc` resource is raw AES-GCM ciphertext. Web Crypto's AES-GCM output already includes the authentication tag.

`assetResourceIds` maps normalized article-relative paths such as `images/results.png` to encrypted resource IDs. This lets the Markdown image renderer resolve a source without exposing original filenames in the public manifest.

## Encryption and Build Pipeline

### Cryptography

- KDF: PBKDF2-SHA-256
- Encryption: AES-256-GCM
- Salt: one random package salt
- IV: one random 12-byte IV per encrypted file
- AAD:
  - Index: `portfolio:v1:index`
  - Resource: `portfolio:v1:resource:<resource-id>`
- Filenames: SHA-256 hash of ciphertext
- Password comparison: successful authenticated decryption of the index

Do not add a separate client-visible password hash. It would give an attacker a smaller artifact to test without decrypting the authenticated index.

Encode the password exactly as entered with `TextEncoder`. Do not trim or normalize it differently between the build script and browser.

### Build order

```text
Read local source
  -> validate metadata and Markdown references
  -> optimize images
  -> encrypt article and image resources
  -> hash ciphertext and assign resource paths
  -> construct encrypted index
  -> write package into a temporary directory
  -> verify round-trip decryption
  -> atomically replace apps/web/public/portfolio
```

The build must never write optimized plaintext into `apps/web/public`.

### Password input

For a real build:

- Prompt without echoing the password
- Prompt twice when creating or rotating a package
- Do not accept a command-line password argument

For automated fixture tests only:

- Permit a test password through an environment variable
- Reject that mode unless the source path is under `tests/fixtures`

### Image processing

Use `sharp` during package generation.

Create:

- Card thumbnail variant
- Article/display variant capped near 1800px wide
- WebP output

The initial quality and size budgets are:

- Thumbnail: target below 100KB
- Display image: target below 500KB
- Warn when a generated image exceeds its target
- Fail only on a larger hard ceiling established with real screenshots

The build encrypts generated image buffers immediately. Original images remain under `.portfolio`.

## Frontend Data Flow

```text
ProjectsWindow mounts
  -> portfolioStore.loadManifest()
  -> locked state
  -> password dialog submits
  -> deriveKey(password, manifest.kdf)
  -> fetch encrypted index
  -> decrypt index
  -> store CryptoKey and project summaries in memory
  -> render overview or selected project
```

Project load:

```text
Select slug
  -> find article resource in decrypted index
  -> fetch ciphertext
  -> decrypt with in-memory key
  -> decode Markdown
  -> render article
```

Image load:

```text
Markdown image component receives relative source
  -> resolve project resource
  -> fetch ciphertext
  -> decrypt into Blob
  -> create object URL
  -> render image
  -> revoke object URL when cache is cleared
```

Cache decrypted articles and Blob URLs for the active browser session. Locking the portfolio clears both.

## Frontend Files

### Create

```text
apps/web/src/lib/portfolio/portfolioTypes.ts
apps/web/src/lib/portfolio/portfolioCrypto.ts
apps/web/src/lib/portfolio/portfolioPackage.ts
apps/web/src/lib/portfolio/portfolioClient.ts
apps/web/src/stores/usePortfolioStore.ts

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
```

### Modify

```text
apps/web/src/stores/useWindowStore.ts
apps/web/src/lib/constants.ts
apps/web/src/lib/routing/windowTypeStrategies.ts
apps/web/src/lib/routing/windowSerialization.ts
apps/web/src/components/system/Desktop.tsx
apps/web/src/components/system/Dock.tsx
apps/web/src/routes/index.tsx
apps/web/src/routes/$.tsx
apps/web/package.json
apps/web/src/styles/index.css
```

Only modify `apps/web/src/styles/index.css` if existing Aqua tokens and Tailwind utilities cannot express a required state. Article elements should normally be styled through ReactMarkdown component mappings.

### Do not modify for the first version

```text
apps/web/src/lib/contentIndex.ts
apps/web/src/lib/contentLoader.ts
apps/web/src/lib/fileToApp.ts
scripts/buildContentMetadata.mjs
apps/api/
iac/
docker-compose.yml
docker-compose.dev.yml
```

## Component Responsibilities

### `ProjectsWindow`

- Reuse `Window`
- Use `useWindowLifecycle`
- Select overview or article from `projectSlug`
- Coordinate sidebar visibility
- Render locked, loading, error, overview, and article states
- Update the window title for selected projects

### `PortfolioPasswordDialog`

- Use Radix Dialog
- Own only form state
- Delegate decryption to the store
- Announce errors through an `aria-live` region

### `ProjectsOverview`

- Render sorted projects
- Handle empty state
- Avoid loading article resources

### `CaseStudyArticle`

- Load one Markdown resource
- Render explicit Markdown component mappings
- Reject raw HTML
- Resolve project-relative images through `CaseStudyFigure`

### `CaseStudyFigure`

- Load one encrypted image lazily
- Render semantic `<figure>` and `<figcaption>`
- Preserve aspect ratio
- Open `ScreenshotDialog`

### `ScreenshotDialog`

- Use Radix Dialog
- Show one full screenshot
- Handle Escape and focus restoration
- Display alt text and caption correctly

### `usePortfolioStore`

Suggested state:

```typescript
type PortfolioStatus =
  | 'idle'
  | 'loading-manifest'
  | 'locked'
  | 'unlocking'
  | 'unlocked'
  | 'error';

interface PortfolioStore {
  status: PortfolioStatus;
  projects: PortfolioProjectSummary[];
  activeKey: CryptoKey | null;
  articleCache: Map<string, string>;
  assetUrlCache: Map<string, string>;
  error: string | null;
  loadManifest: () => Promise<void>;
  unlock: (password: string) => Promise<boolean>;
  loadArticle: (slug: string) => Promise<string>;
  loadAssetUrl: (resourceId: string) => Promise<string>;
  lock: () => void;
}
```

Keep fetch and cryptographic details in `portfolioClient.ts` rather than embedding them in React components.

## Dependencies

Add the latest package-manager-resolved versions:

Runtime:

```text
apps/web/package.json:
  react-markdown
  remark-gfm
```

Development:

```text
root package.json:
  sharp
  @playwright/test
```

Do not introduce a cryptography package unless Web Crypto proves unavailable in a supported runtime.

## Implementation Slices

The slices below are large enough to move development quickly but small enough to diagnose and verify independently.

### Slice 1: Package compiler and cryptographic contract

Scope:

- Types
- Validation
- Image optimization
- Encryption and decryption helpers
- Fixture project
- Package builder
- Unit tests

Create:

```text
scripts/buildPortfolio.ts
scripts/validatePortfolio.ts
apps/web/src/lib/portfolio/portfolioTypes.ts
apps/web/src/lib/portfolio/portfolioCrypto.ts
apps/web/src/lib/portfolio/portfolioPackage.ts
tests/fixtures/portfolio/
```

Acceptance:

- Fixture package builds.
- Correct password decrypts every fixture resource.
- Wrong password fails.
- One changed ciphertext byte fails.
- No fixture plaintext appears in generated output.
- Missing metadata, alt text, or image references fail validation.
- Build writes through a temporary directory and leaves the previous package intact on failure.

### Slice 2: Window, routing, and locked shell

Scope:

- `projects` window type
- URL strategy
- Dock icon
- Desktop renderer
- Friendly route
- Locked/loading/error window states
- Password dialog wired to a mocked package client

Acceptance:

- Dock opens and focuses one Projects window.
- Overview and project URLs round-trip through serialization.
- `/projects/:slug` redirects correctly.
- Password dialog has correct focus and keyboard behavior.
- Existing window types continue to serialize and reconcile.

### Slice 3: End-to-end overview and article

Scope:

- Real encrypted package client
- Zustand portfolio store
- Project overview
- Sidebar
- Markdown renderer
- Inline encrypted images

Acceptance:

- Unlocking displays the ordered fixture project.
- A project deep link unlocks directly into the requested article.
- Article headings, lists, links, and figures render correctly.
- Project list does not decrypt all articles.
- Images decrypt lazily.
- Lock clears decrypted state and revokes object URLs.

### Slice 4: Reading and media polish

Scope:

- Final typography
- Toolbar
- Copy Link
- Screenshot dialog
- Empty/error states
- Reduced-motion handling
- Accessibility review

Acceptance:

- Article remains readable at 1280×800 and 1440×900.
- UI screenshots are never cropped.
- All controls are keyboard reachable.
- Dialog focus is trapped and restored.
- Every content image has alt text.
- Aqua styling frames rather than dominates the article.

### Slice 5: CI, production packaging, and real content

Scope:

- Run frontend tests in CI
- Fixture package generation in CI
- Plaintext leakage verification
- Root web Docker build in CI
- Playwright smoke flows
- Nginx cache rules
- Local real-content workflow
- Editorial and visual review

Acceptance:

- CI exercises tests, type checking, linting, Vite build, and web Docker build.
- Known fixture plaintext does not appear in `dist`.
- Encrypted resources use immutable caching.
- `manifest.json` revalidates instead of receiving immutable caching.
- Real portfolio sources remain ignored and untracked.
- Only encrypted package output is committed.

## Test Plan

### Unit tests

Add tests for:

- PBKDF2 key derivation compatibility
- AES-GCM encrypt/decrypt round trip
- Wrong password
- Tampered ciphertext
- AAD mismatch
- Portfolio metadata validation
- Slug validation
- Duplicate order detection
- Markdown image validation
- Resource path resolution
- `projects` URL strategy
- Portfolio store locking and cache cleanup

### End-to-end tests

Playwright fixture password: test-only value generated in CI.

Flows:

1. Open Projects from Dock, unlock, and see overview.
2. Open a direct project URL, unlock, and see that article.
3. Open and close a screenshot with keyboard controls.
4. Submit a wrong password and recover.
5. Lock and unlock again.
6. Load an invalid slug and return to overview.
7. Verify overview thumbnails and article images have alt text.

Avoid visual snapshot tests initially. Cross-platform fonts and Aqua gradients would create brittle snapshots with limited value.

### Manual visual review

Review:

- 1280×800
- 1440×900
- Default window size
- Maximized window
- Sidebar open and closed
- Short and long articles
- Portrait and landscape screenshots
- Long project titles
- Slow asset loading
- Corrupt or missing package

## Performance Budgets

- Encrypted index: target below 100KB
- Initial unlock should fetch only manifest and index
- Overview loads thumbnails only
- Article loads one Markdown resource
- Figures use lazy loading
- Display image target: below 500KB
- No plaintext article content in the main JavaScript bundle
- No article-wide eager image decryption

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

## Caching and Nginx

Update `nginx.conf`:

```nginx
location = /portfolio/manifest.json {
    expires epoch;
    add_header Cache-Control "no-cache";
    try_files $uri =404;
}

location ~* ^/portfolio/.*\.enc$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
    try_files $uri =404;
}
```

Ciphertext is safe to cache publicly. Hash-named files make immutable caching appropriate.

## Local Authoring Workflow

Initial setup:

```bash
mkdir -p .portfolio/projects
```

For each project:

1. Create the project directory.
2. Add `project.json`.
3. Write `article.md`.
4. Add screenshots under `images/`.
5. Validate.
6. Build and encrypt.
7. Preview the production package.

Commands:

```bash
bun run portfolio:validate
bun run portfolio:build
bun run rip
```

The normal Vite build does not regenerate private content. It uses the last committed encrypted package.

## Verification Commands

```bash
bun run portfolio:validate
cd apps/web && bun run test
cd apps/web && bun run lint
cd apps/web && bun run format:check
cd apps/web && bun run build
docker build -f Dockerfile .
```

Before committing real content:

```bash
git status --short
git ls-files ".portfolio/**"
```

The second command must return no files.

## Deployment Impact

### Unchanged

- FastAPI
- Redis
- Terminal WebSocket
- Railway API service
- EC2 terminal host
- Pulumi
- Docker Compose
- Existing public content pipeline

### Changed

- Web bundle includes encrypted portfolio resources from `apps/web/public/portfolio`
- Root web image includes those resources
- Nginx receives portfolio-specific cache rules
- Railway web deployment is triggered by changes under `apps/web/**`

No production password secret is required because the password is used only to derive the decryption key in the browser and local package builder.

## Security Properties and Limitations

### Provides

- No plaintext portfolio content in the public repository
- No plaintext portfolio content in the deployed static files
- Authenticated encryption that detects wrong passwords and tampering
- Search-engine resistance for titles, text, and screenshots
- Direct asset URLs that expose ciphertext only

### Does not provide

- Rate limiting against password guesses
- Protection against offline dictionary attacks
- Revocation of old ciphertext from Git history
- Protection after a viewer unlocks and captures content
- Protection from malicious JavaScript already running on the site

Use a generated multi-word passphrase rather than a short memorable password.

If these limitations become unacceptable, migrate to:

```text
Private object storage
  -> FastAPI login and session
  -> authenticated project and asset endpoints
  -> same Projects UI and content renderer
```

Do not attempt that migration by committing plaintext to `apps/api/content`; the repository is public.

## Definition of Done

- Projects app opens from the Dock.
- Password unlock decrypts a static package rather than checking a client-side constant.
- Real source content is untracked.
- Overview clearly organizes projects.
- Project deep links survive unlock.
- Articles are readable and visually restrained.
- Screenshots preserve their complete UI.
- Captions and alt text are present.
- Locking removes decrypted state.
- Existing window behavior remains intact.
- Unit and end-to-end tests pass.
- Web Docker image builds in CI.
- Fixture plaintext leakage check passes.
- Production contains only encrypted portfolio resources.
