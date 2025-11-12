import TextEditWindow from '@/components/apps/TextEdit/TextEditWindow';
import DesktopIcons from '@/components/system/DesktopIcons';
import Dock from '@/components/system/Dock';
import MenuBar from '@/components/system/MenuBar';
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
        <DesktopIcons />

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
