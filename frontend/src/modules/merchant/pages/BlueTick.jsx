import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelRoundedIcon from '@mui/icons-material/CancelRounded';
import RemoveCircleOutlineRoundedIcon from '@mui/icons-material/RemoveCircleOutlineRounded';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import PointOfSaleRoundedIcon from '@mui/icons-material/PointOfSaleRounded';
import TimerRoundedIcon from '@mui/icons-material/TimerRounded';
import DoNotDisturbOnRoundedIcon from '@mui/icons-material/DoNotDisturbOnRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import { merchantAPI } from '../../../api/merchant.api';
import BlueTickIcon, { BLUE_TICK_COLOR } from '../../../components/ui/BlueTick';

const RULE_META = {
  rating: { icon: StarRoundedIcon, tip: 'Serve customers well and ask happy ones to leave a review.' },
  walkins: { icon: PointOfSaleRoundedIcon, tip: 'Ring up counter sales in Walk-in Sale.', link: { to: '/merchant/walk-in', label: 'New walk-in sale' } },
  ready: { icon: TimerRoundedIcon, tip: 'Tap "Mark Packed" on a delivery order as soon as it is ready for the partner.', link: { to: '/merchant/bookings', label: 'Open bookings' } },
  rejections: { icon: DoNotDisturbOnRoundedIcon, tip: 'Accept delivery orders quickly and only decline when you really must.' },
};

const RuleCard = ({ check, index }) => {
  const meta = RULE_META[check.key] || {};
  const Icon = meta.icon || CheckCircleRoundedIcon;
  const status = !check.applies ? 'na' : check.passed ? 'pass' : 'fail';
  const tone = {
    pass: { badge: 'bg-[#5EB929]/10 text-[#3F7F17]', label: 'Done', StatusIcon: CheckCircleRoundedIcon, bar: 'bg-[#5EB929]' },
    fail: { badge: 'bg-amber-50 text-amber-700', label: 'Not yet', StatusIcon: CancelRoundedIcon, bar: 'bg-amber-400' },
    na: { badge: 'bg-gray-100 text-gray-500', label: "Doesn't apply", StatusIcon: RemoveCircleOutlineRoundedIcon, bar: 'bg-gray-300' },
  }[status];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600 shrink-0">
          <Icon sx={{ fontSize: 20 }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">
              <span className="text-gray-400 mr-1">{index + 1}.</span>
              {check.title}
            </p>
            <span className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone.badge}`}>
              <tone.StatusIcon sx={{ fontSize: 13 }} /> {tone.label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">{check.detail}</p>

          {check.applies ? (
            <>
              <p className="text-xs font-semibold text-gray-800 mt-2.5">You: {check.current}</p>
              {typeof check.progress === 'number' && (
                <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden" role="progressbar" aria-valuenow={Math.round(check.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${Math.round(check.progress * 100)}%` }} />
                </div>
              )}
              {!check.passed && meta.tip && <p className="text-[11px] text-amber-700 mt-2">{meta.tip}</p>}
            </>
          ) : (
            <p className="text-[11px] text-gray-400 mt-2">{check.notApplicable}</p>
          )}

          {meta.link && check.applies && !check.passed && (
            <Link to={meta.link.to} className="inline-block mt-2 text-[11px] font-bold text-[#5EB929]">
              {meta.link.label} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

const BlueTickPage = () => {
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ['merchantBlueTick'],
    queryFn: async () => (await merchantAPI.getBlueTick()).data,
    staleTime: 60 * 1000,
  });

  const checks = data?.checks || [];
  const applicable = checks.filter((c) => c.applies);
  const done = applicable.filter((c) => c.passed).length;

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <BlueTickIcon size={24} /> Blue Tick
            </h1>
            <p className="text-xs text-gray-500 mt-1">
              Stores that follow every rule get a blue tick next to their name in the Offerly app, so customers know they can trust them.
            </p>
          </div>
          <button
            type="button"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Check again"
            className="shrink-0 w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-500 flex items-center justify-center disabled:opacity-50"
          >
            <RefreshRoundedIcon sx={{ fontSize: 18 }} className={isFetching ? 'animate-spin' : ''} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : isError ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-sm text-gray-600">Couldn't load your blue tick status.</p>
            <button type="button" onClick={() => refetch()} className="mt-3 text-sm font-bold text-[#5EB929]">Try again</button>
          </div>
        ) : (
          <>
            {!data.settings.enabled ? (
              <div className="rounded-2xl p-4 bg-gray-100 text-sm text-gray-600">Blue ticks are switched off by Offerly for now.</div>
            ) : data.verified ? (
              <div className="rounded-2xl p-4 border" style={{ background: `${BLUE_TICK_COLOR}12`, borderColor: `${BLUE_TICK_COLOR}40` }}>
                <p className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <BlueTickIcon size={22} /> You have the blue tick
                </p>
                <p className="text-xs text-gray-600 mt-1">Customers see you as an Offerly verified seller. Keep meeting the rules below to keep it.</p>
              </div>
            ) : (
              <div className="rounded-2xl p-4 bg-white border border-gray-100 shadow-sm">
                <p className="text-base font-bold text-gray-900">No blue tick yet</p>
                <p className="text-xs text-gray-500 mt-1">
                  {done} of {applicable.length} rules done. Meet every rule that applies to your store and the tick appears automatically.
                </p>
                <div className="mt-3 h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${applicable.length ? (done / applicable.length) * 100 : 0}%`, background: BLUE_TICK_COLOR }} />
                </div>
              </div>
            )}

            <div className="space-y-3">
              {checks.map((check, i) => (
                <RuleCard key={check.key} check={check} index={i} />
              ))}
            </div>

            <p className="text-[11px] text-gray-400 text-center">
              Checked every hour. Last checked{' '}
              {new Date(data.checkedAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default BlueTickPage;
