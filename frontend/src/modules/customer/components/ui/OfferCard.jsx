import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState } from 'react';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import { userAPI } from '../../../../api/user.api';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

import { getOptimizedImageUrl } from '../../../../utils/cloudinaryUtils';
import { useOfferImpression } from '../../../../hooks/useOfferImpression';

const OfferCard = ({ offer, variant = 'list', onSaveToggle, viewSource = 'feed' }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, refreshUser } = useApp();
  const offerId = offer._id || offer.id;

  // Counts towards the merchant's "offer views" once the card has been half visible
  // for a second - see hooks/useOfferImpression.
  const impressionRef = useOfferImpression(offerId, viewSource);

  // Optimize image URL
  const optimizedImage = getOptimizedImageUrl(offer.image, { width: 400, height: 300 });

  const [isSaved, setIsSaved] = useState(() => {
    // Check if offer is in user's savedOffers
    return user?.savedOffers?.includes(offerId) || false;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Use merchant data from API (offer.merchant) or fallback to merchantId
  const merchant = offer.merchant || { storeName: offer.merchantName || 'Store', verified: false, distance: 'N/A' };
  const isMerchantOpen = merchant?.isOpen !== false;

  const handleSave = async (e) => {
    e.stopPropagation();
    
    if (!isLoggedIn) {
      toast.error('Please login to save offers');
      navigate('/login');
      return;
    }
    
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const response = await userAPI.toggleSavedOffer(offerId);
      setIsSaved(response.isSaved);
      
      // Sync global user state immediately to avoid desync on navigation
      await refreshUser();
      
      toast.success(response.isSaved ? 'Offer saved!' : 'Offer removed', {
        icon: response.isSaved ? '🔖' : '✅',
        duration: 2000,
      });
      onSaveToggle?.();
    } catch (error) {
      console.error('Failed to save offer:', error);
      toast.error('Failed to save offer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const discountLabel =
    offer.discountType === 'percentage'
      ? `${offer.discountValue}% OFF`
      : offer.discountValue === 0
      ? 'FREE'
      : `₹${offer.discountValue} OFF`;

  // ── Grid variant (Trending/Discover) ──────────────────────────────────────
  if (variant === 'grid') {
    return (
      <motion.div
        ref={impressionRef}
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/offer/${offerId}`)}
        className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer w-full h-[160px] flex flex-col group active:bg-gray-50 transition-colors ${!isMerchantOpen ? 'opacity-80' : ''}`}
      >
        <div className="relative aspect-[16/10] flex-shrink-0 overflow-hidden">
          <img
            src={optimizedImage}
            alt={offer.title}
            className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${!isMerchantOpen ? 'grayscale' : ''}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60';
            }}
          />
          {!isMerchantOpen && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <span className="bg-gray-900/90 text-white text-[9px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-md shadow-md">
                Closed for now
              </span>
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1">
             <span className="bg-primary text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md">
               {discountLabel}
             </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleSave}
            className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md border border-white/20"
          >
            {isSaved
              ? <BookmarkRoundedIcon sx={{ fontSize: 15 }} className="text-primary" />
              : <BookmarkBorderRoundedIcon sx={{ fontSize: 15 }} className="text-gray-400" />
            }
          </motion.button>
        </div>
        <div className={`p-2.5 flex flex-col justify-between flex-1 space-y-1 ${!isMerchantOpen ? 'grayscale' : ''}`}>
          <div className="space-y-0.5">
            <p className="text-[11px] font-semibold text-primary line-clamp-1">{merchant?.storeName}</p>
            <h3 className="text-xs font-semibold text-gray-900 leading-tight line-clamp-2">{offer.title}</h3>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-auto">
            <div className="flex items-center gap-1">
               <LocationOnRoundedIcon sx={{ fontSize: 12 }} className="text-gray-400" />
               <span className="text-[11px] font-normal text-gray-500">{merchant?.distance || 'N/A'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── List variant (Nearby/Deals) ─────────────────────────────────────────────
  return (
    <motion.div
      ref={impressionRef}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/offer/${offerId}`)}
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer active:bg-gray-50 transition-colors ${!isMerchantOpen ? 'opacity-80' : ''}`}
    >
      <div className="flex gap-3 p-2.5">
        <div className="relative flex-shrink-0 w-18 h-18 overflow-hidden rounded-xl border border-gray-100 bg-gray-100">
          <img
            src={optimizedImage}
            alt={offer.title}
            className={`w-full h-full object-cover ${!isMerchantOpen ? 'grayscale' : ''}`}
            loading="lazy"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&auto=format&fit=crop&q=60';
            }}
          />
          {!isMerchantOpen ? (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center p-1">
              <span className="bg-gray-900/90 text-white text-[7px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md text-center leading-tight">
                Closed for now
              </span>
            </div>
          ) : (
            <div className="absolute top-0 left-0">
               <span className="bg-primary text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-br-lg shadow-sm">
                 {discountLabel}
               </span>
            </div>
          )}
        </div>
        <div className={`flex-1 min-w-0 flex flex-col justify-center py-0.5 ${!isMerchantOpen ? 'grayscale' : ''}`}>
          <div className="space-y-0.5">
             <div className="flex items-start justify-between gap-2">
               <p className="text-sm font-semibold text-gray-900 line-clamp-1 flex-1">
                 {offer.title}
               </p>
               <motion.button
                 whileTap={{ scale: 0.8 }}
                 onClick={handleSave}
                 className="pt-0.5"
               >
                 {isSaved
                   ? <BookmarkRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
                   : <BookmarkBorderRoundedIcon sx={{ fontSize: 18 }} className="text-gray-300" />
                 }
               </motion.button>
             </div>
             <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-primary">{merchant?.storeName}</p>
                <div className="w-1 h-1 bg-gray-300 rounded-full" />
                <div className="flex items-center gap-1">
                  <LocationOnRoundedIcon sx={{ fontSize: 12 }} className="text-gray-400" />
                  <span className="text-xs font-normal text-gray-500">{merchant?.distance}</span>
                </div>
             </div>
             {!isMerchantOpen && (
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-0.5">Closed for now</p>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OfferCard;
