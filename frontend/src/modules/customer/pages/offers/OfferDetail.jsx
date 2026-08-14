import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import StarBorderRoundedIcon from '@mui/icons-material/StarBorderRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import BookmarkRoundedIcon from '@mui/icons-material/BookmarkRounded';
import BookmarkBorderRoundedIcon from '@mui/icons-material/BookmarkBorderRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import { offerAPI } from '../../../../api/offer.api';
import { userAPI } from '../../../../api/user.api';
import { bookingAPI } from '../../../../api/booking.api';
import { cartAPI } from '../../../../api/cart.api';
import { reviewAPI } from '../../../../api/review.api';
import PageTransition from '../../components/ui/PageTransition';
import { useApp } from '../../context/AppContext';
import toast from 'react-hot-toast';

const OfferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoggedIn, user, refreshUser } = useApp();

  const [offer, setOffer] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOffer = async () => {
      try {
        const response = await offerAPI.getById(id);
        if (response && response.offer) {
          const o = response.offer;
          setOffer(o);
          setMerchant(o.merchant);
          
          const merchantId = o.merchant?._id || o.merchantId;
          if (merchantId) {
            try {
              const reviewRes = await reviewAPI.getMerchantReviews(merchantId);
              setReviews(reviewRes.data?.slice(0, 3) || []);
            } catch (err) {
              console.error('Failed to fetch reviews:', err);
            }
          }
          
          setIsSaved(user?.savedOffers?.includes(id) || false);
        }
      } catch (error) {
        console.error('Failed to fetch offer:', error);
        toast.error('Offer not found');
        navigate('/explore');
      } finally {
        setLoading(false);
      }
    };
    
    loadOffer();
  }, [id, navigate, user]);

  const handleSave = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to save offers');
      navigate('/login');
      return;
    }
    
    if (isSaving) return;
    
    setIsSaving(true);
    try {
      const response = await userAPI.toggleSavedOffer(id);
      setIsSaved(response.isSaved);
      
      // Sync global user state immediately
      await refreshUser();
      
      toast.success(response.isSaved ? 'Offer saved!' : 'Offer removed', {
        icon: response.isSaved ? '🔖' : '✅',
        duration: 2000,
      });
    } catch (error) {
      console.error('Failed to save offer:', error);
      toast.error('Failed to save offer. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRedeem = async () => {
    if (!isLoggedIn) {
      toast.error('Please login to redeem offers');
      navigate('/login');
      return;
    }
    
    setIsRedeeming(true);
    try {
      const merchantId = merchant?._id || merchant?.id || offer.merchantId;
      
      if (offer.productId) {
        // Add to cart and navigate to CartView
        await cartAPI.updateCart(merchantId, offer.productId, 1);
        toast.success('Added to your booking cart!');
        navigate('/cart');
      } else {
        // Generic offer - redirect to store to add items
        toast.success('Offer applied! Add items to redeem.', { icon: '✨' });
        navigate(`/store/${merchantId}`, { state: { appliedOffer: offer } });
      }
    } catch (error) {
      console.error('Redemption error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to process. Please try again.');
    } finally {
      setIsRedeeming(false);
    }
  };

  const discountLabel =
    offer?.discountType === 'percentage'
      ? `${offer.discountValue}% OFF`
      : offer?.discountValue === 0 ? 'FREE' : `₹${offer?.discountValue} OFF`;

  const validTo = offer ? new Date(offer.validTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const redemptionPercent = offer ? Math.round((offer.currentRedemptions / offer.maxRedemptions) * 100) : 0;

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (!offer) return null;

  return (
    <PageTransition>
      <div className="pb-32">
        {/* Hero image */}
        <div className="relative h-56 sm:h-64 md:h-72 lg:h-80 max-w-4xl mx-auto rounded-b-[2.5rem] overflow-hidden shadow-lg">
          <img src={offer.image} alt={offer.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          {/* Discount badge */}
          <div className="absolute top-4 left-4">
            <span className="bg-primary text-white text-xl font-bold px-4 py-2 rounded-2xl shadow-lg">
              {discountLabel}
            </span>
          </div>
          {/* Save button */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={handleSave}
            className="absolute top-4 right-4 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center"
          >
            {isSaved
              ? <BookmarkRoundedIcon sx={{ fontSize: 22 }} className="text-primary" />
              : <BookmarkBorderRoundedIcon sx={{ fontSize: 22 }} className="text-gray-600" />}
          </motion.button>
          {/* Category badge */}
          <div className="absolute bottom-4 left-4">
            <span className="bg-white/20 backdrop-blur-sm text-white text-xs font-medium px-3 py-1 rounded-full border border-white/30">
              {offer.category}
            </span>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Title + store */}
          <div>
            <h1 className="text-xl font-bold text-text-primary">{offer.title}</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <button 
                onClick={() => navigate(`/store/${merchant?._id || merchant?.id}`)} 
                className="text-primary text-sm font-semibold"
              >
                {merchant?.storeName}
              </button>
              {merchant?.verified && (
                <VerifiedRoundedIcon sx={{ fontSize: 15 }} className="text-primary" />
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-background rounded-2xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <StarRoundedIcon sx={{ fontSize: 16 }} className="text-amber-400" />
                <span className="text-sm font-bold text-text-primary">{merchant?.avgRating}</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">{merchant?.totalReviews} reviews</p>
            </div>
            <div className="flex-1 bg-background rounded-2xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <LocationOnRoundedIcon sx={{ fontSize: 16 }} className="text-primary" />
                <span className="text-sm font-bold text-text-primary">{merchant?.distance}</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">Away</p>
            </div>
            <div className="flex-1 bg-background rounded-2xl px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1">
                <AccessTimeRoundedIcon sx={{ fontSize: 16 }} className="text-amber-500" />
                <span className="text-sm font-bold text-text-primary">Till</span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">{validTo}</p>
            </div>
          </div>

          {/* Redemption progress */}
          {offer.maxRedemptions > 0 && (
            <div className="bg-background rounded-2xl p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-text-primary">Redemptions</span>
                <span className="text-xs text-text-secondary">
                  {offer.currentRedemptions}/{offer.maxRedemptions}
                </span>
              </div>
              <div className="h-2 bg-border rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${redemptionPercent}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                  className="h-full bg-primary rounded-full"
                />
              </div>
              <p className="text-xs text-text-secondary mt-1.5">
                {offer.maxRedemptions - offer.currentRedemptions} redemptions left
              </p>
            </div>
          )}

          {/* Description */}
          <div className="bg-background rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-2">About this Offer</h3>
            <p className="text-sm text-text-secondary leading-relaxed">{offer.description}</p>
          </div>

          {/* Terms */}
          <div className="bg-background rounded-2xl p-4">
            <h3 className="text-sm font-semibold text-text-primary mb-3 flex items-center gap-1.5">
              <InfoOutlinedIcon sx={{ fontSize: 16 }} className="text-primary" />
              Terms & Conditions
            </h3>
            <ul className="space-y-2">
              {offer.terms.map((term, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-text-secondary">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  {term}
                </li>
              ))}
            </ul>
          </div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="section-title">Customer Reviews</h3>
                <button
                  onClick={() => navigate(`/store/${merchant?._id || merchant?.id}`)}
                  className="text-xs text-primary font-semibold"
                >
                  View all
                </button>
              </div>
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-background rounded-2xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-text-primary">{review.customerName}</p>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          s <= review.rating
                            ? <StarRoundedIcon key={s} sx={{ fontSize: 14 }} className="text-amber-400" />
                            : <StarBorderRoundedIcon key={s} sx={{ fontSize: 14 }} className="text-gray-300" />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Booking Bar - Premium & Responsive */}
      <div className="fixed bottom-20 lg:bottom-6 left-0 right-0 lg:left-auto lg:right-1/2 lg:translate-x-1/2 lg:w-full lg:max-w-2xl z-30 px-4 lg:px-0">
        <div className="bg-white/90 backdrop-blur-xl border border-gray-100 lg:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-3.5 flex items-center gap-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-[#3D7A4F]" />
          <div className="flex-1 pl-2">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Benefit</p>
            <p className="text-xl font-black text-[#3D7A4F] leading-none tracking-tight">{discountLabel}</p>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleRedeem}
            disabled={isRedeeming}
            className="flex items-center justify-center gap-3 bg-[#3D7A4F] text-white font-black text-[11px] uppercase tracking-[0.2em] px-8 py-3.5 rounded-xl shadow-lg shadow-[#3D7A4F]/20 active:scale-95 transition-all"
          >
            {isRedeeming ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
                Book Now
              </>
            )}
          </motion.button>
        </div>
      </div>
    </PageTransition>
  );
};

export default OfferDetail;
