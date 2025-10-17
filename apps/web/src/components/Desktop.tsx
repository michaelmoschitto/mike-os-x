import Dock from '@/components/Dock';
import MenuBar from '@/components/MenuBar';

const Desktop = () => {
  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <MenuBar />

      {/* Desktop background - starts below menu bar */}
      <div className="absolute top-[22px] right-0 bottom-0 left-0 bg-gradient-to-br from-[#4a8fd9] via-[#5b9fe5] to-[#6db1eb]">
        {/* Aqua wallpaper effect with subtle aurora-like gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_rgba(255,255,255,0.15)_0%,_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_rgba(74,143,217,0.4)_0%,_transparent_50%)]" />
        <div className="absolute top-1/4 left-1/3 h-[500px] w-[500px] rounded-full bg-[#7eb9ed]/20 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-[400px] w-[400px] rounded-full bg-[#4a90e2]/15 blur-3xl" />
      </div>

      <Dock />

      {/* Main desktop area - will contain windows and desktop icons later */}
      <div className="pt-6" />
    </div>
  );
};

export default Desktop;
