import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import RuleRoundedIcon from '@mui/icons-material/RuleRounded';
import EventRepeatRoundedIcon from '@mui/icons-material/EventRepeatRounded';
import AllInclusiveRoundedIcon from '@mui/icons-material/AllInclusiveRounded';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';
import toast from 'react-hot-toast';
import { rewardsAPI } from '../../../api/rewards.api';
import { REWARD_METRICS, formatMetric, isRupeeMetric } from '../../../utils/rewardMetric';

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white';

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
        <Icon sx={{ fontSize: 20 }} />
      </div>
      <div>
        <h3 className="text-sm font-bold text-gray-900">{title}</h3>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
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

const WINDOW_OPTIONS = [
  { value: 'lifetime', label: 'Lifetime', hint: 'Progress never resets. Each level is won once.' },
  { value: 'monthly', label: 'Every month', hint: 'Progress resets on the 1st. Levels can be won again each month.' },
  { value: 'yearly', label: 'Every year', hint: 'Progress resets on 1 January. Levels can be won again each year.' },
  { value: 'rolling', label: 'Last N days', hint: 'Only recent claims count. Each level can be won again once N days pass.' },
];

const fill = (text, vars) => text.replace(/\{(\w+)\}/g, (all, key) => (key in vars ? vars[key] : all));

const RulesForm = ({ initial, levelCount }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(initial);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const dirty = JSON.stringify(form) !== JSON.stringify(initial);

  const saveMutation = useMutation({
    mutationFn: (payload) => rewardsAPI.updateAdminSettings(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminRewardsSettings'] });
      queryClient.invalidateQueries({ queryKey: ['rewardsSettings'] });
      toast.success('Milestone rules saved');
    },
    onError: (err) => toast.error(err.message || 'Failed to save rules'),
  });

  const metricChanged = form.metric !== initial.metric;
  const unit = REWARD_METRICS.find((m) => m.value === form.metric)?.unit || '';
  const instant = form.revealMode === 'instant';
  const sample = { level: 2, name: 'Silver Saver', credits: 100 };
  const previewTitle = form.notifyTitle || (instant ? '🎉 Reward Unlocked!' : '🎉 Scratch Card Unlocked!');
  const previewBody =
    form.notifyBody ||
    (instant
      ? 'You reached {name}! ₹{credits} has been added to your wallet.'
      : 'You reached {name}! Scratch your card to win ₹{credits} wallet credits.');

  const handleSave = (e) => {
    e.preventDefault();
    if (metricChanged && levelCount > 0) {
      const ok = confirm(
        `You're changing how customers level up. Your ${levelCount} existing level target(s) stay as numbers, ` +
          `so a target of 5 would now mean ${formatMetric(form.metric, 5)}.\n\nReview each level's target after saving. Continue?`
      );
      if (!ok) return;
    }
    // Everything except the on/off switch, which the header toggle owns
    const { enabled: _enabled, ...payload } = form;
    saveMutation.mutate(payload);
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <Section
        icon={TrendingUpRoundedIcon}
        title="How customers level up"
        subtitle="Pick what counts as progress. Every level's target is in this unit."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {REWARD_METRICS.map((m) => (
            <label
              key={m.value}
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                form.metric === m.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="metric"
                checked={form.metric === m.value}
                onChange={() => set({ metric: m.value })}
                className="mt-0.5 text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-xs font-bold text-gray-800">{m.label}</span>
                <span className="block text-[11px] text-gray-500">{m.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {metricChanged && levelCount > 0 && (
          <p className="text-[11px] font-medium text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
            After saving, update each level's target. They're now measured in {unit}.
          </p>
        )}
      </Section>

      <Section
        icon={RuleRoundedIcon}
        title="Which claims count"
        subtitle="Stop tiny or repeated claims being used to farm rewards."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Minimum bill value (₹)" hint="Claims below this don't count. 0 = every claim counts.">
            <input
              type="number"
              min="0"
              value={form.minBillValue}
              onChange={(e) => set({ minBillValue: e.target.value })}
              className={inputClass}
            />
          </Field>
          <Field
            label="Max claims per store per day"
            hint="Only this many claims at the same store on the same day count. 0 = no limit."
          >
            <input
              type="number"
              min="0"
              value={form.maxClaimsPerStorePerDay}
              onChange={(e) => set({ maxClaimsPerStorePerDay: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        icon={EventRepeatRoundedIcon}
        title="Progress period"
        subtitle="Choose whether progress builds forever or resets so customers can earn levels again."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {WINDOW_OPTIONS.map((w) => (
            <label
              key={w.value}
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                form.progressWindow === w.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="progressWindow"
                checked={form.progressWindow === w.value}
                onChange={() => set({ progressWindow: w.value })}
                className="mt-0.5 text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-xs font-bold text-gray-800">{w.label}</span>
                <span className="block text-[11px] text-gray-500">{w.hint}</span>
              </span>
            </label>
          ))}
        </div>
        {form.progressWindow === 'rolling' && (
          <div className="max-w-xs">
            <Field label="Number of days (N)">
              <input
                type="number"
                min="1"
                value={form.rollingDays}
                onChange={(e) => set({ rollingDays: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        )}
      </Section>

      <Section
        icon={AllInclusiveRoundedIcon}
        title="Keep rewarding after the top level"
        subtitle="Customers who pass the last level keep earning bonus cards."
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold text-gray-700">Give bonus cards past the top level</span>
          <Toggle checked={form.repeatEnabled} onChange={(v) => set({ repeatEnabled: v })} />
        </div>
        {form.repeatEnabled && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={`Every (${unit})`} hint="How much more progress earns the next bonus card.">
              <input
                type="number"
                min="1"
                value={form.repeatEvery}
                onChange={(e) => set({ repeatEvery: e.target.value })}
                className={inputClass}
              />
            </Field>
            <Field label="Bonus credits (₹)" hint="Wallet credits on each bonus card.">
              <input
                type="number"
                min="0"
                value={form.repeatCredits}
                onChange={(e) => set({ repeatCredits: e.target.value })}
                className={inputClass}
              />
            </Field>
          </div>
        )}
        {form.repeatEnabled && Number(form.repeatCredits) > 0 && (
          <p className="text-[11px] text-gray-500">
            Example: a bonus card worth ₹{form.repeatCredits} for every {formatMetric(form.metric, form.repeatEvery || 0)} past
            the top level.
            {isRupeeMetric(form.metric) && Number(form.repeatEvery) < 100 && (
              <span className="text-amber-700 font-medium"> That's a very small step for a ₹ target.</span>
            )}
          </p>
        )}
      </Section>

      <Section
        icon={AccountBalanceWalletRoundedIcon}
        title="Cards & credits"
        subtitle="How rewards are delivered and how long they last."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {[
            { value: 'scratch', label: 'Scratch to reveal', hint: 'Customer scratches the card. Credits are added when it is revealed.' },
            { value: 'instant', label: 'Credit instantly', hint: 'Credits go straight to the wallet when the level is reached, no scratching.' },
          ].map((o) => (
            <label
              key={o.value}
              className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-all ${
                form.revealMode === o.value ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="revealMode"
                checked={form.revealMode === o.value}
                onChange={() => set({ revealMode: o.value })}
                className="mt-0.5 text-primary focus:ring-primary"
              />
              <span>
                <span className="block text-xs font-bold text-gray-800">{o.label}</span>
                <span className="block text-[11px] text-gray-500">{o.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {!instant && (
            <Field
              label="Unscratched cards expire after (days)"
              hint="A card not scratched in time is lost. 0 = never expires."
            >
              <input
                type="number"
                min="0"
                value={form.cardExpiryDays}
                onChange={(e) => set({ cardExpiryDays: e.target.value })}
                className={inputClass}
              />
            </Field>
          )}
          <Field
            label="Credits expire after (days)"
            hint="Unspent reward credits are taken back after this many days. 0 = never. Referral credits are not affected."
          >
            <input
              type="number"
              min="0"
              value={form.creditExpiryDays}
              onChange={(e) => set({ creditExpiryDays: e.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section
        icon={NotificationsActiveRoundedIcon}
        title="Reward notification"
        subtitle="Sent as a push and in-app notification when a customer wins a reward. Leave blank for the default."
      >
        <div className="grid grid-cols-1 gap-4">
          <Field label="Title">
            <input
              type="text"
              maxLength={80}
              value={form.notifyTitle}
              onChange={(e) => set({ notifyTitle: e.target.value })}
              placeholder={instant ? '🎉 Reward Unlocked!' : '🎉 Scratch Card Unlocked!'}
              className={inputClass}
            />
          </Field>
          <Field label="Message" hint="You can use {name} (level name), {level} (level number) and {credits} (₹ amount).">
            <textarea
              rows="2"
              maxLength={240}
              value={form.notifyBody}
              onChange={(e) => set({ notifyBody: e.target.value })}
              placeholder={previewBody}
              className={inputClass}
            />
          </Field>
        </div>
        <div className="rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">Preview</p>
          <p className="text-xs font-bold text-gray-900">{fill(previewTitle, sample)}</p>
          <p className="text-xs text-gray-600">{fill(previewBody, sample)}</p>
        </div>
      </Section>

      <div className="sticky bottom-20 lg:bottom-4 z-10 flex items-center justify-end gap-3 bg-white/90 backdrop-blur border border-gray-100 shadow-md rounded-2xl p-3">
        <span className="text-xs text-gray-500 mr-auto">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
        <button
          type="button"
          disabled={!dirty || saveMutation.isPending}
          onClick={() => setForm(initial)}
          className="px-4 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl disabled:opacity-40"
        >
          Discard
        </button>
        <button
          type="submit"
          disabled={!dirty || saveMutation.isPending}
          className="px-5 py-2.5 bg-primary text-white text-xs font-semibold rounded-xl shadow-md hover:bg-primary-dark transition-all disabled:opacity-50"
        >
          {saveMutation.isPending ? 'Saving...' : 'Save Rules'}
        </button>
      </div>
    </form>
  );
};

const RewardsRulesPanel = ({ levelCount }) => {
  const { data: settings, isLoading } = useQuery({
    queryKey: ['adminRewardsSettings'],
    queryFn: async () => (await rewardsAPI.getAdminSettings()).settings,
  });

  if (isLoading || !settings) {
    return <div className="p-12 text-center text-gray-400">Loading rules...</div>;
  }
  // Re-mount the form whenever the saved settings change so it starts clean
  return <RulesForm key={JSON.stringify(settings)} initial={settings} levelCount={levelCount} />;
};

export default RewardsRulesPanel;
