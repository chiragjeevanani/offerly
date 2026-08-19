import { useEffect, useRef } from 'react';
import { trackOfferView } from '../utils/offerViewTracker';

// How much of a card has to be on screen, for how long, before it counts as seen.
// Both thresholds exist to keep fast scrolling from inflating the merchant's numbers.
const VISIBILITY_RATIO = 0.5;
const DWELL_MS = 1000;

/**
 * Counts an offer as viewed once it has been at least half visible for a full second.
 *
 * Returns a ref to attach to the card's root element:
 *
 *   const ref = useOfferImpression(offer._id, 'feed');
 *   return <div ref={ref}>…</div>;
 */
export const useOfferImpression = (offerId, source = 'feed') => {
  const elementRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || !offerId) return undefined;

    // Older browsers simply don't contribute impressions rather than breaking.
    if (typeof IntersectionObserver === 'undefined') {
      return undefined;
    }

    let dwellTimer = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= VISIBILITY_RATIO) {
          if (dwellTimer) return;
          dwellTimer = setTimeout(() => {
            trackOfferView(offerId, source);
            // One impression per mount is enough; the tracker dedupes globally too.
            observer.disconnect();
          }, DWELL_MS);
        } else if (dwellTimer) {
          clearTimeout(dwellTimer);
          dwellTimer = null;
        }
      },
      { threshold: [VISIBILITY_RATIO] }
    );

    observer.observe(element);

    return () => {
      if (dwellTimer) clearTimeout(dwellTimer);
      observer.disconnect();
    };
  }, [offerId, source]);

  return elementRef;
};

/**
 * Counts a view immediately - for full-screen surfaces like the offer detail page,
 * where arriving at all is the intent signal.
 */
export const useOfferViewOnMount = (offerId, source = 'detail') => {
  useEffect(() => {
    if (offerId) {
      trackOfferView(offerId, source);
    }
  }, [offerId, source]);
};

export default useOfferImpression;
