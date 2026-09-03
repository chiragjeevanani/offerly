import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import SparklesIcon from '@mui/icons-material/AutoAwesomeRounded';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import ShoppingCartRoundedIcon from '@mui/icons-material/ShoppingCartRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import QrCode2RoundedIcon from '@mui/icons-material/QrCode2Rounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';

import { cartAPI } from '../../../../api/cart.api';
import { merchantAPI } from '../../../../api/merchant.api';
import { useApp } from '../../context/AppContext';
import PageTransition from '../../components/ui/PageTransition';

const CountUp = ({ to }) => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const duration = 1100;
    const startTime = performance.now();
    let frameId;
    const update = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(ease * to));
      if (progress < 1) {
        frameId = requestAnimationFrame(update);
      }
    };
    frameId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(frameId);
  }, [to]);
  return <span>₹{count.toLocaleString()}</span>;
};

const CartView = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useApp();

  // Instant cached cart resolution so there is ZERO delay when opening cart
  const getInitialCart = () => {
    if (location.state?.initialCart) return location.state.initialCart;
    try {
      const cached = sessionStorage.getItem('offerly_cached_cart');
      if (cached) return JSON.parse(cached);
    } catch {}
    return null;
  };

  const initialCartData = getInitialCart();
  const [cart, setCart] = useState(initialCartData);
  const [merchant, setMerchant] = useState(() => {
    if (location.state?.initialMerchant) return location.state.initialMerchant;
    if (initialCartData?.merchantId && typeof initialCartData.merchantId === 'object') {
      return initialCartData.merchantId;
    }
    return null;
  });
  const [loading, setLoading] = useState(!initialCartData);

  // Mathematics Calculations - Safe for undefined cart/items
  const items = cart?.items || [];
  const totalBasePrice = Math.round(items.reduce((sum, item) => sum + ((item.product?.price || 0) * item.qty), 0));
  const totalOfferPrice = Math.round(items.reduce((sum, item) => sum + ((item.product?.offerPrice || 0) * item.qty), 0));
  const totalDiscount = Math.round(totalBasePrice - totalOfferPrice);
  const discountPercent = totalBasePrice > 0 ? Math.round((totalDiscount / totalBasePrice) * 100) : 0;

  // showCelebrationModal is TRUE immediately on frame 0 if discount > 0!
  const [showCelebrationModal, setShowCelebrationModal] = useState(() => totalDiscount > 0);
  const celebratedKeyRef = useRef('');

  const loadCart = async () => {
    try {
      const cartRes = await cartAPI.getCart();
      const backendCart = cartRes?.data;
      
      if (backendCart && backendCart.merchantId && backendCart.items && backendCart.items.length > 0) {
        setCart(backendCart);
        try {
          sessionStorage.setItem('offerly_cached_cart', JSON.stringify(backendCart));
        } catch {}

        // Immediately set merchant from populated backendCart.merchantId
        if (typeof backendCart.merchantId === 'object' && backendCart.merchantId !== null) {
          setMerchant(backendCart.merchantId);
        }
        
        const merchantId = backendCart.merchantId._id || backendCart.merchantId;
        if (typeof backendCart.merchantId === 'string' || !backendCart.merchantId.storeName) {
          const merchantRes = await merchantAPI.getById(merchantId);
          if (merchantRes && merchantRes.merchant) {
            setMerchant(merchantRes.merchant);
          }
        }
      } else {
        setCart(null);
        try {
          sessionStorage.removeItem('offerly_cached_cart');
        } catch {}
      }
    } catch (error) {
      console.error('Failed to load cart:', error);
      if (!initialCartData) setCart(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCart();
  }, [location.key]);

  const fireCelebration = () => {
    setShowCelebrationModal(true);
    try {
      // Left cannon
      confetti({
        particleCount: 75,
        angle: 60,
        spread: 70,
        origin: { x: 0, y: 0.7 },
        colors: ['#5EB929', '#22C55E', '#FBBF24', '#F97316', '#FFFFFF', '#EC4899'],
        zIndex: 99999999,
      });
      // Right cannon
      confetti({
        particleCount: 75,
        angle: 120,
        spread: 70,
        origin: { x: 1, y: 0.7 },
        colors: ['#5EB929', '#22C55E', '#FBBF24', '#F97316', '#FFFFFF', '#3B82F6'],
        zIndex: 99999999,
      });
      // Center star burst
      setTimeout(() => {
        confetti({
          particleCount: 65,
          spread: 95,
          origin: { x: 0.5, y: 0.4 },
          shapes: ['star', 'circle'],
          colors: ['#5EB929', '#7AD032', '#FBBF24', '#EC4899', '#3B82F6'],
          scalar: 1.25,
          zIndex: 99999999,
        });
      }, 250);
      // Top rain
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 270,
          spread: 130,
          origin: { x: 0.5, y: 0 },
          colors: ['#5EB929', '#FBBF24', '#3B82F6', '#10B981'],
          gravity: 0.9,
          zIndex: 99999999,
        });
      }, 600);
    } catch (e) {
      console.error('Confetti error:', e);
    }
  };

  // Auto-dismiss modal after 4.5s
  useEffect(() => {
    if (showCelebrationModal) {
      const timer = setTimeout(() => {
        setShowCelebrationModal(false);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [showCelebrationModal]);

  // Trigger celebration confetti immediately on cart entry whenever there is a discount
  useEffect(() => {
    if (totalDiscount > 0 && celebratedKeyRef.current !== location.key) {
      celebratedKeyRef.current = location.key;
      fireCelebration();
    }
  }, [totalDiscount, location.key]);

  const handleUpdateQty = async (product, newQty) => {
    if (!merchant) return;
    try {
      const productId = product._id || product.id;
      const response = await cartAPI.updateCart(merchant._id || merchant.id, productId, newQty);
      if (response && response.data) {
        setCart(response.data);
      } else {
        setCart(null);
      }
      loadCart(); // Refresh merchant details if needed
    } catch (error) {
      console.error('Failed to update cart:', error);
    }
  };

  const handleProceed = () => {
     navigate('/redeem/draft');
  };

  if (loading && (!cart || !merchant)) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-safe">
          <div className="w-10 h-10 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
        </div>
      </PageTransition>
    );
  }

  if (!cart || !merchant || !cart.items || cart.items.length === 0) {
    return (
      <PageTransition>
        <div className="min-h-screen bg-gray-50 flex flex-col pt-safe">
          <div className="px-4 py-4 flex items-center bg-white shadow-sm sticky top-0 z-20">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 text-gray-700">
              <ArrowBackRoundedIcon />
            </button>
            <h1 className="text-lg font-bold text-gray-900 ml-2">Booking Cart</h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-4 text-gray-400">
              <ShoppingCartRoundedIcon sx={{fontSize: 40}} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Your Cart is Empty</h2>
            <p className="text-gray-500 mb-6">Looks like you haven't added any services or products yet.</p>
            <button 
              onClick={() => navigate('/home')}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold"
            >
              Explore Offers
            </button>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      {/* Full-Screen Graffiti / Confetti Celebration Modal */}
      <AnimatePresence>
        {showCelebrationModal && totalDiscount > 0 && (
          <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4">
            {/* Dimmed Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowCelebrationModal(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-md"
            />

            {/* Celebration Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.6, y: 40, rotate: -3 }}
              animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 300 }}
              className="relative z-10 w-full max-w-sm rounded-[2.5rem] bg-gradient-to-b from-[#11240c] via-gray-950 to-black p-7 text-center shadow-2xl border-2 border-[#5EB929]/50 overflow-hidden"
            >
              {/* Animated Radial Background Glows & Graffiti Flares */}
              <div className="absolute -top-20 -left-20 w-48 h-48 bg-[#5EB929]/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
              <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-amber-400/25 rounded-full blur-3xl pointer-events-none animate-pulse" />

              {/* Close Button */}
              <button
                onClick={() => setShowCelebrationModal(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 flex items-center justify-center transition-colors"
              >
                <CloseRoundedIcon sx={{ fontSize: 18 }} />
              </button>

              {/* Center Animated Icon */}
              <div className="relative mx-auto mb-4 w-24 h-24 flex items-center justify-center">
                <motion.div
                  animate={{ scale: [1, 1.2, 1], rotate: [0, 8, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                  className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#5EB929] to-[#8cee50] flex items-center justify-center shadow-xl shadow-[#5EB929]/50 border-2 border-white/30"
                >
                  <span className="text-5xl">🎉</span>
                </motion.div>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-2 flex items-center justify-between pointer-events-none"
                >
                  <span className="text-xl">✨</span>
                  <span className="text-xl">⭐</span>
                </motion.div>
              </div>

              {/* Celebrative Badge */}
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#5EB929]/20 border border-[#5EB929]/50 text-[#5EB929] text-[11px] font-black uppercase tracking-widest mb-3">
                <SparklesIcon sx={{ fontSize: 14 }} />
                Discount Applied!
              </div>

              {/* Celebrative Title */}
              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mb-2">
                WOOHOO! SAVINGS UNLOCKED!
              </h2>

              {/* Big Savings Number with CountUp */}
              <div className="my-4 py-3 px-4 bg-white/5 rounded-2xl border border-white/10 backdrop-blur-sm">
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#5EB929] mb-0.5">
                  You're Saving
                </p>
                <div className="text-4xl sm:text-5xl font-black text-[#5EB929] tracking-tight drop-shadow-md">
                  <CountUp to={totalDiscount} />
                </div>
                <p className="text-[11px] text-gray-300 font-semibold mt-1">
                  {discountPercent}% OFF with Offerly
                </p>
              </div>

              <p className="text-xs text-gray-300 leading-relaxed font-medium mb-6">
                Your exclusive discount for <span className="text-white font-bold">{merchant.storeName}</span> has been applied to this booking!
              </p>

              {/* Action Button */}
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setShowCelebrationModal(false)}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-[#5EB929] via-[#6ecd36] to-[#4fa020] text-gray-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-[#5EB929]/40 hover:brightness-110 transition-all flex items-center justify-center gap-2"
              >
                <span>Awesome! View My Cart</span>
                <span>🚀</span>
              </motion.button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-[#F8FAFC] pb-32">
        {/* Concise Premium Header */}
        <div className="px-5 py-5 flex items-center justify-between bg-white border-b border-gray-100 sticky top-0 z-30 shadow-sm backdrop-blur-md bg-white/90">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl text-gray-900 border border-gray-100 hover:scale-105 transition-all">
              <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
            </button>
            <div>
               <h1 className="text-lg font-bold text-gray-900 leading-none uppercase tracking-tight">Review Booking</h1>
               <div className="flex items-center gap-1.5 mt-1.5">
                  <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full" />
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{merchant.storeName}</p>
               </div>
            </div>
          </div>
          {merchant.logo && (
            <img src={merchant.logo} alt="" className="w-10 h-10 rounded-xl shadow-lg object-cover border-2 border-white" />
          )}
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Celebratory Discount Graffiti / Confetti Banner */}
          {totalDiscount > 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: -16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ type: 'spring', stiffness: 350, damping: 25 }}
              className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-gray-950 via-gray-900 to-[#132c0c] p-5 sm:p-6 shadow-xl border border-[#5EB929]/40 text-white cursor-pointer group"
              onClick={fireCelebration}
            >
              {/* Background ambient glow */}
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5EB929]/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-amber-400/20 rounded-full blur-xl pointer-events-none" />

              <div className="relative z-10 flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#5EB929]/20 border border-[#5EB929]/40 text-[#5EB929] text-[10px] font-black uppercase tracking-wider mb-2.5">
                    <SparklesIcon sx={{ fontSize: 13 }} className="animate-spin" style={{ animationDuration: '4s' }} />
                    Discount Unlocked & Applied!
                  </div>

                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>You're Saving ₹{totalDiscount.toLocaleString()}!</span>
                    <span className="text-2xl animate-bounce">🎉</span>
                  </h2>

                  <p className="text-xs text-gray-300 mt-1.5 font-medium leading-relaxed">
                    Exclusive {discountPercent > 0 ? `${discountPercent}% ` : ''}Offerly member discount has been automatically applied to your booking.
                  </p>
                </div>

                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.92 }}
                    className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5EB929] to-[#8cee50] text-white flex items-center justify-center shadow-lg shadow-[#5EB929]/30 border border-white/20"
                  >
                    <span className="text-2xl">🥳</span>
                  </motion.div>
                  <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">
                    Tap for 🎉
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Party Details - Concierge Card */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50 grid grid-cols-2 gap-4 relative overflow-hidden">
             <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-gray-50" />
             
             <div>
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Customer</p>
               <h3 className="text-sm font-bold text-gray-900 leading-none mb-1">{user?.name || 'Guest'}</h3>
               <p className="text-[11px] font-bold text-gray-400">{user?.phone || 'No phone'}</p>
             </div>

             <div className="pl-4">
               <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Merchant</p>
               <h3 className="text-sm font-bold text-[#5EB929] leading-none mb-1">{merchant.storeName}</h3>
               <p className="text-[11px] font-bold text-gray-400 truncate">{merchant.locality}</p>
             </div>
          </div>

          {/* Service Items - High-Density List */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50">
             <div className="flex items-center justify-between mb-6">
               <div className="flex items-center gap-2">
                 <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-gray-400">
                   <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} />
                 </div>
                 <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Service Items</h3>
               </div>
               <span className="text-[10px] font-bold text-gray-400">{cart.items.length} Items</span>
             </div>
             
             <div className="space-y-6">
               {cart.items.map((item, idx) => {
                 const product = item.product;
                 const productPrice = Math.round(product.offerPrice || 0);
                 const basePrice = Math.round(product.price || 0);
                 const itemTotal = productPrice * item.qty;
                 const savings = Math.round((basePrice - productPrice) * item.qty);

                 return (
                  <div key={idx} className="flex justify-between items-center gap-4 relative">
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-900 mb-1">{product.name}</p>
                      {product.categoryId?.name && (
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{product.categoryId.name}</p>
                      )}

                      <div className="flex items-center gap-3">
                         <div className="flex items-center bg-[#F8FAFC] rounded-xl border border-gray-100 p-0.5">
                            <motion.button 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleUpdateQty(product, item.qty - 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              <RemoveRoundedIcon sx={{ fontSize: 14 }} />
                            </motion.button>
                            <span className="w-6 text-center text-[12px] font-bold text-gray-900">{item.qty}</span>
                            <motion.button 
                              whileTap={{ scale: 0.9 }} 
                              onClick={() => handleUpdateQty(product, item.qty + 1)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors"
                            >
                              <AddRoundedIcon sx={{ fontSize: 14 }} />
                            </motion.button>
                         </div>
                         <p className="text-[11px] font-bold text-gray-400">× ₹{productPrice}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">₹{itemTotal}</p>
                      {savings > 0 && (
                         <div className="mt-1 flex items-center justify-end gap-1">
                            <div className="w-1 h-1 bg-green-500 rounded-full" />
                            <p className="text-[9px] font-bold text-green-600 uppercase">Save ₹{savings}</p>
                         </div>
                      )}
                    </div>
                  </div>
                 );
               })}
             </div>
          </div>

          {/* Payment Summary - Structured Receipt */}
          <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-gray-50 relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-gray-100 via-[#5EB929]/20 to-gray-100" />

             <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-5">Bill Summary</h3>
             
             <div className="space-y-3 mb-6">
               <div className="flex justify-between items-center">
                 <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Base Amount</span>
                 <span className="text-[13px] font-bold text-gray-900">₹{totalBasePrice}</span>
               </div>
               <div className="flex justify-between items-center">
                 <div className="flex items-center gap-1.5">
                    <span className="text-[12px] font-bold text-gray-400 uppercase tracking-tight">Offer Benefit</span>
                    <div className="px-1.5 py-0.5 bg-green-50 text-green-600 rounded text-[8px] font-bold uppercase">Apply</div>
                 </div>
                 <span className="text-[13px] font-bold text-green-600">- ₹{totalDiscount}</span>
               </div>
             </div>

             <div className="pt-5 border-t border-dashed border-gray-100 flex justify-between items-end">
                <div>
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Payable</p>
                   <p className="text-[12px] font-bold text-gray-400 leading-none">Net Amount</p>
                </div>
                <div className="text-right">
                   <p className="text-2xl font-bold text-[#5EB929] leading-none tracking-tight">₹{totalOfferPrice}</p>
                </div>
             </div>

             {/* Dynamic Disclaimer */}
             <div className="mt-6 p-4 bg-[#FFF8F1] rounded-2xl border border-[#FFE8D1] flex gap-3">
               <InfoOutlinedIcon className="text-[#B56D24]" sx={{ fontSize: 16 }} />
               <p className="text-[10px] text-[#8C541B] font-bold uppercase tracking-wide leading-relaxed">
                 Pay at store directly. This is a digital reservation, not an online payment.
               </p>
             </div>
          </div>
        </div>

        {/* Action Button - Sticky Bottom */}
        <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-40 backdrop-blur-xl bg-white/95">
           <div className="p-3">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleProceed}
                className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold text-[11px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl shadow-black/20 active:scale-95 transition-all"
              >
                <QrCode2RoundedIcon sx={{ fontSize: 18 }} />
                Generate Booking QR
              </motion.button>
           </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CartView;
