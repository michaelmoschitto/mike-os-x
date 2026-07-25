import { createFileRoute, redirect } from '@tanstack/react-router';

import { initializeContentIndex, useContentIndex } from '@/lib/contentIndex';
import { resolveUrlToContent } from '@/lib/urlResolver';
import { normalizePathForRouting } from '@/lib/utils';
import { showCompactNotification } from '@/stores/notificationHelpers';

const PATH_REDIRECTS: Record<string, string> = {
  resume: 'pdfviewer:resume',
};

export const Route = createFileRoute('/$')({
  loader: async ({ params }) => {
    const path = params._splat || '';
    if (path === '') {
      throw redirect({ to: '/', search: { w: undefined, state: undefined } });
    }

    // Check for path-based redirects first
    if (PATH_REDIRECTS[path]) {
      const currentParams = new URLSearchParams(window.location.search);
      const existingWindows = currentParams.getAll('w');
      const allWindows = [...existingWindows, PATH_REDIRECTS[path]];

      throw redirect({
        to: '/',
        search: { w: allWindows, state: undefined },
      });
    }

    if (path === 'projects' || path.startsWith('projects/')) {
      const projectSlug = path === 'projects' ? '' : path.substring('projects/'.length);
      const isValidSlug = projectSlug === '' || /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(projectSlug);

      if (!isValidSlug) {
        throw redirect({ to: '/', search: { w: undefined, state: undefined } });
      }

      const currentParams = new URLSearchParams(window.location.search);
      const existingWindows = currentParams.getAll('w').filter((id) => !id.startsWith('projects'));
      const projectIdentifier = projectSlug ? `projects:${projectSlug}` : 'projects';

      throw redirect({
        to: '/',
        search: { w: [...existingWindows, projectIdentifier], state: undefined },
      });
    }

    // Initialize content index if needed
    const indexState = useContentIndex.getState();
    if (!indexState.isIndexed) {
      await initializeContentIndex();
    }

    try {
      // Try to resolve the path to content
      const resolved = await resolveUrlToContent(path);

      // Build the appropriate window identifier based on app type
      const appType = resolved.entry.appType;
      const normalizedPath = normalizePathForRouting(path);

      let windowIdentifier: string;

      if (appType === 'photos') {
        // Photos use format: photos:album:photoName (without extension)
        const pathParts = normalizedPath.split('/').filter(Boolean);
        if (pathParts.length >= 3 && pathParts[0] === 'dock' && pathParts[1] === 'photos') {
          const albumName = pathParts[2];
          const photoName = pathParts[pathParts.length - 1].replace(
            /\.(jpg|jpeg|png|gif|webp|svg)$/i,
            ''
          );
          windowIdentifier = `photos:${albumName}:${photoName}`;
        } else {
          const photoName = pathParts[pathParts.length - 1].replace(
            /\.(jpg|jpeg|png|gif|webp|svg)$/i,
            ''
          );
          windowIdentifier = `photos:desktop:${photoName}`;
        }
      } else if (appType === 'pdfviewer') {
        windowIdentifier = `pdfviewer:${normalizedPath}`;
      } else if (appType === 'projects') {
        const projectSlug = resolved.entry.metadata.slug?.replace(/^\/?projects\//, '');
        windowIdentifier = projectSlug ? `projects:${projectSlug}` : 'projects';
      } else {
        // markdown, text, and other content
        windowIdentifier = `textedit:${normalizedPath}`;
      }

      // Preserve existing windows from URL and add new one
      const currentParams = new URLSearchParams(window.location.search);
      const existingWindows = currentParams.getAll('w');
      const allWindows = [...existingWindows, windowIdentifier];

      throw redirect({
        to: '/',
        search: { w: allWindows, state: undefined },
      });
    } catch (error) {
      // If it's a redirect, re-throw it
      if (error && typeof error === 'object' && 'to' in error) {
        throw error;
      }

      // File not found - show notification and redirect to home
      setTimeout(() => {
        showCompactNotification('File Not Found', `The path "/${path}" does not exist.`, {
          autoDismiss: 4000,
        });
      }, 100);

      throw redirect({ to: '/', search: { w: undefined, state: undefined } });
    }
  },
  component: PathComponent,
});

function PathComponent() {
  // This component should never render since we always redirect
  return null;
}
