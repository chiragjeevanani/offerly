import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import { deliveryAPI } from '../../../api/delivery.api';

const STAGES = {
  awaiting_payment: { label: 'Awaiting payment', cls: 'bg-gray-100 text-gray-600' },
  verifying: { label: 'To verify', cls: 'bg-rose-50 text-rose-600' },
  placed: { label: 'New', cls: 'bg-blue-50 text-blue-600' },
  preparing: { label: 'Packing', cls: 'bg-amber-50 text-amber-700' },
  ready: { label: 'Packed', cls: 'bg-violet-50 text-violet-600' },
  picked_up: { label: 'Out for delivery', cls: 'bg-sky-50 text-sky-700' },
  delivered: { label: 'Delivered', cls: 'bg-green-50 text-green-700' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
  returning: { label: 'Returning to store', cls: 'bg-orange-50 text-orange-700' },
  returned: { label: 'Returned', cls: 'bg-gray-100 text-gray-500' },
};

const PAY = {
  unpaid: 'Unpaid',
  paid: 'Paid',
  refund_pending: 'Refund pending',
  refunded: 'Refunded',
  refund_failed: 'Refund failed',
};

const FILTERS = [
  { key: 'verifying', label: 'To verify' },
  { key: 'active', label: 'Active' },
  { key: 'unassigned', label: 'No partner' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'returning', label: 'Returns' },
  { key: 'refunds', label: 'Refund issues' },
  { key: '', label: 'All' },
];

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-');

const OrderPanel = ({ order, onClose, onChanged }) => {
  const [busy, setBusy] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [keepFee, setKeepFee] = useState(false);
  const d = order.delivery || {};
  const stage = order.status === 'expired' ? 'cancelled' : d.status;
  const a = d.address || {};
  const preStage = ['verifying', 'placed', 'preparing', 'ready', 'awaiting_payment'].includes(stage) && order.status === 'pending';
  const toVerify = stage === 'verifying' && order.status === 'pending';
  // Already with the partner: cancelling sends it back to the store instead.
  const outForDelivery = stage === 'picked_up' && order.status === 'pending';

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(message);
      onChanged(res.data);
      setCancelling(false);
    } catch (err) {
      toast.error(err?.error || 'Could not update the order');
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="flex-1">
            <h2 className="text-[15px] font-semibold text-gray-900">Order #{order.internalId}</h2>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${(STAGES[stage] || STAGES.placed).cls}`}>{(STAGES[stage] || STAGES.placed).label}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close"><CloseRoundedIcon /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-[13px]">
          <div className="grid grid-cols-2 gap-3">
            <div><p className="text-[11px] text-gray-400">Store</p><p className="font-semibold text-gray-800">{order.store?.name}</p><p className="text-gray-500">{order.store?.phone}</p></div>
            <div><p className="text-[11px] text-gray-400">Customer</p><p className="font-semibold text-gray-800">{a.name || order.customerName}</p><p className="text-gray-500">{a.phone}</p></div>
          </div>
          {d.supportRequestedAt && stage === 'picked_up' && (
            <div className="rounded-xl bg-orange-50 border border-orange-200 p-3 text-[12px] text-orange-800">
              <p className="font-semibold">Partner can't deliver this order ({when(d.supportRequestedAt)})</p>
              <p className="mt-0.5">{d.supportReason}</p>
              <p className="mt-1 text-orange-700">Call the customer or the partner, then cancel it to send it back to the store.</p>
            </div>
          )}
          {toVerify && (
            <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 flex items-center gap-3">
              <div className="flex-1 text-[12px] text-rose-700">
                Call the customer to confirm the order and address. The store hasn't been told yet.
              </div>
              {a.phone && (
                <a href={`tel:${a.phone}`} className="h-9 px-3 rounded-lg bg-white border border-rose-200 text-rose-600 text-[12px] font-semibold flex items-center gap-1">
                  <PhoneRoundedIcon sx={{ fontSize: 15 }} /> Call
                </a>
              )}
            </div>
          )}
          <div>
            <p className="text-[11px] text-gray-400">Address</p>
            <p className="text-gray-700">{[a.line1, a.line2, a.landmark && `Near ${a.landmark}`, a.pincode].filter(Boolean).join(', ')}</p>
            {d.distanceKm != null && <p className="text-gray-400 text-[12px]">{d.distanceKm} km from store</p>}
          </div>
          <div>
            <p className="text-[11px] text-gray-400">Delivery partner</p>
            <p className="font-semibold text-gray-800">{d.partnerName ? `${d.partnerName} · ${d.partnerPhone}` : 'Not assigned yet'}</p>
          </div>

          <div className="rounded-xl border border-gray-100 p-3 space-y-1.5">
            {(order.items || []).map((it, i) => (
              <div key={i} className="flex justify-between text-gray-700"><span>{it.qty} × {it.product?.name}</span><span>{rupees(it.qty * (it.product?.offerPrice || 0))}</span></div>
            ))}
            {order.freeGift?.title && (
              <p className="text-amber-700 text-[12px] flex items-center gap-1"><CardGiftcardRoundedIcon sx={{ fontSize: 14 }} /> Free {order.freeGift.title}</p>
            )}
            <div className="pt-2 border-t border-dashed border-gray-100 flex justify-between text-gray-500"><span>Delivery fee</span><span>{rupees(d.fee)}</span></div>
            <div className="flex justify-between font-semibold text-gray-900"><span>Customer pays</span><span>{rupees(order.amountDue)}</span></div>
            <p className="text-[12px] text-gray-500">{d.paymentMode === 'online' ? 'Online' : d.collectedVia === 'upi' ? 'UPI QR at the door' : d.collectedVia === 'cash' ? 'Cash at the door' : 'Cash / UPI on delivery'} · {PAY[d.paymentStatus] || '-'}</p>
            {d.feeRetained && d.fee > 0 && (
              <p className="text-[12px] text-gray-500">Cancelled on the customer's side: the {rupees(d.fee)} delivery fee is not refunded{d.refundAmount != null ? ` (refunded ${rupees(d.refundAmount)})` : ''}.</p>
            )}
          </div>

          <div className="space-y-1 text-[12px] text-gray-500">
            {[
              ['Placed', d.placedAt || order.createdAt],
              ['Verified by Offerly', d.verifiedAt],
              ['Accepted by store', d.acceptedAt],
              ['Packed', d.readyAt],
              ['Partner assigned', d.assignedAt],
              ['Picked up', d.pickedUpAt],
              ['Delivered', d.deliveredAt],
              [d.returnStartedAt ? 'Return started' : 'Cancelled', d.cancelledAt],
              ['Returned to store', d.returnedAt],
            ].filter(([, v]) => v).map(([k, v]) => (
              <div key={k} className="flex justify-between"><span>{k}</span><span className="text-gray-700">{when(v)}</span></div>
            ))}
            {d.cancelReason && <p className="text-red-500">Cancelled by {d.cancelledBy || 'system'}: {d.cancelReason}</p>}
          </div>

          {cancelling && outForDelivery && d.fee > 0 && (
            <label className="flex items-start gap-2 text-[12px] text-gray-600">
              <input type="checkbox" checked={keepFee} onChange={(e) => setKeepFee(e.target.checked)} className="mt-0.5 accent-[#5EB929]" />
              <span>Customer's fault (refused / didn't answer): keep the {rupees(d.fee)} delivery fee, refund the rest</span>
            </label>
          )}
          {cancelling && (
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reason (shown to the customer and store)</span>
              <input value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1.5 w-full h-11 px-3 border border-gray-200 rounded-xl outline-none focus:border-red-300" />
            </label>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex flex-wrap gap-2">
          {d.paymentStatus === 'refund_failed' && (
            <button disabled={Boolean(busy)} onClick={() => run('refund', () => deliveryAPI.retryRefund(order._id), 'Refund started')} className="flex-1 h-11 rounded-xl bg-amber-500 text-white text-[13px] font-semibold">
              {busy === 'refund' ? 'Retrying...' : 'Retry refund'}
            </button>
          )}
          {cancelling ? (
            <>
              <button onClick={() => setCancelling(false)} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-semibold">Back</button>
              <button disabled={Boolean(busy)} onClick={() => run('cancel', () => deliveryAPI.adminCancelOrder(order._id, reason.trim(), outForDelivery && keepFee), outForDelivery ? 'Partner told to return it to the store' : 'Order cancelled')} className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-semibold">
                {busy === 'cancel' ? 'Cancelling...' : outForDelivery ? 'Cancel & return to store' : 'Cancel order'}
              </button>
            </>
          ) : (
            <>
              {toVerify && (
                <button disabled={Boolean(busy)} onClick={() => run('verify', () => deliveryAPI.adminVerifyOrder(order._id), 'Verified. The store has the order.')} className="flex-[2] h-11 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold">
                  {busy === 'verify' ? 'Sending...' : 'Verified - send to store'}
                </button>
              )}
              {preStage && d.partnerName && (
                <button disabled={Boolean(busy)} onClick={() => run('unassign', () => deliveryAPI.unassignOrder(order._id), 'Back in the pool for another partner')} className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-semibold">
                  Reassign
                </button>
              )}
              {stage === 'returning' && (
                <button disabled={Boolean(busy)} onClick={() => run('returned', () => deliveryAPI.adminConfirmReturn(order._id), 'Marked as returned. Stock is back on sale.')} className="flex-1 h-11 rounded-xl bg-orange-500 text-white text-[13px] font-semibold">
                  {busy === 'returned' ? 'Saving...' : 'Mark returned to store'}
                </button>
              )}
              {(preStage || outForDelivery) && (
                <button onClick={() => setCancelling(true)} className="flex-1 h-11 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold">Cancel order</button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const DeliveryOrders = () => {
  const queryClient = useQueryClient();
  const [stage, setStage] = useState('active');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['adminDeliveryOrders', stage, q],
    queryFn: async () => deliveryAPI.getAdminOrders({ stage: stage || undefined, q: q.trim() || undefined }),
    refetchInterval: 30_000,
    placeholderData: (prev) => prev,
  });
  const orders = data?.data || [];
  const summary = data?.summary || { stages: {} };

  const tiles = [
    { label: 'To verify', value: summary.stages?.verifying || 0, warn: summary.stages?.verifying > 0 },
    { label: 'Live orders', value: ['placed', 'preparing', 'ready', 'picked_up', 'returning'].reduce((s, k) => s + (summary.stages?.[k] || 0), 0) },
    { label: 'Waiting for partner', value: summary.unassigned || 0, warn: summary.unassigned > 0 },
    { label: 'Delivered today', value: summary.deliveredToday || 0 },
    { label: 'Value today', value: rupees(summary.valueToday), sub: `${rupees(summary.feesToday)} in fees` },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0"><LocalShippingRoundedIcon /></div>
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Delivery Orders</h1>
            <p className="text-[12px] text-gray-500">Every home delivery, live. Reassign a partner or cancel before pickup.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <div className="relative w-full md:w-64">
            <SearchRoundedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order ID, customer, partner..." className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]" />
          </div>
          <button onClick={() => refetch()} className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500" aria-label="Refresh">
            <RefreshRoundedIcon sx={{ fontSize: 18 }} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className={`rounded-2xl border p-4 ${t.warn ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
            <p className="text-[11px] text-gray-500">{t.label}</p>
            <p className="text-2xl font-semibold text-gray-900 mt-1">{t.value}</p>
            {t.sub && <p className="text-[11px] text-gray-400">{t.sub}</p>}
          </div>
        ))}
      </div>

      {summary.refundIssues > 0 && stage !== 'refunds' && (
        <button onClick={() => setStage('refunds')} className="w-full text-left p-3 rounded-xl bg-red-50 border border-red-100 text-[13px] text-red-600">
          {summary.refundIssues} refund{summary.refundIssues === 1 ? '' : 's'} need attention. View them.
        </button>
      )}

      <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-100 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button key={f.key || 'all'} onClick={() => setStage(f.key)} className={`px-4 h-9 rounded-lg text-[12px] font-semibold whitespace-nowrap ${stage === f.key ? 'bg-[#5EB929] text-white' : 'text-gray-500 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <LocalShippingRoundedIcon sx={{ fontSize: 40 }} className="text-gray-200" />
          <p className="mt-2 text-[13px] text-gray-500">No delivery orders here</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="hidden md:grid grid-cols-[110px_1.2fr_1fr_1fr_110px_120px] gap-3 px-4 py-3 bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
            <span>Order</span><span>Store → Customer</span><span>Partner</span><span>Status</span><span className="text-right">Amount</span><span className="text-right">Placed</span>
          </div>
          {orders.map((o) => {
            const st = o.status === 'expired' ? 'cancelled' : o.delivery?.status;
            const s = STAGES[st] || STAGES.placed;
            return (
              <button key={o._id} onClick={() => setSelected(o)} className="w-full text-left grid grid-cols-2 md:grid-cols-[110px_1.2fr_1fr_1fr_110px_120px] gap-x-3 gap-y-1 px-4 py-3 border-t border-gray-50 hover:bg-gray-50/60 text-[13px]">
                <span className="font-mono font-semibold text-[#5EB929]">#{o.internalId}</span>
                <span className="text-gray-800 truncate md:order-none order-3 col-span-2 md:col-span-1">{o.store?.name} → {o.delivery?.address?.name || o.customerName}</span>
                <span className={`truncate ${o.delivery?.partnerName ? 'text-gray-700' : 'text-amber-600'} hidden md:block`}>{o.delivery?.partnerName || (['preparing', 'ready'].includes(st) ? 'Waiting...' : '-')}</span>
                <span className="justify-self-end md:justify-self-start"><span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${s.cls}`}>{s.label}</span></span>
                <span className="md:text-right text-gray-900 font-semibold order-4 md:order-none">
                  {rupees(o.amountDue)} <span className="text-[10px] font-normal text-gray-400">{o.delivery?.paymentMode === 'online' ? 'online' : 'COD'}</span>
                </span>
                <span className="text-right text-gray-400 text-[12px] order-5 md:order-none">{when(o.createdAt)}</span>
              </button>
            );
          })}
        </div>
      )}

      {selected && (
        <OrderPanel
          order={selected}
          onClose={() => setSelected(null)}
          onChanged={(updated) => {
            setSelected(updated);
            queryClient.invalidateQueries({ queryKey: ['adminDeliveryOrders'] });
          }}
        />
      )}
    </div>
  );
};

export default DeliveryOrders;
