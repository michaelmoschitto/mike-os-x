const MobileBanner = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black p-8 text-center text-white md:hidden">
      <div className="max-w-md">
        <p className="text-lg font-medium">
          this site is quite literally a mac desktop, please view on a larger screen.
        </p>
      </div>
    </div>
  );
};

export default MobileBanner;
