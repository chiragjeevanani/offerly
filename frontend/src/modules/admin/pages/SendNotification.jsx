import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import CampaignRoundedIcon from '@mui/icons-material/CampaignRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';
import { useCities } from '../../../hooks/useReferenceData';

const AUDIENCES = {
  customer: [
    { key: 'all_customers', label: 'All customers' },
    { key: 'city_customers', label: 'Customers in a city' },
    { key: 'customer', label: 'One customer' },
  ],
  merchant: [
    { key: 'all_merchants', label: 'All merchants' },
    { key: 'city_merchants', label: 'Merchants in a city' },
    { key: 'merchant', label: 'One merchant' },
  ],
};

const MERCHANT_PAGES = [
  { path: '', label: 'Nothing (notifications page)' },
  { path: '/merchant', label: 'Dashboard' },
  { path: '/merchant/subscription', label: 'My Plan' },
  { path: '/merchant/blue-tick', label: 'Blue Tick' },
  { path: '/merchant/wallet', label: 'Offerly Wallet' },
  { path: '/merchant/offers', label: 'Offers' },
];

const when = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const inputCls = 'w-full h-11 px-3 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10';
const Label = ({ children }) => <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{children}</span>;

// Type-ahead picker for a customer, merchant, store or offer.
const Picker = ({ kind, placeholder, value, onChange }) => {
  const [q, setQ] = useState('');
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);
  const { data: results = [], isFetching } = useQuery({
    queryKey: ['broadcastSearch', kind, debounced],
    queryFn: async () => (await adminAPI.searchBroadcastTargets(kind, debounced)).data,
    enabled: debounced.length >= 2 && !value,
  });

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 h-11 px-3 rounded-xl border border-[#5EB929]/40 bg-[#5EB929]/5">
        <span className="text-[14px] font-semibold text-gray-800 truncate">
          {value.title} <span className="text-gray-400 font-normal">{value.sub}</span>
        </span>
        <button type="button" aria-label="Clear" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-600">
          <CloseRoundedIcon sx={{ fontSize: 18 }} />
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <SearchRoundedIcon sx={{ fontSize: 18 }} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder} className={`${inputCls} pl-9`} />
      {debounced.length >= 2 && (
        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-100 rounded-xl shadow-lg overflow-hidden">
          {results.length === 0 ? (
            <p className="px-3 py-2.5 text-[13px] text-gray-400">{isFetching ? 'Searching...' : 'Nothing found'}</p>
          ) : (
            results.map((r) => (
              <button key={r.id} type="button" onClick={() => { onChange(r); setQ(''); }} className="w-full text-left px-3 py-2.5 hover:bg-gray-50">
                <p className="text-[13px] font-semibold text-gray-800">{r.title}</p>
                {r.sub && <p className="text-[11px] text-gray-400">{r.sub}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const SendNotification = () => {
  const queryClient = useQueryClient();
  const { data: cities = [] } = useCities();
  const [who, setWho] = useState('customer');
  const [audience, setAudience] = useState('all_customers');
  const [city, setCity] = useState('');
  const [target, setTarget] = useState(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [opens, setOpens] = useState('none'); // customers: none | home | store | offer
  const [linkTarget, setLinkTarget] = useState(null);
  const [merchantPage, setMerchantPage] = useState('');
  const [sending, setSending] = useState(false);

  const single = audience === 'customer' || audience === 'merchant';
  const byCity = audience.startsWith('city_');

  const { data: count } = useQuery({
    queryKey: ['broadcastCount', audience, city],
    queryFn: async () => (await adminAPI.countBroadcastAudience(audience, city)).count,
    enabled: !single && (!byCity || Boolean(city)),
  });

  const { data: history = [] } = useQuery({
    queryKey: ['broadcasts'],
    queryFn: async () => (await adminAPI.getBroadcasts()).data,
    // Keep refreshing while a send is still going out.
    refetchInterval: (query) => ((query.state.data || []).some((b) => b.status === 'sending') ? 3000 : false),
  });

  const pickWho = (next) => {
    setWho(next);
    setAudience(AUDIENCES[next][0].key);
    setTarget(null);
    setOpens('none');
    setLinkTarget(null);
    setMerchantPage('');
  };

  const link = who === 'merchant'
    ? merchantPage
    : opens === 'home' ? '/home' : (opens === 'store' || opens === 'offer') && linkTarget ? `/${opens}/${linkTarget.id}` : '';
  const reach = single ? (target ? 1 : 0) : count ?? 0;
  const ready = title.trim() && body.trim() && (!single || target) && (!byCity || city)
    && !((opens === 'store' || opens === 'offer') && who === 'customer' && !linkTarget);

  const send = async () => {
    if (!window.confirm(`Send "${title.trim()}" to ${reach} ${who}${reach === 1 ? '' : 's'}?`)) return;
    setSending(true);
    try {
      await adminAPI.sendBroadcast({ title: title.trim(), body: body.trim(), audience: { type: audience, city, targetId: target?.id }, link });
      toast.success('Sending now - see the progress below');
      setTitle('');
      setBody('');
      queryClient.invalidateQueries({ queryKey: ['broadcasts'] });
    } catch (err) {
      toast.error(err?.error || 'Could not send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto pb-24 grid gap-6 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <CampaignRoundedIcon className="text-[#5EB929]" /> Send Notification
          </h1>
          <p className="text-[13px] text-gray-500 mt-1">
            Appears in the app's notifications and as a phone notification for people who allowed them.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {[['customer', 'Customers'], ['merchant', 'Merchants']].map(([k, l]) => (
              <button key={k} type="button" onClick={() => pickWho(k)} aria-pressed={who === k}
                className={`h-11 rounded-xl text-[14px] font-semibold border-2 ${who === k ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900' : 'border-gray-100 text-gray-500'}`}>
                {l}
              </button>
            ))}
          </div>

          <label className="block">
            <Label>Send to</Label>
            <select value={audience} onChange={(e) => { setAudience(e.target.value); setTarget(null); }} className={`${inputCls} mt-1.5`}>
              {AUDIENCES[who].map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
            </select>
          </label>

          {byCity && (
            <label className="block">
              <Label>City</Label>
              <select value={city} onChange={(e) => setCity(e.target.value)} className={`${inputCls} mt-1.5`}>
                <option value="">Choose a city</option>
                {cities.map((c) => <option key={c._id || c.name} value={c.name}>{c.name}</option>)}
              </select>
            </label>
          )}

          {single && (
            <div>
              <Label>{who === 'customer' ? 'Customer' : 'Merchant'}</Label>
              <div className="mt-1.5">
                <Picker kind={who} placeholder={who === 'customer' ? 'Search name or phone' : 'Search store name or phone'} value={target} onChange={setTarget} />
              </div>
            </div>
          )}

          <label className="block">
            <div className="flex justify-between"><Label>Title</Label><span className="text-[11px] text-gray-400">{title.length}/80</span></div>
            <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Diwali deals are live!" className={`${inputCls} mt-1.5`} />
          </label>
          <label className="block">
            <div className="flex justify-between"><Label>Message</Label><span className="text-[11px] text-gray-400">{body.length}/300</span></div>
            <textarea value={body} maxLength={300} rows={3} onChange={(e) => setBody(e.target.value)} placeholder="e.g. Up to 40% off at stores near you. Tap to see them."
              className="mt-1.5 w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-[14px] outline-none focus:border-[#5EB929] focus:ring-2 focus:ring-[#5EB929]/10" />
          </label>

          {who === 'customer' ? (
            <div className="space-y-2">
              <Label>When tapped, open</Label>
              <div className="grid grid-cols-4 gap-2">
                {[['none', 'Nothing'], ['home', 'Home'], ['store', 'A store'], ['offer', 'An offer']].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => { setOpens(k); setLinkTarget(null); }} aria-pressed={opens === k}
                    className={`h-10 rounded-xl text-[12px] font-semibold border ${opens === k ? 'border-[#5EB929] bg-[#5EB929]/5 text-gray-900' : 'border-gray-200 text-gray-500'}`}>
                    {l}
                  </button>
                ))}
              </div>
              {(opens === 'store' || opens === 'offer') && (
                <Picker kind={opens} placeholder={opens === 'store' ? 'Search a live store' : 'Search an active offer'} value={linkTarget} onChange={setLinkTarget} />
              )}
            </div>
          ) : (
            <label className="block">
              <Label>When tapped, open</Label>
              <select value={merchantPage} onChange={(e) => setMerchantPage(e.target.value)} className={`${inputCls} mt-1.5`}>
                {MERCHANT_PAGES.map((p) => <option key={p.path} value={p.path}>{p.label}</option>)}
              </select>
            </label>
          )}

          <button type="button" onClick={send} disabled={!ready || sending || reach === 0}
            className="w-full h-12 rounded-xl bg-[#5EB929] text-white text-[14px] font-semibold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
            <SendRoundedIcon sx={{ fontSize: 18 }} />
            {sending ? 'Sending...' : `Send to ${reach} ${who}${reach === 1 ? '' : 's'}`}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Preview</p>
          <div className="rounded-2xl bg-gray-900 p-4 text-white shadow-lg">
            <div className="flex items-center gap-2 text-[11px] text-gray-400">
              <img src="/offerly-icon-64.png" alt="" className="w-4 h-4 rounded" /> Offerly · now
            </div>
            <p className="mt-1.5 text-[14px] font-semibold">{title.trim() || 'Your title'}</p>
            <p className="text-[13px] text-gray-300 leading-snug">{body.trim() || 'Your message appears here.'}</p>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Sent</p>
          <div className="space-y-2">
            {history.length === 0 && <p className="text-[13px] text-gray-400">Nothing sent yet.</p>}
            {history.map((b) => (
              <div key={b._id} className="bg-white rounded-xl border border-gray-100 p-3">
                <div className="flex justify-between gap-2">
                  <p className="text-[13px] font-semibold text-gray-800">{b.title}</p>
                  <span className={`shrink-0 text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${
                    b.status === 'sent' ? 'bg-green-50 text-green-700' : b.status === 'failed' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
                    {b.status === 'sending' ? 'Sending...' : b.status}
                  </span>
                </div>
                <p className="text-[12px] text-gray-500 line-clamp-2">{b.body}</p>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  {b.audience?.label} · {b.delivered}/{b.recipients} in app · {b.pushed} phone{b.pushed === 1 ? '' : 's'}
                  {b.linkLabel ? ` · opens ${b.linkLabel}` : ''} · {when(b.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SendNotification;
