import Dock from '@/components/Dock';
import MenuBar from '@/components/MenuBar';
import DesktopIcons from '@/components/DesktopIcons';

const Desktop = () => {
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
      </div>

      <Dock />
    </div>
  );
};

export default Desktop;
