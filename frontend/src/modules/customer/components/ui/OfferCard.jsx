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

const OfferCard = ({ offer, variant = 'list', onSaveToggle }) => {
  const navigate = useNavigate();
  const { user, isLoggedIn, refreshUser } = useApp();
  const offerId = offer._id || offer.id;
  
  // Optimize image URL
  const optimizedImage = getOptimizedImageUrl(offer.image, { width: 400, height: 300 });

  const [isSaved, setIsSaved] = useState(() => {
    // Check if offer is in user's savedOffers
    return user?.savedOffers?.includes(offerId) || false;
  });
  const [isSaving, setIsSaving] = useState(false);

  // Use merchant data from API (offer.merchant) or fallback to merchantId
  const merchant = offer.merchant || { storeName: offer.merchantName || 'Store', verified: false, distance: 'N/A' };

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
        whileTap={{ scale: 0.97 }}
        onClick={() => navigate(`/offer/${offerId}`)}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer w-full h-[160px] flex flex-col group active:bg-gray-50 transition-colors"
      >
        <div className="relative aspect-[16/10] flex-shrink-0 overflow-hidden">
          <img
            src={optimizedImage}
            alt={offer.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            loading="lazy"
          />
          <div className="absolute top-2 left-2 flex flex-col gap-1">
             <span className="bg-[#3D7A4F] text-white text-[9px] font-black px-2 py-1 rounded-md shadow-lg uppercase tracking-widest">
               {discountLabel}
             </span>
          </div>
          <motion.button
            whileTap={{ scale: 0.8 }}
            onClick={handleSave}
            className="absolute top-2 right-2 w-7 h-7 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20"
          >
            {isSaved
              ? <BookmarkRoundedIcon sx={{ fontSize: 14 }} className="text-[#3D7A4F]" />
              : <BookmarkBorderRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400" />
            }
          </motion.button>
        </div>
        <div className="p-2.5 flex flex-col justify-between flex-1 space-y-1">
          <div className="space-y-0.5">
            <p className="text-[8px] font-black text-[#3D7A4F] uppercase tracking-widest line-clamp-1">{merchant?.storeName}</p>
            <h3 className="text-[10px] font-black text-gray-900 leading-tight line-clamp-2 uppercase tracking-tight">{offer.title}</h3>
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-50 mt-auto">
            <div className="flex items-center gap-1">
               <LocationOnRoundedIcon sx={{ fontSize: 8 }} className="text-gray-300" />
               <span className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{merchant?.distance || 'N/A'}</span>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ── List variant (Nearby/Deals) ─────────────────────────────────────────────
  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/offer/${offerId}`)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer active:bg-gray-50 transition-colors"
    >
      <div className="flex gap-3 p-2">
        <div className="relative flex-shrink-0 w-16 h-16 overflow-hidden rounded-xl border border-gray-100">
          <img
            src={optimizedImage}
            alt={offer.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-0 left-0">
             <span className="bg-[#3D7A4F] text-white text-[7px] font-black px-1.5 py-0.5 rounded-br-lg shadow-md uppercase">
               {discountLabel}
             </span>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-center py-0.5">
          <div className="space-y-0.5">
             <div className="flex items-start justify-between gap-2">
               <p className="text-[11px] font-black text-gray-900 line-clamp-1 uppercase tracking-tight flex-1">
                 {offer.title}
               </p>
               <motion.button
                 whileTap={{ scale: 0.8 }}
                 onClick={handleSave}
                 className="pt-0.5"
               >
                 {isSaved
                   ? <BookmarkRoundedIcon sx={{ fontSize: 16 }} className="text-[#3D7A4F]" />
                   : <BookmarkBorderRoundedIcon sx={{ fontSize: 16 }} className="text-gray-300" />
                 }
               </motion.button>
             </div>
             <div className="flex items-center gap-2">
                <p className="text-[9px] font-black text-[#3D7A4F] uppercase tracking-widest">{merchant?.storeName}</p>
                <div className="w-1 h-1 bg-gray-100 rounded-full" />
                <div className="flex items-center gap-1">
                  <LocationOnRoundedIcon sx={{ fontSize: 10 }} className="text-gray-300" />
                  <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{merchant?.distance}</span>
                </div>
             </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default OfferCard;
