import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { isRingBlocked, startRinging, stopRinging, subscribeRing } from '../../../utils/ringer';
import { rupees } from '../utils/partner';

const NO_ORDERS = [];
const SKIPPED_KEY = 'offerly_partner_skipped_orders';

const readSkipped = () => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(SKIPPED_KEY) || '[]'));
  } catch {
    return new Set();
  }
};
const writeSkipped = (set) => {
  try {
    sessionStorage.setItem(SKIPPED_KEY, JSON.stringify([...set].slice(-100)));
  } catch {
    /* private mode - skipping just lasts until the next refresh */
  }
};

// Rings on every partner screen while an open order is waiting in their city,
// until they accept it or skip it. Skipping only silences it for this partner;
// the order stays open for others.
const PartnerOrderAlert = ({ me }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [skipped, setSkipped] = useState(readSkipped);
  const [busy, setBusy] = useState(false);
  const [, force] = useState(0);

  const online = Boolean(me?.partner?.isOnline);
  const atLimit = (me?.activeCount || 0) >= (me?.maxActive || 1);

  const { data: pool = NO_ORDERS } = useQuery({
    queryKey: ['partnerAvailable'],
    queryFn: async () => (await deliveryAPI.getAvailable())?.data || [],
    enabled: online,
    refetchInterval: online ? 10_000 : false,
  });

  const order = useMemo(() => (online && !atLimit ? pool.find((o) => !skipped.has(o.id)) : undefined), [pool, skipped, online, atLimit]);

  useEffect(() => {
    if (order) startRinging();
    else stopRinging();
    return () => stopRinging();
  }, [Boolean(order)]);

  useEffect(() => subscribeRing(() => force((n) => n + 1)), []);

  if (!order) return null;

  const accept = async () => {
    setBusy(true);
    try {
      await deliveryAPI.acceptOrder(order.id);
      toast.success(`Order #${order.internalId} is yours. Head to the store.`);
      ['partnerActive', 'partnerAvailable', 'partnerMe'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      navigate(`/delivery/orders/${order.id}`);
    } catch (err) {
      toast.error(err?.error || 'Could not accept');
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    const next = new Set(skipped);
    next.add(order.id);
    writeSkipped(next);
    setSkipped(next);
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] bg-gray-950/70 backdrop-blur-md flex items-center justify-center p-4" role="alertdialog" aria-label="New delivery order">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden">
        <div className="bg-gray-900 text-white px-5 py-4 flex items-center gap-3">
          <NotificationsActiveRoundedIcon className="animate-pulse text-[#5EB929]" />
          <div className="flex-1">
            <p className="text-[15px] font-bold leading-tight">New order nearby</p>
            <p className="text-[11px] text-gray-300">Accept or reject to stop the ring</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-widest text-gray-400">You earn</p>
            <p className="text-lg font-black text-[#5EB929]">{rupees(order.payout)}</p>
          </div>
        </div>

        <div className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[15px] font-bold text-gray-900">#{order.internalId}</span>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {order.collectAmount > 0 ? `Collect ${rupees(order.collectAmount)}` : 'Prepaid'}
            </span>
          </div>
          <div className="rounded-2xl bg-gray-50 p-3 space-y-1 text-[13px]">
            <p className="font-semibold text-gray-900">{order.store?.name}</p>
            {order.store?.locality && <p className="text-gray-500">{order.store.locality}</p>}
            <p className="text-gray-500">
              Drop: {[order.drop?.line2, order.drop?.landmark, order.drop?.pincode].filter(Boolean).join(', ') || 'Area shown after you accept'}
            </p>
            <p className="text-gray-400 text-[12px]">
              {order.itemCount} item{order.itemCount === 1 ? '' : 's'}{order.distanceKm != null ? ` · ${order.distanceKm} km from the store` : ''}
            </p>
          </div>

          {isRingBlocked() && (
            <p className="text-[12px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2 text-center">Tap anywhere on the screen to turn the ring on</p>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={skip} disabled={busy} className="flex-1 h-12 rounded-xl border border-red-200 text-red-500 font-bold text-sm">Reject</button>
            <button onClick={accept} disabled={busy} className="flex-[2] h-12 rounded-xl bg-[#5EB929] text-white font-bold text-sm shadow-lg shadow-[#5EB929]/20 disabled:opacity-60">
              {busy ? 'Accepting...' : 'Accept order'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default PartnerOrderAlert;
