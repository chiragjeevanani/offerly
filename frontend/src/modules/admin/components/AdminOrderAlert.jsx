import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { useSocket } from '../../../hooks/useSocket';
import { isRingBlocked, startRinging, stopRinging, subscribeRing } from '../../../utils/ringer';

const NO_ORDERS = [];
const KEY = ['adminOrdersToVerify'];
const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

// Rings on every admin page while a delivery order is waiting for the admin's
// confirmation call (the "verify orders first" setting), until it is verified
// (sent to the store) or cancelled. A compact card, not a modal, so the admin
// can keep working while it rings.
const AdminOrderAlert = () => {
  const queryClient = useQueryClient();
  const { socket } = useSocket();
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [, force] = useState(0);

  const { data: orders = NO_ORDERS } = useQuery({
    queryKey: KEY,
    queryFn: async () => (await deliveryAPI.getAdminOrders({ stage: 'verifying' }))?.data || [],
    refetchInterval: 15000,
    staleTime: 5000,
  });
  const order = orders.find((o) => o.status === 'pending' && o.delivery?.status === 'verifying');

  // A new order notification: look right away instead of waiting for the poll.
  useEffect(() => {
    if (!socket) return undefined;
    const refresh = () => queryClient.invalidateQueries({ queryKey: KEY });
    socket.on('admin_notification', refresh);
    return () => socket.off('admin_notification', refresh);
  }, [socket, queryClient]);

  useEffect(() => {
    if (order) startRinging();
    else stopRinging();
    return () => stopRinging();
  }, [Boolean(order)]);

  useEffect(() => subscribeRing(() => force((n) => n + 1)), []);
  useEffect(() => { setRejecting(false); setReason(''); }, [order?._id]);

  if (!order) return null;

  const a = order.delivery?.address || {};
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: KEY });
    queryClient.invalidateQueries({ queryKey: ['adminDeliveryOrders'] });
  };

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      await fn();
      toast.success(message);
    } catch (err) {
      toast.error(err?.error || 'Could not update the order');
    } finally {
      setBusy('');
      refresh();
    }
  };

  return createPortal(
    <div className="fixed z-[10000] bottom-4 right-4 left-4 sm:left-auto sm:w-[22rem] bg-white rounded-2xl shadow-2xl border border-rose-200 overflow-hidden" role="alertdialog" aria-label="Delivery order to verify">
      <div className="bg-rose-500 text-white px-4 py-3 flex items-center gap-3">
        <NotificationsActiveRoundedIcon className="animate-pulse" />
        <div className="flex-1">
          <p className="text-[14px] font-bold leading-tight">New order to verify</p>
          <p className="text-[11px] opacity-90">{orders.length > 1 ? `${orders.length} orders waiting for your call` : 'Call the customer, then verify or cancel'}</p>
        </div>
      </div>
      <div className="p-4 space-y-3 text-[13px]">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-gray-900">#{order.internalId}</span>
          <span className="text-gray-500">{rupees(order.amountDue)} · {order.delivery?.paymentMode === 'online' ? 'Paid online' : 'Cash on delivery'}</span>
        </div>
        <div className="rounded-xl bg-gray-50 p-3">
          <p className="font-semibold text-gray-900">{a.name || order.customerName}</p>
          <p className="text-gray-500">{[a.line1, a.line2, a.landmark && `Near ${a.landmark}`, a.pincode].filter(Boolean).join(', ')}</p>
          <p className="text-gray-400 text-[12px] mt-1">{order.store?.name} · {(order.items || []).reduce((s, it) => s + (it.qty || 0), 0)} item(s)</p>
        </div>
        {a.phone && (
          <a href={`tel:${a.phone}`} className="w-full h-11 rounded-xl bg-gray-900 text-white font-semibold flex items-center justify-center gap-2">
            <PhoneRoundedIcon sx={{ fontSize: 18 }} /> Call {a.phone}
          </a>
        )}
        {isRingBlocked() && <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center">Click anywhere on the page to turn the ring on</p>}
        {rejecting && (
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (shown to the customer)" className="w-full h-11 px-3 border border-gray-200 rounded-xl outline-none focus:border-red-300" />
        )}
        <div className="flex gap-2">
          {rejecting ? (
            <>
              <button onClick={() => setRejecting(false)} disabled={Boolean(busy)} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-600 font-semibold">Back</button>
              <button onClick={() => run('cancel', () => deliveryAPI.adminCancelOrder(order._id, reason.trim()), 'Order cancelled')} disabled={Boolean(busy)} className="flex-1 h-11 rounded-xl bg-red-500 text-white font-semibold disabled:opacity-60">{busy === 'cancel' ? 'Cancelling...' : 'Cancel order'}</button>
            </>
          ) : (
            <>
              <button onClick={() => setRejecting(true)} disabled={Boolean(busy)} className="flex-1 h-11 rounded-xl border border-red-200 text-red-500 font-semibold">Cancel</button>
              <button onClick={() => run('verify', () => deliveryAPI.adminVerifyOrder(order._id), 'Verified. The store has the order.')} disabled={Boolean(busy)} className="flex-[2] h-11 rounded-xl bg-[#5EB929] text-white font-semibold disabled:opacity-60">{busy === 'verify' ? 'Sending...' : 'Verified - send to store'}</button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

export default AdminOrderAlert;
