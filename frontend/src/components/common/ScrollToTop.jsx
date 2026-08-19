import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component ensures that upon navigation, the window
 * and any nested scrollable containers (e.g. AppLayout main element)
 * are smoothly reset to the top.
 */
const ScrollToTop = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Reset window scroll
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // Reset scrollable main container in AppLayout
    const scrollContainers = document.querySelectorAll('main, .overflow-y-auto');
    scrollContainers.forEach((container) => {
      container.scrollTop = 0;
    });
  }, [pathname, search]);

  return null;
};

export default ScrollToTop;
