import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import { 
  getMerchantById, 
  getOffersByMerchant, 
  getReviewsByMerchant,
  getProductsByMerchant,
} from '../../data/localStorageUtils';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { merchantAPI } from '../../../../api/merchant.api';
import { productAPI } from '../../../../api/product.api';
import { offerAPI } from '../../../../api/offer.api';
import { reviewAPI } from '../../../../api/review.api';
import { cartAPI } from '../../../../api/cart.api';
import PageTransition from '../../components/ui/PageTransition';
import { checkIsServiceStore, shouldShowVegIndicator } from '../../../../utils/storeTypeHelper';
import ConfirmDialog from '../../../../components/ui/ConfirmDialog';
import { useOfferImpression } from '../../../../hooks/useOfferImpression';

// Offer chips in the store header. Split out so each one can carry its own
// impression observer - a customer who lands here has genuinely seen these offers.
const StoreOfferTag = ({ offer }) => {
  const ref = useOfferImpression(offer._id || offer.id, 'store');

  return (
    <div
      ref={ref}
      className="whitespace-nowrap px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold border border-green-100"
    >
      ✨ {offer.title}
    </div>
  );
};

const StoreProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [merchant, setMerchant] = useState(null);
  const [products, setProducts] = useState([]);
  const [offers, setOffers] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [cart, setCart] = useState({ merchantId: null, items: [] });
  const [activeTab, setActiveTab] = useState('menu');
  const [loading, setLoading] = useState(true);
  const [showHours, setShowHours] = useState(false);
  const [pendingCartAction, setPendingCartAction] = useState(null);

  const getStatus = () => {
    if (!merchant || !merchant.businessHours) return { isOpen: false, label: 'Hours Not Set' };
    
    const now = new Date();
    const day = now.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const hours = merchant.businessHours[day];
    
    if (!hours || hours.isClosed || !hours.open || !hours.close) {
      return { isOpen: false, label: 'Closed Today' };
    }
    
    try {
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [openH, openM] = hours.open.split(':').map(Number);
      const [closeH, closeM] = hours.close.split(':').map(Number);
      
      const openTime = (openH || 0) * 60 + (openM || 0);
      const closeTime = (closeH || 0) * 60 + (closeM || 0);
      
      if (currentTime >= openTime && currentTime < closeTime) {
        return { isOpen: true, label: `Open now (Closes at ${hours.close})` };
      }
      
      if (currentTime < openTime) {
        return { isOpen: false, label: `Closed (Opens at ${hours.open})` };
      }
      
      return { isOpen: false, label: 'Closed for the day' };
    } catch {
      return { isOpen: false, label: 'Closed Today' };
    }
  };

  const status = getStatus();

  const isServiceBased = useMemo(() => {
    return checkIsServiceStore(merchant, products);
  }, [merchant, products]);

  const catalogTabLabel = isServiceBased ? 'Services' : 'Products';

  useEffect(() => {
    const loadStoreData = async () => {
      setLoading(true);
      try {
        const merchantResponse = await merchantAPI.getById(id);
        
        if (merchantResponse && merchantResponse.merchant) {
          const m = merchantResponse.merchant;
          
          if (m.status !== 'approved') {
            toast.error('This merchant is no longer available.');
            navigate('/explore');
            return;
          }
          
          setMerchant(m);
          
          // Parallel fetch for products, offers, reviews and cart
          const [productsRes, offersRes, reviewRes, cartRes] = await Promise.all([
            productAPI.getByMerchant(id).catch(err => ({ products: [] })),
            offerAPI.getAll({ merchantId: id, status: 'active' }).catch(err => ({ offers: [] })),
            reviewAPI.getMerchantReviews(id).catch(err => ({ data: [] })),
            cartAPI.getCart().catch(err => ({ data: null }))
          ]);

          setProducts(productsRes.products || []);
          setOffers(offersRes.offers || []);
          setReviews(reviewRes.data || []);
          
          // Only set cart if it belongs to this merchant
          const backendCart = cartRes.data;
          if (backendCart && backendCart.merchantId && 
              (backendCart.merchantId._id || backendCart.merchantId) === id) {
            setCart({
              merchantId: backendCart.merchantId._id || backendCart.merchantId,
              items: backendCart.items || []
            });
          } else {
            setCart({ merchantId: null, items: [] });
          }
          
          setLoading(false);
        }
      } catch (error) {
        console.error('Failed to fetch store data:', error);
        toast.error('Store not found or unavailable');
        navigate('/explore');
      }
    };
    
    loadStoreData();
  }, [id, navigate]);

  const applyCartUpdate = async (product, newQty) => {
    const merchantId = merchant._id || merchant.id;
    try {
      const productId = product._id || product.id;
      const response = await cartAPI.updateCart(merchantId, productId, newQty);

      if (response && response.data) {
        const fullCart = {
          ...response.data,
          merchantId: merchant
        };
        setCart({
          merchantId: response.data.merchantId._id || response.data.merchantId,
          items: response.data.items || []
        });
        try {
          sessionStorage.setItem('offerly_cached_cart', JSON.stringify(fullCart));
        } catch {}
      } else {
        setCart({ merchantId: null, items: [] });
        try {
          sessionStorage.removeItem('offerly_cached_cart');
        } catch {}
      }
    } catch (error) {
      console.error('Failed to update cart:', error);
      toast.error('Failed to update cart');
    }
  };

  const handleUpdateQty = (product, newQty) => {
    const merchantId = merchant._id || merchant.id;
    const cartMerchantId = cart.merchantId;

    // Adding from a different merchant than the one already in the cart
    // requires confirming the old cart gets cleared first.
    if (cartMerchantId && cartMerchantId !== merchantId && newQty > 0) {
      setPendingCartAction({ product, newQty });
      return;
    }

    applyCartUpdate(product, newQty);
  };

  const confirmMerchantSwitch = () => {
    if (pendingCartAction) {
      applyCartUpdate(pendingCartAction.product, pendingCartAction.newQty);
    }
    setPendingCartAction(null);
  };

  const getQty = (productId) => {
    const merchantId = merchant?._id || merchant?.id;
    if (cart.merchantId !== merchantId) return 0;
    const item = cart.items.find(i => (i.product._id || i.product) === productId);
    return item ? item.qty : 0;
  };

  const merchantId = merchant?._id || merchant?.id;
  const cartTotalItems = cart.merchantId === merchantId 
    ? cart.items.reduce((sum, item) => sum + item.qty, 0) 
    : 0;
    
  const cartTotalPrice = cart.merchantId === merchantId
    ? cart.items.reduce((sum, item) => sum + ((item.product.price || item.product.offerPrice || 0) * item.qty), 0)
    : 0;

  const productsByCategory = useMemo(() => {
    const groups = new Map();
    products.forEach((product) => {
      const key = product.categoryId || 'uncategorized';
      if (!groups.has(key)) {
        groups.set(key, {
          categoryId: key,
          categoryName: product.categoryName || 'Uncategorized',
          categoryDiscountPercent: product.categoryDiscountPercent || 0,
          products: [],
        });
      }
      groups.get(key).products.push(product);
    });
    return Array.from(groups.values());
  }, [products]);

  if (loading) {
    return (
      <PageTransition>
        <div className="flex items-center justify-center min-h-screen">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (!merchant) return null;

  return (
    <PageTransition>
      <div className="pb-32">
        {/* Cover image */}
        <div className="relative h-48 sm:h-56 md:h-64 lg:h-72 max-w-5xl mx-auto rounded-b-[2.5rem] overflow-hidden shadow-lg bg-gray-900">
          <img 
            src={merchant.coverImage || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80'} 
            alt="" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=1200&auto=format&fit=crop&q=80';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        </div>

        {/* Store info */}
        <div className="px-4 -mt-16 relative z-10">
          <div className="bg-surface rounded-3xl shadow-card p-4 sm:p-6 border border-gray-100">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-4 border-white shadow-lg -mt-10 flex-shrink-0 flex items-center justify-center">
                {merchant.logo ? (
                  <img 
                    src={merchant.logo} 
                    alt="" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      if (e.currentTarget.nextElementSibling) {
                        e.currentTarget.nextElementSibling.style.display = 'flex';
                      }
                    }}
                  />
                ) : null}
                <div 
                  style={{ display: merchant.logo ? 'none' : 'flex' }}
                  className="w-full h-full items-center justify-center bg-primary/10"
                >
                  <span className="text-2xl font-bold text-primary">{merchant.storeName?.charAt(0) || 'O'}</span>
                </div>
              </div>

              <div className="flex-1 pt-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">{merchant.storeName}</h1>
                  {merchant.verified && (
                    <VerifiedRoundedIcon sx={{ fontSize: 20 }} className="text-primary-500 flex-shrink-0" />
                  )}
                </div>
                <p className="text-sm text-text-secondary mt-1 font-medium">{merchant.category}</p>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div className="bg-gray-50 rounded-2xl py-3 text-center border border-gray-100">
                <div className="flex items-center justify-center gap-1">
                  <StarRoundedIcon sx={{ fontSize: 18 }} className="text-amber-500" />
                  <span className="text-base font-bold text-gray-800">{merchant.avgRating}</span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Rating</p>
              </div>
              <div className="bg-gray-50 rounded-2xl py-3 text-center border border-gray-100">
                <p className="text-base font-bold text-gray-800">{merchant.totalReviews}</p>
                <p className="text-xs text-gray-500 font-medium">Reviews</p>
              </div>
              <div className="bg-gray-50 rounded-2xl py-3 text-center border border-gray-100">
                <p className="text-base font-bold text-gray-800">{products.length}</p>
                <p className="text-xs text-gray-500 font-medium">{catalogTabLabel}</p>
              </div>
            </div>

            {/* Address & Contact */}
            <div className="mt-5 space-y-3">
              <div className="flex items-start gap-3 text-sm text-text-secondary">
                <LocationOnRoundedIcon sx={{ fontSize: 18 }} className="text-primary mt-0.5" />
                <span className="leading-relaxed">{merchant.address}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-secondary">
                <PhoneRoundedIcon sx={{ fontSize: 18 }} className="text-primary" />
                <span className="font-medium text-gray-700">{merchant.phone}</span>
              </div>

              {/* Business Hours */}
              <div className="pt-3 border-t border-gray-50">
                <div 
                  className="flex items-center justify-between cursor-pointer group"
                  onClick={() => setShowHours(!showHours)}
                >
                  <div className="flex items-center gap-3">
                    <AccessTimeRoundedIcon sx={{ fontSize: 18 }} className={status.isOpen ? 'text-[#5EB929]' : 'text-red-500'} />
                    <span className={`text-sm font-bold ${status.isOpen ? 'text-[#5EB929]' : 'text-red-500'}`}>
                      {status.label}
                    </span>
                  </div>
                  <motion.div animate={{ rotate: showHours ? 180 : 0 }}>
                    <ExpandMoreRoundedIcon className="text-gray-400 group-hover:text-primary transition-colors" />
                  </motion.div>
                </div>

                <AnimatePresence>
                  {showHours && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-4 space-y-2 bg-gray-50/50 rounded-2xl p-4 border border-gray-100">
                        {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((day) => {
                          const h = merchant.businessHours[day];
                          const isToday = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() === day;
                          return (
                            <div key={day} className={`flex justify-between items-center ${isToday ? 'bg-white p-2 rounded-lg shadow-sm border border-gray-100' : 'px-2'}`}>
                              <span className={`text-[11px] font-bold uppercase tracking-tight ${isToday ? 'text-primary' : 'text-gray-400'}`}>
                                {day} {isToday && '•'}
                              </span>
                              <span className={`text-[11px] font-bold ${h?.isClosed || !h?.open || !h?.close ? 'text-red-400' : 'text-gray-600'}`}>
                                {h?.isClosed || !h?.open || !h?.close ? 'Closed' : `${h?.open} - ${h?.close}`}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            
            {/* Active Offers Tags */}
            {offers.length > 0 && (
              <div className="mt-5 pt-4 border-t border-gray-100 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                 {offers.map(off => (
                   <StoreOfferTag key={off._id || off.id} offer={off} />
                 ))}
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-4 mt-6">
          <div className="flex bg-gray-100/80 rounded-2xl p-1.5 gap-1">
            {['menu', 'photos', 'reviews'].map((tab) => (
              <motion.button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 rounded-xl text-sm font-bold capitalize transition-colors ${
                  activeTab === tab ? 'bg-white text-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
                whileTap={{ scale: 0.96 }}
              >
                {tab === 'menu' ? catalogTabLabel : tab}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="px-4 mt-6">
          {activeTab === 'menu' && (
            <div className="space-y-6">
              {products.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
                   <ShoppingCartRoundedIcon className="text-gray-300 mb-2" sx={{fontSize: 40}} />
                   <p className="text-gray-500 font-medium">No {catalogTabLabel.toLowerCase()} listed</p>
                </div>
              ) : (
                productsByCategory.map((group) => (
                  <div key={group.categoryId}>
                    <div className="flex items-center gap-2 mb-3">
                      <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{group.categoryName}</h2>
                      {group.categoryDiscountPercent > 0 && (
                        <span className="text-[11px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                          {group.categoryDiscountPercent}% OFF
                        </span>
                      )}
                    </div>
                    <div className="space-y-4">
                      {group.products.map((product, idx) => {
                        const productId = product._id || product.id;
                        const qty = getQty(productId);
                        return (
                          <motion.div
                            key={productId}
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex gap-4"
                          >
                            <div className="flex-1">
                              {shouldShowVegIndicator(merchant, product) && (
                                <div className={`w-3 h-3 border grid place-items-center mb-1 ${product.isVeg ? 'border-green-600' : 'border-red-600'}`}>
                                  <div className={`w-1.5 h-1.5 rounded-full ${product.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                                </div>
                              )}
                              <h3 className="font-bold text-gray-800 text-base">{product.name}</h3>
                              <div className="flex items-center gap-2 mt-2">
                                 <span className="font-bold text-gray-900 text-sm">₹{product.price}</span>
                              </div>
                            </div>

                            {/* Quantity Controller */}
                            <div className="flex items-end">
                              {qty === 0 ? (
                                <motion.button
                                  whileTap={{scale:0.95}}
                                  onClick={() => handleUpdateQty(product, 1)}
                                  className="px-6 py-2 bg-primary-50 text-primary font-bold rounded-lg border border-primary-200"
                                >
                                  ADD
                                </motion.button>
                              ) : (
                                <div className="flex items-center bg-primary text-white rounded-lg overflow-hidden shadow-md">
                                  <motion.button
                                    whileTap={{backgroundColor:'rgba(0,0,0,0.1)'}}
                                    className="px-3 py-2"
                                    onClick={() => handleUpdateQty(product, qty - 1)}
                                  >
                                    <RemoveRoundedIcon sx={{fontSize: 18}} />
                                  </motion.button>
                                  <span className="px-2 font-bold w-8 text-center">{qty}</span>
                                  <motion.button
                                    whileTap={{backgroundColor:'rgba(0,0,0,0.1)'}}
                                    className="px-3 py-2"
                                    onClick={() => handleUpdateQty(product, qty + 1)}
                                  >
                                    <AddRoundedIcon sx={{fontSize: 18}} />
                                  </motion.button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'photos' && (
            <div className="grid grid-cols-2 gap-3">
              {[merchant.coverImage, ...merchant.photos].map((photo, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className="aspect-square rounded-2xl overflow-hidden bg-gray-100 shadow-sm"
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </motion.div>
              ))}
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              {reviews.length === 0 ? (
                <p className="text-center text-text-secondary text-sm py-8">No reviews yet</p>
              ) : (
                reviews.map((review, idx) => (
                  <motion.div
                    key={review._id || review.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="bg-surface rounded-2xl shadow-sm border border-gray-100 p-5"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary-50 rounded-full flex items-center justify-center border border-primary-100">
                          <span className="text-sm font-bold text-primary">{review.customerName.charAt(0)}</span>
                        </div>
                        <p className="text-sm font-bold text-text-primary">{review.customerName}</p>
                      </div>
                      <div className="flex bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-100">
                        <StarRoundedIcon sx={{ fontSize: 14 }} className="text-amber-500" />
                        <span className="text-xs font-bold text-amber-700 ml-1">{review.rating}</span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{review.text}</p>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Summary Pill */}
      <AnimatePresence>
        {cartTotalItems > 0 && (
          <div className="fixed bottom-[5.5rem] sm:bottom-24 lg:bottom-7 left-0 right-0 z-[10001] pointer-events-none flex justify-center px-4">
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 50, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 450, damping: 26 }}
              className="pointer-events-auto"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => {
                  const fullCart = {
                    ...cart,
                    merchantId: merchant,
                  };
                  try {
                    sessionStorage.setItem('offerly_cached_cart', JSON.stringify(fullCart));
                  } catch {}
                  navigate('/cart', {
                    state: {
                      initialCart: fullCart,
                      initialMerchant: merchant,
                      autoCelebrate: true,
                    },
                  });
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    navigate('/cart', {
                      state: {
                        initialCart: { ...cart, merchantId: merchant },
                        initialMerchant: merchant,
                        autoCelebrate: true,
                      },
                    });
                  }
                }}
                className="group cursor-pointer bg-gray-900/95 hover:bg-gray-900 active:scale-[0.97] transition-all duration-200 backdrop-blur-xl rounded-full shadow-[0_12px_32px_rgba(0,0,0,0.45),0_0_24px_rgba(94,185,41,0.22)] border border-white/15 ring-1 ring-primary/25 pl-3.5 pr-2 py-1.5 flex items-center gap-3 select-none"
              >
                {/* Mini Cart Icon with Item Count Badge & Lively Bounce */}
                <motion.div
                  key={cartTotalItems}
                  initial={{ scale: 0.85, rotate: -10 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 15 }}
                  className="relative flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary border border-primary/30 shrink-0"
                >
                  <ShoppingCartRoundedIcon sx={{ fontSize: 16 }} />
                  <motion.span
                    key={`badge-${cartTotalItems}`}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 12 }}
                    className="absolute -top-1 -right-1 bg-primary text-white text-[10px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center ring-2 ring-gray-900 shadow-sm"
                  >
                    {cartTotalItems}
                  </motion.span>
                </motion.div>

                {/* Price & Cart Info */}
                <div className="flex flex-col min-w-0 pr-0.5">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-sm font-bold text-white tracking-tight">
                      ₹{cartTotalPrice.toLocaleString()}
                    </span>
                    <span className="text-[11px] text-gray-400 font-medium">
                      • {cartTotalItems} {cartTotalItems > 1 ? 'items' : 'item'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold leading-none">
                      Discounts in cart
                    </span>
                  </div>
                </div>

                {/* View Cart Pill Button with Animated Arrow */}
                <div className="bg-white group-hover:bg-primary group-hover:text-white text-gray-900 font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1 shadow-sm transition-colors duration-200 shrink-0">
                  <span>View Cart</span>
                  <motion.span
                    animate={{ x: [0, 3, 0] }}
                    transition={{ repeat: Infinity, duration: 1.8, ease: 'easeInOut' }}
                    className="flex items-center"
                  >
                    <ArrowForwardRoundedIcon sx={{ fontSize: 13 }} />
                  </motion.span>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        isOpen={!!pendingCartAction}
        title="Start a new cart?"
        message="You have items from another store in your cart. Adding this item will clear them."
        confirmText="Clear & Add"
        confirmColor="primary"
        onConfirm={confirmMerchantSwitch}
        onCancel={() => setPendingCartAction(null)}
      />
    </PageTransition>
  );
};

export default StoreProfile;
