import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import QrCodeScannerRoundedIcon from '@mui/icons-material/QrCodeScannerRounded';
import KeyboardDoubleArrowDownRoundedIcon from '@mui/icons-material/KeyboardDoubleArrowDownRounded';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

import { bookingAPI } from '../../../../api/booking.api';
import { cartAPI } from '../../../../api/cart.api';
import { merchantAPI } from '../../../../api/merchant.api';
import PageTransition from '../../components/ui/PageTransition';
import { useApp } from '../../context/AppContext';
import { useSocket } from '../../../../context/SocketContext';

function formatDateTime(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-IN', options);
}

const QrScreen = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [merchant, setMerchant] = useState(null);
  const [isDraft, setIsDraft] = useState(id === 'draft');
  const [isRequesting, setIsRequesting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFulfilled, setIsFulfilled] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);
  const { user } = useApp();

  const [draftData, setDraftData] = useState(null);
  const [draftMerchantId, setDraftMerchantId] = useState(null);

  useEffect(() => {
    const loadBooking = async () => {
      if (id === 'draft') {
        try {
          const cartRes = await cartAPI.getCart();
          const backendCart = cartRes.data;
          
          if (!backendCart || !backendCart.merchantId || !backendCart.items || backendCart.items.length === 0) {
            navigate('/explore');
            return;
          }

          const mId = backendCart.merchantId._id || backendCart.merchantId;
          setDraftMerchantId(mId);

          const totalBasePrice = backendCart.items.reduce((sum, item) => sum + (item.product.price * item.qty), 0);
          const totalOfferPrice = backendCart.items.reduce((sum, item) => sum + (item.product.offerPrice * item.qty), 0);
          const totalDiscount = totalBasePrice - totalOfferPrice;

          setDraftData({
            items: backendCart.items,
            totals: { base: totalBasePrice, discount: totalDiscount, final: totalOfferPrice }
          });

          const merchantRes = await merchantAPI.getById(mId);
          if (merchantRes && merchantRes.merchant) {
            setMerchant(merchantRes.merchant);
          }
        } catch (err) {
          console.error("Failed to load draft cart:", err);
          navigate('/explore');
        }
        setLoading(false);
      } else {
        try {
          const response = await bookingAPI.getById(id);
          if (response && response.success) {
            const b = response.data;
            setBooking(b);
            setMerchant(b.merchantId); // API populates merchantId
            setIsDraft(false);
          } else {
            toast.error('Booking not found');
            navigate('/explore');
          }
        } catch (error) {
          console.error('Failed to load booking:', error);
          toast.error('Failed to load booking details');
          navigate('/explore');
        } finally {
          setLoading(false);
        }
      }
    };

    loadBooking();
  }, [id, navigate]);

  const { socket } = useSocket();

  // WebSocket listener for real-time fulfillment notification
  useEffect(() => {
    if (!booking || isDraft || !socket) return;

    const handleNotification = (notification) => {
      if (notification.type === 'booking_fulfilled' &&
          (notification.redemptionId === booking._id || notification.redemptionId === booking.id)) {
        setIsFulfilled(true);
        setBooking(prev => prev ? { ...prev, status: 'completed', scannedAt: new Date().toISOString() } : prev);
      }
    };

    socket.on('user_notification', handleNotification);

    return () => {
      socket.off('user_notification', handleNotification);
    };
  }, [booking?._id, isDraft, socket]);

  // Polling fallback
  useEffect(() => {
    if (!booking || isDraft || isFulfilled || isExpired) return;
    
    const interval = setInterval(async () => {
      try {
        const response = await bookingAPI.getById(id);
        if (response?.data?.status === 'completed') {
           setIsFulfilled(true);
           setBooking(prev => prev ? ({ ...prev, status: 'completed' }) : prev);
        } else if (response?.data?.status === 'expired') {
           setIsExpired(true);
           setBooking(prev => prev ? ({ ...prev, status: 'expired' }) : prev);
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [booking?._id, isDraft, isFulfilled, isExpired, id]);

  // Expiry Countdown Timer
  useEffect(() => {
    if (!booking || isDraft || isFulfilled || isExpired || !booking.qrExpiry) return;

    const calculateTimeLeft = () => {
      const difference = new Date(booking.qrExpiry) - new Date();
      if (difference <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        setBooking(prev => prev ? { ...prev, status: 'expired' } : prev);
        return;
      }
      
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);
      
      setTimeLeft(
        `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`
      );
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(timer);
  }, [booking?.qrExpiry, isDraft, isFulfilled, isExpired]);

  // Wake lock
  useEffect(() => {
    let wakeLock = null;
    const requestWakeLock = async () => {
      try {
        if ('wakeLock' in navigator) {
          wakeLock = await navigator.wakeLock.request('screen');
        }
      } catch (err) {
        console.error(`${err.name}, ${err.message}`);
      }
    };
    if (booking && !isDraft) {
      requestWakeLock();
    }
    return () => {
      if (wakeLock !== null) {
        wakeLock.release().catch(console.error);
      }
    };
  }, [booking?._id, isDraft]);

  const handleSendRequest = async () => {
    setIsRequesting(true);
    try {
      const response = await bookingAPI.create({
        merchantId: draftMerchantId,
        items: draftData.items.map(it => {
          const prod = it.product;
          return {
            productId: prod._id || prod.id,
            product: {
              id: prod._id || prod.id,
              name: prod.name,
              category: prod.categoryName,
              price: prod.price,
              offerPrice: prod.offerPrice,
              isVeg: prod.isVeg,
              duration: prod.duration
            },
            qty: it.qty
          };
        }),
        totals: {
          base: draftData.totals.base,
          discount: draftData.totals.discount,
          final: draftData.totals.final,
          original: draftData.totals.base
        }
      });

      if (response && response.success) {
        await cartAPI.clearCart();
        navigate(`/redeem/${response.data._id || response.data.id}`, { replace: true });
      } else {
        throw new Error('Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate pass';
      toast.error(errorMessage);
    } finally {
      setIsRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!merchant) return null;

  return (
    <PageTransition>
      <div className="min-h-screen bg-gray-950 flex flex-col items-center">
        {/* Top Navbar */}
        <div className="w-full max-w-[1200px] px-4 py-4 flex items-center justify-between z-20 sticky top-0">
          <button onClick={() => navigate('/home')} className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white">
            <CloseRoundedIcon />
          </button>
          <p className="text-white font-bold tracking-widest text-sm uppercase">{"Service Request"}</p>
          <div className="w-10 h-10" />
        </div>

        {isDraft ? (
          /* ──────── DRAFT REQUEST VIEW ──────── */
          <div className="flex-1 w-full max-w-md mx-auto px-4 pb-24 flex flex-col items-center justify-center">

            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-white w-full p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Header */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-gray-100 via-[#5EB929]/20 to-gray-100" />
              
              <div className="text-center mt-2 mb-6">
                <div className="inline-block px-3 py-1 bg-[#F8FAFC] border border-gray-100 rounded-lg mb-3">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] leading-none">Booking Preview</p>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 leading-tight uppercase tracking-tight">{merchant.storeName}</h2>
                <div className="flex items-center justify-center gap-1.5 mt-2">
                   <div className="w-1.5 h-1.5 bg-[#5EB929] rounded-full animate-pulse" />
                   <p className="text-[9px] font-bold text-[#5EB929] uppercase tracking-widest">Awaiting Reservation</p>
                </div>
              </div>

              <div className="space-y-6 mb-6 relative">
                {/* Decorative horizontal cutouts for ticket look */}
                <div className="absolute -left-11 top-0 bottom-0 w-px border-l-4 border-dashed border-gray-100" />
                <div className="absolute -right-11 top-0 bottom-0 w-px border-r-4 border-dashed border-gray-100" />

                {draftData?.items?.map((it, idx) => {
                  const product = it.product;
                  const productName = typeof product === 'object' ? product.name : 'Product';
                  const productPrice = Math.round(typeof product === 'object' ? (product.offerPrice || 0) : 0);
                  return (
                  <div key={idx} className="flex justify-between items-center group">
                    <div className="flex-1">
                       <p className="text-[13px] font-bold text-gray-800 leading-tight">{productName}</p>
                       <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{it.qty} Unit(s)</p>
                    </div>
                    <span className="text-[14px] font-bold text-gray-900">₹{Math.round(it.qty * productPrice)}</span>
                  </div>
                  );
                })}
              </div>

              <div className="bg-[#F8FAFC] rounded-3xl p-6 border border-gray-50 mb-6">
                <div className="flex justify-between items-center mb-1">
                   <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Payable</p>
                   <p className="text-[10px] font-bold text-[#5EB929] uppercase tracking-widest">At Store</p>
                </div>
                <div className="flex justify-between items-end">
                   <p className="text-[12px] font-bold text-gray-400">Net Amount</p>
                   <span className="text-3xl font-bold text-[#5EB929] leading-none tracking-tight">₹{Math.round(draftData?.totals?.final)}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3 px-2">
                   <InfoOutlinedIcon className="text-gray-400 shrink-0" sx={{ fontSize: 16 }} />
                   <p className="text-[10px] text-gray-500 font-bold uppercase leading-relaxed tracking-wide">
                     Confirming locks this offer for you. No payment is needed now.
                   </p>
                </div>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSendRequest}
                  disabled={isRequesting}
                  className="w-full h-14 bg-gray-900 text-white rounded-2xl font-bold text-[12px] uppercase tracking-[0.25em] flex items-center justify-center gap-3 shadow-2xl shadow-black/20 active:scale-95 transition-all"
                >
                  {isRequesting ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>Accept & Reserve 🚀</>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </div>
        ) : booking ? (
          /* ──────── ACTIVE BOOKING QR PASS VIEW ──────── */
          <div className="flex-1 w-full max-w-sm mx-auto px-4 pb-6 flex flex-col items-center justify-center">

            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white w-full rounded-[2rem] shadow-2xl relative overflow-hidden flex flex-col border border-gray-50"
            >
              {/* Header Area - Ultra Compact */}
              <div className="bg-[#5EB929]/5 p-4 flex items-center justify-center gap-3 border-b border-[#5EB929]/10">
                <div className="w-8 h-8 bg-[#5EB929] rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-[#5EB929]/20">
                   <CheckCircleRoundedIcon className="text-white" sx={{ fontSize: 18 }} />
                </div>
                <div className="text-left">
                   <h1 className="text-sm font-bold text-gray-900 uppercase leading-none tracking-tight">Reservation Confirmed</h1>
                   <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase tracking-[0.1em]">Pass ID: <span className="text-gray-900">{booking.internalId || booking.id || booking._id}</span></p>
                </div>
              </div>

              {/* QR Code Segment - Ultra Compact */}
              <div className="p-4 flex flex-col items-center justify-center bg-white border-b border-dashed border-gray-100 relative">
                {/* Decorative cutouts */}
                <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-950" />
                <div className="absolute top-1/2 right-0 translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-950" />

                <div className="bg-white p-3 rounded-2xl shadow-xl shadow-[#5EB929]/5 border border-gray-50">
                  <QRCodeSVG
                    value={booking.qrToken || booking.id || booking._id}
                    size={140}
                    fgColor="#111827"
                    bgColor="#ffffff"
                    level="H"
                  />
                </div>
                <div className="mt-4 bg-[#F8FAFC] flex items-center gap-2 px-3 py-1 rounded-md border border-gray-100 text-[9px] font-bold tracking-[0.2em] text-gray-900">
                  {booking.internalId || booking.id || booking._id}
                </div>
              </div>

              {/* Details Segment - Ultra Compact */}
              <div className="p-4 bg-[#F8FAFC]">
                <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm">
                  <div className="flex justify-between items-start mb-3 border-b border-gray-50 pb-2">
                     <div>
                        <h3 className="text-[11px] font-bold text-gray-900 leading-none">{merchant.storeName}</h3>
                        <p className="text-[8px] font-bold text-gray-400 mt-1 uppercase truncate max-w-[150px]">{merchant.locality || merchant.address}</p>
                     </div>
                     <div className="px-2 py-0.5 bg-green-50 text-green-600 rounded text-[7px] font-bold uppercase tracking-wider">Verified</div>
                  </div>

                  {booking.items && booking.items.length > 0 && (
                    <div className="space-y-1.5 mb-3">
                      {booking.items.map((it, idx) => {
                        const productName = it.product?.name || it.product?.title || 'Product';
                        const productPrice = Math.round(it.product?.offerPrice || it.product?.discountValue || 0);
                        return (
                          <div key={idx} className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-gray-500">{it.qty} × {productName}</span>
                            <span className="font-bold text-gray-900">₹{Math.round(it.qty * productPrice)}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {booking.totals?.walletDiscount > 0 && (
                    <div className="flex justify-between items-center text-[10px] mb-1.5">
                      <span className="font-bold text-emerald-600">🎉 New customer bonus</span>
                      <span className="font-bold text-emerald-600">-₹{Math.round(booking.totals.walletDiscount)}</span>
                    </div>
                  )}

                  {booking.totals && (
                    <div className="pt-2 flex justify-between items-end border-t border-dashed border-gray-100">
                      <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest leading-none">Total Offline Pay</p>
                      <span className="text-lg font-bold text-[#5EB929] leading-none tracking-tight">₹{Math.round(booking.totals.total || booking.totals.final)}</span>
                    </div>
                  )}
                </div>
                
                {/* Compact Instruction */}
                <div className="mt-3 flex items-center justify-center gap-2">
                   <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-pulse" />
                   <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">
                     {isExpired ? 'Pass Expired' : `Expires in ${timeLeft}`} — Show to merchant
                   </p>
                </div>
              </div>
            </motion.div>
          </div>
        ) : null}

        {/* Fulfilled Overlay */}
        <AnimatePresence>
          {isFulfilled && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 bg-gray-950/90 backdrop-blur-xl flex items-center justify-center z-[100] p-4"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.2 }}
                className="bg-white rounded-[2.5rem] p-10 max-w-sm w-full text-center shadow-2xl"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15, delay: 0.4 }}
                  className="w-24 h-24 bg-[#5EB929]/10 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner"
                >
                  <CheckCircleRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 48 }} />
                </motion.div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3 uppercase tracking-tight">Booking Fulfilled!</h2>
                <p className="text-[13px] text-gray-500 font-medium mb-8 leading-relaxed">
                  Your reservation <span className="font-bold text-gray-900">#{booking?.internalId || booking?._id}</span> has been verified and completed successfully.
                </p>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate('/home')}
                  className="w-full py-4.5 bg-gray-900 text-white rounded-2xl font-bold text-[12px] uppercase tracking-[0.2em] shadow-xl shadow-black/10 active:scale-95 transition-all"
                >
                  Return to Home
                </motion.button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </PageTransition>
  );
};

export default QrScreen;
