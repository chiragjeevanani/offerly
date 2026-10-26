import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import PhoneInTalkRoundedIcon from '@mui/icons-material/PhoneInTalkRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import { deliveryAPI } from '../../../api/delivery.api';

const Toggle = ({ checked, onChange, label, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-50 ${checked ? 'bg-[#5EB929]' : 'bg-gray-300'}`}
  >
    <span className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
  </button>
);

const Section = ({ icon: Icon, title, subtitle, children, right }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
        <Icon sx={{ fontSize: 20 }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-[14px] font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-[12px] text-gray-500">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="p-5 space-y-4">{children}</div>
  </div>
);

const MoneyField = ({ label, value, onChange, hint, suffix = '₹', disabled }) => (
  <label className="block">
    <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
    <div className="relative mt-1.5">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-gray-400">{suffix}</span>
      <input
        type="number"
        min="0"
        inputMode="numeric"
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
        className="w-full h-11 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10 disabled:bg-gray-50"
      />
    </div>
    {hint && <span className="block mt-1 text-[11px] text-gray-400">{hint}</span>}
  </label>
);

const num = (v) => (v === '' || v == null ? 0 : Number(v));

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// The partner-rule groups as the API takes them (also what "unsaved changes" compares).
const rulesPayload = (s) => ({
  cancellationRule: { enabled: Boolean(s.cancellationRule?.enabled), allowed: Math.max(0, Math.round(num(s.cancellationRule?.allowed))) },
  autoAssign: { enabled: Boolean(s.autoAssign?.enabled), afterMinutes: Math.min(60, Math.max(1, Math.round(num(s.autoAssign?.afterMinutes) || 5))) },
  payouts: { frequency: s.payouts?.frequency === 'daily' ? 'daily' : 'weekly', weeklyDay: Number(s.payouts?.weeklyDay ?? 1), minAmount: Math.max(0, Math.round(num(s.payouts?.minAmount))) },
  shifts: {
    enabled: Boolean(s.shifts?.enabled),
    graceMinutes: Math.min(120, Math.max(0, Math.round(num(s.shifts?.graceMinutes)))),
    defaultStart: s.shifts?.defaultStart || '09:00',
    defaultEnd: s.shifts?.defaultEnd || '21:00',
    defaultBreakMinutes: Math.min(600, Math.max(0, Math.round(num(s.shifts?.defaultBreakMinutes)))),
  },
});

const PERIODS = [
  { key: 'daily', label: 'In a day', short: 'a day' },
  { key: 'weekly', label: 'In a week', short: 'a week (Mon-Sun)' },
  { key: 'monthly', label: 'In a month', short: 'a month' },
];
const MAX_TARGETS = 12;

const DeliverySettings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['adminDeliverySettings'],
    queryFn: async () => (await deliveryAPI.getAdminSettings())?.data,
  });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    if (data) setForm(data);
  }, [data]);

  const dirty = useMemo(() => {
    if (!form || !data) return false;
    const pick = (s) => JSON.stringify({
      deliveryFee: num(s.deliveryFee),
      freeDeliveryMinOrder: num(s.freeDeliveryMinOrder),
      allowCod: s.allowCod,
      allowOnline: s.allowOnline,
      maxDistanceKm: num(s.maxDistanceKm),
      partnerPayoutPerDelivery: num(s.partnerPayoutPerDelivery),
      maxActiveOrdersPerPartner: num(s.maxActiveOrdersPerPartner),
      hideDropUntilAccepted: s.hideDropUntilAccepted,
      ...rulesPayload(s),
      collectUpiId: (s.collectUpiId || '').trim(),
      collectUpiName: (s.collectUpiName || '').trim(),
      targets: (s.targets || []).map((t) => ({ id: t.id || '', period: t.period, deliveries: num(t.deliveries), bonus: num(t.bonus), active: t.active !== false })),
      freeGift: { ...s.freeGift, minOrderValue: num(s.freeGift.minOrderValue) },
    });
    return pick(form) !== pick(data);
  }, [form, data]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  // cancellationRule / autoAssign / payouts / shifts are small nested groups.
  const setIn = (group, key) => (value) => setForm((f) => ({ ...f, [group]: { ...f[group], [key]: value } }));
  const setGift = (key) => (value) => setForm((f) => ({ ...f, freeGift: { ...f.freeGift, [key]: value } }));
  const setTarget = (idx, patch) =>
    setForm((f) => ({ ...f, targets: f.targets.map((t, i) => (i === idx ? { ...t, ...patch } : t)) }));
  const addTarget = () =>
    setForm((f) => ({ ...f, targets: [...f.targets, { period: 'daily', deliveries: '', bonus: '', active: true }] }));
  const removeTarget = (idx) => setForm((f) => ({ ...f, targets: f.targets.filter((_, i) => i !== idx) }));

  // The master switch saves on its own, straight away.
  const toggleModule = async (enabled) => {
    setSwitching(true);
    try {
      const res = await deliveryAPI.updateAdminSettings({ enabled });
      queryClient.setQueryData(['adminDeliverySettings'], res.data);
      setForm((f) => ({ ...f, enabled: res.data.enabled }));
      queryClient.invalidateQueries({ queryKey: ['deliveryConfig'] });
      toast.success(enabled ? 'Home delivery is ON for customers' : 'Home delivery is OFF. Customers only see pickup.');
    } catch (err) {
      toast.error(err?.error || 'Could not change delivery');
    } finally {
      setSwitching(false);
    }
  };

  const toggleVerification = async (adminVerification) => {
    setSwitching(true);
    try {
      const res = await deliveryAPI.updateAdminSettings({ adminVerification });
      queryClient.setQueryData(['adminDeliverySettings'], res.data);
      setForm((f) => ({ ...f, adminVerification: res.data.adminVerification }));
      toast.success(adminVerification
        ? 'New orders now wait for your call before reaching the store'
        : 'New orders now go straight to the store. Orders already waiting still need your OK.');
    } catch (err) {
      toast.error(err?.error || 'Could not change this');
    } finally {
      setSwitching(false);
    }
  };

  const save = async () => {
    const badTarget = form.targets.findIndex((t) => !(Number.isInteger(num(t.deliveries)) && num(t.deliveries) >= 1 && num(t.bonus) >= 1));
    if (badTarget >= 0) {
      toast.error(`Target ${badTarget + 1}: enter the number of deliveries and the bonus amount`);
      return;
    }
    setSaving(true);
    try {
      const res = await deliveryAPI.updateAdminSettings({
        deliveryFee: num(form.deliveryFee),
        freeDeliveryMinOrder: num(form.freeDeliveryMinOrder),
        allowCod: form.allowCod,
        allowOnline: form.allowOnline,
        maxDistanceKm: num(form.maxDistanceKm),
        partnerPayoutPerDelivery: num(form.partnerPayoutPerDelivery),
        maxActiveOrdersPerPartner: Math.min(20, Math.max(1, num(form.maxActiveOrdersPerPartner) || 1)),
        hideDropUntilAccepted: form.hideDropUntilAccepted,
        ...rulesPayload(form),
        collectUpiId: (form.collectUpiId || '').trim(),
        collectUpiName: (form.collectUpiName || '').trim(),
        targets: form.targets.map((t) => ({
          ...(t.id ? { id: t.id } : {}),
          period: t.period,
          deliveries: num(t.deliveries),
          bonus: Math.round(num(t.bonus)),
          active: t.active !== false,
        })),
        freeGift: {
          enabled: form.freeGift.enabled,
          minOrderValue: num(form.freeGift.minOrderValue),
          title: form.freeGift.title.trim(),
          description: form.freeGift.description.trim(),
          appliesTo: form.freeGift.appliesTo,
        },
      });
      queryClient.setQueryData(['adminDeliverySettings'], res.data);
      queryClient.invalidateQueries({ queryKey: ['deliveryConfig'] });
      toast.success('Delivery settings saved');
    } catch (err) {
      toast.error(err?.error || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="py-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
      </div>
    );
  }

  const feeText = num(form.deliveryFee) > 0 ? `₹${num(form.deliveryFee)}` : 'free';

  return (
    <div className="max-w-5xl mx-auto space-y-5 pb-24">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
          <LocalShippingRoundedIcon />
        </div>
        <div>
          <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Delivery Settings</h1>
          <p className="text-[12px] text-gray-500">Home delivery for product orders: charges, the free gift and how customers can pay.</p>
        </div>
      </div>

      {/* Master switch */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${form.enabled ? 'bg-[#5EB929]/5 border-[#5EB929]/30' : 'bg-white border-gray-100'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${form.enabled ? 'bg-[#5EB929] text-white' : 'bg-gray-100 text-gray-400'}`}>
          <LocalShippingRoundedIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">Delivery module is {form.enabled ? 'ON' : 'OFF'}</p>
          <p className="text-[12px] text-gray-500">
            {form.enabled
              ? 'Customers can choose Home Delivery in the cart. Orders already placed carry on either way.'
              : 'Customers only see Store Pickup and delivery partners cannot go online.'}
          </p>
        </div>
        <Toggle checked={form.enabled} onChange={toggleModule} disabled={switching} label="Delivery module" />
      </div>

      {/* Verify orders first - also saves on its own */}
      <div className={`rounded-2xl border p-5 flex items-center gap-4 ${form.adminVerification ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${form.adminVerification ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
          <PhoneInTalkRoundedIcon />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-gray-900">Verify cash orders by phone first is {form.adminVerification ? 'ON' : 'OFF'}</p>
          <p className="text-[12px] text-gray-500">
            {form.adminVerification
              ? 'New cash-on-delivery orders wait in Delivery Orders > "To verify". Call the customer, then send it to the store (or cancel it). Prepaid orders go straight to the store.'
              : 'New delivery orders go straight to the store.'}
          </p>
        </div>
        <Toggle checked={Boolean(form.adminVerification)} onChange={toggleVerification} disabled={switching} label="Verify orders first" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Section icon={CurrencyRupeeRoundedIcon} title="Delivery charge" subtitle="Added to every delivery order">
          <MoneyField label="Delivery fee" value={form.deliveryFee} onChange={set('deliveryFee')} hint="Set 0 to make delivery always free" />
          <MoneyField
            label="Free delivery on orders above"
            value={form.freeDeliveryMinOrder}
            onChange={set('freeDeliveryMinOrder')}
            hint={num(form.freeDeliveryMinOrder) > 0 ? `Orders of ₹${num(form.freeDeliveryMinOrder)} or more pay no delivery fee` : 'Set 0 to always charge the fee'}
          />
          <MoneyField label="Delivery radius" suffix="km" value={form.maxDistanceKm} onChange={set('maxDistanceKm')} hint={num(form.maxDistanceKm) > 0 ? `Customers must pin a location within ${num(form.maxDistanceKm)} km of the store` : '0 = no limit (any address in the city)'} />
        </Section>

        <Section
          icon={CardGiftcardRoundedIcon}
          title="Free gift"
          subtitle="Something free on bigger orders"
          right={<Toggle checked={form.freeGift.enabled} onChange={setGift('enabled')} label="Free gift" />}
        >
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Gift name</span>
            <input
              value={form.freeGift.title}
              maxLength={80}
              onChange={(e) => setGift('title')(e.target.value)}
              placeholder="e.g. Chocolate bar"
              className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10"
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Description (optional)</span>
            <textarea
              value={form.freeGift.description}
              maxLength={300}
              rows={2}
              onChange={(e) => setGift('description')(e.target.value)}
              placeholder="Shown to the customer, e.g. 'A Dairy Milk Silk on us'"
              className="mt-1.5 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10 resize-none"
            />
          </label>
          <MoneyField label="For orders of at least" value={form.freeGift.minOrderValue} onChange={setGift('minOrderValue')} />
          <div>
            <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Applies to</span>
            <div className="mt-1.5 grid grid-cols-2 gap-2">
              {[
                { key: 'delivery', label: 'Delivery orders' },
                { key: 'all', label: 'Delivery + pickup' },
              ].map((o) => (
                <button
                  key={o.key}
                  type="button"
                  onClick={() => setGift('appliesTo')(o.key)}
                  className={`h-10 rounded-xl border text-[12px] font-semibold ${form.freeGift.appliesTo === o.key ? 'border-[#5EB929] bg-[#5EB929]/5 text-[#3F7F17]' : 'border-gray-200 text-gray-500'}`}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-gray-400">The store is asked to pack the gift with the order.</p>
        </Section>

        <Section icon={PaymentsRoundedIcon} title="Payment methods" subtitle="How customers can pay for delivery">
          {[
            { key: 'allowOnline', title: 'Pay online', sub: 'UPI, cards and net banking through Razorpay at checkout. Refunded automatically if cancelled.' },
            { key: 'allowCod', title: 'Cash / UPI on delivery', sub: 'The delivery partner collects at the door.' },
          ].map((m) => (
            <div key={m.key} className="flex items-start gap-3">
              <div className="flex-1">
                <p className="text-[13px] font-semibold text-gray-800">{m.title}</p>
                <p className="text-[12px] text-gray-500">{m.sub}</p>
              </div>
              <Toggle
                checked={form[m.key]}
                label={m.title}
                onChange={(v) => {
                  const other = m.key === 'allowCod' ? 'allowOnline' : 'allowCod';
                  if (!v && !form[other]) {
                    toast.error('Keep at least one payment method on');
                    return;
                  }
                  set(m.key)(v);
                }}
              />
            </div>
          ))}
          <div className="pt-3 border-t border-gray-100 space-y-3">
            <div>
              <p className="text-[13px] font-semibold text-gray-800">UPI QR for cash-on-delivery</p>
              <p className="text-[12px] text-gray-500">{form.collectUpiId ? 'The partner can show a QR with the amount filled in. The money goes to this UPI ID.' : 'Add the Offerly UPI ID to let the partner offer "Scan & Pay QR" next to cash. Empty = cash only.'}</p>
            </div>
            <input value={form.collectUpiId || ''} onChange={(e) => set('collectUpiId')(e.target.value.replace(/\s/g, ''))} placeholder="offerly@okbank" autoCapitalize="none" className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10" />
            <input value={form.collectUpiName || ''} maxLength={60} onChange={(e) => set('collectUpiName')(e.target.value)} placeholder="Name shown in the UPI app (e.g. Offerly)" className="w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10" />
          </div>
        </Section>

        <Section icon={TwoWheelerRoundedIcon} title="Delivery partners" subtitle="Earnings and limits">
          <MoneyField label="Payout per delivery" value={form.partnerPayoutPerDelivery} onChange={set('partnerPayoutPerDelivery')} hint="Added to the partner's earnings for every delivered order. Pay them from Delivery Partners." />
          <MoneyField
            label="Orders a partner can carry at once"
            suffix="#"
            value={form.maxActiveOrdersPerPartner}
            onChange={set('maxActiveOrdersPerPartner')}
            hint="Between 1 and 20. A partner must deliver one before accepting more."
          />
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-800">Hide customer address until accepted</p>
              <p className="text-[12px] text-gray-500">
                {form.hideDropUntilAccepted
                  ? 'Partners see only the area and pincode of new orders. The house number and phone show after they accept.'
                  : 'Partners see the full address and customer phone before accepting.'}
              </p>
            </div>
            <Toggle checked={form.hideDropUntilAccepted} onChange={set('hideDropUntilAccepted')} label="Hide customer address until accepted" />
          </div>
        </Section>
      </div>

      <Section
        icon={EmojiEventsRoundedIcon}
        title="Partner targets"
        subtitle="Extra incentive when a partner completes enough deliveries"
        right={
          form.targets.length < MAX_TARGETS && (
            <button type="button" onClick={addTarget} className="h-9 px-3 rounded-xl bg-[#5EB929] text-white text-[12px] font-semibold flex items-center gap-1">
              <AddRoundedIcon sx={{ fontSize: 16 }} /> Add target
            </button>
          )
        }
      >
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-3 space-y-3">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-[13px] font-semibold text-gray-800">Order cancellation target</p>
              <p className="text-[12px] text-gray-500">
                {!form.cancellationRule.enabled
                  ? 'Off: cancelling orders never costs a partner their bonus.'
                  : num(form.cancellationRule.allowed) === 0
                    ? 'A partner who cancels even one order (accepts it, then releases it) gets no bonus for that period.'
                    : `A partner who cancels more than ${num(form.cancellationRule.allowed)} order${num(form.cancellationRule.allowed) === 1 ? '' : 's'} in a target's period gets no bonus for it.`}
              </p>
            </div>
            <Toggle checked={form.cancellationRule.enabled} onChange={setIn('cancellationRule', 'enabled')} label="Order cancellation target" />
          </div>
          {form.cancellationRule.enabled && (
            <MoneyField label="Cancellations allowed per period" suffix="#" value={form.cancellationRule.allowed} onChange={setIn('cancellationRule', 'allowed')} hint="0 = no cancellations allowed. Giving back an order the system assigned doesn't count." />
          )}
        </div>
        {form.targets.length === 0 ? (
          <p className="text-[13px] text-gray-500">
            No targets yet. Add one, for example <span className="font-semibold">10 deliveries in a day = ₹200 bonus</span>.
          </p>
        ) : (
          <div className="space-y-3">
            {form.targets.map((t, idx) => {
              const period = PERIODS.find((p) => p.key === t.period) || PERIODS[0];
              return (
                <div key={t.id || `new-${idx}`} className={`rounded-xl border p-3 ${t.active === false ? 'border-gray-100 bg-gray-50/60' : 'border-gray-200'}`}>
                  <div className="grid grid-cols-2 md:grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 items-end">
                    <label className="block">
                      <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Period</span>
                      <select
                        value={t.period}
                        onChange={(e) => setTarget(idx, { period: e.target.value })}
                        className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929]"
                      >
                        {PERIODS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
                      </select>
                    </label>
                    <MoneyField label="Deliveries" suffix="#" value={t.deliveries} onChange={(v) => setTarget(idx, { deliveries: v })} />
                    <MoneyField label="Bonus" value={t.bonus} onChange={(v) => setTarget(idx, { bonus: v })} />
                    <div className="flex items-center gap-2 h-11">
                      <Toggle checked={t.active !== false} onChange={(v) => setTarget(idx, { active: v })} label={`Target ${idx + 1} active`} />
                      <span className="text-[12px] text-gray-500 md:hidden">{t.active !== false ? 'On' : 'Off'}</span>
                    </div>
                    <button type="button" onClick={() => removeTarget(idx)} className="h-11 w-11 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 flex items-center justify-center justify-self-end" aria-label={`Remove target ${idx + 1}`}>
                      <DeleteOutlineRoundedIcon sx={{ fontSize: 20 }} />
                    </button>
                  </div>
                  {num(t.deliveries) > 0 && num(t.bonus) > 0 && (
                    <p className="mt-2 text-[12px] text-gray-500">
                      Deliver <span className="font-semibold text-gray-800">{num(t.deliveries)}</span> order{num(t.deliveries) === 1 ? '' : 's'} in {period.short} and earn{' '}
                      <span className="font-semibold text-[#3F7F17]">₹{num(t.bonus)}</span> extra{t.active === false ? ' (switched off)' : ''}.
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <p className="text-[11px] text-gray-400">
          The bonus is added to the partner's earnings once per target per period (days, Monday-to-Sunday weeks and months follow Indian time) and is paid out with their other earnings under Delivery Partners. Changing a target never changes bonuses already paid.
        </p>
      </Section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Section
          icon={AssignmentIndRoundedIcon}
          title="Auto-assign orders"
          subtitle="When no partner accepts in time"
          right={<Toggle checked={form.autoAssign.enabled} onChange={setIn('autoAssign', 'enabled')} label="Auto-assign orders" />}
        >
          <MoneyField label="Assign after" suffix="min" value={form.autoAssign.afterMinutes} onChange={setIn('autoAssign', 'afterMinutes')} disabled={!form.autoAssign.enabled} hint="Between 1 and 60 minutes, counted from when the store accepts the order." />
          <p className="text-[12px] text-gray-500">
            {form.autoAssign.enabled
              ? `An order nobody accepts within ${num(form.autoAssign.afterMinutes) || 5} minutes goes to an online partner in its city with room for it: fewest orders in hand first, partners who declined it last. You're told if nobody is online.`
              : 'Off: orders wait in the pool until a partner accepts them.'}
          </p>
        </Section>

        <Section icon={AccountBalanceWalletRoundedIcon} title="Partner withdrawals" subtitle="When partners can take out their earnings">
          <div className="grid grid-cols-2 gap-2">
            {[{ key: 'daily', label: 'Once a day' }, { key: 'weekly', label: 'Once a week' }].map((o) => (
              <button
                key={o.key}
                type="button"
                onClick={() => setIn('payouts', 'frequency')(o.key)}
                className={`h-10 rounded-xl border text-[12px] font-semibold ${form.payouts.frequency === o.key ? 'border-[#5EB929] bg-[#5EB929]/5 text-[#3F7F17]' : 'border-gray-200 text-gray-500'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {form.payouts.frequency === 'weekly' && (
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Withdrawal day</span>
              <select
                value={form.payouts.weeklyDay}
                onChange={(e) => setIn('payouts', 'weeklyDay')(Number(e.target.value))}
                className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929]"
              >
                {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
              </select>
            </label>
          )}
          <MoneyField label="Smallest withdrawal" value={form.payouts.minAmount} onChange={setIn('payouts', 'minAmount')} hint="0 = any amount" />
          <p className="text-[12px] text-gray-500">Requests appear under Delivery Partners &gt; Withdrawals for you to pay and mark as paid.</p>
        </Section>

        <Section
          icon={ScheduleRoundedIcon}
          title="Shifts"
          subtitle="Late or long breaks lose the incentive"
          right={<Toggle checked={form.shifts.enabled} onChange={setIn('shifts', 'enabled')} label="Shifts" />}
        >
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Default start</span>
              <input type="time" value={form.shifts.defaultStart} onChange={(e) => setIn('shifts', 'defaultStart')(e.target.value)} className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929]" />
            </label>
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Default end</span>
              <input type="time" value={form.shifts.defaultEnd} onChange={(e) => setIn('shifts', 'defaultEnd')(e.target.value)} className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929]" />
            </label>
          </div>
          <MoneyField label="Default break" suffix="min" value={form.shifts.defaultBreakMinutes} onChange={setIn('shifts', 'defaultBreakMinutes')} />
          <MoneyField label="Grace after start" suffix="min" value={form.shifts.graceMinutes} onChange={setIn('shifts', 'graceMinutes')} hint="0 = must be online exactly at shift start" />
          <p className="text-[12px] text-gray-500">
            {form.shifts.enabled
              ? 'A partner who comes online after their shift start (plus grace), or is offline longer than their break during the shift, gets no target bonus for that period. Set each partner\'s own shift under Delivery Partners.'
              : 'Off: no shift rules. Switching on applies from that moment, never to earlier days.'}
          </p>
        </Section>
      </div>

      <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-[12px] text-gray-600">
        <span className="font-semibold text-gray-800">Customers see: </span>
        Delivery costs {feeText}
        {num(form.freeDeliveryMinOrder) > 0 && num(form.deliveryFee) > 0 ? `, free on orders of ₹${num(form.freeDeliveryMinOrder)}+` : ''}
        {form.freeGift.enabled && form.freeGift.title ? `. Orders of ₹${num(form.freeGift.minOrderValue)}+ get a free ${form.freeGift.title}` : ''}.
      </div>

      {/* Save bar */}
      <div className={`fixed bottom-16 lg:bottom-0 left-0 lg:left-[260px] right-0 z-30 transition-transform ${dirty ? 'translate-y-0' : 'translate-y-[200%]'}`}>
        <div className="max-w-5xl mx-auto p-4">
          <div className="bg-gray-900 text-white rounded-2xl shadow-2xl px-5 py-3 flex items-center justify-between gap-4">
            <p className="text-[13px] font-medium">You have unsaved changes</p>
            <div className="flex gap-2">
              <button onClick={() => setForm(data)} className="h-10 px-4 rounded-xl text-[13px] font-semibold text-gray-300 hover:text-white">Discard</button>
              <button onClick={save} disabled={saving} className="h-10 px-5 rounded-xl bg-[#5EB929] text-[13px] font-semibold disabled:opacity-50">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeliverySettings;
