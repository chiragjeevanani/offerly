import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deliveryAPI } from '../../../api/delivery.api';

// A delivery partner's own shift (start, end, break, days off) in the admin's
// partner panel, with how today is going. Empty fields use the defaults from
// Delivery Settings > Shifts.

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TODAY = {
  off: ['Day off today', 'bg-gray-100 text-gray-600'],
  upcoming: ["Today's shift hasn't started", 'bg-sky-50 text-sky-700'],
  waiting: ['Shift started, not online yet (within grace)', 'bg-amber-50 text-amber-700'],
  ok: ['On time today', 'bg-green-50 text-green-700'],
  late: ['Late today: no incentive this period', 'bg-red-50 text-red-600'],
  absent: ['Not online for the shift: no incentive this period', 'bg-red-50 text-red-600'],
  over_break: ['Over the break today: no incentive this period', 'bg-red-50 text-red-600'],
};

const PartnerShiftEditor = ({ partnerId }) => {
  const queryClient = useQueryClient();
  const key = ['adminPartnerShift', partnerId];
  const { data } = useQuery({ queryKey: key, queryFn: async () => (await deliveryAPI.getPartnerShift(partnerId))?.data });
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      start: data.own.start || '',
      end: data.own.end || '',
      breakMinutes: data.own.breakMinutes ?? '',
      offDays: data.own.offDays ?? null,
    });
  }, [data]);

  if (!data || !form) return null;
  const rules = data.rules;
  const offDays = form.offDays ?? data.effective.offDays;

  const save = async (payload, message) => {
    setSaving(true);
    try {
      const res = await deliveryAPI.updatePartnerShift(partnerId, payload);
      queryClient.setQueryData(key, res.data);
      toast.success(message);
    } catch (err) {
      toast.error(err?.error || 'Could not save the shift');
    } finally {
      setSaving(false);
    }
  };

  const today = data.today?.today;
  const [todayText, todayCls] = today ? TODAY[today.status] || ['', ''] : ['', ''];

  return (
    <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-semibold text-gray-800">Shift</p>
        {!rules.enabled && <span className="text-[11px] text-gray-400">Shift rules are off in Delivery Settings</span>}
      </div>
      {today && (
        <p className={`text-[12px] font-semibold rounded-xl px-3 py-2 ${todayCls}`}>
          {todayText}
          {today.status === 'late' ? ` (${today.lateByMinutes} min late)` : ''}
          {['ok', 'over_break'].includes(today.status) ? ` · break used ${today.breakUsedMinutes} of ${data.effective.breakMinutes} min` : ''}
        </p>
      )}
      <div className="grid grid-cols-3 gap-2">
        <label className="block">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Start</span>
          <input type="time" value={form.start || rules.defaultStart} onChange={(e) => setForm((f) => ({ ...f, start: e.target.value }))} className="mt-1 w-full h-10 px-2 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">End</span>
          <input type="time" value={form.end || rules.defaultEnd} onChange={(e) => setForm((f) => ({ ...f, end: e.target.value }))} className="mt-1 w-full h-10 px-2 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]" />
        </label>
        <label className="block">
          <span className="text-[10px] font-semibold text-gray-500 uppercase">Break (min)</span>
          <input inputMode="numeric" value={form.breakMinutes} placeholder={String(rules.defaultBreakMinutes)} onChange={(e) => setForm((f) => ({ ...f, breakMinutes: e.target.value.replace(/\D/g, '').slice(0, 3) }))} className="mt-1 w-full h-10 px-2 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]" />
        </label>
      </div>
      <div>
        <span className="text-[10px] font-semibold text-gray-500 uppercase">Days off</span>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => {
            const on = offDays.includes(i);
            return (
              <button
                key={d}
                type="button"
                onClick={() => setForm((f) => ({ ...f, offDays: on ? offDays.filter((x) => x !== i) : [...offDays, i].sort() }))}
                className={`h-8 px-2.5 rounded-lg border text-[12px] font-semibold ${on ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 text-gray-500'}`}
                aria-pressed={on}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex gap-2">
        {data.effective.custom && (
          <button
            type="button"
            disabled={saving}
            onClick={() => save({ start: '', end: '', breakMinutes: null, offDays: null }, 'Shift reset to the defaults')}
            className="h-10 px-3 rounded-xl border border-gray-200 text-gray-600 text-[12px] font-semibold"
          >
            Use defaults
          </button>
        )}
        <button
          type="button"
          disabled={saving}
          onClick={() => save({
            start: form.start || rules.defaultStart,
            end: form.end || rules.defaultEnd,
            breakMinutes: form.breakMinutes === '' ? rules.defaultBreakMinutes : Number(form.breakMinutes),
            offDays,
          }, 'Shift saved. The partner has been told.')}
          className="flex-1 h-10 rounded-xl bg-gray-900 text-white text-[13px] font-semibold disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save shift'}
        </button>
      </div>
      <p className="text-[11px] text-gray-400">
        {data.effective.custom ? 'Own shift.' : `Using the defaults (${rules.defaultStart} to ${rules.defaultEnd}, ${rules.defaultBreakMinutes} min break).`}
        {rules.graceMinutes ? ` ${rules.graceMinutes} min grace after start.` : ''}
      </p>
    </div>
  );
};

export default PartnerShiftEditor;
