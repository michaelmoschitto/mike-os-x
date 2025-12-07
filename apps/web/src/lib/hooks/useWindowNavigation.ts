import { useNavigate } from '@tanstack/react-router';

export const useWindowNavigation = () => {
  const navigate = useNavigate();

  const navigateToWindows = (windowIdentifiers: string[]) => {
    navigate({
      to: '/',
      search: {
        w: windowIdentifiers.length > 0 ? windowIdentifiers : undefined,
        state: undefined,
      },
      replace: false,
    });
  };

  const addWindow = (existingWindows: string[], newWindowId: string) => {
    if (existingWindows.includes(newWindowId)) return;
    navigateToWindows([...existingWindows, newWindowId]);
  };

  const removeWindow = (existingWindows: string[], windowIdToRemove: string) => {
    navigateToWindows(existingWindows.filter((id) => id !== windowIdToRemove));
  };

  return { navigateToWindows, addWindow, removeWindow };
};
