import { useRef } from 'react';

const DOUBLE_CLICK_THRESHOLD_MS = 300;

interface UseDoubleClickOptions {
  onClick: () => void;
  onDoubleClick: () => void;
  threshold?: number;
}

export const useDoubleClick = ({
  onClick,
  onDoubleClick,
  threshold = DOUBLE_CLICK_THRESHOLD_MS,
}: UseDoubleClickOptions) => {
  const lastClickTime = useRef(0);

  const handleClick = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    const now = Date.now();
    const timeSinceLastClick = now - lastClickTime.current;

    if (timeSinceLastClick < threshold && timeSinceLastClick > 0) {
      onDoubleClick();
    } else {
      onClick();
    }

    lastClickTime.current = now;
  };

  return handleClick;
};
