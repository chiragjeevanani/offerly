import { useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import NavigationRoundedIcon from '@mui/icons-material/NavigationRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import VerifiedRoundedIcon from '@mui/icons-material/VerifiedRounded';
import UndoRoundedIcon from '@mui/icons-material/UndoRounded';
import SupportAgentRoundedIcon from '@mui/icons-material/SupportAgentRounded';
import { supportAPI } from '../../../api/support.api';
import { deliveryAPI } from '../../../api/delivery.api';
import { Card, PrimaryButton, SectionLabel, StageBadge, Spinner } from '../components/PartnerUI';
import { mapsLink, rupees } from '../utils/partner';

const STEPS = ['Accept', 'Pick up', 'Deliver'];

const PlaceCard = ({ icon: Icon, tone, title, name, lines, phone, mapTarget }) => (
  <Card className="p-4">
    <div className="flex items-start gap-3">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tone}`}>
        <Icon sx={{ fontSize: 20 }} />
      </span>
      <div className="flex-1 min-w-0">
        <SectionLabel>{title}</SectionLabel>
        <p className="text-[14px] font-bold text-gray-900 mt-0.5">{name}</p>
        {lines.filter(Boolean).map((l) => (
          <p key={l} className="text-[12px] text-gray-500 font-medium leading-snug">{l}</p>
        ))}
      </div>
    </div>
    {(phone || mapTarget) && (
      <div className="mt-3 grid grid-cols-2 gap-2">
        {mapTarget && (
          <a href={mapsLink(mapTarget)} target="_blank" rel="noreferrer" className={`h-10 rounded-xl bg-gray-900 text-white text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${phone ? '' : 'col-span-2'}`}>
            <NavigationRoundedIcon sx={{ fontSize: 16 }} /> Navigate
          </a>
        )}
        {phone && (
          <a href={`tel:${phone}`} className={`h-10 rounded-xl bg-[#F8FAFC] border border-gray-100 text-gray-700 text-[11px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 ${mapTarget ? '' : 'col-span-2'}`}>
            <PhoneRoundedIcon sx={{ fontSize: 16 }} /> Call
          </a>
        )}
      </div>
    )}
  </Card>
);

const DeliverSheet = ({ order, onClose, onDone }) => {
  const [code, setCode] = useState(['', '', '', '']);
  const [cash, setCash] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputs = useRef([]);
  const isCod = order.collectAmount > 0;
  const otp = code.join('');

  const setDigit = (i, v) => {
    const clean = v.replace(/\D/g, '');
    if (clean.length > 1) {
      const next = clean.slice(0, 4).split('');
      setCode([...next, ...Array(4 - next.length).fill('')]);
      inputs.current[Math.min(next.length, 3)]?.focus();
      return;
    }
    setCode((p) => p.map((d, idx) => (idx === i ? clean : d)));
    if (clean && i < 3) inputs.current[i + 1]?.focus();
  };

  const submit = async () => {
    setBusy(true);
    try {
      await deliveryAPI.deliverOrder(order.id, otp, cash);
      onDone();
    } catch (err) {
      toast.error(err?.error || 'Could not complete delivery');
      if (err?.code === 'WRONG_OTP') {
        setCode(['', '', '', '']);
        inputs.current[0]?.focus();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 shadow-2xl space-y-5"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto sm:hidden" />
        <div>
          <h3 className="text-lg font-bold text-gray-900">Complete delivery</h3>
          <p className="text-[12px] text-gray-500 font-medium">Ask {order.drop.name || 'the customer'} for the 4-digit delivery code shown in their app.</p>
        </div>

        <div className="flex justify-center gap-3" aria-label="Delivery code">
          {code.map((d, i) => (
            <input
              key={i}
              ref={(el) => { inputs.current[i] = el; }}
              value={d}
              onChange={(e) => setDigit(i, e.target.value)}
              onKeyDown={(e) => e.key === 'Backspace' && !code[i] && i > 0 && inputs.current[i - 1]?.focus()}
              inputMode="numeric"
              maxLength={4}
              autoFocus={i === 0}
              aria-label={`Code digit ${i + 1}`}
              className="w-14 h-16 rounded-2xl bg-[#F8FAFC] border border-gray-100 text-center text-2xl font-black text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]/50 focus:ring-2 focus:ring-[#5EB929]/10"
            />
          ))}
        </div>

        {isCod && (
          <label className={`flex items-center gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${cash ? 'border-[#5EB929] bg-[#5EB929]/5' : 'border-amber-200 bg-amber-50'}`}>
            <input type="checkbox" checked={cash} onChange={(e) => setCash(e.target.checked)} className="sr-only peer" />
            <span className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cash ? 'bg-[#5EB929] text-white' : 'border-2 border-amber-400 bg-white'}`}>
              {cash && <CheckRoundedIcon sx={{ fontSize: 16 }} />}
            </span>
            <span className="text-[13px] font-bold text-gray-800">
              I have collected <span className="text-gray-900 font-black">{rupees(order.collectAmount)}</span> (cash or UPI)
            </span>
          </label>
        )}

        <PrimaryButton onClick={submit} loading={busy} disabled={otp.length !== 4 || (isCod && !cash)} className="w-full">
          <VerifiedRoundedIcon sx={{ fontSize: 18 }} /> Confirm Delivery
        </PrimaryButton>
      </motion.div>
    </div>
  );
};

const RETURN_REASONS = [
  { key: 'customer_refused', label: 'Customer refused the order' },
  { key: 'not_reachable', label: "Couldn't reach the customer" },
  { key: 'wrong_address', label: 'Wrong or unsafe address' },
  { key: 'other', label: 'Something else' },
];

// Picked up but can't be delivered (customer refused / not answering...): pick a
// reason and contact Offerly support, who decide - the partner doesn't send the
// order back on their own. If support cancels it, the order switches to "returning".
const ReturnSheet = ({ order, onClose, onDone }) => {
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(Boolean(order.supportRequestedAt));
  const { data: support } = useQuery({
    queryKey: ['supportContacts'],
    queryFn: async () => (await supportAPI.getContacts())?.data,
    staleTime: 300_000,
  });
  const helpline = support?.merchant?.phone || support?.customer?.phone;

  const submit = async () => {
    setBusy(true);
    try {
      await deliveryAPI.requestSupport(order.id, reason, note.trim());
      setSent(true);
      onDone();
    } catch (err) {
      toast.error(err?.error || 'Could not reach support');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 shadow-2xl space-y-4"
          role="dialog"
          aria-label="Support told"
        >
          <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto sm:hidden" />
          <div>
            <h3 className="text-lg font-bold text-gray-900">Support has been told</h3>
            <p className="text-[12px] text-gray-500 font-medium">
              Offerly support will decide what to do with this order and get in touch. Please keep the order safe with you and don't hand it over until they tell you. If they cancel it, you'll be asked to return it to {order.store.name}.
            </p>
          </div>
          {helpline && (
            <a href={`tel:${helpline}`} className="w-full h-12 rounded-2xl bg-gray-900 text-white text-[12px] font-bold uppercase tracking-widest flex items-center justify-center gap-2">
              <PhoneRoundedIcon sx={{ fontSize: 18 }} /> Call support
            </a>
          )}
          <button onClick={onClose} className="w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-widest text-gray-500">Close</button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 shadow-2xl space-y-4"
        role="dialog"
        aria-label="Can't deliver"
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto sm:hidden" />
        <div>
          <h3 className="text-lg font-bold text-gray-900">Can't deliver this order?</h3>
          <p className="text-[12px] text-gray-500 font-medium">
            Try calling {order.drop.name || 'the customer'} first. If it still can't be delivered, tell Offerly support and they'll decide what happens next.
          </p>
        </div>
        <div className="space-y-2">
          {RETURN_REASONS.map((r) => (
            <button
              key={r.key}
              type="button"
              onClick={() => setReason(r.key)}
              aria-pressed={reason === r.key}
              className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-[13px] font-bold transition-all ${
                reason === r.key ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900' : 'border-gray-100 text-gray-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        {reason && (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 160))}
            rows={2}
            placeholder={reason === 'other' ? 'What went wrong? (required)' : 'Add a note (optional)'}
            className="w-full rounded-2xl bg-[#F8FAFC] border border-gray-100 px-4 py-3 text-[13px] outline-none focus:bg-white focus:border-[#5EB929]/50"
          />
        )}
        <PrimaryButton variant="dark" onClick={submit} loading={busy} disabled={!reason || (reason === 'other' && !note.trim())} className="w-full">
          <SupportAgentRoundedIcon sx={{ fontSize: 18 }} /> Contact Support
        </PrimaryButton>
      </motion.div>
    </div>
  );
};

const PartnerOrderDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState('');
  const [delivering, setDelivering] = useState(false);
  const [returning, setReturning] = useState(false);
  const [done, setDone] = useState(false);

  const { data: order, isLoading, isError } = useQuery({
    queryKey: ['partnerOrder', id],
    queryFn: async () => (await deliveryAPI.getOrder(id))?.data,
    refetchInterval: 20_000,
    retry: false,
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['partnerOrder', id] });
    queryClient.invalidateQueries({ queryKey: ['partnerActive'] });
    queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
    queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
  };

  const act = async (key, fn, message, after) => {
    setBusy(key);
    try {
      await fn();
      if (message) toast.success(message);
      refresh();
      after?.();
    } catch (err) {
      toast.error(err?.error || 'Something went wrong');
      refresh();
    } finally {
      setBusy('');
    }
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Spinner className="w-8 h-8 border-[#5EB929]/20 border-t-[#5EB929]" /></div>;
  }
  if (isError || !order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm font-semibold text-gray-600">This order is no longer available.</p>
        <PrimaryButton onClick={() => navigate('/delivery', { replace: true })}>Back to Home</PrimaryButton>
      </div>
    );
  }

  const mine = order.mine;
  const stage = order.stage;
  const stepIdx = !mine ? 0 : stage === 'picked_up' ? 2 : stage === 'delivered' ? 3 : 1;
  // Being taken back to the store: the order is cancelled, but the partner still has the goods.
  const goingBack = mine && stage === 'returning';
  const finished = !goingBack && (['delivered', 'cancelled', 'returned'].includes(stage) || order.status !== 'pending');
  const noPayout = ['returning', 'returned'].includes(stage);
  const store = order.store;
  const drop = order.drop;

  return (
    <div className="pb-36">
      <div className="px-4 py-4 flex items-center gap-3 bg-white/90 backdrop-blur-md border-b border-gray-100 sticky top-0 z-30">
        <button onClick={() => navigate('/delivery')} className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-700" aria-label="Back">
          <ArrowBackRoundedIcon sx={{ fontSize: 20 }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-gray-900 leading-none">Order #{order.internalId}</h1>
          <div className="mt-1.5"><StageBadge stage={stage} /></div>
        </div>
        {order.payout > 0 && !noPayout && (
          <div className="text-right">
            <SectionLabel>You earn</SectionLabel>
            <p className="text-lg font-black text-[#5EB929]">{rupees(order.payout)}</p>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4">
        {goingBack && (
          <Card className="p-4 border-orange-200 bg-orange-50">
            <p className="text-[14px] font-bold text-orange-800 flex items-center gap-2">
              <UndoRoundedIcon sx={{ fontSize: 18 }} /> Take this order back to {store.name}
            </p>
            {order.cancelReason && <p className="mt-1 text-[12px] font-medium text-orange-700">Reason: {order.cancelReason}</p>}
            <p className="mt-2 text-[12px] font-medium text-orange-700">
              Hand everything to the store. They tap "Received back" and the order closes. Don't collect any money.
            </p>
          </Card>
        )}
        {stage === 'returned' && (
          <Card className="p-4">
            <p className="text-[13px] font-bold text-gray-800">Returned to the store{order.cancelReason ? ` - ${order.cancelReason}` : ''}.</p>
          </Card>
        )}

        {!finished && !goingBack && (
          <Card className="p-4">
            <ol className="flex items-center">
              {STEPS.map((s, i) => (
                <li key={s} className="flex-1 flex items-center last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black ${
                      i < stepIdx ? 'bg-[#5EB929] text-white' : i === stepIdx ? 'bg-gray-900 text-white ring-4 ring-gray-900/10' : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i < stepIdx ? <CheckRoundedIcon sx={{ fontSize: 15 }} /> : i + 1}
                    </span>
                    <span className={`text-[10px] font-bold ${i <= stepIdx ? 'text-gray-900' : 'text-gray-400'}`}>{s}</span>
                  </div>
                  {i < STEPS.length - 1 && <span className={`flex-1 h-0.5 mx-2 mb-4 ${i < stepIdx ? 'bg-[#5EB929]' : 'bg-gray-100'}`} />}
                </li>
              ))}
            </ol>
            {mine && stage === 'preparing' && (
              <p className="mt-3 text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">The store is still packing. Head over; it should be ready when you arrive.</p>
            )}
          </Card>
        )}

        <PlaceCard
          icon={StorefrontRoundedIcon}
          tone="bg-gray-100 text-gray-600"
          title={goingBack ? 'Return to' : 'Pick up from'}
          name={store.name}
          lines={[store.address, store.locality]}
          phone={mine && !finished ? store.phone : ''}
          mapTarget={!finished ? { lat: store.lat, lng: store.lng, query: `${store.name} ${store.address}` } : null}
        />

        {!goingBack && <PlaceCard
          icon={LocationOnRoundedIcon}
          tone="bg-[#5EB929]/10 text-[#5EB929]"
          title="Deliver to"
          name={drop.name || 'Customer'}
          lines={[
            drop.line1,
            drop.line2,
            drop.landmark && `Near ${drop.landmark}`,
            drop.pincode,
            order.distanceKm != null ? `${order.distanceKm} km from the store` : '',
          ]}
          phone={mine && !finished ? drop.phone : ''}
          mapTarget={!finished && (mine || drop.lat != null) ? { lat: drop.lat, lng: drop.lng, query: [drop.line1, drop.line2, drop.pincode].filter(Boolean).join(', ') } : null}
        />}
        {order.addressHidden && <p className="text-[11px] text-gray-400 font-medium px-1">The full address and phone number appear once you accept.</p>}

        <Card className="p-4">
          <SectionLabel className="mb-3">Items ({order.itemCount})</SectionLabel>
          <div className="space-y-2">
            {order.items.map((it, i) => (
              <div key={i} className="flex justify-between text-[13px] font-semibold text-gray-700">
                <span className="truncate pr-3">{it.name}</span>
                <span className="font-black text-gray-900">× {it.qty}</span>
              </div>
            ))}
          </div>
          {order.freeGift && (
            <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2">
              <CardGiftcardRoundedIcon sx={{ fontSize: 18 }} className="text-amber-600" />
              <p className="text-[12px] font-bold text-amber-800">Check the free {order.freeGift.title} is in the bag</p>
            </div>
          )}
        </Card>

        <Card className="p-4 flex items-center gap-3">
          <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${order.collectAmount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-[#5EB929]/10 text-[#5EB929]'}`}>
            <PaymentsRoundedIcon sx={{ fontSize: 20 }} />
          </span>
          <div className="flex-1">
            <SectionLabel>Payment</SectionLabel>
            <p className="text-[14px] font-bold text-gray-900">
              {noPayout
                ? 'Nothing to collect - the order was cancelled'
                : order.collectAmount > 0
                  ? `Collect ${rupees(order.collectAmount)} at the door`
                  : 'Prepaid - nothing to collect'}
            </p>
          </div>
        </Card>

        {mine && !finished && !goingBack && stage !== 'picked_up' && (
          <button
            onClick={() => act('release', () => deliveryAPI.releaseOrder(order.id), 'Order released', () => navigate('/delivery', { replace: true }))}
            disabled={Boolean(busy)}
            className="w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50"
          >
            {busy === 'release' ? 'Releasing...' : "Can't do this order? Release it"}
          </button>
        )}
        {mine && stage === 'picked_up' && (
          <button
            onClick={() => setReturning(true)}
            className="w-full h-11 rounded-xl text-[11px] font-bold uppercase tracking-widest text-red-500 hover:bg-red-50"
          >
            Can't deliver? Contact support
          </button>
        )}
      </div>

      {/* Primary action */}
      {!finished && !goingBack && (
        <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-xl border-t border-gray-100 pb-safe">
          <div className="max-w-lg mx-auto p-3">
            {!mine ? (
              <PrimaryButton className="w-full" loading={busy === 'accept'} onClick={() => act('accept', () => deliveryAPI.acceptOrder(order.id), 'Order accepted. Head to the store.')}>
                Accept Order
              </PrimaryButton>
            ) : stage === 'picked_up' ? (
              <PrimaryButton className="w-full" onClick={() => setDelivering(true)}>
                <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> Complete Delivery
              </PrimaryButton>
            ) : (
              <PrimaryButton variant="dark" className="w-full" loading={busy === 'pickup'} onClick={() => act('pickup', () => deliveryAPI.pickupOrder(order.id), 'Picked up. Now head to the customer.')}>
                <StorefrontRoundedIcon sx={{ fontSize: 18 }} /> Confirm Pickup
              </PrimaryButton>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {delivering && (
          <DeliverSheet
            order={order}
            onClose={() => setDelivering(false)}
            onDone={() => {
              setDelivering(false);
              setDone(true);
              refresh();
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {returning && (
          <ReturnSheet
            order={order}
            onClose={() => setReturning(false)}
            onDone={() => refresh()}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="fixed inset-0 z-[110] bg-gray-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 20 }} className="bg-white rounded-[2.5rem] p-8 max-w-sm w-full text-center">
              <div className="w-20 h-20 mx-auto rounded-full bg-[#5EB929]/10 flex items-center justify-center">
                <CheckCircleRoundedIcon className="text-[#5EB929]" sx={{ fontSize: 44 }} />
              </div>
              <h2 className="mt-5 text-2xl font-bold text-gray-900">Delivered!</h2>
              <p className="mt-1 text-[13px] text-gray-500">
                Order #{order.internalId} is complete{order.payout > 0 ? `. You earned ${rupees(order.payout)}.` : '.'}
              </p>
              <PrimaryButton className="w-full mt-6" onClick={() => navigate('/delivery', { replace: true })}>Back to Orders</PrimaryButton>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PartnerOrderDetail;
