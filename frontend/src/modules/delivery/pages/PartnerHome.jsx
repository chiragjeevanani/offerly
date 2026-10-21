import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import PowerSettingsNewRoundedIcon from '@mui/icons-material/PowerSettingsNewRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import LocationOnRoundedIcon from '@mui/icons-material/LocationOnRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { Card, SectionLabel, StageBadge, Spinner } from '../components/PartnerUI';
import { rupees } from '../utils/partner';
import PushOptInCard from '../../../components/common/PushOptInCard';

const timeAgo = (d) => {
  if (!d) return '';
  const mins = Math.max(0, Math.round((Date.now() - new Date(d).getTime()) / 60000));
  return mins < 1 ? 'just now' : mins < 60 ? `${mins} min ago` : `${Math.round(mins / 60)} h ago`;
};

// One order card: the pool (accept) or the partner's own (continue).
const OrderCard = ({ order, action, onAction, busy, onOpen }) => (
  <Card className="p-4">
    <button onClick={onOpen} className="w-full text-left">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-[11px] font-mono font-bold text-[#5EB929]">#{order.internalId}</span>
          <StageBadge stage={order.stage} />
        </div>
        <span className="text-[10px] font-semibold text-gray-400 shrink-0">{timeAgo(order.assignedAt || order.readyAt || order.placedAt)}</span>
      </div>

      <div className="mt-3 space-y-2.5">
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-gray-50 text-gray-500 flex items-center justify-center shrink-0">
            <StorefrontRoundedIcon sx={{ fontSize: 15 }} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate">{order.store.name}</p>
            <p className="text-[11px] text-gray-400 font-medium truncate">{order.store.locality || order.store.address}</p>
          </div>
        </div>
        <div className="flex items-start gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
            <LocationOnRoundedIcon sx={{ fontSize: 15 }} />
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-gray-900 truncate">
              {order.drop.name || [order.drop.line2, order.drop.landmark].filter(Boolean).join(', ') || 'Customer'}
            </p>
            <p className="text-[11px] text-gray-400 font-medium truncate">
              {[order.drop.line1, order.drop.line2, order.drop.pincode].filter(Boolean).join(', ')}
              {order.distanceKm != null ? ` · ${order.distanceKm} km from store` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-gray-500 bg-gray-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
          <Inventory2RoundedIcon sx={{ fontSize: 12 }} /> {order.itemCount} item{order.itemCount === 1 ? '' : 's'}
        </span>
        {order.collectAmount > 0 ? (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">Collect {rupees(order.collectAmount)}</span>
        ) : (
          <span className="text-[10px] font-bold text-[#3F7F17] bg-[#5EB929]/10 px-2 py-1 rounded-lg">Prepaid</span>
        )}
        {order.freeGift && (
          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg inline-flex items-center gap-1">
            <CardGiftcardRoundedIcon sx={{ fontSize: 12 }} /> Gift
          </span>
        )}
        {order.payout > 0 && <span className="ml-auto text-[12px] font-black text-gray-900">Earn {rupees(order.payout)}</span>}
      </div>
    </button>

    {action && (
      <button
        onClick={onAction}
        disabled={busy}
        className="mt-4 w-full h-11 rounded-xl bg-[#5EB929] text-white text-[11px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-lg shadow-[#5EB929]/20 disabled:opacity-60"
      >
        {busy ? <Spinner /> : <>{action} <ChevronRightRoundedIcon sx={{ fontSize: 16 }} /></>}
      </button>
    )}
  </Card>
);

const PERIOD_LABEL = { daily: 'Today', weekly: 'This week', monthly: 'This month' };

// Progress toward the admin's incentive targets.
const TargetsCard = ({ targets }) => (
  <section className="space-y-3">
    <SectionLabel>Your targets</SectionLabel>
    {targets.map((t) => {
      const pct = Math.min(100, Math.round((t.done / t.deliveries) * 100));
      const left = Math.max(0, t.deliveries - t.done);
      return (
        <Card key={t.id} className={`p-4 ${t.achieved ? 'border-[#5EB929]/40' : ''}`}>
          <div className="flex items-center gap-3">
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${t.achieved ? 'bg-[#5EB929] text-white' : 'bg-amber-50 text-amber-600'}`}>
              {t.achieved ? <CheckCircleRoundedIcon sx={{ fontSize: 22 }} /> : <EmojiEventsRoundedIcon sx={{ fontSize: 22 }} />}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-gray-900">
                {t.deliveries} deliveries <span className="text-gray-400 font-semibold">· {PERIOD_LABEL[t.period]}</span>
              </p>
              <p className={`text-[11px] font-semibold ${t.achieved ? 'text-[#3F7F17]' : 'text-gray-500'}`}>
                {t.achieved ? 'Target achieved! Bonus added to your earnings' : `${left} more to earn the bonus`}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-lg font-black text-gray-900">{rupees(t.bonus)}</p>
              <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Bonus</p>
            </div>
          </div>
          <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={t.deliveries} aria-valuenow={Math.min(t.done, t.deliveries)} aria-label={`${t.done} of ${t.deliveries} deliveries`}>
            <div className={`h-full rounded-full transition-all duration-500 ${t.achieved ? 'bg-[#5EB929]' : 'bg-gradient-to-r from-amber-400 to-[#5EB929]'}`} style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px] font-bold text-gray-400">
            <span>{Math.min(t.done, t.deliveries)} / {t.deliveries} done</span>
            <span>Resets {new Date(t.resetsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
          </div>
        </Card>
      );
    })}
  </section>
);

const PartnerHome = ({ me }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const partner = me.partner;
  const online = partner.isOnline;
  const [toggling, setToggling] = useState(false);
  const [accepting, setAccepting] = useState('');

  const { data: active = [], isLoading: loadingActive } = useQuery({
    queryKey: ['partnerActive'],
    queryFn: async () => (await deliveryAPI.getMyOrders('active'))?.data || [],
    refetchInterval: 20_000,
  });
  const { data: pool = [], isLoading: loadingPool } = useQuery({
    queryKey: ['partnerAvailable'],
    queryFn: async () => (await deliveryAPI.getAvailable())?.data || [],
    enabled: online,
    refetchInterval: online ? 15_000 : false,
  });

  const toggleOnline = async () => {
    setToggling(true);
    try {
      await deliveryAPI.updateMe({ isOnline: !online });
      await queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
      toast.success(online ? 'You are offline' : 'You are online. New orders will show up here.');
    } catch (err) {
      toast.error(err?.error || 'Could not change status');
    } finally {
      setToggling(false);
    }
  };

  const accept = async (order) => {
    setAccepting(order.id);
    try {
      await deliveryAPI.acceptOrder(order.id);
      toast.success(`Order #${order.internalId} is yours. Head to the store.`);
      queryClient.invalidateQueries({ queryKey: ['partnerActive'] });
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
      queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
      navigate(`/delivery/orders/${order.id}`);
    } catch (err) {
      toast.error(err?.error || 'Could not accept');
      queryClient.invalidateQueries({ queryKey: ['partnerAvailable'] });
    } finally {
      setAccepting('');
    }
  };

  const atLimit = me.activeCount >= me.maxActive;
  const firstName = partner.name?.split(' ')[0] || 'Partner';

  return (
    <div className="px-4 pt-5 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
            {partner.profilePhoto ? (
              <img src={partner.profilePhoto} alt="" className="w-full h-full object-cover" />
            ) : (
              <TwoWheelerRoundedIcon className="text-[#5EB929]" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{partner.city}</p>
            <h1 className="text-lg font-bold text-gray-900 truncate">Hi, {firstName}</h1>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${online ? 'bg-[#5EB929]/10 text-[#3F7F17]' : 'bg-gray-100 text-gray-500'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${online ? 'bg-[#5EB929] animate-pulse' : 'bg-gray-400'}`} />
          {online ? 'Online' : 'Offline'}
        </span>
      </div>

      {/* Online switch */}
      <motion.div
        layout
        className={`relative overflow-hidden rounded-[2rem] p-5 shadow-xl text-white ${
          online ? 'bg-gradient-to-br from-gray-950 via-gray-900 to-[#132c0c] border border-[#5EB929]/30' : 'bg-gradient-to-br from-gray-800 to-gray-900'
        }`}
      >
        {online && <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5EB929]/25 rounded-full blur-2xl pointer-events-none" />}
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-lg font-black tracking-tight">{online ? "You're on duty" : "You're off duty"}</p>
            <p className="text-[12px] text-gray-300 font-medium mt-0.5">
              {!me.deliveryEnabled ? 'Deliveries are paused by Offerly right now.' : online ? 'Orders in your city appear below.' : 'Go online to start getting orders.'}
            </p>
          </div>
          <button
            onClick={toggleOnline}
            disabled={toggling || (!online && !me.deliveryEnabled)}
            aria-pressed={online}
            aria-label={online ? 'Go offline' : 'Go online'}
            className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all disabled:opacity-50 ${
              online ? 'bg-gradient-to-tr from-[#5EB929] to-[#8cee50] shadow-lg shadow-[#5EB929]/40' : 'bg-white/10 border border-white/20'
            }`}
          >
            {toggling ? <Spinner /> : <PowerSettingsNewRoundedIcon sx={{ fontSize: 30 }} />}
          </button>
        </div>
      </motion.div>

      {/* Without push, a partner with the app closed never hears about new orders. */}
      <PushOptInCard persona="delivery" hideWhenOn />

      {/* Today */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Deliveries', value: me.today.deliveries },
          { label: 'Earned', value: rupees(me.today.earnings) },
          { label: 'Cash in hand', value: rupees(partner.stats.cashInHand) },
        ].map((s) => (
          <Card key={s.label} className="p-3.5">
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{s.label}</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {me.targets?.length > 0 && <TargetsCard targets={me.targets} />}

      {/* My active orders */}
      {(loadingActive || active.length > 0) && (
        <section className="space-y-3">
          <SectionLabel>Your orders ({active.length}/{me.maxActive})</SectionLabel>
          {loadingActive ? (
            <div className="py-6 flex justify-center"><Spinner className="w-6 h-6 border-[#5EB929]/20 border-t-[#5EB929]" /></div>
          ) : (
            active.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                action={o.stage === 'picked_up' ? 'Deliver' : o.stage === 'returning' ? 'Return to store' : 'Go to store'}
                onAction={() => navigate(`/delivery/orders/${o.id}`)}
                onOpen={() => navigate(`/delivery/orders/${o.id}`)}
              />
            ))
          )}
        </section>
      )}

      {/* Pool */}
      <section className="space-y-3 pb-4">
        <div className="flex items-center justify-between">
          <SectionLabel>New orders near you</SectionLabel>
          {online && pool.length > 0 && <span className="text-[10px] font-bold text-[#5EB929]">{pool.length} available</span>}
        </div>
        {!online ? (
          <Card className="p-6 text-center">
            <p className="text-[13px] font-semibold text-gray-500">Go online to see orders waiting for a partner.</p>
          </Card>
        ) : loadingPool ? (
          <div className="py-6 flex justify-center"><Spinner className="w-6 h-6 border-[#5EB929]/20 border-t-[#5EB929]" /></div>
        ) : pool.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
              <TwoWheelerRoundedIcon />
            </div>
            <p className="mt-3 text-[13px] font-bold text-gray-800">No orders right now</p>
            <p className="text-[12px] text-gray-400 font-medium">Stay online. We'll ping you when one comes in.</p>
          </Card>
        ) : (
          <>
          {atLimit && (
            <p className="text-[11px] font-semibold text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
              You're carrying {me.maxActive} orders. Deliver one to accept more.
            </p>
          )}
          <AnimatePresence>
            {pool.map((o) => (
              <motion.div key={o.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <OrderCard
                  order={o}
                  action={atLimit ? null : 'Accept order'}
                  busy={accepting === o.id}
                  onAction={() => accept(o)}
                  onOpen={() => navigate(`/delivery/orders/${o.id}`)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
          </>
        )}
      </section>
    </div>
  );
};

export default PartnerHome;
