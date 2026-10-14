import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import PhoneAndroidRoundedIcon from '@mui/icons-material/PhoneAndroidRounded';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { merchantAPI } from '../../../api/merchant.api';

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const when = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

const PERIODS = [
  { key: 'today', label: 'Today' },
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: '90d', label: '90 days' },
  { key: 'all', label: 'All time' },
];

const ONLINE = { label: 'Online', sub: 'Booked in the Offerly app', icon: PhoneAndroidRoundedIcon, bar: 'bg-[#5EB929]', tone: 'text-[#4E9F1F] bg-[#5EB929]/10' };
const OFFLINE = { label: 'Offline', sub: 'Walk-in sales at your counter', icon: StorefrontRoundedIcon, bar: 'bg-indigo-500', tone: 'text-indigo-600 bg-indigo-50' };

const share = (a, b) => (a + b > 0 ? Math.round((a / (a + b)) * 100) : 0);

const SideCard = ({ meta, stats }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
    <div className="flex items-center gap-2">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${meta.tone}`}>
        <meta.icon sx={{ fontSize: 18 }} />
      </div>
      <div>
        <p className="text-sm font-bold text-gray-900">{meta.label}</p>
        <p className="text-[10px] text-gray-500">{meta.sub}</p>
      </div>
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">{stats.orders}</p>
      <p className="text-[11px] text-gray-500">{stats.orders === 1 ? 'order' : 'orders'}</p>
    </div>
    <div className="space-y-1 text-xs">
      <div className="flex justify-between"><span className="text-gray-500">Sales</span><span className="font-bold text-gray-900">{rupees(stats.revenue)}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Discount given</span><span className="font-semibold text-gray-700">{rupees(stats.discount)}</span></div>
      <div className="flex justify-between"><span className="text-gray-500">Customers</span><span className="font-semibold text-gray-700">{stats.customers}</span></div>
    </div>
  </div>
);

const ShareBar = ({ title, online, offline, format = (n) => n }) => {
  const pct = share(online, offline);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-[11px] font-semibold">
        <span className="text-gray-600">{title}</span>
        <span className="text-gray-500">
          <span className="text-[#4E9F1F]">{format(online)}</span> online · <span className="text-indigo-600">{format(offline)}</span> offline
        </span>
      </div>
      <div className="h-3 rounded-full bg-gray-100 overflow-hidden flex">
        {online + offline > 0 && (
          <>
            <div className={ONLINE.bar} style={{ width: `${pct}%` }} />
            <div className={OFFLINE.bar} style={{ width: `${100 - pct}%` }} />
          </>
        )}
      </div>
      <p className="text-[10px] text-gray-400">{online + offline > 0 ? `${pct}% online · ${100 - pct}% offline` : 'Nothing in this period'}</p>
    </div>
  );
};

// Daily orders, online stacked on offline.
const DailyChart = ({ series }) => {
  const max = Math.max(1, ...series.map((d) => d.online + d.offline));
  const labelEvery = Math.ceil(series.length / 7);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <p className="text-sm font-bold text-gray-900 mb-3">Orders per day</p>
      <div className="flex items-end gap-[3px] h-32">
        {series.map((d) => {
          const total = d.online + d.offline;
          return (
            <div key={d.date} className="flex-1 h-full flex flex-col justify-end" title={`${d.date}: ${d.online} online, ${d.offline} offline`}>
              <div className="w-full flex flex-col justify-end rounded-t-[3px] overflow-hidden" style={{ height: `${(total / max) * 100}%` }}>
                <div className={ONLINE.bar} style={{ height: total ? `${(d.online / total) * 100}%` : 0 }} />
                <div className={OFFLINE.bar} style={{ height: total ? `${(d.offline / total) * 100}%` : 0 }} />
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-[3px] mt-1.5">
        {series.map((d, i) => (
          <span key={d.date} className="flex-1 text-[9px] text-gray-400 text-center overflow-visible whitespace-nowrap">
            {i % labelEvery === 0 ? new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''}
          </span>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[11px] text-gray-600">
        <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${ONLINE.bar}`} /> Online</span>
        <span className="flex items-center gap-1.5"><span className={`w-2.5 h-2.5 rounded-sm ${OFFLINE.bar}`} /> Offline</span>
      </div>
    </div>
  );
};

const OnlineOffline = () => {
  const [period, setPeriod] = useState('30d');
  const { data, isLoading, isError } = useQuery({
    queryKey: ['salesComparison', period],
    queryFn: async () => (await merchantAPI.getSalesComparison(period))?.data,
    placeholderData: (prev) => prev,
  });

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <CompareArrowsRoundedIcon className="text-[#5EB929]" /> Online vs Offline
            </h1>
            <p className="text-xs text-gray-500 mt-1">App bookings you scanned compared with walk-in sales you rang up.</p>
          </div>
          <Link to="/merchant/walk-in" className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-white bg-[#5EB929] px-3 py-2 rounded-lg">
            <AddRoundedIcon sx={{ fontSize: 15 }} /> Walk-in sale
          </Link>
        </div>

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap border transition-colors ${
                period === p.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {isLoading && !data ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="h-48 bg-white rounded-2xl animate-pulse" />
            <div className="h-48 bg-white rounded-2xl animate-pulse" />
          </div>
        ) : isError || !data ? (
          <p className="p-8 text-center text-sm text-red-500">Couldn't load the comparison. Please try again.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <SideCard meta={ONLINE} stats={data.online} />
              <SideCard meta={OFFLINE} stats={data.offline} />
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
              <ShareBar title="Orders" online={data.online.orders} offline={data.offline.orders} />
              <ShareBar title="Sales" online={data.online.revenue} offline={data.offline.revenue} format={rupees} />
            </div>

            {data.series.length > 0 && <DailyChart series={data.series} />}

            <div className="space-y-2">
              <h2 className="text-sm font-bold text-gray-900 px-0.5">Latest orders</h2>
              {data.recent.length === 0 ? (
                <p className="text-xs text-gray-400 bg-white rounded-2xl border border-gray-100 p-4 text-center">No orders in this period.</p>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
                  {data.recent.map((r) => {
                    const meta = r.type === 'online' ? ONLINE : OFFLINE;
                    return (
                      <div key={`${r.type}-${r.id}`} className="p-3.5 flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${meta.tone}`}>
                          <meta.icon sx={{ fontSize: 16 }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{r.customer}</p>
                          <p className="text-[11px] text-gray-500">
                            {meta.label}{r.ref ? ` · ${r.ref}` : ''} · {when(r.date)}
                          </p>
                        </div>
                        <p className="text-sm font-bold text-gray-900">{rupees(r.amount)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default OnlineOffline;
