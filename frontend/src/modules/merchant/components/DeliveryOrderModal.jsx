import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { bookingAPI } from '../../../api/booking.api';
import { DELIVERY_STAGE } from '../utils/deliveryStage';

// Store's view of a delivery order: pack it, hand it to the partner, or reject it.
// The partner completes it at the customer's door.
const DeliveryOrderModal = ({ booking, onClose, onChanged }) => {
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const d = booking.delivery || {};
  const stage = booking.status === 'expired' ? 'cancelled' : d.status;
  const stageInfo = DELIVERY_STAGE[stage] || DELIVERY_STAGE.placed;
  const sentBack = ['returning', 'returned'].includes(stage);
  const addr = d.address || {};
  const itemsValue = Math.round(booking.totals?.final || 0);
  const offerlyShare = Math.round((booking.totals?.referralDiscount || 0) + (booking.totals?.walletDiscount || 0));

  const run = async (key, fn, success) => {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(success);
      onChanged(res?.data);
    } catch (err) {
      toast.error(err?.error || 'Could not update the order');
    } finally {
      setBusy('');
    }
  };

  const Spinner = () => <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />;

  return createPortal(
    <div className="fixed inset-0 bg-gray-950/60 backdrop-blur-md flex items-center justify-center p-4 z-[9999]">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
          <div>
            <div className="flex items-center gap-1.5">
              <LocalShippingRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]" />
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery Order</p>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h2 className="text-base font-bold text-gray-900">#{booking.internalId}</h2>
              <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${stageInfo.cls}`}>{stageInfo.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white border border-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600" aria-label="Close">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[65vh] overflow-y-auto">
          <div className="bg-background rounded-xl p-4 border border-gray-100">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{sentBack ? 'Items coming back' : 'Pack these items'}</h4>
            <div className="space-y-2">
              {booking.items?.map((it, idx) => (
                <div key={idx} className="flex justify-between items-center text-xs font-bold text-gray-700">
                  <span>{it.qty} × {it.product?.name || 'Product'}</span>
                  <span className="text-gray-900">₹{(it.qty * (it.product?.offerPrice || 0)).toLocaleString()}</span>
                </div>
              ))}
            </div>
            {booking.freeGift?.title && (
              <div className="mt-3 p-2.5 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                <CardGiftcardRoundedIcon sx={{ fontSize: 16 }} className="text-amber-600" />
                <span className="text-[11px] font-bold text-amber-800">Include free gift: {booking.freeGift.title}</span>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-200 space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-gray-900 uppercase">Order value</span>
                <span className="text-lg font-bold text-[#5EB929]">₹{(itemsValue + offerlyShare).toLocaleString()}</span>
              </div>
              <p className="text-[10px] font-semibold text-gray-500 leading-relaxed">
                {sentBack
                  ? 'Not delivered, so there is no payment for this order.'
                  : <>{d.paymentMode === 'online' ? 'Paid online.' : 'Cash on delivery, collected by the delivery partner.'} Don't collect any money at the counter:
                    Offerly adds the full amount to your Offerly Wallet once it is delivered.</>}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
              <LocationOnRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Deliver to</p>
              <p className="text-[13px] font-bold text-gray-900">{addr.name || booking.customerName}</p>
              <p className="text-[11px] font-medium text-gray-500 leading-snug">
                {[addr.line2, addr.landmark && `Near ${addr.landmark}`, addr.pincode].filter(Boolean).join(', ') || 'Address shared with the delivery partner'}
              </p>
              {d.distanceKm != null && <p className="text-[10px] font-bold text-gray-400 mt-0.5">{d.distanceKm} km away</p>}
            </div>
          </div>

          {d.partnerName ? (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <TwoWheelerRoundedIcon sx={{ fontSize: 18 }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Delivery partner</p>
                <p className="text-[13px] font-bold text-gray-900 truncate">{d.partnerName}</p>
              </div>
              {d.partnerPhone && ['preparing', 'ready', 'returning'].includes(stage) && (
                <a href={`tel:${d.partnerPhone}`} className="w-9 h-9 rounded-xl bg-gray-50 flex items-center justify-center text-gray-600" aria-label="Call partner">
                  <PhoneRoundedIcon sx={{ fontSize: 16 }} />
                </a>
              )}
            </div>
          ) : ['preparing', 'ready'].includes(stage) ? (
            <p className="text-[11px] font-semibold text-gray-500 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" /> Finding a delivery partner...
            </p>
          ) : null}

          {stage === 'returning' && (
            <div className="p-3 rounded-xl bg-orange-50 border border-orange-200">
              <p className="text-[12px] font-bold text-orange-800">{d.partnerName || 'The partner'} couldn't deliver this order and is bringing it back.</p>
              {d.cancelReason && <p className="text-[11px] font-semibold text-orange-700 mt-0.5">Reason: {d.cancelReason}</p>}
              <p className="text-[11px] font-medium text-orange-700 mt-1">Check the items when they arrive, then tap Received back. The stock goes back on sale.</p>
            </div>
          )}
          {stage === 'returned' && (
            <p className="text-[11px] font-semibold text-gray-500">Returned to your store{d.cancelReason ? ` - ${d.cancelReason}` : ''}. The customer was not charged.</p>
          )}

          {stage === 'cancelled' && d.cancelReason && (
            <p className="text-[11px] font-semibold text-gray-500">Cancelled{d.cancelledBy ? ` by ${d.cancelledBy}` : ''}: {d.cancelReason}</p>
          )}

          {rejecting && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest" htmlFor="reject-reason">Why can't you take it?</label>
              <input
                id="reject-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Item out of stock"
                className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm outline-none focus:border-red-300"
              />
            </div>
          )}
        </div>

        <div className="p-5 bg-gray-50 flex gap-3">
          {rejecting ? (
            <>
              <button onClick={() => setRejecting(false)} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm">Back</button>
              <button
                onClick={() => run('reject', () => bookingAPI.cancel(booking._id, reason.trim()), 'Order rejected')}
                disabled={Boolean(busy)}
                className="flex-[2] py-3 bg-red-500 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {busy === 'reject' ? <Spinner /> : 'Reject Order'}
              </button>
            </>
          ) : (
            <>
              {['placed', 'preparing', 'ready'].includes(stage) && booking.status === 'pending' ? (
                <button onClick={() => setRejecting(true)} className="flex-1 py-3 bg-white border border-gray-200 text-red-500 rounded-xl font-bold text-sm">Reject</button>
              ) : (
                <button onClick={onClose} className="flex-1 py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-sm">Close</button>
              )}
              {stage === 'placed' && (
                <button
                  onClick={() => run('accept', () => deliveryAPI.storeAccept(booking._id), 'Accepted. Start packing!')}
                  disabled={Boolean(busy)}
                  className="flex-[2] py-3 bg-[#5EB929] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy === 'accept' ? <Spinner /> : <><CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> Accept & Pack</>}
                </button>
              )}
              {stage === 'preparing' && (
                <button
                  onClick={() => run('ready', () => deliveryAPI.storeReady(booking._id), 'Marked as packed')}
                  disabled={Boolean(busy)}
                  className="flex-[2] py-3 bg-[#5EB929] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#5EB929]/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy === 'ready' ? <Spinner /> : <><Inventory2RoundedIcon sx={{ fontSize: 18 }} /> Mark Packed</>}
                </button>
              )}
              {stage === 'returning' && (
                <button
                  onClick={() => run('returned', () => deliveryAPI.storeReturned(booking._id), 'Return received. Stock is back on sale.')}
                  disabled={Boolean(busy)}
                  className="flex-[2] py-3 bg-orange-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {busy === 'returned' ? <Spinner /> : <><CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> Received back</>}
                </button>
              )}
              {stage === 'ready' && (
                <div className="flex-[2] py-3 bg-white border border-gray-200 text-gray-500 rounded-xl font-bold text-xs text-center">
                  Hand it to {d.partnerName || 'the partner'} on arrival
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default DeliveryOrderModal;
