import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import KeyboardArrowDownRoundedIcon from '@mui/icons-material/KeyboardArrowDownRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import RestaurantRoundedIcon from '@mui/icons-material/RestaurantRounded';
import ContentCutRoundedIcon from '@mui/icons-material/ContentCutRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import FitnessCenterRoundedIcon from '@mui/icons-material/FitnessCenterRounded';
import BuildRoundedIcon from '@mui/icons-material/BuildRounded';
import LocalCafeRoundedIcon from '@mui/icons-material/LocalCafeRounded';
import MedicalServicesRoundedIcon from '@mui/icons-material/MedicalServicesRounded';
import MoreHorizRoundedIcon from '@mui/icons-material/MoreHorizRounded';
import LocalOfferRoundedIcon from '@mui/icons-material/LocalOfferRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';

import { useApp } from '../../context/AppContext';
import BottomSheet from '../../components/ui/BottomSheet';
import StoreCard from '../../components/ui/StoreCard';
import PageTransition from '../../components/ui/PageTransition';
import { categoryAPI } from '../../../../api/category.api';
import { offerAPI } from '../../../../api/offer.api';
import { merchantAPI } from '../../../../api/merchant.api';
import { cityAPI } from '../../../../api/city.api';
import { adAPI } from '../../../../api/adRequest.api';
import OfferCard from '../../components/ui/OfferCard';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// Reusable animated Section Header
const SectionHeader = ({ title, icon: Icon, onAction, actionText = 'View All' }) => (
  <div className="flex items-center justify-between mb-4 px-1">
    <div className="flex items-center gap-1.5">
      {Icon && <Icon sx={{ fontSize: 20 }} className="text-primary" />}
      <h2 className="text-lg font-bold text-text-primary tracking-tight">{title}</h2>
    </div>
    {onAction && (
      <motion.button
        whileHover={{ x: 3 }}
        onClick={onAction}
        className="text-xs text-primary font-semibold flex items-center bg-primary-light/50 px-2 py-1 rounded-lg transition-colors hover:bg-primary-light"
      >
        {actionText} <ChevronRightRoundedIcon sx={{ fontSize: 16 }} />
      </motion.button>
    )}
  </div>
);

// Modern Category Icon mapper with proper MUI icons
const getIconForCategory = (label) => {
  const map = {
    'Food': RestaurantRoundedIcon,
    'Saloon': ContentCutRoundedIcon,
    'Shops': ShoppingCartRoundedIcon,
    'Gym': FitnessCenterRoundedIcon,
    'Services': BuildRoundedIcon,
    'Cafe': LocalCafeRoundedIcon,
    'Health': MedicalServicesRoundedIcon,
    'Other': StorefrontRoundedIcon,
  };
  return map[label] || StorefrontRoundedIcon;
};

// Map colors for categories to make them look vibrant and distinct
const getColorForCategory = (label) => {
  const map = {
    'Food': 'text-orange-500 bg-orange-50 hover:border-orange-200',
    'Saloon': 'text-purple-500 bg-purple-50 hover:border-purple-200',
    'Shops': 'text-blue-500 bg-blue-50 hover:border-blue-200',
    'Gym': 'text-red-500 bg-red-50 hover:border-red-200',
    'Services': 'text-amber-500 bg-amber-50 hover:border-amber-200',
    'Cafe': 'text-amber-700 bg-amber-50 hover:border-amber-200',
    'Health': 'text-teal-500 bg-teal-50 hover:border-teal-200',
  };
  return map[label] || 'text-primary bg-primary-light hover:border-primary/30';
};

const Home = () => {
  const navigate = useNavigate();
  const { user, selectedCity, setSelectedCity, setSelectedCategory } = useApp();
  const useUnifiedFeed = import.meta.env.VITE_USE_UNIFIED_FEED !== 'false';
  const [categories, setCategories] = useState([]);
  const [citySheetOpen, setCitySheetOpen] = useState(false);
  const [availableCities, setAvailableCities] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [cityRequired, setCityRequired] = useState(false);
  
  // Sections data
  const [featuredBanners, setFeaturedBanners] = useState([]);
  const [trendingOffers, setTrendingOffers] = useState([]);
  const [nearbyOffers, setNearbyOffers] = useState([]);
  const [recommendedOffers, setRecommendedOffers] = useState([]);
  const [mostPopulatedStores, setMostPopulatedStores] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Carousel state
  const [currentSlide, setCurrentSlide] = useState(0);

  // 1. Get User Location on Mount
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserCoords({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Location access denied or unavailable:', error.message);
        }
      );
    }
  }, []);

  // 2. Load basic items (Categories & Cities) that don't depend on selection
  useEffect(() => {
    const loadBasics = async () => {
      try {
        const [catRes, cityRes] = await Promise.all([
          categoryAPI.getAll(),
          cityAPI.getAll()
        ]);
        setCategories(catRes.categories || []);
        setAvailableCities(cityRes.cities || []);
      } catch (error) {
        console.error('Failed to load basics:', error);
      }
    };
    loadBasics();
  }, []);

  // 3. MAIN DATA SYNC: Reactive to selectedCity and userCoords
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const resolvedCity =
          selectedCity !== 'Select City' ? selectedCity : (user?.city || '');

        if (!resolvedCity) {
          setCityRequired(true);
          setFeaturedBanners([]);
          setTrendingOffers([]);
          setNearbyOffers([]);
          setRecommendedOffers([]);
          setMostPopulatedStores([]);
          setIsLoading(false);
          return;
        }

        setCityRequired(false);

        // Base query parameters
        const baseParams = { 
          city: resolvedCity,
          userLat: userCoords?.lat,
          userLng: userCoords?.lng
        };

        if (useUnifiedFeed) {
          const feedResponse = await offerAPI.getFeed(baseParams);
          const buckets = feedResponse?.buckets || {};

          setFeaturedBanners(feedResponse?.banners || []);
          setTrendingOffers(buckets.trendingOffers || []);
          setNearbyOffers(buckets.nearYouOffers || []);
          setMostPopulatedStores(buckets.mostPopulatedStores || []);
          setRecommendedOffers(buckets.recommendedOffers || []);
        } else {
          // Legacy fallback mode
          const [
            adsResponse,
            trendingOffersResponse, 
            nearbyOffersResponse,
            trendingMerchantsResponse
          ] = await Promise.all([
            adAPI.getApproved({ city: baseParams.city }),
            offerAPI.getAll({ ...baseParams, status: 'active', isTrending: true, limit: 5 }),
            offerAPI.getAll({ ...baseParams, status: 'active', limit: 4 }),
            merchantAPI.getAll({ 
              ...baseParams, 
              status: 'approved',
              sortBy: 'totalRedemptions',
              sortOrder: 'desc',
              limit: 3
            }),
          ]);

          const allAds = adsResponse.ads || [];
          const trendingOffersData = trendingOffersResponse.offers || [];
          const nearbyOffersData = nearbyOffersResponse.offers || [];
          const trendingStores = trendingMerchantsResponse.merchants || [];

          const adBanners = allAds.map(ad => ({
            ...ad,
            id: ad._id,
            title: ad.title || `${ad.storeName} Promotion`,
            image: ad.image,
            merchantId: ad.merchantId,
            isAd: true
          }));

          const organicTrending = trendingOffersData.map(o => ({
            ...o,
            id: o._id,
            isAd: false
          }));

          setFeaturedBanners([...adBanners, ...organicTrending].slice(0, 5));
          setTrendingOffers(trendingOffersData);
          setNearbyOffers(nearbyOffersData);
          setMostPopulatedStores(trendingStores);
          setRecommendedOffers([]);
        }

      } catch (error) {
        console.error('Failed to sync home page data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [selectedCity, user?.city, userCoords, useUnifiedFeed]);

  // 4. Auto-sliding Carousel interval
  useEffect(() => {
    if (featuredBanners.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredBanners.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [featuredBanners.length]);

  const handleCategoryClick = (name) => {
    setSelectedCategory(name);
    navigate('/explore');
  };

  const displayCity = selectedCity !== 'Select City' ? selectedCity : (user?.city || 'Select City');

  return (
    <PageTransition>
      <div className="px-4 md:px-6 py-3 space-y-5 pb-8 bg-background min-h-screen">

        {/* 1. Clean Search Bar */}
        <motion.section
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="pt-0"
        >
          <button
            onClick={() => navigate('/search')}
            className="w-full flex items-center gap-3 bg-white border border-gray-200/80 rounded-2xl px-4 py-3 shadow-sm transition-all hover:border-primary/40 hover:shadow-md group active:scale-[0.99]"
          >
            <SearchRoundedIcon sx={{ fontSize: 20 }} className="text-gray-400 group-hover:text-primary transition-colors" />
            <div className="flex-1 text-left">
               <p className="text-sm font-normal text-gray-400">Search places, offers or services</p>
            </div>
          </button>
        </motion.section>

        {!isLoading && cityRequired && (
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-2xl p-4"
          >
            <h3 className="text-sm font-semibold text-amber-900">Select your city to see local offers</h3>
            <p className="text-xs text-amber-700 mt-1">
              Feed is city-based. Please choose your city to load Trending, Near You and Recommended offers.
            </p>
            <button
              onClick={() => setCitySheetOpen(true)}
              className="mt-3 text-xs font-semibold bg-amber-600 text-white px-3.5 py-2 rounded-xl"
            >
              Select City
            </button>
          </motion.section>
        )}

        {/* 2. Categories Section */}
        <motion.section variants={containerVariants} initial="hidden" animate="visible">
          <div className="flex items-center justify-between mb-3 px-0.5">
             <h2 className="text-base font-bold text-gray-900 tracking-tight">Select Services</h2>
             <button onClick={() => navigate('/explore')} className="text-xs font-semibold text-primary hover:underline">View All</button>
          </div>
          <div className="flex gap-3.5 overflow-x-auto scrollbar-hide -mx-4 md:-mx-6 px-4 md:px-6 pb-2 snap-x min-h-[82px] items-start">
            {/* Logic: Show 5 + More on mobile, 7 + More on desktop */}
            {categories.length > 0 ? (
              [...categories.slice(0, window.innerWidth < 768 ? 5 : 7), { _id: 'more', name: 'More' }].map((cat, idx) => {
                const Icon = cat._id === 'more' ? MoreHorizRoundedIcon : getIconForCategory(cat.name);
                const customColors = cat._id === 'more' 
                  ? 'text-gray-500 bg-gray-100/80' 
                  : getColorForCategory(cat.name);

                return (
                  <motion.button
                    key={cat._id || idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.04 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => cat._id === 'more' ? navigate('/explore') : handleCategoryClick(cat.name)}
                    className="flex flex-col items-center gap-1.5 flex-shrink-0 snap-start group w-[60px]"
                  >
                    <div className={`w-13 h-13 p-3 rounded-2xl shadow-sm flex items-center justify-center border border-gray-100 transition-all duration-300 group-hover:shadow-md group-hover:scale-105 ${customColors}`}>
                      <Icon sx={{ fontSize: 22 }} className="transition-transform group-hover:scale-110" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 text-center line-clamp-1 w-full px-0.5 capitalize">
                      {cat.name}
                    </span>
                  </motion.button>
                );
              })
            ) : (
              // Placeholder to prevent layout shift
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-[60px] h-20 bg-gray-100/70 rounded-2xl animate-pulse flex-shrink-0" />
              ))
            )}
          </div>
        </motion.section>

        {/* Claim Milestones & Scratch Cards Quick Banner */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div
            onClick={() => navigate('/rewards')}
            className="flex items-center justify-between bg-gradient-to-r from-primary-50 via-emerald-50 to-primary-50/50 border border-primary/20 rounded-2xl p-3.5 shadow-sm hover:shadow-md cursor-pointer transition-all active:scale-[0.99] group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md shadow-primary/25 group-hover:scale-105 transition-transform">
                <EmojiEventsRoundedIcon sx={{ fontSize: 22 }} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-gray-900 leading-snug flex items-center gap-1.5">
                  Claim Milestones & Rewards
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-primary text-white uppercase">
                    Win Cards
                  </span>
                </h4>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Level up with every claimed offer and scratch to win!
                </p>
              </div>
            </div>
            <div className="flex items-center text-primary font-semibold text-xs group-hover:translate-x-1 transition-transform">
              <ChevronRightRoundedIcon sx={{ fontSize: 20 }} />
            </div>
          </div>
        </motion.section>

        {/* 3. Top Promotions (High-End Carousel) */}
        {!isLoading && featuredBanners.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative"
          >
            <div className="flex items-center justify-between mb-2 px-0.5">
               <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <LocalOfferRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
                  Top Offers
               </h2>
               <div className="flex gap-1.5 items-center">
                  {featuredBanners.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentSlide(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentSlide ? 'bg-primary w-6' : 'bg-gray-200 w-1.5 hover:bg-gray-300'
                      }`}
                    />
                  ))}
               </div>
            </div>

            <div className="relative aspect-[16/9] md:aspect-[3/1] md:max-h-[400px] rounded-3xl overflow-hidden shadow-card-hover border border-gray-100 group">
              <AnimatePresence mode="wait">
                  <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, scale: 1.05 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: "circOut" }}
                  className="absolute inset-0 cursor-pointer"
                  onClick={() => {
                    const banner = featuredBanners[currentSlide];
                    if (banner.isAd) navigate(`/store/${banner.merchantId}`);
                    else navigate(`/offer/${banner._id || banner.id}`);
                  }}
                >
                  <img
                    src={featuredBanners[currentSlide].image || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80'}
                    alt={featuredBanners[currentSlide].title}
                    className="w-full h-full object-cover transition-transform duration-[4000ms] group-hover:scale-105"
                    onError={(e) => {
                      e.currentTarget.src = 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&auto=format&fit=crop&q=80';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
                    <div className="flex items-center gap-2 mb-2">
                       <span className="px-3 py-1 rounded-full text-[10px] font-semibold tracking-wide backdrop-blur-md border border-white/20 shadow-lg bg-primary text-white">
                          Premium Offer
                       </span>
                    </div>
                    <h3 className="text-white text-lg md:text-2xl font-bold leading-tight line-clamp-1 drop-shadow-md">
                      {featuredBanners[currentSlide].title}
                    </h3>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.section>
        )}

        {/* 4. Trending Offers */}
        {!isLoading && trendingOffers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="flex items-center justify-between mb-2.5 px-0.5">
               <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <TrendingUpRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
                  Trending Nearby
               </h2>
               <button onClick={() => navigate('/explore')} className="text-xs font-semibold text-primary hover:underline">View All</button>
            </div>
            <div className="flex overflow-x-auto scrollbar-hide gap-3.5 pb-2 snap-x px-0.5">
              {trendingOffers.map((offer) => (
                <div key={offer._id || offer.id} className="w-[140px] flex-shrink-0 snap-start">
                  <OfferCard offer={offer} variant="grid" />
                </div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 5. Most Populated Stores */}
        {!isLoading && mostPopulatedStores.length > 0 && (
          <motion.section
             initial={{ opacity: 0, y: 16 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between mb-2.5 px-0.5">
               <h2 className="text-base font-bold text-gray-900 tracking-tight flex items-center gap-2">
                  <StorefrontRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
                  Nearby Outlets
               </h2>
               <button onClick={() => navigate('/explore')} className="text-xs font-semibold text-primary hover:underline">View All</button>
            </div>
            <div className="space-y-3">
              {mostPopulatedStores.map((merchant, idx) => (
                <motion.div
                  key={merchant._id || merchant.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.45 + idx * 0.05 }}
                >
                  <StoreCard 
                    merchant={merchant} 
                    variant="row" 
                    offerCount={merchant.offerCount || 0} 
                  />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 6. Nearby Offers */}
        {!isLoading && nearbyOffers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
          >
            <SectionHeader title="Deals Near You" onAction={() => navigate('/explore')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {nearbyOffers.map((offer, idx) => (
                <motion.div
                  key={offer._id || offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + idx * 0.07 }}
                >
                  <OfferCard offer={offer} variant="list" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* 7. Recommended Offers */}
        {!isLoading && recommendedOffers.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <SectionHeader title="Recommended for You" onAction={() => navigate('/explore')} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recommendedOffers.map((offer, idx) => (
                <motion.div
                  key={offer._id || offer.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.52 + idx * 0.06 }}
                >
                  <OfferCard offer={offer} variant="list" />
                </motion.div>
              ))}
            </div>
          </motion.section>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div className="space-y-12 pt-4">
             <div className="h-44 bg-gray-100 rounded-[1.5rem] animate-pulse" />
             <div className="space-y-4">
                <div className="h-6 w-32 bg-gray-100 rounded animate-pulse" />
                <div className="flex gap-4">
                   <div className="h-32 w-[260px] bg-gray-100 rounded-2xl animate-pulse" />
                   <div className="h-32 w-[260px] bg-gray-100 rounded-2xl animate-pulse" />
                </div>
             </div>
          </div>
        )}

      </div>

      {/* City selection bottom sheet */}
      <BottomSheet
        isOpen={citySheetOpen}
        onClose={() => setCitySheetOpen(false)}
        title="Select City"
      >
        <div className="p-4 grid grid-cols-2 gap-3 pb-10">
          {availableCities.map((city) => (
            <motion.button
              key={city._id || city.id}
              whileTap={{ scale: 0.95 }}
              onClick={() => { setSelectedCity(city.name); setCitySheetOpen(false); }}
              className={`flex items-center justify-center gap-2 p-3.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                displayCity === city.name
                  ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/10'
                  : 'border-border text-text-secondary hover:border-gray-300'
              }`}
            >
              <LocationOnRoundedIcon sx={{ fontSize: 18 }} className={displayCity === city.name ? 'text-primary' : 'text-gray-400'} />
              {city.name}
            </motion.button>
          ))}
        </div>
      </BottomSheet>
    </PageTransition>
  );
};

export default Home;
