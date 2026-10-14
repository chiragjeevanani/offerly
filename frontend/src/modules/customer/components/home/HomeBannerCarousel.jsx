import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { userAPI } from '../../../../api/user.api';

// Admin-managed advertisement posters (Admin -> Home Banners), shown above
// "Select Services". Same frame as the Top Offers carousel.
const SITE_HOSTS = ['getofferly.in', 'www.getofferly.in'];

const openBannerLink = (link, navigate) => {
  if (!link) return;
  if (link.startsWith('/')) return navigate(link);
  try {
    const url = new URL(link);
    if (SITE_HOSTS.includes(url.hostname)) return navigate(url.pathname + url.search);
  } catch {
    return;
  }
  window.open(link, '_blank', 'noopener,noreferrer');
};

const HomeBannerCarousel = ({ city }) => {
  const navigate = useNavigate();
  const [index, setIndex] = useState(0);
  const dragged = useRef(false);

  const { data: banners = [] } = useQuery({
    queryKey: ['homeBanners', city || ''],
    queryFn: async () => (await userAPI.getHomeBanners(city || undefined))?.data || [],
    staleTime: 5 * 60 * 1000,
  });

  const count = banners.length;
  const active = index < count ? index : 0;

  // Auto-advance; restarts whenever the slide changes so a swipe gets a full 4 s.
  useEffect(() => {
    if (count <= 1) return;
    const timer = setTimeout(() => setIndex((i) => (i + 1) % count), 4000);
    return () => clearTimeout(timer);
  }, [active, count]);

  if (!count) return null;
  const banner = banners[active];

  const go = (step) => setIndex((i) => (i + step + count) % count);

  const handleTap = () => {
    if (dragged.current || !banner.link) return;
    userAPI.trackHomeBannerClick(banner._id).catch(() => {});
    openBannerLink(banner.link, navigate);
  };

  return (
    <section className="relative">
      <div className="relative aspect-[16/9] md:aspect-[3/1] md:max-h-[400px] rounded-3xl overflow-hidden shadow-card-hover border border-gray-100 bg-gray-100">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={banner._id}
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.4, ease: 'circOut' }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => { dragged.current = true; }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) go(1);
              else if (info.offset.x > 50) go(-1);
              // Let the click that follows a drag pass before tapping works again.
              setTimeout(() => { dragged.current = false; }, 0);
            }}
            onClick={handleTap}
            className={`absolute inset-0 ${banner.link ? 'cursor-pointer' : ''}`}
          >
            <img
              src={banner.image}
              alt={banner.title || 'Offerly promotion'}
              draggable={false}
              className="w-full h-full object-cover select-none"
            />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <div className="absolute bottom-2.5 inset-x-0 flex justify-center gap-1.5 pointer-events-none">
            {banners.map((b, i) => (
              <span
                key={b._id}
                className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${
                  i === active ? 'bg-white w-5' : 'bg-white/60 w-1.5'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default HomeBannerCarousel;
