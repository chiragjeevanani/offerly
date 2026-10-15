import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import HourglassTopRoundedIcon from '@mui/icons-material/HourglassTopRounded';

import { bookingAPI } from '../../../../api/booking.api';
import { deliveryAPI } from '../../../../api/delivery.api';
import { useSocket } from '../../../../context/SocketContext';
import { loadRazorpay } from '../../../../utils/razorpay';
import PageTransition from '../../components/ui/PageTransition';
import ProductThumb from '../../components/ui/ProductThumb';

const STEPS = [
  { key: 'placed', label: 'Order placed', at: 'placedAt' },
  { key: 'preparing', label: 'Store is packing', at: 'acceptedAt' },
  { key: 'ready', label: 'Packed & ready', at: 'readyAt' },
  { key: 'picked_up', label: 'Out for delivery', at: 'pickedUpAt' },
  { key: 'delivered', label: 'Delivered', at: 'deliveredAt' },
];
const STEP_INDEX = Object.fromEntries(STEPS.map((s, i) => [s.key, i]));

const HERO = {
  awaiting_payment: { title: 'Complete your payment', sub: 'Your order goes to the store once it is paid.', icon: HourglassTopRoundedIcon },
  placed: { title: 'Waiting for the store', sub: 'The store will confirm your order shortly.', icon: StorefrontRoundedIcon },
  preparing: { title: 'Packing your order', sub: 'The store is getting your items ready.', icon: Inventory2RoundedIcon },
  ready: { title: 'Ready for pickup', sub: 'Your order is packed and waiting for the delivery partner.', icon: Inventory2RoundedIcon },
  picked_up: { title: 'On the way!', sub: 'Your delivery partner is heading to you.', icon: TwoWheelerRoundedIcon },
  delivered: { title: 'Delivered', sub: 'Enjoy your order!', icon: CheckRoundedIcon },
  cancelled: { title: 'Order cancelled', sub: '', icon: CancelRoundedIcon },
};

const time = (d) => (d ? new Date(d).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '');

const refundText = {
  refund_pending: 'Your refund is being processed.',
  refunded: 'Refund started. It usually reaches your account in 5-7 working days.',
  refund_failed: 'Your refund is delayed. Our team will get it to you; contact support if it takes long.',
};

const OrderTracking = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await bookingAPI.getById(id);
      const data = res?.data;
      if (!data) throw new Error('not found');
      if (data.fulfillment !== 'delivery') {
        navigate(`/redeem/${id}`, { replace: true });
        return;
      }
      setOrder(data);
    } catch {
      toast.error('Order not found');
      navigate('/redemptions', { replace: true });
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    load();
  }, [load]);

  const stage = order?.delivery?.status;
  const orderId = order?._id;
  const isLive = order && order.status === 'pending';

  // Live updates: socket first, polling as a fallback.
  useEffect(() => {
    if (!socket || !orderId) return;
    const onNote = (n) => {
      const rid = n?.redemptionId || n?.data?.redemptionId;
      if (rid && String(rid) === String(orderId)) load();
    };
    socket.on('user_notification', onNote);
    return () => socket.off('user_notification', onNote);
  }, [socket, orderId, load]);

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [isLive, load]);

  const pay = async () => {
    setBusy(true);
    try {
      const res = await deliveryAPI.getPayment(order._id);
      const payment = res?.payment;
      if (!(await loadRazorpay())) throw new Error('Payment could not load. Check your connection.');
      new window.Razorpay({
        key: payment.key,
        amount: payment.amount,
        currency: payment.currency,
        name: 'Offerly',
        description: `Order #${order.internalId}`,
        order_id: payment.orderId,
        prefill: payment.customerDetails,
        theme: { color: '#5EB929' },
        handler: async (response) => {
          const t = toast.loading('Confirming payment...');
          try {
            await deliveryAPI.verifyPayment(order._id, response);
            toast.success('Payment received. Order placed!', { id: t });
          } catch (err) {
            toast.error(err?.error || 'Could not confirm the payment yet', { id: t });
          }
          load();
        },
        modal: { ondismiss: () => setBusy(false) },
      }).open();
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not start payment');
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    setBusy(true);
    try {
      await deliveryAPI.cancelOrder(order._id);
      toast.success('Order cancelled');
      setConfirmCancel(false);
      load();
    } catch (err) {
      toast.error(err?.error || 'Could not cancel the order');
    } finally {
      setBusy(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const d = order.delivery || {};
  const store = order.merchantId || {};
  const lapsed = order.status === 'expired' || stage === 'cancelled';
  const hero = HERO[lapsed ? 'cancelled' : stage] || HERO.placed;
  const HeroIcon = hero.icon;
  const currentIdx = STEP_INDEX[stage] ?? -1;
  const total = Math.round((order.totals?.final || 0) + (d.fee || 0));
  const canCancel = isLive && ['awaiting_payment', 'placed', 'preparing', 'ready'].includes(stage);
  const showCode = isLive && ['placed', 'preparing', 'ready', 'picked_up'].includes(stage) && d.otp;
  const addr = d.address || {};
  const cancelSub = d.cancelledBy === 'customer'
    ? 'You cancelled this order.'
    : d.cancelledBy === 'store'
      ? `The store cancelled this order.${d.cancelReason ? ` ${d.cancelReason}` : ''}`
      : d.cancelReason || 'This order was cancelled.';

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F8FAFC] pb-28">
        <div className="px-4 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30 shadow-sm">
          <button onClick={() => navigate('/redemptions')} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700" aria-label="Back">
            <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-none uppercase tracking-tight">Order #{order.internalId}</h1>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 truncate">{store.storeName} · Home delivery</p>
          </div>
        </div>

        <div className="p-4 space-y-4 max-w-2xl mx-auto">
          {/* Status hero */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`relative overflow-hidden rounded-[2rem] p-6 shadow-xl text-white ${
              lapsed ? 'bg-gradient-to-br from-gray-800 to-gray-900' : 'bg-gradient-to-br from-gray-950 via-gray-900 to-[#132c0c] border border-[#5EB929]/30'
            }`}
          >
            {!lapsed && <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5EB929]/25 rounded-full blur-2xl pointer-events-none" />}
            <div className="relative flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${lapsed ? 'bg-white/10' : 'bg-gradient-to-tr from-[#5EB929] to-[#8cee50] shadow-lg shadow-[#5EB929]/30'}`}>
                <HeroIcon sx={{ fontSize: 28 }} className={stage === 'picked_up' ? 'animate-pulse' : ''} />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl font-black tracking-tight">{hero.title}</h2>
                <p className="text-[12px] text-gray-300 font-medium mt-0.5">{lapsed ? cancelSub : hero.sub}</p>
              </div>
            </div>
            {lapsed && refundText[d.paymentStatus] && (
              <p className="relative mt-4 text-[11px] font-semibold text-amber-200 bg-white/5 rounded-xl px-3 py-2">{refundText[d.paymentStatus]}</p>
            )}
          </motion.div>

          {/* Awaiting payment */}
          {isLive && stage === 'awaiting_payment' && (
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-amber-100">
              <p className="text-[12px] font-semibold text-gray-600">
                Pay <span className="font-black text-gray-900">₹{total}</span> before{' '}
                <span className="font-black text-gray-900">{time(order.qrExpiry)}</span> or the order is dropped.
              </p>
              <button onClick={pay} disabled={busy} className="mt-4 w-full h-12 rounded-xl bg-[#5EB929] text-white font-bold text-[12px] uppercase tracking-widest shadow-lg shadow-[#5EB929]/20 disabled:opacity-50">
                Pay ₹{total} Now
              </button>
            </div>
          )}

          {/* Delivery code */}
          {showCode && (
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-[#5EB929]/20 text-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Code</p>
              <div className="flex justify-center gap-2.5 my-3" aria-label={`Delivery code ${d.otp.split('').join(' ')}`}>
                {d.otp.split('').map((digit, i) => (
                  <span key={i} className="w-12 h-14 rounded-xl bg-[#F8FAFC] border border-gray-100 flex items-center justify-center text-2xl font-black text-gray-900">
                    {digit}
                  </span>
                ))}
              </div>
              <p className="text-[11px] font-semibold text-gray-500">Share this code with the delivery partner only when you receive your order.</p>
              {d.paymentMode === 'cod' && (
                <p className="mt-2 text-[11px] font-bold text-[#4E9F1F]">Keep ₹{total} ready (cash or UPI)</p>
              )}
            </div>
          )}

          {/* Timeline */}
          {stage !== 'awaiting_payment' && (
            <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Order Status</h3>
              <ol className="relative">
                {STEPS.map((step, i) => {
                  const done = !lapsed && i <= currentIdx;
                  const current = !lapsed && i === currentIdx && stage !== 'delivered';
                  return (
                    <li key={step.key} className="flex gap-3 pb-4 last:pb-0 relative">
                      {i < STEPS.length - 1 && (
                        <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${!lapsed && i < currentIdx ? 'bg-[#5EB929]' : 'bg-gray-100'}`} />
                      )}
                      <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                        done ? 'bg-[#5EB929] text-white' : 'bg-gray-100 text-gray-300'
                      } ${current ? 'ring-4 ring-[#5EB929]/20' : ''}`}>
                        {done ? <CheckRoundedIcon sx={{ fontSize: 14 }} /> : <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />}
                      </span>
                      <div className="flex-1 flex justify-between gap-2 -mt-0.5">
                        <p className={`text-[13px] font-bold ${done ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                        <p className="text-[11px] font-semibold text-gray-400">{done ? time(d[step.at]) : ''}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {/* Partner */}
          {d.partnerName && isLive && (
            <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-50 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
                <TwoWheelerRoundedIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Delivery Partner</p>
                <p className="text-[14px] font-bold text-gray-900 truncate">{d.partnerName}</p>
              </div>
              {d.partnerPhone && (
                <a href={`tel:${d.partnerPhone}`} className="w-11 h-11 rounded-xl bg-[#5EB929] text-white flex items-center justify-center shadow-lg shadow-[#5EB929]/20" aria-label="Call delivery partner">
                  <PhoneRoundedIcon sx={{ fontSize: 20 }} />
                </a>
              )}
            </div>
          )}

          {/* Store + address */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center shrink-0">
                <StorefrontRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">From</p>
                <p className="text-[13px] font-bold text-gray-900">{store.storeName}</p>
                <p className="text-[11px] font-medium text-gray-400 truncate">{store.locality || store.address}</p>
              </div>
              {store.phone && isLive && (
                <a href={`tel:${store.phone}`} className="w-9 h-9 rounded-xl bg-gray-50 text-gray-600 flex items-center justify-center" aria-label="Call store">
                  <PhoneRoundedIcon sx={{ fontSize: 16 }} />
                </a>
              )}
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
                <LocationOnRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Deliver to</p>
                <p className="text-[13px] font-bold text-gray-900">{addr.name} · {addr.phone}</p>
                <p className="text-[11px] font-medium text-gray-500 leading-snug">
                  {[addr.line1, addr.line2, addr.landmark && `Near ${addr.landmark}`, addr.pincode].filter(Boolean).join(', ')}
                </p>
              </div>
            </div>
          </div>

          {/* Gift */}
          {order.freeGift?.title && (
            <div className="rounded-3xl p-4 border bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 flex items-center gap-3">
              <CardGiftcardRoundedIcon className="text-amber-600" />
              <div>
                <p className="text-[12px] font-black text-amber-800">Free {order.freeGift.title}</p>
                {order.freeGift.description && <p className="text-[11px] font-medium text-amber-700/80">{order.freeGift.description}</p>}
              </div>
            </div>
          )}

          {/* Bill */}
          <div className="bg-white rounded-[2rem] p-5 shadow-sm border border-gray-50">
            <div className="flex items-center gap-2 mb-4">
              <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} className="text-gray-400" />
              <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Bill Details</h3>
            </div>
            <div className="space-y-2.5 mb-4">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <ProductThumb src={it.product?.image} alt={it.product?.name} className="w-9 h-9" />
                  <span className="flex-1 min-w-0 truncate text-[12px] font-bold text-gray-700">{it.qty} × {it.product?.name}</span>
                  <span className="text-[12px] font-bold text-gray-900">₹{Math.round((it.product?.offerPrice || 0) * it.qty)}</span>
                </div>
              ))}
            </div>
            <div className="space-y-2 pt-3 border-t border-dashed border-gray-100 text-[12px] font-bold">
              {order.totals?.walletDiscount > 0 && (
                <div className="flex justify-between text-[#5EB929]"><span>{order.totals.bonusLabel || 'Offerly bonus'}</span><span>- ₹{Math.round(order.totals.walletDiscount)}</span></div>
              )}
              {order.totals?.referralDiscount > 0 && (
                <div className="flex justify-between text-[#5EB929]"><span>Referral points</span><span>- ₹{Math.round(order.totals.referralDiscount)}</span></div>
              )}
              <div className="flex justify-between text-gray-500">
                <span>Delivery fee</span>
                <span className={d.fee > 0 ? 'text-gray-900' : 'text-[#5EB929]'}>{d.fee > 0 ? `+ ₹${d.fee}` : 'FREE'}</span>
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-end">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total</p>
                <p className="text-[11px] font-semibold text-gray-400">
                  {d.paymentMode === 'online'
                    ? d.paymentStatus === 'paid' ? 'Paid online' : d.paymentStatus === 'unpaid' ? 'Online · not paid yet' : 'Paid online · refunded'
                    : stage === 'delivered' ? 'Paid on delivery' : 'Cash / UPI on delivery'}
                </p>
              </div>
              <p className="text-2xl font-bold text-[#5EB929] tracking-tight">₹{total}</p>
            </div>
          </div>

          {stage === 'delivered' && !order.hasReview && (
            <button onClick={() => navigate(`/review/${order._id}`)} className="w-full h-12 rounded-xl bg-white border border-[#5EB929]/40 text-[#4E9F1F] font-bold text-[12px] uppercase tracking-widest flex items-center justify-center gap-2">
              <StarRoundedIcon sx={{ fontSize: 18 }} /> Rate this order
            </button>
          )}

          {canCancel && (
            <button onClick={() => setConfirmCancel(true)} className="w-full h-12 rounded-xl text-red-500 font-bold text-[12px] uppercase tracking-widest hover:bg-red-50 transition-colors">
              Cancel Order
            </button>
          )}
        </div>

        <AnimatePresence>
          {confirmCancel && (
            <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && setConfirmCancel(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
              <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} className="relative w-full max-w-sm bg-white rounded-[2rem] p-6 shadow-2xl">
                <h3 className="text-lg font-bold text-gray-900">Cancel this order?</h3>
                <p className="mt-1 text-[13px] text-gray-500">
                  {d.paymentStatus === 'paid' ? `Your ₹${total} will be refunded to your original payment method.` : 'The store will be told not to pack it.'}
                </p>
                <div className="mt-6 flex gap-3">
                  <button onClick={() => setConfirmCancel(false)} disabled={busy} className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-700 font-bold text-[12px] uppercase tracking-widest">Keep it</button>
                  <button onClick={cancel} disabled={busy} className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold text-[12px] uppercase tracking-widest disabled:opacity-50">
                    {busy ? 'Cancelling...' : 'Cancel order'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {stage === 'picked_up' && (
          <div className="sr-only" aria-live="polite">Your order is out for delivery</div>
        )}
      </div>
    </PageTransition>
  );
};

export default OrderTracking;
