import { useState } from 'react';

import type { ProjectSummary } from '@/lib/projectsContent';
import { resolveProjectAssetUrl } from '@/lib/projectsContent';

export interface ScreenshotDetails {
  src: string;
  alt: string;
  caption?: string;
}

interface CaseStudyFigureProps {
  project: ProjectSummary;
  src?: string;
  alt?: string;
  caption?: string;
  onOpen: (screenshot: ScreenshotDetails) => void;
}

const CaseStudyFigure = ({
  project,
  src,
  alt,
  caption,
  onOpen,
}: CaseStudyFigureProps) => {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = src ? resolveProjectAssetUrl(project, src) : null;
  const accessibleAlt = alt?.trim() || 'Case study interface screenshot';

  if (!imageUrl || imageFailed) {
    return (
      <figure className="my-7">
        <div className="flex min-h-[180px] items-center justify-center rounded-[4px] border border-[#c7c7c7] bg-[#f1f2f4]">
          <p className="font-ui text-[12px] text-[var(--color-text-secondary)]">
            Screenshot unavailable
          </p>
        </div>
        {caption ? (
          <figcaption className="font-ui mt-2 text-center text-[11px] leading-4 text-[var(--color-text-secondary)]">
            {caption}
          </figcaption>
        ) : null}
      </figure>
    );
  }

  const screenshot = { src: imageUrl, alt: accessibleAlt, caption };

  return (
    <figure className="my-7">
      <button
        type="button"
        className="block w-full cursor-zoom-in overflow-hidden rounded-[4px] border border-[#b8b8b8] bg-[#eef0f3] shadow-[0_2px_8px_rgba(0,0,0,0.12)] focus-visible:ring-2 focus-visible:ring-[var(--color-aqua-blue)] focus-visible:ring-offset-2 focus-visible:outline-none"
        aria-label={`Open full-size screenshot: ${accessibleAlt}`}
        onClick={() => onOpen(screenshot)}
      >
        <img
          src={imageUrl}
          alt={accessibleAlt}
          className="h-auto max-h-[720px] w-full object-contain"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      </button>
      {caption ? (
        <figcaption className="font-ui mt-2 text-center text-[11px] leading-4 text-[var(--color-text-secondary)]">
          {caption}
        </figcaption>
      ) : null}
    </figure>
  );
};

export default CaseStudyFigure;
