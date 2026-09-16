import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import NotificationsNoneRoundedIcon from '@mui/icons-material/NotificationsNoneRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import SportsEsportsRoundedIcon from '@mui/icons-material/SportsEsportsRounded';
import CasinoRoundedIcon from '@mui/icons-material/CasinoRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import toast from 'react-hot-toast';

// Helper to format opening time tomorrow from merchant.businessHours
export const getTomorrowOpeningTime = (merchant) => {
  if (!merchant) return 'Opens tomorrow at 9:00 AM';
  
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const now = new Date();
  const tomorrowDay = days[(now.getDay() + 1) % 7];
  
  const tomorrowHours = merchant.businessHours?.[tomorrowDay];
  if (tomorrowHours && !tomorrowHours.isClosed && tomorrowHours.open) {
    try {
      const [hStr, mStr] = tomorrowHours.open.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr ? mStr.padStart(2, '0') : '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `Opens tomorrow at ${h}:${m} ${ampm}`;
    } catch {
      return `Opens tomorrow at ${tomorrowHours.open}`;
    }
  }

  // Fallback to today's open time if specified
  const todayHours = merchant.businessHours?.[days[now.getDay()]];
  if (todayHours && !todayHours.isClosed && todayHours.open) {
    try {
      const [hStr, mStr] = todayHours.open.split(':');
      let h = parseInt(hStr, 10);
      const m = mStr ? mStr.padStart(2, '0') : '00';
      const ampm = h >= 12 ? 'PM' : 'AM';
      h = h % 12 || 12;
      return `Opens tomorrow at ${h}:${m} ${ampm}`;
    } catch {
      return `Opens tomorrow at ${todayHours.open}`;
    }
  }

  return 'Opens tomorrow at 9:00 AM';
};

// Fallback curated upcoming offers if an area has few offers
const DEFAULT_UPCOMING_OFFERS = [
  {
    id: 'up-1',
    storeName: 'Royal Biryani & Grills',
    category: 'Food & Dining',
    locality: 'Central Market',
    rating: 4.8,
    offerTitle: 'Flat 40% OFF on Signature Hyderabadi Handi',
    discountBadge: 'FLAT 40% OFF',
    description: 'Pre-book your feast for tomorrow lunch or dinner',
    openingTime: 'Opens tomorrow at 11:00 AM',
    image: '/placeholders/sample-1.webp',
  },
  {
    id: 'up-2',
    storeName: 'The Belgian Waffle & Cafe',
    category: 'Desserts & Bakes',
    locality: 'City Center Mall',
    rating: 4.9,
    offerTitle: 'Buy 1 Get 1 Free on all Belgian Waffles',
    discountBadge: 'BUY 1 GET 1',
    description: 'Fresh warm waffles & specialty artisan coffee',
    openingTime: 'Opens tomorrow at 9:00 AM',
    image: '/placeholders/sample-2.webp',
  },
  {
    id: 'up-3',
    storeName: 'Luxe Salon & Wellness Spa',
    category: 'Saloon & Spa',
    locality: 'Green Park Avenue',
    rating: 4.7,
    offerTitle: 'Flat ₹300 OFF on Hair Spa & Facial Combo',
    discountBadge: 'SAVE ₹300',
    description: 'Early bird weekday relaxation appointment slots',
    openingTime: 'Opens tomorrow at 10:00 AM',
    image: '/placeholders/sample-3.webp',
  },
  {
    id: 'up-4',
    storeName: 'Crispy Crust Gourmet Pizza',
    category: 'Italian & Fast Food',
    locality: 'Sector 14',
    rating: 4.6,
    offerTitle: 'Free Garlic Breadsticks + 20% OFF on Pizzas',
    discountBadge: 'FREE SIDES',
    description: 'Wood-fired oven sourdough crust specials',
    openingTime: 'Opens tomorrow at 11:30 AM',
    image: '/placeholders/sample-4.webp',
  },
];

const AllStoresClosedView = ({
  city = '',
  stores = [],
  rawOffers = [],
  onSimulateToggle,
  isSimulated = false,
}) => {
  const navigate = useNavigate();
  const [activeBannerSlide, setActiveBannerSlide] = useState(0);

  // Store reminder IDs in local storage
  const [reminders, setReminders] = useState(() => {
    try {
      const saved = localStorage.getItem('offerly_store_reminders');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleReminder = (id, storeName, openingTime, e) => {
    e.stopPropagation();
    setReminders((prev) => {
      const next = { ...prev };
      if (next[id]) {
        delete next[id];
        try {
          localStorage.setItem('offerly_store_reminders', JSON.stringify(next));
        } catch {}
        toast(`Reminder cancelled for ${storeName}`, {
          icon: '🔕',
          style: { borderRadius: '14px', fontSize: '13px' },
        });
      } else {
        next[id] = { storeName, openingTime, setAt: new Date().toISOString() };
        try {
          localStorage.setItem('offerly_store_reminders', JSON.stringify(next));
        } catch {}
        toast.success(`Reminder set! We'll alert you when ${storeName} opens tomorrow.`, {
          icon: '🔔',
          style: { borderRadius: '14px', fontSize: '13px', fontWeight: '500' },
          duration: 3500,
        });
      }
      return next;
    });
  };

  // Build 3–5 upcoming offers from available city data or fallbacks
  const upcomingOffers = React.useMemo(() => {
    const list = [];
    const seenStores = new Set();

    // 1. First priority: Real offers available in the city
    if (rawOffers && rawOffers.length > 0) {
      for (const offer of rawOffers) {
        const merchant = offer.merchant || {};
        const storeName = merchant.storeName || offer.merchantName || 'Store';
        if (seenStores.has(storeName)) continue;
        seenStores.add(storeName);

        const discountBadge =
          offer.discountType === 'percentage'
            ? `${offer.discountValue}% FLAT OFF`
            : offer.discountValue === 0
            ? 'FREE'
            : `SAVE ₹${offer.discountValue}`;

        list.push({
          id: offer._id || offer.id || `off-${list.length}`,
          offerId: offer._id || offer.id,
          merchantId: merchant._id || merchant.id || offer.merchantId,
          storeName,
          category: merchant.category || offer.category || 'Specialty Store',
          locality: merchant.locality || merchant.city || city || 'Near You',
          rating: merchant.avgRating || 4.7,
          offerTitle: offer.title || 'Exclusive Member Discount',
          discountBadge,
          description: offer.description || 'Valid on all orders tomorrow',
          openingTime: getTomorrowOpeningTime(merchant),
          image: offer.image || merchant.coverImage || merchant.logo,
          logo: merchant.logo,
          verified: Boolean(merchant.verified),
        });

        if (list.length >= 5) break;
      }
    }

    // 2. Second priority: If fewer than 3, add from city stores
    if (list.length < 3 && stores && stores.length > 0) {
      for (const store of stores) {
        const sName = store.storeName || 'Local Store';
        if (seenStores.has(sName)) continue;
        seenStores.add(sName);

        list.push({
          id: store._id || store.id || `str-${list.length}`,
          merchantId: store._id || store.id,
          storeName: sName,
          category: store.category || 'Store',
          locality: store.locality || store.city || city || 'Near You',
          rating: store.avgRating || 4.8,
          offerTitle: `Flat 25% OFF on Tomorrow's First 50 Orders`,
          discountBadge: '25% FLAT OFF',
          description: `Early morning opening offer at ${sName}`,
          openingTime: getTomorrowOpeningTime(store),
          image: store.coverImage || store.logo,
          logo: store.logo,
          verified: Boolean(store.verified),
        });

        if (list.length >= 5) break;
      }
    }

    // 3. Third priority: If still fewer than 3, supplement with curated default templates
    if (list.length < 3) {
      for (const fallback of DEFAULT_UPCOMING_OFFERS) {
        if (!seenStores.has(fallback.storeName)) {
          seenStores.add(fallback.storeName);
          list.push(fallback);
          if (list.length >= 4) break;
        }
      }
    }

    // Ensure 3 to 5 items
    return list.slice(0, 5);
  }, [rawOffers, stores, city]);

  return (
    <div className="space-y-6 pt-1 pb-10">
      {/* Simulation / Dev toggle banner */}
      {onSimulateToggle && (
        <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-200/80 px-3.5 py-2 rounded-xl text-xs">
          <span className="text-emerald-800 font-medium flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {isSimulated ? 'Closed Stores Preview Active' : 'Simulate Closed State'}
          </span>
          <button
            onClick={onSimulateToggle}
            className="font-semibold text-emerald-700 bg-white border border-emerald-300 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            {isSimulated ? 'Switch to Normal Feed' : 'Preview Closed View'}
          </button>
        </div>
      )}

      {/* 1. Header matching reference image 2 */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center px-3"
      >
        <h2 className="text-[21px] sm:text-2xl font-black text-gray-900 tracking-tight leading-snug">
          Nothing open right now...
        </h2>
        <p
          className="font-['Caveat',_cursive] text-[26px] sm:text-[32px] text-[#008736] font-bold tracking-wide mt-0.5"
          style={{ transform: 'rotate(-1deg)' }}
        >
          but here's what's coming tomorrow!
        </p>
        <p className="text-xs text-gray-500 mt-2 max-w-sm mx-auto leading-relaxed">
          All outlets in {city || 'Digboi'} have closed for today.<br className="hidden xs:inline" /> Discover tomorrow's best deals and set reminders!
        </p>
      </motion.div>

      {/* 2. 3D Closed Store Illustration with Mascot Ovi */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.45, delay: 0.1 }}
        className="relative w-full max-w-[460px] mx-auto px-2 flex justify-center items-center"
      >
        <img
          src="/closed-store-3d.png"
          alt="Nothing open right now - Amazing deals are coming tomorrow!"
          className="w-full h-auto object-contain select-none pointer-events-none filter drop-shadow-sm"
          draggable={false}
        />
      </motion.div>

      {/* 3. 4-Pillar Features Row */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="w-full max-w-[480px] mx-auto px-1"
      >
        <div className="bg-[#EBF8EB] rounded-2xl border border-emerald-100/90 py-3.5 px-1 sm:px-2 grid grid-cols-4 divide-x divide-emerald-200/70 shadow-xs">
          {/* Pillar 1: Set Reminders */}
          <div className="flex flex-col items-center text-center px-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#008736] flex items-center justify-center mb-1.5 shadow-xs">
              <CalendarMonthRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <h5 className="text-[10px] sm:text-[11px] font-black text-gray-900 leading-tight">
              Set Reminders
            </h5>
            <p className="text-[8px] sm:text-[9.5px] text-gray-500 font-medium leading-tight mt-0.5">
              Get notified when stores open
            </p>
          </div>

          {/* Pillar 2: Save Your Favourite Stores */}
          <div className="flex flex-col items-center text-center px-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#008736] flex items-center justify-center mb-1.5 shadow-xs">
              <FavoriteRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <h5 className="text-[10px] sm:text-[11px] font-black text-gray-900 leading-tight">
              Save Your Favourite Stores
            </h5>
            <p className="text-[8px] sm:text-[9.5px] text-gray-500 font-medium leading-tight mt-0.5">
              Never miss a deal
            </p>
          </div>

          {/* Pillar 3: Be the First to Know */}
          <div className="flex flex-col items-center text-center px-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#008736] flex items-center justify-center mb-1.5 shadow-xs">
              <NotificationsActiveRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <h5 className="text-[10px] sm:text-[11px] font-black text-gray-900 leading-tight">
              Be the First to Know
            </h5>
            <p className="text-[8px] sm:text-[9.5px] text-gray-500 font-medium leading-tight mt-0.5">
              New offers every day
            </p>
          </div>

          {/* Pillar 4: Support Local */}
          <div className="flex flex-col items-center text-center px-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100/80 text-[#008736] flex items-center justify-center mb-1.5 shadow-xs">
              <StorefrontRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <h5 className="text-[10px] sm:text-[11px] font-black text-gray-900 leading-tight">
              Support Local
            </h5>
            <p className="text-[8px] sm:text-[9.5px] text-gray-500 font-medium leading-tight mt-0.5">
              A happier {city || 'Digboi'} together!
            </p>
          </div>
        </div>
      </motion.div>

      {/* 4. Green Lucky Reel Reward Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
        className="w-full max-w-[480px] mx-auto px-1 cursor-pointer"
        onClick={() => navigate('/rewards')}
      >
        <div className="relative overflow-hidden rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-[0.99] border border-emerald-500/20 group">
          <img
            src="/lucky-reel-banner-green.png"
            alt="Play the game to win rewards - Try Lucky Reel"
            className="w-full h-auto object-contain block rounded-2xl select-none pointer-events-none"
            draggable={false}
          />
        </div>
      </motion.div>

      {/* 4. UPCOMING OFFERS (Store → Offer → Opening time → “Remind me”) */}
      <motion.section
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.3 }}
        className="pt-2"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div>
            <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
              <LocalOfferRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
              Tomorrow’s Upcoming Offers
            </h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Opening deals coming live tomorrow morning
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-primary-50 text-primary rounded-full border border-primary/20">
            {upcomingOffers.length} Deals
          </span>
        </div>

        {/* List of 3–5 Upcoming Offers */}
        <div className="space-y-3.5">
          {upcomingOffers.map((item, idx) => {
            const isReminderSet = Boolean(reminders[item.id]);

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.35 + idx * 0.05 }}
                onClick={() => {
                  if (item.offerId) navigate(`/offer/${item.offerId}`);
                  else if (item.merchantId) navigate(`/store/${item.merchantId}`);
                }}
                className="bg-white rounded-2xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group active:bg-gray-50/70"
              >
                {/* Store Header: Store Logo + Name + Category + Rating */}
                <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-gray-100/80">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Store Logo or Initial */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-primary-50 border border-primary/20 flex-shrink-0 flex items-center justify-center">
                      {item.logo || item.image ? (
                        <img
                          src={item.logo || item.image}
                          alt={item.storeName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            if (e.currentTarget.nextElementSibling) {
                              e.currentTarget.nextElementSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <span
                        style={{ display: item.logo || item.image ? 'none' : 'flex' }}
                        className="w-full h-full items-center justify-center text-sm font-bold text-primary"
                      >
                        {item.storeName?.charAt(0) || 'S'}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <h4 className="text-sm font-bold text-gray-900 truncate">
                          {item.storeName}
                        </h4>
                        {item.verified && (
                          <VerifiedRoundedIcon sx={{ fontSize: 14 }} className="text-blue-500 flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
                        <span className="capitalize">{item.category}</span>
                        <span>•</span>
                        <span className="truncate">{item.locality}</span>
                      </div>
                    </div>
                  </div>

                  {/* Rating Pill */}
                  <div className="flex items-center gap-1 bg-amber-50 border border-amber-200/80 px-2 py-0.5 rounded-lg flex-shrink-0">
                    <StarRoundedIcon sx={{ fontSize: 13 }} className="text-amber-500" />
                    <span className="text-xs font-bold text-amber-800">{item.rating}</span>
                  </div>
                </div>

                {/* Offer Details: Discount Badge + Title + Description */}
                <div className="py-2.5">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-extrabold text-[10px] tracking-wide border border-emerald-200 uppercase">
                      {item.discountBadge}
                    </span>
                    <span className="text-[10px] text-gray-400 font-medium">Tomorrow's Special</span>
                  </div>
                  <h5 className="text-[13px] font-bold text-gray-900 group-hover:text-primary transition-colors leading-snug">
                    {item.offerTitle}
                  </h5>
                  {item.description && (
                    <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Bottom Bar: Opening Time + Interactive "Remind me" Button */}
                <div className="flex items-center justify-between pt-2.5 border-t border-gray-100/80 gap-2">
                  {/* Opening Time */}
                  <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
                    <AccessTimeRoundedIcon sx={{ fontSize: 15 }} className="text-amber-600" />
                    <span className="text-[11px] md:text-xs font-semibold text-amber-800 bg-amber-50/90 px-2 py-1 rounded-lg border border-amber-200/70">
                      {item.openingTime}
                    </span>
                  </div>

                  {/* "Remind me" Button */}
                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => toggleReminder(item.id, item.storeName, item.openingTime, e)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                      isReminderSet
                        ? 'bg-primary text-white shadow-primary/20 hover:bg-primary-dark'
                        : 'bg-white border border-primary/40 text-primary hover:bg-primary-50 active:bg-primary-100'
                    }`}
                  >
                    {isReminderSet ? (
                      <>
                        <NotificationsActiveRoundedIcon sx={{ fontSize: 14 }} className="animate-bounce" />
                        <span>Reminder Set! 🔔</span>
                      </>
                    ) : (
                      <>
                        <NotificationsNoneRoundedIcon sx={{ fontSize: 15 }} />
                        <span>Remind me</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
};

export default AllStoresClosedView;
