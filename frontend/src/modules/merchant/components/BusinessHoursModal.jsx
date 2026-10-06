import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import toast from 'react-hot-toast';
import { merchantAPI } from '../../../api/merchant.api';

const WEEK_DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const DEFAULT_DAY = { open: '09:00', close: '21:00', isClosed: false };

const normalize = (hours) =>
  Object.fromEntries(WEEK_DAYS.map((d) => [d, {
    open: hours?.[d]?.open || DEFAULT_DAY.open,
    close: hours?.[d]?.close || DEFAULT_DAY.close,
    isClosed: Boolean(hours?.[d]?.isClosed),
  }]));

// Edits the store's weekly schedule. The open/closed toggle on the dashboard
// follows these hours automatically (backend cron), so they need to be editable
// after onboarding, not just during it.
const BusinessHoursModal = ({ merchant, onClose, onSaved }) => {
  const [hours, setHours] = useState(() => normalize(merchant?.businessHours));
  const [saving, setSaving] = useState(false);

  const update = (day, patch) => setHours((prev) => ({ ...prev, [day]: { ...prev[day], ...patch } }));

  const copyToAll = (day) => {
    setHours((prev) => Object.fromEntries(WEEK_DAYS.map((d) => [d, { ...prev[day] }])));
    toast.success(`Copied ${day}'s hours to every day`);
  };

  const handleSave = async () => {
    for (const d of WEEK_DAYS) {
      const h = hours[d];
      if (!h.isClosed && h.open === h.close) {
        toast.error(`Open and close times can't be the same on ${d}`);
        return;
      }
    }
    setSaving(true);
    try {
      await merchantAPI.updateStore({ businessHours: hours });
      toast.success('Business hours updated');
      await onSaved?.();
      onClose();
    } catch (error) {
      toast.error(error?.message || 'Failed to update business hours');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-end sm:items-center justify-center bg-gray-950/60 backdrop-blur-sm p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full sm:max-w-lg bg-white rounded-t-[2rem] sm:rounded-2xl shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#5EB929]/10 text-[#5EB929] rounded-lg flex items-center justify-center">
              <AccessTimeRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <div>
              <h2 className="text-[15px] font-bold text-gray-900 leading-none">Business Hours</h2>
              <p className="text-[10px] font-bold text-gray-400 mt-1">Your store opens and closes automatically on this schedule</p>
            </div>
          </div>
          <button onClick={onClose} disabled={saving} className="w-8 h-8 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-3 divide-y divide-gray-50">
          {WEEK_DAYS.map((day) => {
            const h = hours[day];
            return (
              <div key={day} className="py-3 space-y-2">
               <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => update(day, { isClosed: !h.isClosed })}
                  role="switch"
                  aria-checked={!h.isClosed}
                  className={`relative w-9 h-5 rounded-full transition-colors shrink-0 ${h.isClosed ? 'bg-gray-200' : 'bg-[#5EB929]'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${h.isClosed ? '' : 'translate-x-4'}`} />
                </button>
                <span className={`flex-1 text-[12px] font-bold capitalize ${h.isClosed ? 'text-gray-300' : 'text-gray-800'}`}>{day}</span>
                {h.isClosed && <span className="text-[11px] font-bold text-red-400 uppercase">Closed</span>}
                <button type="button" onClick={() => copyToAll(day)} className="text-[10px] font-bold text-[#5EB929] shrink-0" title="Copy to all days">
                  Copy to all
                </button>
               </div>
               {!h.isClosed && (
                 <div className="flex items-center gap-2 pl-12">
                   <input type="time" value={h.open} onChange={(e) => update(day, { open: e.target.value })} aria-label={`${day} opening time`} className="min-w-0 flex-1 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-[13px] font-bold outline-none focus:border-[#5EB929]/40" />
                   <span className="text-[11px] font-bold text-gray-300">to</span>
                   <input type="time" value={h.close} onChange={(e) => update(day, { close: e.target.value })} aria-label={`${day} closing time`} className="min-w-0 flex-1 bg-gray-50 border border-gray-100 rounded-lg px-2.5 py-2 text-[13px] font-bold outline-none focus:border-[#5EB929]/40" />
                 </div>
               )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 space-y-2">
          <p className="text-[10px] font-medium text-gray-400 leading-relaxed">
            A close time earlier than the open time runs past midnight (e.g. 6 PM to 2 AM).
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-11 bg-[#5EB929] text-white rounded-xl text-[12px] font-bold uppercase tracking-wider disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Hours'}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default BusinessHoursModal;
