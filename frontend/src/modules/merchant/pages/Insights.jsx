import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts';
import PersonAddAlt1RoundedIcon from '@mui/icons-material/PersonAddAlt1Rounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import CurrencyRupeeRoundedIcon from '@mui/icons-material/CurrencyRupeeRounded';
import ShoppingBagRoundedIcon from '@mui/icons-material/ShoppingBagRounded';
import ArrowUpwardRoundedIcon from '@mui/icons-material/ArrowUpwardRounded';
import ArrowDownwardRoundedIcon from '@mui/icons-material/ArrowDownwardRounded';
import ChevronLeftRoundedIcon from '@mui/icons-material/ChevronLeftRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { merchantAPI } from '../../../api/merchant.api';

const ACCENT = '#5EB929';

// ── Month helpers ───────────────────────────────────────────────────────────
const monthKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const shiftMonth = (key, delta) => {
  const [year, month] = key.split('-').map(Number);
  const next = new Date(year, month - 1 + delta, 1);
  return monthKey(next);
};

const formatMonthLabel = (key) => {
  const [year, month] = key.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
};

const rupees = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

const formatHour = (hour) => {
  const suffix = hour < 12 ? 'am' : 'pm';
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}${suffix}`;
};

// ── Shared bits ─────────────────────────────────────────────────────────────
const Delta = ({ value }) => {
  if (value === null || value === undefined) {
    return <span className="text-[9px] font-bold text-gray-300 uppercase tracking-widest">New</span>;
  }
  if (value === 0) {
    return <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Flat</span>;
  }

  const up = value > 0;
  const Icon = up ? ArrowUpwardRoundedIcon : ArrowDownwardRoundedIcon;

  return (
    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-widest ${up ? 'text-[#5EB929]' : 'text-rose-500'}`}>
      <Icon sx={{ fontSize: 11 }} /> {Math.abs(value)}%
    </span>
  );
};

const Panel = ({ title, subtitle, action, children, className = '' }) => (
  <div className={`bg-white rounded-[1.75rem] p-5 lg:p-6 shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-gray-50 ${className}`}>
    <div className="flex items-start justify-between gap-3 mb-5">
      <div>
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">{title}</h3>
        {subtitle && <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </div>
);

const StatTile = (props) => (
  <div className="bg-white rounded-2xl p-4 border border-gray-50 shadow-sm flex flex-col gap-2.5">
    <div className="flex items-center justify-between">
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${props.tone}`}>
        <props.icon sx={{ fontSize: 17 }} />
      </div>
      <Delta value={props.change} />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900 leading-none tabular-nums">{props.value}</p>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-1.5">{props.label}</p>
      {props.hint && <p className="text-[9px] font-bold text-gray-300 mt-1">{props.hint}</p>}
    </div>
  </div>
);

const EmptyNote = ({ children }) => (
  <div className="py-10 text-center bg-background rounded-2xl border border-dashed border-gray-200">
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{children}</p>
  </div>
);

// Coverage is shown next to every demographic chart. These fields are optional in
// the customer profile, so a breakdown without it invites reading a thin sample as fact.
const CoverageBadge = ({ coverage }) => (
  <span
    className="inline-flex items-center gap-1 text-[8px] font-bold uppercase tracking-widest text-gray-400"
    title="Share of this month's customers who have filled in this detail"
  >
    <InfoOutlinedIcon sx={{ fontSize: 11 }} />
    {coverage}% shared
  </span>
);

const Breakdown = ({ rows, total }) => {
  if (!rows?.length) return <EmptyNote>No data</EmptyNote>;

  return (
    <div className="space-y-2.5">
      {rows.map((row) => (
        <div key={row.label}>
          <div className="flex items-center justify-between mb-1">
            <span className={`text-[11px] font-bold ${row.label === 'Not shared' ? 'text-gray-300' : 'text-gray-700'}`}>
              {row.label}
            </span>
            <span className="text-[10px] font-bold text-gray-400 tabular-nums">
              {row.count} · {row.share}%
            </span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${row.label === 'Not shared' ? 'bg-gray-200' : 'bg-[#5EB929]'}`}
              style={{ width: `${total ? Math.max(row.share, 1) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

const ChartTip = ({ active, payload, label, formatter }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-gray-900 text-white px-3.5 py-2 rounded-xl shadow-2xl border border-white/10">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm font-bold text-[#5EB929]">{formatter(payload[0].value)}</p>
    </div>
  );
};

// ── Peak periods heatmap ────────────────────────────────────────────────────
// Trading hours only - a 24-column grid is unreadable on a phone and most cells
// would be empty anyway.
const HEATMAP_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7am – 10pm

const Heatmap = ({ matrix }) => {
  const peak = useMemo(() => {
    let max = 0;
    for (const day of matrix || []) {
      for (const hour of day.hours) {
        if (hour.redemptions > max) max = hour.redemptions;
      }
    }
    return max;
  }, [matrix]);

  if (!peak) return <EmptyNote>No redemptions this month</EmptyNote>;

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="min-w-[520px]">
        <div className="flex gap-1 mb-1 pl-9">
          {HEATMAP_HOURS.map((hour) => (
            <div key={hour} className="flex-1 text-center text-[7px] font-bold text-gray-300 uppercase">
              {hour % 3 === 1 ? formatHour(hour) : ''}
            </div>
          ))}
        </div>
        {(matrix || []).map((day) => (
          <div key={day.weekday} className="flex items-center gap-1 mb-1">
            <div className="w-8 text-[8px] font-bold text-gray-400 uppercase tracking-widest">{day.weekday}</div>
            {HEATMAP_HOURS.map((hour) => {
              const cell = day.hours[hour];
              const intensity = peak ? cell.redemptions / peak : 0;
              return (
                <div
                  key={hour}
                  title={`${day.weekday} ${formatHour(hour)} — ${cell.redemptions} redemptions`}
                  className="flex-1 aspect-square rounded-[3px] min-w-[14px]"
                  style={{
                    backgroundColor: intensity === 0 ? '#F3F4F6' : ACCENT,
                    opacity: intensity === 0 ? 1 : 0.18 + intensity * 0.82,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Page ────────────────────────────────────────────────────────────────────
const SORTS = {
  revenue: { label: 'Revenue', compare: (a, b) => b.revenue - a.revenue },
  redemptions: { label: 'Redemptions', compare: (a, b) => b.redemptions - a.redemptions },
  views: { label: 'Views', compare: (a, b) => b.views - a.views },
  conversionRate: {
    label: 'Conversion',
    compare: (a, b) => (b.conversionRate ?? -1) - (a.conversionRate ?? -1),
  },
};

const InsightsLocked = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4 text-center px-6">
      <div className="w-16 h-16 rounded-3xl bg-indigo-50 flex items-center justify-center">
        <WorkspacePremiumRoundedIcon sx={{ fontSize: 30 }} className="text-indigo-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">Dashboard Insights is a premium feature</p>
        <p className="text-[11px] font-medium text-gray-500 mt-1 max-w-xs">
          Upgrade to a plan that includes Insights to unlock revenue trends, customer demographics, and offer performance analytics.
        </p>
      </div>
      <button
        onClick={() => navigate('/merchant/subscription')}
        className="mt-2 px-6 py-3 bg-[#5EB929] text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-[#2D5A3A] transition-all shadow-lg shadow-[#5EB929]/20"
      >
        View Plans
      </button>
    </div>
  );
};

const Insights = ({ merchant }) => {
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [sortBy, setSortBy] = useState('revenue');

  const currentMonth = monthKey(new Date());
  const isCurrentMonth = month === currentMonth;

  const insightsEnabled = Boolean(merchant?.subscription?.planId?.insightsEnabled);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['merchantInsights', merchant?._id, month],
    queryFn: () => merchantAPI.getMonthlyAnalytics(month),
    enabled: !!merchant?._id && insightsEnabled,
    placeholderData: (previous) => previous,
  });

  if (!insightsEnabled) {
    return <InsightsLocked />;
  }

  const revenueSeries = useMemo(
    () => (data?.revenueSeries || []).map((point) => ({
      ...point,
      day: Number(point.date.slice(8, 10)),
    })),
    [data]
  );

  const acquisitionSeries = useMemo(
    () => (data?.acquisition?.daily || []).map((point) => ({
      ...point,
      day: Number(point.date.slice(8, 10)),
    })),
    [data]
  );

  const sortedOffers = useMemo(
    () => [...(data?.offerPerformance || [])].sort(SORTS[sortBy].compare),
    [data, sortBy]
  );

  if (isLoading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#5EB929]/10 rounded-full" />
          <div className="w-16 h-16 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin absolute inset-0" />
        </div>
        <p className="text-gray-900 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Building your report</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm font-bold text-gray-900">Couldn't load your insights</p>
        <p className="text-[11px] font-medium text-gray-500">Check your connection and try again.</p>
      </div>
    );
  }

  const summary = data?.summary || {};
  const acquisition = data?.acquisition || {};
  const repeat = data?.repeatCustomers || {};
  const peaks = data?.peakPeriods || {};
  const demographics = data?.demographics || {};

  return (
    <div className="min-h-screen bg-background p-3 lg:p-6 -m-4 lg:-m-6">
      <div className="max-w-7xl mx-auto space-y-5 pb-20">

        {/* Header + month picker */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-6 bg-[#5EB929] rounded-full" />
              <h1 className="text-xl lg:text-2xl font-bold text-gray-900 tracking-tight">Insights</h1>
            </div>
            <p className="text-[12px] text-gray-500 font-medium">
              How your offers performed in {formatMonthLabel(month)}
            </p>
          </div>

          <div className="flex items-center gap-1 bg-white rounded-2xl border border-gray-100 shadow-sm p-1.5 self-start">
            <button
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Previous month"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeftRoundedIcon sx={{ fontSize: 18 }} />
            </button>
            <span className="px-3 text-[10px] font-bold text-gray-900 uppercase tracking-widest whitespace-nowrap tabular-nums">
              {formatMonthLabel(month)}
            </span>
            <button
              onClick={() => setMonth(shiftMonth(month, 1))}
              disabled={isCurrentMonth}
              aria-label="Next month"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-50 disabled:opacity-25 disabled:hover:bg-transparent transition-colors"
            >
              <ChevronRightRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatTile
            icon={CurrencyRupeeRoundedIcon}
            tone="bg-amber-50 text-amber-500"
            label="Revenue Generated"
            value={rupees(summary.revenue)}
            change={summary.revenueChange}
            hint={`vs ${rupees(summary.previousRevenue)} last month`}
          />
          <StatTile
            icon={PersonAddAlt1RoundedIcon}
            tone="bg-indigo-50 text-indigo-500"
            label="Customers Acquired"
            value={acquisition.acquired ?? 0}
            change={acquisition.change}
            hint={`${summary.activeCustomers ?? 0} customers active`}
          />
          <StatTile
            icon={ReplayRoundedIcon}
            tone="bg-[#5EB929]/10 text-[#5EB929]"
            label="Repeat Customers"
            value={repeat.repeat ?? 0}
            change={null}
            hint={`${repeat.repeatRate ?? 0}% of customers returned`}
          />
          <StatTile
            icon={ShoppingBagRoundedIcon}
            tone="bg-pink-50 text-pink-500"
            label="Avg Order Value"
            value={rupees(summary.averageOrderValue)}
            change={null}
            hint={`${summary.redemptions ?? 0} redemptions`}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* Revenue trend */}
          <Panel title="Revenue" subtitle="Daily through the month" className="lg:col-span-8">
            {summary.revenue ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={revenueSeries}>
                    <defs>
                      <linearGradient id="insightsRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={ACCENT} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={8} interval={4} />
                    <YAxis hide />
                    <Tooltip content={<ChartTip formatter={rupees} />} cursor={{ stroke: ACCENT, strokeWidth: 2, strokeDasharray: '5 5' }} />
                    <Area type="monotone" dataKey="revenue" stroke={ACCENT} strokeWidth={2.5} fillOpacity={1} fill="url(#insightsRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>No revenue recorded this month</EmptyNote>
            )}
          </Panel>

          {/* Repeat split */}
          <Panel title="Customer Mix" subtitle="Returning vs one-time" className="lg:col-span-4">
            {repeat.total ? (
              <div className="space-y-5">
                <div>
                  <p className="text-4xl font-bold text-gray-900 leading-none tabular-nums">{repeat.repeatRate}%</p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-2">Repeat rate</p>
                </div>
                <div className="h-2.5 rounded-full overflow-hidden flex bg-gray-100">
                  <div className="bg-[#5EB929]" style={{ width: `${repeat.repeatRate}%` }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-background rounded-xl border border-gray-50">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Returning</p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{repeat.repeat}</p>
                  </div>
                  <div className="p-3 bg-background rounded-xl border border-gray-50">
                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">One-time</p>
                    <p className="text-lg font-bold text-gray-900 tabular-nums">{repeat.oneTime}</p>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-gray-400">
                  {repeat.averageVisits} visits per customer on average
                </p>
              </div>
            ) : (
              <EmptyNote>No customers this month</EmptyNote>
            )}
          </Panel>

          {/* Acquisition */}
          <Panel title="New Customers" subtitle="First-time visitors per day" className="lg:col-span-6">
            {acquisition.acquired ? (
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={acquisitionSeries}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} dy={8} interval={4} />
                    <YAxis hide />
                    <Tooltip content={<ChartTip formatter={(v) => `${v} new`} />} cursor={{ fill: 'rgba(94,185,41,0.06)' }} />
                    <Bar dataKey="acquired" fill={ACCENT} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <EmptyNote>No new customers this month</EmptyNote>
            )}
          </Panel>

          {/* Peak periods */}
          <Panel
            title="Peak Periods"
            subtitle={
              peaks.peakSlot
                ? `Busiest: ${peaks.peakSlot.weekday} around ${formatHour(peaks.peakSlot.hour)}`
                : 'When your customers redeem'
            }
            className="lg:col-span-6"
          >
            <Heatmap matrix={peaks.matrix} />
            {peaks.busiestDay && (
              <p className="text-[10px] font-bold text-gray-400 mt-4">
                {peaks.busiestDay.weekday} is your strongest day
                {peaks.busiestHour ? ` · ${formatHour(peaks.busiestHour.hour)} is your strongest hour` : ''}
              </p>
            )}
          </Panel>

          {/* Offer performance */}
          <Panel
            title="Offer Performance"
            subtitle="Views, redemptions and revenue per offer"
            className="lg:col-span-12"
            action={
              <div className="flex items-center gap-1 bg-background rounded-xl p-1 border border-gray-50">
                {Object.entries(SORTS).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => setSortBy(key)}
                    className={`px-2.5 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-colors ${
                      sortBy === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {config.label}
                  </button>
                ))}
              </div>
            }
          >
            {sortedOffers.length === 0 ? (
              <EmptyNote>No offer activity this month</EmptyNote>
            ) : (
              <div className="overflow-x-auto -mx-5 lg:-mx-6 px-5 lg:px-6">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Offer', 'Views', 'Redemptions', 'Conversion', 'Revenue'].map((heading, index) => (
                        <th
                          key={heading}
                          className={`pb-3 text-[8px] font-bold text-gray-400 uppercase tracking-widest ${index === 0 ? 'text-left' : 'text-right'}`}
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedOffers.map((offer, index) => (
                      <tr key={offer.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-lg bg-background flex items-center justify-center text-[9px] font-bold text-gray-400 shrink-0">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-gray-900 truncate max-w-[220px]">{offer.title}</p>
                              {offer.status !== 'active' && (
                                <p className="text-[8px] font-bold text-gray-300 uppercase tracking-widest">{offer.status}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-right text-[11px] font-bold text-gray-600 tabular-nums">
                          {offer.views.toLocaleString('en-IN')}
                        </td>
                        <td className="py-3 text-right text-[11px] font-bold text-gray-600 tabular-nums">
                          {offer.redemptions}
                        </td>
                        <td className="py-3 text-right text-[11px] font-bold tabular-nums">
                          {offer.conversionRate === null ? (
                            <span className="text-gray-300">—</span>
                          ) : (
                            <span className="text-[#5EB929]">{offer.conversionRate}%</span>
                          )}
                        </td>
                        <td className="py-3 text-right text-[11px] font-bold text-gray-900 tabular-nums">
                          {rupees(offer.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Demographics */}
          <Panel
            title="Customer Demographics"
            subtitle={`Based on ${demographics.totalCustomers ?? 0} customers this month`}
            className="lg:col-span-12"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Gender</h4>
                  <CoverageBadge coverage={demographics.gender?.coverage ?? 0} />
                </div>
                <Breakdown rows={demographics.gender?.breakdown} total={demographics.totalCustomers} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Age</h4>
                  <CoverageBadge coverage={demographics.age?.coverage ?? 0} />
                </div>
                <Breakdown rows={demographics.age?.breakdown} total={demographics.totalCustomers} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">City</h4>
                  <CoverageBadge coverage={demographics.city?.coverage ?? 0} />
                </div>
                <Breakdown rows={demographics.city?.breakdown} total={demographics.totalCustomers} />
              </div>
            </div>

            <p className="text-[10px] font-medium text-gray-400 mt-6 pt-4 border-t border-gray-50">
              Demographics come from what customers choose to share on their profile. "Not shared"
              means the detail is missing, not that it is unusual.
            </p>
          </Panel>

        </div>
      </div>
    </div>
  );
};

export default Insights;
