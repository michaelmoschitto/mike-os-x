import DesktopIcons from '@/components/DesktopIcons';
import Dock from '@/components/Dock';
import MenuBar from '@/components/MenuBar';
import TextEditWindow from '@/components/TextEditWindow';
import { useWindowStore } from '@/stores/useWindowStore';

const Desktop = () => {
  const windows = useWindowStore((state) => state.windows);
  const activeWindowId = useWindowStore((state) => state.activeWindowId);

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MenuBar />

      {/* Desktop background - starts below menu bar */}
      <div
        className="absolute top-[22px] right-0 bottom-0 left-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url(/imgs/osx-10-light.png)' }}
      >
        {/* Desktop Icons */}
        <DesktopIcons />

        {/* Windows */}
        {windows
          .filter((w) => !w.isMinimized)
          .map((window) => (
            <TextEditWindow
              key={window.id}
              window={window}
              isActive={window.id === activeWindowId}
            />
          ))}
      </div>

      <Dock />
    </div>
  );
};

export default Desktop;
