const createAquaScrollbar = (target, isDocument = false) => {
  const scrollElement = isDocument ? document.scrollingElement : target;
  const scrollEventTarget = isDocument ? window : target;
  const classTarget = isDocument ? document.documentElement : target;

  const scrollbar = document.createElement('div');
  scrollbar.className = 'aqua-scrollbar';
  scrollbar.setAttribute('role', 'scrollbar');
  scrollbar.setAttribute('aria-label', isDocument ? 'Page scroll' : 'Projects scroll');
  scrollbar.setAttribute('aria-orientation', 'vertical');
  scrollbar.tabIndex = 0;
  scrollbar.innerHTML = `
    <button class="aqua-scrollbar__button aqua-scrollbar__button--up" type="button" aria-label="Scroll up"></button>
    <div class="aqua-scrollbar__track">
      <div class="aqua-scrollbar__thumb" aria-hidden="true"></div>
    </div>
    <button class="aqua-scrollbar__button aqua-scrollbar__button--down" type="button" aria-label="Scroll down"></button>
  `;

  document.body.append(scrollbar);
  classTarget.classList.add('custom-scrollbar-active');
  document.documentElement.classList.add('custom-scrollbar-active');

  const track = scrollbar.querySelector('.aqua-scrollbar__track');
  const thumb = scrollbar.querySelector('.aqua-scrollbar__thumb');
  const upButton = scrollbar.querySelector('.aqua-scrollbar__button--up');
  const downButton = scrollbar.querySelector('.aqua-scrollbar__button--down');

  const getMetrics = () => {
    const clientHeight = isDocument ? window.innerHeight : target.clientHeight;
    return {
      clientHeight,
      scrollHeight: scrollElement.scrollHeight,
      scrollTop: scrollElement.scrollTop,
    };
  };

  const setScrollTop = (scrollTop, behavior = 'auto') => {
    if (isDocument) {
      window.scrollTo({ top: scrollTop, behavior });
      return;
    }

    target.scrollTo({ top: scrollTop, behavior });
  };

  const updatePosition = () => {
    const bounds = isDocument
      ? { top: 5, right: window.innerWidth - 3, height: window.innerHeight - 10 }
      : target.getBoundingClientRect();
    const scrollbarWidth = scrollbar.offsetWidth || 19;

    scrollbar.style.top = `${Math.max(5, bounds.top)}px`;
    scrollbar.style.left = `${document.documentElement.clientWidth - scrollbarWidth - 3}px`;
    scrollbar.style.height = `${Math.max(80, bounds.height)}px`;
  };

  const updateThumb = () => {
    updatePosition();

    const { clientHeight, scrollHeight, scrollTop } = getMetrics();
    const maxScroll = Math.max(0, scrollHeight - clientHeight);
    const trackHeight = track.clientHeight;
    const thumbHeight = Math.max(42, Math.round(trackHeight * (clientHeight / scrollHeight)));
    const maxTravel = Math.max(0, trackHeight - thumbHeight);
    const thumbTop = maxScroll === 0 ? 0 : Math.round((scrollTop / maxScroll) * maxTravel);

    scrollbar.hidden = maxScroll <= 1;
    thumb.style.height = `${Math.min(trackHeight, thumbHeight)}px`;
    thumb.style.transform = `translateY(${thumbTop}px)`;
    scrollbar.setAttribute('aria-valuemin', '0');
    scrollbar.setAttribute('aria-valuemax', String(Math.round(maxScroll)));
    scrollbar.setAttribute('aria-valuenow', String(Math.round(scrollTop)));
  };

  const scrollByStep = (direction) => {
    const { clientHeight, scrollTop } = getMetrics();
    setScrollTop(scrollTop + direction * Math.max(72, clientHeight * 0.14), 'smooth');
  };

  upButton.addEventListener('click', () => scrollByStep(-1));
  downButton.addEventListener('click', () => scrollByStep(1));

  scrollbar.addEventListener('keydown', (event) => {
    const { clientHeight, scrollTop } = getMetrics();
    const maxScroll = Math.max(0, scrollElement.scrollHeight - clientHeight);

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      scrollByStep(-1);
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      scrollByStep(1);
      return;
    }

    if (event.key === 'PageUp') {
      event.preventDefault();
      setScrollTop(scrollTop - clientHeight * 0.8, 'smooth');
      return;
    }

    if (event.key === 'PageDown') {
      event.preventDefault();
      setScrollTop(scrollTop + clientHeight * 0.8, 'smooth');
      return;
    }

    if (event.key === 'Home') {
      event.preventDefault();
      setScrollTop(0, 'smooth');
      return;
    }

    if (event.key === 'End') {
      event.preventDefault();
      setScrollTop(maxScroll, 'smooth');
    }
  });

  track.addEventListener('pointerdown', (event) => {
    if (event.target === thumb) return;

    const thumbBounds = thumb.getBoundingClientRect();
    const direction = event.clientY < thumbBounds.top ? -1 : 1;
    const { clientHeight, scrollTop } = getMetrics();
    setScrollTop(scrollTop + direction * clientHeight * 0.8, 'smooth');
  });

  thumb.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    thumb.setPointerCapture(event.pointerId);

    const startY = event.clientY;
    const startScrollTop = getMetrics().scrollTop;

    const handlePointerMove = (moveEvent) => {
      const { clientHeight, scrollHeight } = getMetrics();
      const maxScroll = Math.max(0, scrollHeight - clientHeight);
      const maxTravel = Math.max(1, track.clientHeight - thumb.clientHeight);
      setScrollTop(startScrollTop + ((moveEvent.clientY - startY) / maxTravel) * maxScroll);
    };

    const handlePointerUp = (upEvent) => {
      if (thumb.hasPointerCapture(upEvent.pointerId)) {
        thumb.releasePointerCapture(upEvent.pointerId);
      }

      thumb.removeEventListener('pointermove', handlePointerMove);
      thumb.removeEventListener('pointerup', handlePointerUp);
      thumb.removeEventListener('pointercancel', handlePointerUp);
    };

    thumb.addEventListener('pointermove', handlePointerMove);
    thumb.addEventListener('pointerup', handlePointerUp);
    thumb.addEventListener('pointercancel', handlePointerUp);
  });

  scrollEventTarget.addEventListener('scroll', updateThumb, { passive: true });
  window.addEventListener('resize', updateThumb);
  window.addEventListener('load', updateThumb);

  const resizeObserver = new ResizeObserver(updateThumb);
  resizeObserver.observe(isDocument ? document.body : target);

  requestAnimationFrame(updateThumb);
};

const projectsPane = document.querySelector('.project-scroll');

if (projectsPane && window.matchMedia('(min-width: 861px)').matches) {
  createAquaScrollbar(projectsPane);
} else if (!document.querySelector('.site--home')) {
  createAquaScrollbar(document.documentElement, true);
}
