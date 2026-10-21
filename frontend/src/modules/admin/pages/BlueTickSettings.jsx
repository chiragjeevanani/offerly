import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';
import BlueTick from '../../../components/ui/BlueTick';

// Each rule card: the numbers admins can change, with the range the API accepts.
const RULES = [
  {
    key: 'rating',
    icon: StarRoundedIcon,
    title: 'Customer rating',
    who: 'Every store (pickup and delivery)',
    fields: [
      { key: 'minRating', label: 'Minimum rating (★)', min: 1, max: 5, step: 0.1 },
      { key: 'minReviews', label: 'Minimum number of reviews', min: 0, max: 1000 },
    ],
  },
  {
    key: 'walkins',
    icon: PointOfSaleRoundedIcon,
    title: 'Walk-in sales',
    who: 'Stores with pickup / dine-in (not delivery-only)',
    fields: [{ key: 'minWalkinsPerWeek', label: 'Walk-in sales needed per week', min: 0, max: 10000 }],
  },
  {
    key: 'ready',
    icon: TimerRoundedIcon,
    title: 'Orders marked ready on time',
    who: 'Stores taking delivery orders (pickup passes have no ready step)',
    fields: [
      { key: 'readyWithinMinutes', label: 'Mark Packed within (minutes of accepting)', min: 1, max: 240 },
      { key: 'minOnTimePercent', label: 'Share of orders on time (%), last 30 days', min: 0, max: 100 },
    ],
  },
  {
    key: 'rejections',
    icon: DoNotDisturbOnRoundedIcon,
    title: 'Order rejections',
    who: 'Stores taking delivery orders. Declined or left unanswered both count.',
    fields: [{ key: 'maxRejectionsPerWeek', label: 'Most rejections allowed per week', min: 0, max: 1000 }],
  },
];

const FIELD_KEYS = RULES.flatMap((r) => r.fields.map((f) => f.key));

const BlueTickSettings = () => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['blueTickSettings'],
    queryFn: async () => (await adminAPI.getBlueTickSettings()).data,
  });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm({ enabled: data.enabled, ...Object.fromEntries(FIELD_KEYS.map((k) => [k, String(data[k])])) });
  }, [data]);

  const dirty = Boolean(
    data && form && (form.enabled !== data.enabled || FIELD_KEYS.some((k) => Number(form[k]) !== data[k]))
  );

  const save = async () => {
    for (const rule of RULES) {
      for (const f of rule.fields) {
        const v = Number(form[f.key]);
        if (form[f.key] === '' || !Number.isFinite(v) || v < f.min || v > f.max) {
          toast.error(`${f.label}: enter a number from ${f.min} to ${f.max}`);
          return;
        }
      }
    }
    setSaving(true);
    try {
      const res = await adminAPI.updateBlueTickSettings({
        enabled: form.enabled,
        ...Object.fromEntries(FIELD_KEYS.map((k) => [k, Number(form[k])])),
      });
      queryClient.setQueryData(['blueTickSettings'], res.data);
      toast.success(`Saved. ${res.data.counts.verified} of ${res.data.counts.approved} stores now have the blue tick.`);
    } catch (err) {
      toast.error(err?.error || err?.message || 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-8 h-8 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-24">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <BlueTick size={24} /> Blue Tick
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Stores meeting every rule that applies to them get a blue tick in the customer app. Checked every hour and
            when you save. Merchants see their progress under Blue Tick in their panel.
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-2xl font-bold text-gray-900">
            {data.counts.verified}
            <span className="text-sm text-gray-400 font-semibold"> / {data.counts.approved}</span>
          </p>
          <p className="text-[11px] text-gray-500">stores verified</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
        <div>
          <p className="text-[14px] font-semibold text-gray-800">Show blue ticks</p>
          <p className="text-[12px] text-gray-500">Off removes the tick from every store.</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          aria-label="Show blue ticks"
          onClick={() => setForm({ ...form, enabled: !form.enabled })}
          className={`relative w-12 h-7 rounded-full shrink-0 transition-colors ${form.enabled ? 'bg-[#5EB929]' : 'bg-gray-300'}`}
        >
          <span className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${form.enabled ? 'translate-x-5' : ''}`} />
        </button>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {RULES.map((rule, i) => (
          <div key={rule.key} className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden ${form.enabled ? '' : 'opacity-60'}`}>
            <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center">
                <rule.icon sx={{ fontSize: 20 }} />
              </div>
              <div>
                <h3 className="text-[14px] font-semibold text-gray-800">
                  {i + 1}. {rule.title}
                </h3>
                <p className="text-[12px] text-gray-500">{rule.who}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {rule.fields.map((f) => (
                <label key={f.key} className="block">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{f.label}</span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={f.min}
                    max={f.max}
                    step={f.step || 1}
                    value={form[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="mt-1.5 w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10"
                  />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={!dirty || saving}
        className="w-full h-12 rounded-xl bg-[#5EB929] text-white text-[14px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {saving ? 'Saving and re-checking stores...' : 'Save rules'}
      </button>
    </div>
  );
};

export default BlueTickSettings;
