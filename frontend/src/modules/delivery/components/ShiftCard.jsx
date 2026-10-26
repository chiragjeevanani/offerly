import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import { Card, SectionLabel } from './PartnerUI';

// Today's shift on the partner's Home: the times, and whether they are on track
// to keep their incentive (on time, break left) or have lost it for the period.

const time12 = (hhmm) => {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (!Number.isFinite(h)) return hhmm;
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

const STATUS = {
  off: { tone: 'bg-gray-100 text-gray-500', text: () => 'Day off today' },
  upcoming: { tone: 'bg-sky-50 text-sky-700', text: (s) => `Go online by ${time12(s.start)}${s.graceMinutes ? ` (${s.graceMinutes} min grace)` : ''} to keep your incentive` },
  waiting: { tone: 'bg-amber-50 text-amber-700', text: () => 'Your shift has started. Go online now to keep your incentive' },
  ok: { tone: 'bg-[#5EB929]/10 text-[#3F7F17]', text: () => 'On time. Incentive on track' },
  late: { tone: 'bg-red-50 text-red-600', text: (s, d) => `You came online ${d.lateByMinutes} min late. No incentive this period` },
  absent: { tone: 'bg-red-50 text-red-600', text: () => "You didn't come online for your shift. No incentive this period" },
  over_break: { tone: 'bg-red-50 text-red-600', text: (s, d) => `Offline ${d.breakUsedMinutes} min, more than your ${s.breakMinutes} min break. No incentive this period` },
};

const ShiftCard = ({ shift }) => {
  if (!shift?.today) return null;
  const day = shift.today;
  const st = STATUS[day.status] || STATUS.upcoming;
  const showBreak = ['ok', 'over_break'].includes(day.status) && shift.breakMinutes > 0;
  const breakPct = showBreak ? Math.min(100, Math.round((day.breakUsedMinutes / shift.breakMinutes) * 100)) : 0;
  return (
    <section className="space-y-3">
      <SectionLabel>Your shift</SectionLabel>
      <Card className="p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gray-900 text-[#5EB929] flex items-center justify-center shrink-0">
            <ScheduleRoundedIcon sx={{ fontSize: 22 }} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold text-gray-900">{time12(shift.start)} to {time12(shift.end)}</p>
            <p className="text-[11px] font-semibold text-gray-500">{shift.breakMinutes} min break allowed</p>
          </div>
        </div>
        <p className={`mt-3 text-[12px] font-semibold rounded-xl px-3 py-2 ${st.tone}`}>{st.text(shift, day)}</p>
        {showBreak && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] font-bold text-gray-400">
              <span>Break used</span>
              <span>{day.breakUsedMinutes} / {shift.breakMinutes} min</span>
            </div>
            <div className="mt-1 h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuemin={0} aria-valuemax={shift.breakMinutes} aria-valuenow={day.breakUsedMinutes} aria-label="Break used">
              <div className={`h-full rounded-full ${breakPct >= 100 ? 'bg-red-500' : breakPct >= 70 ? 'bg-amber-400' : 'bg-[#5EB929]'}`} style={{ width: `${breakPct}%` }} />
            </div>
          </div>
        )}
      </Card>
    </section>
  );
};

export default ShiftCard;
