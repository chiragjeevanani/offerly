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
    image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60',
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
    image: 'https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=500&auto=format&fit=crop&q=60',
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
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&auto=format&fit=crop&q=60',
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
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&auto=format&fit=crop&q=60',
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

      {/* 1. Header with exact requested text matching reference image */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center px-3"
      >
        <h2 className="text-[19px] md:text-2xl font-extrabold text-gray-900 tracking-tight leading-snug">
          Nothing open right now…
        </h2>
        <p
          className="font-['Caveat',_cursive] text-2xl md:text-3xl text-[#d94848] font-bold tracking-wide mt-0.5"
          style={{ transform: 'rotate(-1deg)' }}
        >
          but here’s what’s coming tomorrow
        </p>
        <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
          All outlets in {city || 'this area'} have closed for today. Discover tomorrow's best deals and set reminders!
        </p>
      </motion.div>

      {/* 2. Custom Illustration (High-fidelity vector matching the client's reference) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="relative max-w-sm mx-auto px-4 flex justify-center items-center"
      >
        <div className="w-full max-w-[340px] aspect-[1.25/1] relative flex items-center justify-center">
          <svg
            viewBox="0 0 400 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full drop-shadow-sm select-none"
          >
            <defs>
              {/* Background Glow */}
              <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fdf2f8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>

              {/* Awning gradient */}
              <linearGradient id="awningGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f472b6" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>

              {/* Shop booth gradient */}
              <linearGradient id="boothGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#fce7f3" />
                <stop offset="100%" stopColor="#fbcfe8" />
              </linearGradient>

              {/* Bike seat/box gradient */}
              <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e293b" />
                <stop offset="100%" stopColor="#0f172a" />
              </linearGradient>
            </defs>

            {/* Ambient Background Circle */}
            <circle cx="200" cy="160" r="140" fill="url(#bgGlow)" />

            {/* Ground Line */}
            <line x1="40" y1="285" x2="360" y2="285" stroke="#e2e8f0" strokeWidth="3" strokeLinecap="round" />

            {/* 1. STORE BOOTH (Right side) */}
            <g id="storeBooth">
              {/* Main Wall */}
              <rect x="210" y="90" width="165" height="195" rx="14" fill="url(#boothGrad)" stroke="#f472b6" strokeWidth="2.5" />

              {/* Store Window Counter cutout */}
              <rect x="228" y="125" width="130" height="95" rx="10" fill="#ffffff" stroke="#fbcfe8" strokeWidth="2" />
              <rect x="228" y="180" width="130" height="40" fill="#fef3c7" />

              {/* Awning Canopy */}
              <path
                d="M195 90 C 205 65, 230 60, 290 60 C 350 60, 380 65, 390 90 Z"
                fill="url(#awningGrad)"
              />
              {/* Scalloped Awning trim */}
              <path
                d="M195 90 Q 207 100, 219 90 Q 231 100, 243 90 Q 255 100, 267 90 Q 279 100, 291 90 Q 303 100, 315 90 Q 327 100, 339 90 Q 351 100, 363 90 Q 375 100, 390 90 L 390 85 L 195 85 Z"
                fill="#ffffff"
                opacity="0.9"
              />

              {/* Shopkeeper inside */}
              <g id="shopkeeper">
                {/* Body */}
                <path d="M272 155 Q 292 145, 312 155 L 316 182 L 268 182 Z" fill="#6366f1" />
                {/* Apron collar */}
                <polygon points="292,156 284,166 300,166" fill="#ffffff" />
                {/* Head */}
                <circle cx="292" cy="138" r="14" fill="#6b3710" />
                {/* Hair */}
                <path d="M280 134 Q 292 122, 304 134 Q 307 140, 292 131 Q 278 140, 280 134 Z" fill="#1e1e24" />
                {/* Smiling Eyes */}
                <circle cx="288" cy="138" r="1.5" fill="#ffffff" />
                <circle cx="296" cy="138" r="1.5" fill="#ffffff" />
                {/* Friendly Smile */}
                <path d="M289 144 Q 292 147, 295 144" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                {/* Hand waving */}
                <path d="M266 165 Q 250 155, 252 145" stroke="#6b3710" strokeWidth="4" strokeLinecap="round" />
              </g>

              {/* Closed Hanging Sign */}
              <g id="closedSign" transform="translate(240, 195)">
                <rect x="0" y="0" width="48" height="20" rx="4" fill="#ffffff" stroke="#ef4444" strokeWidth="1.5" />
                <text x="24" y="14" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">CLOSED</text>
              </g>

              {/* Takeaway bag on counter */}
              <rect x="325" y="170" width="22" height="28" rx="3" fill="#f59e0b" />
              <path d="M331 170 Q 336 163, 341 170" stroke="#b45309" strokeWidth="1.8" fill="none" />
            </g>

            {/* 2. DELIVERY BIKE & RIDER (Front / Center Left) */}
            <g id="deliveryBike">
              {/* Back Wheel */}
              <circle cx="120" cy="255" r="28" fill="#1e293b" />
              <circle cx="120" cy="255" r="18" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
              <circle cx="120" cy="255" r="6" fill="#64748b" />

              {/* Front Wheel */}
              <circle cx="230" cy="255" r="28" fill="#1e293b" />
              <circle cx="230" cy="255" r="18" fill="#ffffff" stroke="#cbd5e1" strokeWidth="3" />
              <circle cx="230" cy="255" r="6" fill="#64748b" />

              {/* Scooter Chassis */}
              <path
                d="M120 255 L 148 230 L 195 230 L 222 200 L 230 255"
                stroke="#ec4899"
                strokeWidth="7"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
              <path
                d="M140 230 Q 170 215, 205 230"
                fill="#fce7f3"
                stroke="#ec4899"
                strokeWidth="2"
              />

              {/* Scooter Handlebars & Headlight */}
              <line x1="216" y1="205" x2="210" y2="185" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <line x1="202" y1="185" x2="218" y2="185" stroke="#334155" strokeWidth="4" strokeLinecap="round" />
              <circle cx="220" cy="188" r="6" fill="#fbbf24" stroke="#d97706" strokeWidth="1.5" />

              {/* Large Delivery Box on Back */}
              <rect x="95" y="172" width="46" height="46" rx="8" fill="url(#boxGrad)" stroke="#334155" strokeWidth="2" />
              {/* Box Logo / Accent (Bag Icon) */}
              <circle cx="118" cy="195" r="12" fill="#ec4899" />
              <path d="M114 195 Q 118 190, 122 195" stroke="#ffffff" strokeWidth="1.8" fill="none" />
              <rect x="113" y="195" width="10" height="7" rx="1.5" fill="#ffffff" />

              {/* Rider Standing / Leaning */}
              <g id="rider">
                {/* Legs */}
                <path d="M165 200 L 160 250 L 150 282" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <path d="M178 200 L 180 245 L 195 282" stroke="#1e293b" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                {/* Rider Jacket / Body */}
                <path d="M155 160 L 185 160 L 182 205 L 157 205 Z" fill="#ef4444" rx="4" />
                {/* White Stripe on jacket */}
                <line x1="170" y1="160" x2="170" y2="205" stroke="#ffffff" strokeWidth="2" />
                {/* Rider Arms on Handle */}
                <path d="M160 168 L 185 180 L 205 186" stroke="#ef4444" strokeWidth="5" strokeLinecap="round" fill="none" />
                {/* Helmet */}
                <circle cx="170" cy="142" r="14" fill="#ef4444" />
                {/* Visor */}
                <path d="M173 138 Q 183 142, 175 149" stroke="#1e293b" strokeWidth="4" strokeLinecap="round" fill="none" />
              </g>
            </g>

            {/* Stars / Night Embellishments */}
            <circle cx="80" cy="70" r="3" fill="#fbbf24" opacity="0.8" />
            <circle cx="140" cy="50" r="2.5" fill="#fbbf24" opacity="0.7" />
            <circle cx="50" cy="110" r="2" fill="#fbbf24" opacity="0.6" />
            {/* Crescent Moon */}
            <path
              d="M75 50 A 12 12 0 0 0 88 65 A 15 15 0 1 1 75 50 Z"
              fill="#fbbf24"
              opacity="0.85"
            />
          </svg>
        </div>
      </motion.div>

      {/* 3. Gamification Banners (Matching the 2 cards in client's reference screenshot) */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-3"
      >
        {/* Banner 1: Play Game to Win Rewards (Blue/Indigo Gradient) */}
        <div
          onClick={() => navigate('/rewards')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-600 to-blue-600 text-white p-4 shadow-md shadow-blue-500/15 cursor-pointer hover:shadow-lg transition-all active:scale-[0.99] group border border-blue-400/30"
        >
          {/* Subtle wave background overlay */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="max-w-[62%]">
              <h4 className="text-[15px] font-bold leading-tight drop-shadow-sm">
                Play the game to win rewards
              </h4>
              <p className="text-xs text-blue-100/90 mt-0.5 font-medium">
                Win cashbacks, coins & exclusive perks
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/rewards');
                }}
                className="mt-3 px-5 py-1.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 text-xs font-extrabold shadow-md shadow-amber-500/30 hover:brightness-105 active:scale-95 transition-all flex items-center gap-1"
              >
                Play <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Game / Slot Machine Graphic */}
            <div className="w-24 h-20 rounded-xl bg-blue-900/60 border border-blue-300/40 p-2 shadow-inner flex flex-col justify-center items-center relative flex-shrink-0 group-hover:scale-105 transition-transform">
              <div className="flex items-center gap-1.5">
                <span className="text-lg">💎</span>
                <span className="text-lg">🍬</span>
                <span className="text-lg">⭐</span>
              </div>
              <div className="w-full h-1 bg-amber-400/80 rounded-full mt-2" />
              <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mt-1">
                LUCKY REEL
              </span>
            </div>
          </div>
        </div>

        {/* Banner 2: Spin the Wheel to Win Rewards (Purple/Magenta Gradient) */}
        <div
          onClick={() => navigate('/rewards')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-700 via-fuchsia-600 to-purple-600 text-white p-4 shadow-md shadow-purple-500/15 cursor-pointer hover:shadow-lg transition-all active:scale-[0.99] group border border-purple-400/30"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_60%)] pointer-events-none" />

          <div className="flex items-center justify-between relative z-10">
            <div className="max-w-[62%]">
              <h4 className="text-[15px] font-bold leading-tight drop-shadow-sm">
                Spin the wheel to win rewards
              </h4>
              <p className="text-xs text-purple-100/90 mt-0.5 font-medium">
                Claim vouchers & surprise milestone gifts
              </p>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/rewards');
                }}
                className="mt-3 px-5 py-1.5 rounded-full bg-gradient-to-b from-amber-300 to-amber-400 text-amber-950 text-xs font-extrabold shadow-md shadow-amber-500/30 hover:brightness-105 active:scale-95 transition-all flex items-center gap-1"
              >
                Spin <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
              </button>
            </div>

            {/* Spin Wheel Graphic */}
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-fuchsia-900 to-purple-800 border-2 border-amber-300/80 p-1.5 shadow-lg flex items-center justify-center relative flex-shrink-0 group-hover:rotate-12 transition-transform duration-500">
              <div className="w-full h-full rounded-full border border-dashed border-white/60 flex items-center justify-center">
                <span className="text-2xl animate-spin-slow">🎡</span>
              </div>
              <div className="absolute -top-1 w-2.5 h-2.5 bg-amber-400 rotate-45 rounded-sm" />
            </div>
          </div>
        </div>

        {/* Carousel indicator dots (matching the 2 dots in client's screenshot) */}
        <div className="flex justify-center items-center gap-1.5 pt-1">
          <div className="w-2 h-2 rounded-full bg-gray-800 transition-all" />
          <div className="w-2 h-2 rounded-full bg-gray-300 transition-all" />
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
