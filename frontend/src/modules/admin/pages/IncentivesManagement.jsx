import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ShareRoundedIcon from '@mui/icons-material/ShareRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import CreditScoreRoundedIcon from '@mui/icons-material/CreditScoreRounded';
import FiberNewRoundedIcon from '@mui/icons-material/FiberNewRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import WavingHandRoundedIcon from '@mui/icons-material/WavingHandRounded';
import FavoriteRoundedIcon from '@mui/icons-material/FavoriteRounded';
import CelebrationRoundedIcon from '@mui/icons-material/CelebrationRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white';

const Section = ({ icon: Icon, title, subtitle, action, children }) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon sx={{ fontSize: 20 }} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const Field = ({ label, hint, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-700 mb-1.5">{label}</label>
    {children}
    {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
  </div>
);

const Toggle = ({ checked, onChange }) => (
  <button
    type="button"
    onClick={() => onChange(!checked)}
    className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-primary' : 'bg-gray-300'}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
    />
  </button>
);

// Number input that keeps what's typed (including empty) and stores a number
const NumberInput = ({ value, onChange, prefix, suffix, min = 0, max }) => (
  <div className="relative">
    {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-gray-400">{prefix}</span>}
    <input
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? '' : Number(e.target.value))}
      className={`${inputClass} ${prefix ? 'pl-8' : ''} ${suffix ? 'pr-14' : ''}`}
    />
    {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-400">{suffix}</span>}
  </div>
);

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;

const BONUSES = [
  { key: 'newUser', title: 'New User Bonus', icon: FiberNewRoundedIcon, hint: "Extra discount on a customer's first visit on Offerly." },
  { key: 'returning', title: 'Returning User Bonus', icon: ReplayRoundedIcon, hint: 'Extra discount when a customer visits again, at most once per gap you set.' },
  { key: 'welcomeBack', title: 'Welcome Back Bonus', icon: WavingHandRoundedIcon, hint: "For customers who haven't visited for a while." },
  { key: 'loyal', title: 'Loyal Customer Bonus', icon: FavoriteRoundedIcon, hint: 'Extra discount once a customer has made enough visits.' },
  { key: 'specialDay', title: 'Special Day Bonus', icon: CelebrationRoundedIcon, hint: 'On birthdays, festivals or other occasions you add.' },
];

// "₹40 off orders of ₹500+" / "10% off, up to ₹100"
const describeBonus = (b) => {
  if (!b?.value) return 'Set an amount to turn this on';
  const off = b.discountType === 'percent' ? `${b.value}% off${b.maxDiscount > 0 ? `, up to ${rupees(b.maxDiscount)}` : ''}` : `${rupees(b.value)} off`;
  return `${off}${b.minOrderValue > 0 ? ` on orders of ${rupees(b.minOrderValue)}+` : ' on any order'}`;
};

const BonusCard = ({ meta, bonus, stats, onChange }) => {
  const set = (patch) => onChange({ ...bonus, ...patch });
  const isPercent = bonus.discountType === 'percent';
  const Icon = meta.icon;

  return (
    <Section
      icon={Icon}
      title={meta.title}
      subtitle={meta.hint}
      action={<Toggle checked={bonus.enabled} onChange={(enabled) => set({ enabled })} />}
    >
      <div className={`space-y-4 ${bonus.enabled ? '' : 'opacity-50'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-gray-50 text-gray-600">{describeBonus(bonus)}</span>
          {stats && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-primary/10 text-primary">
              Given {rupees(stats.amount)} on {stats.count} order{stats.count === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl max-w-xs">
          {[
            ['flat', 'Flat ₹'],
            ['percent', 'Percent %'],
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => set({ discountType: value })}
              className={`py-1.5 rounded-lg text-xs font-bold transition-all ${bonus.discountType === value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label={isPercent ? 'Discount %' : 'Discount amount'}>
            <NumberInput
              value={bonus.value}
              onChange={(value) => set({ value })}
              prefix={isPercent ? undefined : '₹'}
              suffix={isPercent ? '%' : undefined}
              max={isPercent ? 100 : undefined}
            />
          </Field>
          {isPercent && (
            <Field label="Maximum discount" hint="0 = no cap">
              <NumberInput value={bonus.maxDiscount} onChange={(maxDiscount) => set({ maxDiscount })} prefix="₹" />
            </Field>
          )}
          <Field label="Minimum order value" hint="0 = any order">
            <NumberInput value={bonus.minOrderValue} onChange={(minOrderValue) => set({ minOrderValue })} prefix="₹" />
          </Field>
        </div>

        {meta.key === 'returning' && (
          <Field
            label="Gap between uses"
            hint="After a customer gets this bonus, they can't get it again for this many days. 0 = on every repeat order."
          >
            <NumberInput value={bonus.cooldownDays} onChange={(cooldownDays) => set({ cooldownDays })} suffix="days" />
          </Field>
        )}
        {meta.key === 'welcomeBack' && (
          <Field label="Counts as 'away' after" hint="Days since the customer's last visit">
            <NumberInput value={bonus.inactiveDays} onChange={(inactiveDays) => set({ inactiveDays })} suffix="days" min={1} />
          </Field>
        )}
        {meta.key === 'loyal' && (
          <Field label="Visits needed" hint="Completed visits anywhere on Offerly before this bonus starts">
            <NumberInput value={bonus.minVisits} onChange={(minVisits) => set({ minVisits })} suffix="visits" min={2} />
          </Field>
        )}
        {meta.key === 'specialDay' && <SpecialDayFields bonus={bonus} set={set} />}
      </div>
    </Section>
  );
};

const SpecialDayFields = ({ bonus, set }) => {
  const occasions = bonus.occasions || [];
  const setOccasion = (idx, patch) => set({ occasions: occasions.map((o, i) => (i === idx ? { ...o, ...patch } : o)) });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-100">
        <div>
          <p className="text-xs font-bold text-gray-800">Customer's birthday</p>
          <p className="text-[11px] text-gray-500">Uses the date of birth on their profile.</p>
        </div>
        <Toggle checked={bonus.birthday} onChange={(birthday) => set({ birthday })} />
      </div>
      {bonus.birthday && (
        <Field label="Days either side of the birthday" hint="0 = only on the day itself">
          <NumberInput value={bonus.birthdayWindowDays} onChange={(birthdayWindowDays) => set({ birthdayWindowDays })} suffix="days" max={15} />
        </Field>
      )}

      <div className="space-y-2">
        <p className="text-xs font-semibold text-gray-700">Festivals & occasions</p>
        {occasions.length === 0 && <p className="text-[11px] text-gray-400">None added. Add Diwali, Bihu, a store anniversary...</p>}
        {occasions.map((o, idx) => (
          <div key={idx} className="grid grid-cols-[1fr_auto] sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2 items-center p-2.5 rounded-xl bg-gray-50">
            <input
              type="text"
              value={o.name}
              placeholder="e.g. Diwali"
              maxLength={60}
              onChange={(e) => setOccasion(idx, { name: e.target.value })}
              className={`${inputClass} col-span-1`}
            />
            <button
              type="button"
              onClick={() => set({ occasions: occasions.filter((_, i) => i !== idx) })}
              className="sm:order-last w-9 h-9 rounded-xl bg-red-50 text-red-500 flex items-center justify-center"
              title="Remove"
            >
              <CloseRoundedIcon sx={{ fontSize: 16 }} />
            </button>
            <input
              type="date"
              value={o.startDate}
              onChange={(e) => setOccasion(idx, { startDate: e.target.value })}
              className={inputClass}
              aria-label="Start date"
            />
            <input
              type="date"
              value={o.endDate}
              onChange={(e) => setOccasion(idx, { endDate: e.target.value })}
              className={inputClass}
              aria-label="End date"
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => set({ occasions: [...occasions, { name: '', startDate: '', endDate: '' }] })}
          className="flex items-center gap-1 text-xs font-bold text-primary"
        >
          <AddRoundedIcon sx={{ fontSize: 16 }} /> Add occasion
        </button>
      </div>
    </div>
  );
};

const Stat = ({ label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
    <p className="text-[11px] font-semibold text-gray-500">{label}</p>
    <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

// A cleared number box means 0 (text fields like occasion names are left alone)
const TEXT_KEYS = new Set(['name', 'startDate', 'endDate', 'discountType']);
const blanksToZero = (value, key) => {
  if (Array.isArray(value)) return value.map((v) => blanksToZero(v));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, blanksToZero(v, k)]));
  }
  return value === '' && !TEXT_KEYS.has(key) ? 0 : value;
};

const pickSection = (settings, section) =>
  section === 'fund'
    ? { bonuses: settings.bonuses }
    : { referral: settings.referral, credits: settings.credits };

const IncentivesForm = ({ section, initial, summary }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const saveMutation = useMutation({
    mutationFn: (payload) => adminAPI.updateIncentiveSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminIncentiveSettings'] });
      toast.success('Settings saved');
    },
    onError: (err) => toast.error(err?.response?.data?.error || err.message || 'Failed to save'),
  });

  const handleSave = (e) => {
    e.preventDefault();
    saveMutation.mutate(blanksToZero(form));
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      {section === 'referral' ? (
        <>
          <Section
            icon={ShareRoundedIcon}
            title="Referral rewards"
            subtitle="Paid as wallet credits once the invited friend completes their first qualifying order."
            action={<Toggle checked={form.referral.enabled} onChange={(enabled) => setForm((f) => ({ ...f, referral: { ...f.referral, enabled } }))} />}
          >
            <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 ${form.referral.enabled ? '' : 'opacity-50'}`}>
              <Field label="Customer who invites gets">
                <NumberInput value={form.referral.referrerBonus} onChange={(v) => setForm((f) => ({ ...f, referral: { ...f.referral, referrerBonus: v } }))} prefix="₹" />
              </Field>
              <Field label="Friend who joins gets">
                <NumberInput value={form.referral.referredBonus} onChange={(v) => setForm((f) => ({ ...f, referral: { ...f.referral, referredBonus: v } }))} prefix="₹" />
              </Field>
              <Field label="Friend's order must be at least">
                <NumberInput value={form.referral.minOrderValue} onChange={(v) => setForm((f) => ({ ...f, referral: { ...f.referral, minOrderValue: v } }))} prefix="₹" />
              </Field>
            </div>
            <p className="text-[11px] font-medium text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
              Customers see: “Earn {rupees(form.referral.referrerBonus)} credits when your friend redeems an offer worth {rupees(form.referral.minOrderValue)}+”
            </p>
          </Section>

          <Section
            icon={CreditScoreRoundedIcon}
            title="Using credits on an order"
            subtitle="Applies to all wallet credits: referral rewards and milestone rewards."
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Minimum order value to use credits" hint="0 = credits can be used on any order">
                <NumberInput value={form.credits.minOrderValue} onChange={(v) => setForm((f) => ({ ...f, credits: { ...f.credits, minOrderValue: v } }))} prefix="₹" />
              </Field>
              <Field label="Most credits per order" hint="0 = no limit">
                <NumberInput value={form.credits.maxPerOrder} onChange={(v) => setForm((f) => ({ ...f, credits: { ...f.credits, maxPerOrder: v } }))} prefix="₹" />
              </Field>
            </div>
          </Section>
        </>
      ) : (
        <>
          <div className="text-xs text-gray-600 bg-primary/5 border border-primary/15 rounded-2xl p-4 space-y-1">
            <p>
              <span className="font-bold">Paid from each store's discount wallet</span> (30% of every plan payment). A bonus stops at a
              store once its wallet is empty.
            </p>
            <p>Each order gets <span className="font-bold">only the biggest bonus</span> the customer qualifies for. Visits are counted across all of Offerly.</p>
          </div>
          {BONUSES.map((meta) => (
            <BonusCard
              key={meta.key}
              meta={meta}
              bonus={form.bonuses[meta.key]}
              stats={summary?.byBonus?.[meta.key]}
              onChange={(next) => setForm((f) => ({ ...f, bonuses: { ...f.bonuses, [meta.key]: next } }))}
            />
          ))}
        </>
      )}

      {dirty && (
        <div className="sticky bottom-20 lg:bottom-4 z-10 flex items-center gap-2 bg-white border border-gray-200 shadow-lg rounded-2xl p-3">
          <span className="text-xs font-medium text-gray-600 mr-auto min-w-0 truncate">Unsaved changes</span>
          <button
            type="button"
            disabled={saveMutation.isPending}
            onClick={() => setForm(initial)}
            className="shrink-0 whitespace-nowrap px-3 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-40"
          >
            Discard
          </button>
          <button
            type="submit"
            disabled={saveMutation.isPending}
            className="shrink-0 whitespace-nowrap px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all disabled:opacity-50"
          >
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      )}
    </form>
  );
};

// section: 'referral' (Refer & Earn) or 'fund' (Customer Distribution Fund)
const IncentivesManagement = ({ section = 'referral' }) => {
  const { data: settings, isLoading, isError } = useQuery({
    queryKey: ['adminIncentiveSettings'],
    queryFn: async () => (await adminAPI.getIncentiveSettings()).data,
  });
  const { data: summary } = useQuery({
    queryKey: ['adminIncentiveSummary'],
    queryFn: async () => (await adminAPI.getIncentiveSummary()).data,
  });

  const isFund = section === 'fund';
  const initial = settings ? pickSection(settings, section) : null;

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-4xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
          {isFund ? (
            <AccountBalanceWalletRoundedIcon sx={{ fontSize: 28 }} className="text-primary" />
          ) : (
            <ShareRoundedIcon sx={{ fontSize: 28 }} className="text-primary" />
          )}
          {isFund ? 'Customer Distribution Fund' : 'Refer & Earn'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isFund
            ? 'Extra discounts for customers, paid from store discount wallets. You control who gets what, and on which orders.'
            : 'What customers earn for inviting friends, and when they can spend their credits.'}
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {isFund ? (
            <>
              <Stat label="In the fund now" value={rupees(summary.fundBalance)} sub={`across ${summary.storesWithFunds} store${summary.storesWithFunds === 1 ? '' : 's'}`} />
              <Stat label="Given last 30 days" value={rupees(summary.distributed30d)} sub={`${summary.ordersWithBonus30d} orders`} />
              <Stat label="Given all time" value={rupees(summary.distributedAllTime)} />
            </>
          ) : (
            <Stat label="Customers who joined by referral" value={summary.referredUsers} />
          )}
        </div>
      )}

      {isLoading && <p className="text-sm text-gray-500 py-10 text-center">Loading...</p>}
      {isError && <p className="text-sm text-red-500 py-10 text-center">Couldn't load settings. Refresh to try again.</p>}
      {initial && <IncentivesForm key={`${section}-${JSON.stringify(initial)}`} section={section} initial={initial} summary={summary} />}
    </div>
  );
};

export default IncentivesManagement;
