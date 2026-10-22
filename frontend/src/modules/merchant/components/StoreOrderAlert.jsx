import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { bookingAPI } from '../../../api/booking.api';
import { deliveryAPI } from '../../../api/delivery.api';
import { useSocket } from '../../../context/SocketContext';
import { isRingBlocked, startRinging, stopRinging, subscribeRing } from '../../../utils/ringer';

const NO_ORDERS = [];
const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// A delivery order the store hasn't answered yet.
const needsAnswer = (b) => b.fulfillment === 'delivery' && b.status === 'pending' && b.delivery?.status === 'placed';

// Rings, on every merchant page, until the store accepts or rejects each new
// delivery order. Driven by the order list itself (not just the live event), so
// it also rings for an order that arrived while the app was closed.
const StoreOrderAlert = ({ merchant }) => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [, force] = useState(0);

  const key = ['merchantBookings', merchant?._id];
  const { data: bookings = NO_ORDERS } = useQuery({
    queryKey: key,
    enabled: Boolean(merchant?._id),
    refetchInterval: 15000,
    staleTime: 5000,
    queryFn: async () => {
      const response = await bookingAPI.getMerchantRedemptions();
      if (!response.success) throw new Error('Sync failed');
      return response.data;
    },
  });
  const waiting = useMemo(() => bookings.filter(needsAnswer), [bookings]);
  const order = waiting[0];

  // A new order or a change: refresh right away instead of waiting for the poll.
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = (n) => {
      if (['new_booking', 'delivery_update', 'booking_updated'].includes(n?.type)) queryClient.invalidateQueries({ queryKey: key });
    };
    socket.on('merchant_notification', refresh);
    return () => socket.off('merchant_notification', refresh);
  }, [socket, merchant?._id]);

  useEffect(() => {
    if (order) startRinging();
    else stopRinging();
    return () => stopRinging();
  }, [Boolean(order)]);

  useEffect(() => subscribeRing(() => force((n) => n + 1)), []);
  useEffect(() => { setRejecting(false); setReason(''); }, [order?._id]);

  if (!order) return null;

  const d = order.delivery || {};
  const itemCount = (order.items || []).reduce((s, it) => s + (it.qty || 0), 0);
  const refreshList = () => queryClient.invalidateQueries({ queryKey: key });

  const accept = async () => {
    setBusy('accept');
    try {
      await deliveryAPI.storeAccept(order._id);
      toast.success(`Order #${order.internalId} accepted. Start packing.`);
      refreshList();
    } catch (err) {
      toast.error(err?.error || 'Could not accept the order');
      refreshList();
    } finally {
      setBusy('');
    }
  };

  const reject = async () => {
    setBusy('reject');
    try {
      await bookingAPI.cancel(order._id, reason.trim());
      toast.success('Order rejected');
      refreshList();
    } catch (err) {
      toast.error(err?.error || 'Could not reject the order');
      refreshList();
    } finally {
      setBusy('');
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-gray-950/70 backdrop-blur-md flex items-center justify-center p-4" role="alertdialog" aria-label="New delivery order">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-[#5EB929] text-white px-5 py-4 flex items-center gap-3">
          <NotificationsActiveRoundedIcon className="animate-pulse" />
          <div className="flex-1">
            <p className="text-[15px] font-bold leading-tight">New delivery order</p>
            <p className="text-[11px] opacity-90">{waiting.length > 1 ? `${waiting.length} orders waiting for you` : 'Accept or reject to stop the ring'}</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[15px] font-bold text-gray-900">#{order.internalId}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{d.paymentMode === 'online' ? 'Prepaid' : 'Cash on delivery'}</span>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 space-y-1">
            {(order.items || []).slice(0, 4).map((it, i) => (
              <p key={i} className="text-[13px] text-gray-700 flex justify-between"><span>{it.qty} × {it.product?.name || 'Item'}</span></p>
            ))}
            {(order.items || []).length > 4 && <p className="text-[12px] text-gray-400">+ {(order.items || []).length - 4} more</p>}
            <p className="pt-1 text-[12px] text-gray-500">{itemCount} item{itemCount === 1 ? '' : 's'} · Items bill {rupees(order.totals?.final)}</p>
            {order.freeGift?.title && <p className="text-[12px] text-amber-700">Pack the free {order.freeGift.title} too</p>}
          </div>

          {isRingBlocked() && (
            <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center">Tap anywhere on the screen to turn the ring on</p>
          )}

          {rejecting && (
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why can't you take it? (optional)"
              className="w-full h-11 px-3 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-red-300"
            />
          )}

          <div className="flex gap-2 pt-1">
            {rejecting ? (
              <>
                <button onClick={() => setRejecting(false)} disabled={Boolean(busy)} className="flex-1 h-12 rounded-xl bg-gray-100 text-gray-600 font-bold text-sm">Back</button>
                <button onClick={reject} disabled={Boolean(busy)} className="flex-1 h-12 rounded-xl bg-red-500 text-white font-bold text-sm disabled:opacity-60">{busy === 'reject' ? 'Rejecting...' : 'Reject order'}</button>
              </>
            ) : (
              <>
                <button onClick={() => setRejecting(true)} disabled={Boolean(busy)} className="flex-1 h-12 rounded-xl border border-red-200 text-red-500 font-bold text-sm">Reject</button>
                <button onClick={accept} disabled={Boolean(busy)} className="flex-[2] h-12 rounded-xl bg-[#5EB929] text-white font-bold text-sm shadow-lg shadow-[#5EB929]/20 disabled:opacity-60">{busy === 'accept' ? 'Accepting...' : 'Accept order'}</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default StoreOrderAlert;
