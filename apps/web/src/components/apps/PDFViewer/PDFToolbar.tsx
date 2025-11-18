import { AquaButton } from '@/components/ui/aqua';

interface PDFToolbarProps {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

const PDFToolbar = ({ scale, onZoomIn, onZoomOut }: PDFToolbarProps) => {
  return (
    <div className="aqua-menubar flex h-[52px] items-center justify-end gap-2 px-3">
      <AquaButton
        onClick={onZoomOut}
        disabled={scale <= 0.5}
        size="md"
        title="Zoom Out"
        aria-label="Zoom Out"
        className="h-[28px] w-[28px]"
      >
        −
      </AquaButton>
      <AquaButton
        onClick={onZoomIn}
        disabled={scale >= 3.0}
        size="md"
        title="Zoom In"
        aria-label="Zoom In"
        className="h-[28px] w-[28px]"
      >
        +
      </AquaButton>
    </div>
  );
};

export default PDFToolbar;
