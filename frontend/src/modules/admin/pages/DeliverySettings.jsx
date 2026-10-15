import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
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
      freeGift: { ...s.freeGift, minOrderValue: num(s.freeGift.minOrderValue) },
    });
    return pick(form) !== pick(data);
  }, [form, data]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setGift = (key) => (value) => setForm((f) => ({ ...f, freeGift: { ...f.freeGift, [key]: value } }));

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

  const save = async () => {
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
