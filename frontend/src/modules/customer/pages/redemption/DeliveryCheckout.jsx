import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import MyLocationRoundedIcon from '@mui/icons-material/MyLocationRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';

import { cartAPI } from '../../../../api/cart.api';
import { bookingAPI } from '../../../../api/booking.api';
import { deliveryAPI } from '../../../../api/delivery.api';
import { useApp } from '../../context/AppContext';
import { useDeliveryConfig, priceDelivery } from '../../../../hooks/useDeliveryConfig';
import { getUseReferralPoints, setUseReferralPoints } from '../../../../utils/referralPoints';
import { getSavedAddress, saveAddress } from '../../../../utils/fulfillment';
import { loadRazorpay } from '../../../../utils/razorpay';
import PageTransition from '../../components/ui/PageTransition';
import ProductThumb from '../../components/ui/ProductThumb';

const Field = ({ label, error, className = '', ...props }) => (
  <label className={`block ${className}`}>
    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</span>
    <input
      {...props}
      className={`mt-1.5 w-full h-12 px-4 bg-[#F8FAFC] border rounded-xl text-[13px] font-semibold text-gray-900 outline-none transition-all focus:bg-white focus:border-[#5EB929]/50 focus:ring-2 focus:ring-[#5EB929]/10 ${
        error ? 'border-red-300' : 'border-gray-100'
      }`}
    />
    {error && <span className="block mt-1 text-[10px] font-bold text-red-500">{error}</span>}
  </label>
);

// Distance in km between two points (same formula as the server).
const haversineKm = (a, b) => {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

const DeliveryCheckout = () => {
  const navigate = useNavigate();
  const { user, refreshUser } = useApp();
  const { config, isLoading: configLoading } = useDeliveryConfig();

  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);
  const [locating, setLocating] = useState(false);
  const [errors, setErrors] = useState({});

  const [address, setAddress] = useState(() => {
    const saved = getSavedAddress() || {};
    return {
      name: saved.name || user?.name || '',
      phone: saved.phone || String(user?.phone || '').replace(/\D/g, '').slice(-10),
      line1: saved.line1 || '',
      line2: saved.line2 || '',
      landmark: saved.landmark || '',
      pincode: saved.pincode || '',
      lat: typeof saved.lat === 'number' ? saved.lat : null,
      lng: typeof saved.lng === 'number' ? saved.lng : null,
    };
  });
  const [paymentMode, setPaymentMode] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await cartAPI.getCart();
        const data = res?.data;
        if (!data || !data.items?.length) {
          navigate('/cart', { replace: true });
          return;
        }
        setCart(data);
      } catch {
        toast.error('Could not load your cart');
        navigate('/cart', { replace: true });
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (configLoading) return;
    if (!config.enabled) {
      toast.error('Home delivery is not available right now');
      navigate('/cart', { replace: true });
      return;
    }
    setPaymentMode((prev) => {
      if (prev === 'online' && config.allowOnline) return prev;
      if (prev === 'cod' && config.allowCod) return prev;
      return config.allowOnline ? 'online' : 'cod';
    });
  }, [config, configLoading, navigate]);

  const store = cart?.merchantId && typeof cart.merchantId === 'object' ? cart.merchantId : null;
  const items = cart?.items || [];
  const base = Math.round(items.reduce((s, it) => s + (it.product?.price || 0) * it.qty, 0));
  const subtotal = Math.round(items.reduce((s, it) => s + (it.product?.offerPrice || 0) * it.qty, 0));
  const storeDiscount = base - subtotal;
  const bonus = Math.round(cart?.offerlyExtraDiscount || 0);
  const afterBonus = Math.max(0, subtotal - bonus);

  // Referral points ticked in the cart, under the same admin limits.
  const creditRules = cart?.creditRules || {};
  const wantsPoints = getUseReferralPoints();
  const points = wantsPoints && subtotal >= (creditRules.minOrderValue || 0)
    ? Math.min(Math.max(0, Math.floor(user?.credits || 0)), afterBonus, creditRules.maxPerOrder > 0 ? creditRules.maxPerOrder : Infinity)
    : 0;

  const pricing = priceDelivery(config, subtotal, 'delivery');
  const total = afterBonus - points + pricing.fee;

  const storePin = store?.coordinates?.lat && store?.coordinates?.lng ? store.coordinates : null;
  const distanceKm = useMemo(() => {
    if (!storePin || address.lat == null || address.lng == null) return null;
    return Math.round(haversineKm(storePin, { lat: address.lat, lng: address.lng }) * 10) / 10;
  }, [storePin, address.lat, address.lng]);
  const outOfRange = config.maxDistanceKm > 0 && distanceKm != null && distanceKm > config.maxDistanceKm;

  const set = (key) => (e) => {
    let value = e.target.value;
    if (key === 'phone') value = value.replace(/\D/g, '').slice(0, 10);
    if (key === 'pincode') value = value.replace(/\D/g, '').slice(0, 6);
    setAddress((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location is not available on this device');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setAddress((prev) => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude }));
        setErrors((prev) => ({ ...prev, pin: '' }));
        setLocating(false);
        toast.success('Location pinned');
      },
      () => {
        setLocating(false);
        toast.error('Allow location access to pin your address');
      },
      { enableHighAccuracy: true, timeout: 15000 }
    );
  };

  const validate = () => {
    const next = {};
    if (address.name.trim().length < 2) next.name = 'Enter the receiver\'s name';
    if (!/^[6-9]\d{9}$/.test(address.phone)) next.phone = 'Enter a valid 10-digit mobile number';
    if (address.line1.trim().length < 3) next.line1 = 'Enter your house / flat and building';
    if (address.pincode && !/^\d{6}$/.test(address.pincode)) next.pincode = 'Enter a valid 6-digit pincode';
    if (config.maxDistanceKm > 0 && (address.lat == null || address.lng == null)) next.pin = 'Pin your location so we can check the store delivers to you';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const goToOrder = (id) => navigate(`/order/${id}`, { replace: true });

  const openCheckout = async (orderId, payment) => {
    const loaded = await loadRazorpay();
    if (!loaded) {
      toast.error('Payment could not load. You can pay from the order page.');
      goToOrder(orderId);
      return;
    }
    const rzp = new window.Razorpay({
      key: payment.key,
      amount: payment.amount,
      currency: payment.currency,
      name: 'Offerly',
      description: `Delivery order from ${store?.storeName || 'store'}`,
      order_id: payment.orderId,
      prefill: payment.customerDetails,
      theme: { color: '#5EB929' },
      handler: async (response) => {
        const t = toast.loading('Confirming payment...');
        try {
          await deliveryAPI.verifyPayment(orderId, response);
          toast.success('Payment received. Order placed!', { id: t });
        } catch (err) {
          toast.error(err?.error || 'We could not confirm the payment yet. Check the order page.', { id: t });
        }
        goToOrder(orderId);
      },
      modal: {
        ondismiss: () => {
          toast('Payment not completed. You can pay from the order page.');
          goToOrder(orderId);
        },
      },
    });
    rzp.open();
  };

  const placeOrder = async () => {
    if (!validate()) {
      toast.error('Please check the delivery details');
      return;
    }
    if (outOfRange) {
      toast.error(`This store delivers within ${config.maxDistanceKm} km`);
      return;
    }
    setPlacing(true);
    try {
      const cleanAddress = {
        name: address.name.trim(),
        phone: address.phone,
        line1: address.line1.trim(),
        line2: address.line2.trim(),
        landmark: address.landmark.trim(),
        pincode: address.pincode,
        lat: address.lat,
        lng: address.lng,
      };
      const res = await bookingAPI.create({
        merchantId: store?._id || cart.merchantId,
        items: items.map((it) => ({ productId: it.product._id || it.product.id, variantId: it.variant?._id || null, qty: it.qty })),
        useReferralPoints: points > 0,
        fulfillment: 'delivery',
        delivery: { paymentMode, address: cleanAddress },
      });
      const order = res?.data;
      if (!order?._id) throw new Error('Order could not be placed');

      saveAddress(cleanAddress);
      await cartAPI.clearCart().catch(() => {});
      try {
        sessionStorage.removeItem('offerly_cached_cart');
      } catch {
        // ignore
      }
      if (points > 0) {
        setUseReferralPoints(false);
        refreshUser().catch(() => {});
      }

      if (res.payment) {
        await openCheckout(order._id, res.payment);
      } else {
        toast.success('Order placed!');
        goToOrder(order._id);
      }
    } catch (err) {
      if (err?.code === 'SUBSCRIPTION_REQUIRED') {
        navigate('/subscribe', { state: { from: '/checkout' } });
        return;
      }
      toast.error(err?.error || err?.message || 'Could not place the order');
    } finally {
      setPlacing(false);
    }
  };

  if (loading || configLoading || !cart) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const paymentOptions = [
    config.allowOnline && {
      key: 'online',
      title: 'Pay Online',
      hint: 'UPI, cards, net banking',
      icon: CreditCardRoundedIcon,
    },
    config.allowCod && {
      key: 'cod',
      title: 'Cash / UPI on Delivery',
      hint: 'Pay the delivery partner at your door',
      icon: PaymentsRoundedIcon,
    },
  ].filter(Boolean);

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] pb-36">
        <div className="px-4 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700" aria-label="Back">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-none uppercase tracking-tight">Checkout</h1>
            <div className="flex items-center gap-1.5 mt-1.5">
              <LocalShippingRoundedIcon sx={{ fontSize: 12 }} className="text-[#5EB929]" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Home delivery · {store?.storeName}</p>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Address */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-[#5EB929]/10 rounded-lg flex items-center justify-center text-[#5EB929]">
                <LocationOnRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest">Deliver To</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Receiver's name" value={address.name} onChange={set('name')} error={errors.name} autoComplete="name" />
              <Field label="Mobile number" type="tel" inputMode="numeric" value={address.phone} onChange={set('phone')} error={errors.phone} autoComplete="tel-national" placeholder="10-digit number" />
              <Field className="sm:col-span-2" label="House / Flat, Building" value={address.line1} onChange={set('line1')} error={errors.line1} autoComplete="address-line1" placeholder="e.g. 12B, Sunrise Apartments" />
              <Field className="sm:col-span-2" label="Area, Street" value={address.line2} onChange={set('line2')} autoComplete="address-line2" placeholder="e.g. MG Road, Vijay Nagar" />
              <Field label="Landmark (optional)" value={address.landmark} onChange={set('landmark')} placeholder="Near..." />
              <Field label="Pincode" inputMode="numeric" value={address.pincode} onChange={set('pincode')} error={errors.pincode} autoComplete="postal-code" />
            </div>

            <button
              type="button"
              onClick={useCurrentLocation}
              disabled={locating}
              className={`mt-4 w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-dashed text-[12px] font-bold transition-all ${
                address.lat != null ? 'border-[#5EB929]/40 bg-[#5EB929]/5 text-[#4E9F1F]' : errors.pin ? 'border-red-300 text-red-500' : 'border-gray-200 text-gray-600 hover:border-[#5EB929]/40'
              }`}
            >
              {locating ? (
                <div className="w-4 h-4 border-2 border-[#5EB929]/30 border-t-[#5EB929] rounded-full animate-spin" />
              ) : address.lat != null ? (
                <CheckCircleRoundedIcon sx={{ fontSize: 18 }} />
              ) : (
                <MyLocationRoundedIcon sx={{ fontSize: 18 }} />
              )}
              {address.lat != null
                ? `Location pinned${distanceKm != null ? ` · ${distanceKm} km from store` : ''} (tap to update)`
                : `Pin my current location${config.maxDistanceKm > 0 ? '' : ' (helps the partner find you)'}`}
            </button>
            {errors.pin && <p className="mt-1.5 text-[10px] font-bold text-red-500">{errors.pin}</p>}
            {outOfRange && (
              <p className="mt-2 text-[11px] font-bold text-red-500">
                This store delivers within {config.maxDistanceKm} km and you're {distanceKm} km away. Choose pickup instead.
              </p>
            )}
          </div>

          {/* Payment */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-widest mb-4">Payment Method</h3>
            <div className="space-y-2.5" role="radiogroup" aria-label="Payment method">
              {paymentOptions.map((opt) => {
                const active = paymentMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setPaymentMode(opt.key)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${
                      active ? 'border-[#5EB929] bg-[#5EB929]/5' : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${active ? 'bg-[#5EB929] text-white' : 'bg-gray-50 text-gray-400'}`}>
                      <opt.icon sx={{ fontSize: 20 }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-900">{opt.title}</p>
                      <p className="text-[11px] font-medium text-gray-400">{opt.hint}</p>
                    </div>
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${active ? 'border-[#5EB929]' : 'border-gray-300'}`}>
                      {active && <span className="w-2.5 h-2.5 rounded-full bg-[#5EB929]" />}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Order Summary</h3>
            <div className="space-y-3 mb-5">
              {items.map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <ProductThumb src={it.product?.images?.[0]} alt={it.product?.name} className="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold text-gray-900 truncate">{it.product?.name}</p>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{it.variant?.label ? `${it.variant.label} · ` : ''}Qty {it.qty}</p>
                  </div>
                  <span className="text-[13px] font-bold text-gray-900">₹{Math.round((it.product?.offerPrice || 0) * it.qty)}</span>
                </div>
              ))}
            </div>

            {pricing.giftUnlocked && (
              <div className="mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3">
                <CardGiftcardRoundedIcon className="text-amber-600" sx={{ fontSize: 20 }} />
                <div className="min-w-0">
                  <p className="text-[12px] font-black text-amber-800">Free {pricing.gift.title} included</p>
                  {pricing.gift.description && <p className="text-[10px] font-medium text-amber-700/80">{pricing.gift.description}</p>}
                </div>
              </div>
            )}

            <div className="space-y-2.5 pt-4 border-t border-dashed border-gray-100">
              <Row label="Item total (MRP)" value={`₹${base}`} />
              {storeDiscount > 0 && <Row label="Store discount" value={`- ₹${storeDiscount}`} green />}
              {bonus > 0 && <Row label={cart.offerlyBonusLabel || 'Offerly bonus'} value={`- ₹${bonus}`} green />}
              {points > 0 && <Row label="Referral points" value={`- ₹${points}`} green />}
              <Row
                label="Delivery fee"
                value={pricing.fee > 0 ? `+ ₹${pricing.fee}` : 'FREE'}
                green={pricing.fee === 0}
                strike={pricing.fee === 0 && config.deliveryFee > 0 ? `₹${config.deliveryFee}` : ''}
              />
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100 flex items-end justify-between">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">To Pay</p>
                <p className="text-[11px] font-semibold text-gray-400">{paymentMode === 'online' ? 'Paid online now' : 'Paid at your door'}</p>
              </div>
              <p className="text-2xl font-bold text-[#5EB929] tracking-tight">₹{Math.max(0, total)}</p>
            </div>
          </div>

          <p className="flex items-center justify-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
            <LockRoundedIcon sx={{ fontSize: 12 }} /> You'll get a delivery code to share at handover
          </p>
        </div>

        <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-gray-100 z-40">
          <div className="p-3 max-w-2xl mx-auto">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={placeOrder}
              disabled={placing || outOfRange || !paymentMode}
              className="w-full bg-gray-900 text-white rounded-xl py-4 font-bold text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl shadow-black/20 disabled:opacity-50"
            >
              {placing ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : paymentMode === 'online' ? (
                <>Pay ₹{Math.max(0, total)} & Place Order</>
              ) : (
                <>Place Order · ₹{Math.max(0, total)}</>
              )}
            </motion.button>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

const Row = ({ label, value, green, strike }) => (
  <div className="flex justify-between items-center">
    <span className="text-[12px] font-bold text-gray-500 uppercase tracking-tight">{label}</span>
    <span className={`text-[13px] font-bold ${green ? 'text-[#5EB929]' : 'text-gray-900'}`}>
      {strike && <span className="mr-1.5 text-gray-300 line-through font-semibold">{strike}</span>}
      {value}
    </span>
  </div>
);

export default DeliveryCheckout;
