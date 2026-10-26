import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import TwoWheelerRoundedIcon from '@mui/icons-material/TwoWheelerRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import PhoneRoundedIcon from '@mui/icons-material/PhoneRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import BlockRoundedIcon from '@mui/icons-material/BlockRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import PartnerShiftEditor from '../components/PartnerShiftEditor';
import PartnerWithdrawals from '../components/PartnerWithdrawals';

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'approved', label: 'Approved' },
  { key: 'rejected', label: 'Rejected' },
  { key: 'blocked', label: 'Blocked' },
  { key: 'withdrawals', label: 'Withdrawals' },
];

const STATUS_CLS = {
  pending: 'bg-amber-50 text-amber-700',
  approved: 'bg-green-50 text-green-700',
  rejected: 'bg-red-50 text-red-600',
  blocked: 'bg-gray-100 text-gray-600',
};

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;

const DocThumb = ({ url, label }) => (
  <div>
    <p className="text-[11px] font-semibold text-gray-500 mb-1.5">{label}</p>
    {url ? (
      <a href={url} target="_blank" rel="noreferrer" className="block aspect-[4/3] rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
        <img src={url} alt={label} className="w-full h-full object-cover" />
      </a>
    ) : (
      <div className="aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-[11px] text-gray-400">Not uploaded</div>
    )}
  </div>
);

const PartnerPanel = ({ partner, onClose, onUpdated }) => {
  const [busy, setBusy] = useState('');
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const run = async (key, fn, message) => {
    setBusy(key);
    try {
      const res = await fn();
      toast.success(message);
      onUpdated(res.data);
      setRejecting(false);
    } catch (err) {
      toast.error(err?.error || 'Could not update');
    } finally {
      setBusy('');
    }
  };

  const s = partner.stats;
  const owes = s.cashInHand > 0 || s.earningsDue > 0;

  return (
    <div className="fixed inset-0 z-[60] flex justify-end">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
            {partner.profilePhoto ? <img src={partner.profilePhoto} alt="" className="w-full h-full object-cover" /> : <TwoWheelerRoundedIcon className="text-[#5EB929]" />}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-gray-900 truncate">{partner.name}</h2>
            <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full ${STATUS_CLS[partner.status]}`}>{partner.status}</span>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500" aria-label="Close"><CloseRoundedIcon /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-[13px]">
            {[
              ['Mobile', `+91 ${partner.phone}`],
              ['City', partner.city],
              ['Vehicle', `${partner.vehicleType}${partner.vehicleNumber ? ` · ${partner.vehicleNumber}` : ''}`],
              ['Licence no.', partner.documents.licenceNumber || '-'],
              ['Email', partner.email || '-'],
              ['Joined', new Date(partner.createdAt).toLocaleDateString('en-IN')],
            ].map(([k, v]) => (
              <div key={k}>
                <p className="text-[11px] text-gray-400">{k}</p>
                <p className="font-semibold text-gray-800 capitalize break-words">{v}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <DocThumb url={partner.documents.idProofImage} label="Government ID" />
            {partner.vehicleType !== 'bicycle' && <DocThumb url={partner.documents.licenceImage} label="Driving licence" />}
          </div>

          {partner.status === 'rejected' && partner.rejectionReason && (
            <p className="text-[12px] p-3 rounded-xl bg-red-50 text-red-600">Rejected: {partner.rejectionReason}</p>
          )}

          {partner.status === 'approved' && (
            <div className="rounded-2xl border border-gray-100 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[13px] font-semibold text-gray-800">Account</p>
                <span className={`text-[11px] font-semibold ${partner.isOnline ? 'text-[#5EB929]' : 'text-gray-400'}`}>{partner.isOnline ? '● Online' : 'Offline'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-gray-50 p-2.5"><p className="text-[10px] text-gray-400">Deliveries</p><p className="font-semibold text-gray-900">{s.totalDeliveries}</p></div>
                <div className="rounded-xl bg-amber-50 p-2.5"><p className="text-[10px] text-amber-700">Cash with them</p><p className="font-semibold text-amber-800">{rupees(s.cashInHand)}</p></div>
                <div className="rounded-xl bg-[#5EB929]/10 p-2.5"><p className="text-[10px] text-[#3F7F17]">We owe them</p><p className="font-semibold text-[#3F7F17]">{rupees(s.earningsDue)}</p></div>
              </div>
              {(partner.bankDetails.upiId || partner.bankDetails.accountNumber) && (
                <p className="text-[12px] text-gray-500">
                  Pay to: {partner.bankDetails.upiId || `${partner.bankDetails.accountNumber} · ${partner.bankDetails.ifscCode}`}
                </p>
              )}
              <button
                disabled={!owes || Boolean(busy)}
                onClick={() => run('settle', () => deliveryAPI.settlePartner(partner.id), 'Settled')}
                className="w-full h-10 rounded-xl bg-gray-900 text-white text-[13px] font-semibold disabled:opacity-40"
              >
                {busy === 'settle' ? 'Settling...' : owes ? `Settle up (collect ${rupees(s.cashInHand)}, pay ${rupees(s.earningsDue)})` : 'Nothing to settle'}
              </button>
              {partner.settlements.length > 0 && (
                <div className="pt-2 space-y-1">
                  <p className="text-[11px] text-gray-400">Recent settlements</p>
                  {partner.settlements.slice(0, 5).map((st, i) => (
                    <p key={i} className="text-[12px] text-gray-600">
                      {new Date(st.at).toLocaleDateString('en-IN')}: collected {rupees(st.cashReceived)}, paid {rupees(st.earningsPaid)}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {partner.status === 'approved' && <PartnerShiftEditor partnerId={partner.id} />}

          {rejecting && (
            <label className="block">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Reason (shown to the partner)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. ID photo is blurry, please upload a clearer one"
                className="mt-1.5 w-full px-3 py-2.5 border border-gray-200 rounded-xl text-[14px] outline-none focus:border-red-300 resize-none"
              />
            </label>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-2">
          <a href={`tel:${partner.phone}`} className="h-11 px-4 rounded-xl border border-gray-200 text-gray-600 flex items-center gap-1.5 text-[13px] font-semibold">
            <PhoneRoundedIcon sx={{ fontSize: 18 }} /> Call
          </a>
          {rejecting ? (
            <>
              <button onClick={() => setRejecting(false)} className="flex-1 h-11 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-semibold">Back</button>
              <button
                disabled={!reason.trim() || Boolean(busy)}
                onClick={() => run('reject', () => deliveryAPI.updatePartnerStatus(partner.id, 'rejected', reason.trim()), 'Partner rejected')}
                className="flex-1 h-11 rounded-xl bg-red-500 text-white text-[13px] font-semibold disabled:opacity-40"
              >
                Reject
              </button>
            </>
          ) : partner.status === 'pending' || partner.status === 'rejected' ? (
            <>
              {partner.status === 'pending' && (
                <button onClick={() => setRejecting(true)} className="flex-1 h-11 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold">Reject</button>
              )}
              <button
                disabled={Boolean(busy)}
                onClick={() => run('approve', () => deliveryAPI.updatePartnerStatus(partner.id, 'approved'), 'Partner approved')}
                className="flex-1 h-11 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <CheckCircleRoundedIcon sx={{ fontSize: 18 }} /> Approve
              </button>
            </>
          ) : partner.status === 'approved' ? (
            <button
              disabled={Boolean(busy)}
              onClick={() => run('block', () => deliveryAPI.updatePartnerStatus(partner.id, 'blocked'), 'Partner blocked')}
              className="flex-1 h-11 rounded-xl border border-gray-200 text-gray-700 text-[13px] font-semibold flex items-center justify-center gap-1.5"
            >
              <BlockRoundedIcon sx={{ fontSize: 18 }} /> Block
            </button>
          ) : (
            <button
              disabled={Boolean(busy)}
              onClick={() => run('unblock', () => deliveryAPI.updatePartnerStatus(partner.id, 'approved'), 'Partner unblocked')}
              className="flex-1 h-11 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold"
            >
              Unblock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const DeliveryPartners = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('pending');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState(null);

  const key = ['adminDeliveryPartners', tab, q];
  const { data, isLoading } = useQuery({
    queryKey: key,
    queryFn: async () => deliveryAPI.getPartners({ status: tab, q: q.trim() || undefined }),
    placeholderData: (prev) => prev,
    enabled: tab !== 'withdrawals',
  });
  // Waiting withdrawals, for the tab's badge.
  const { data: waiting } = useQuery({
    queryKey: ['adminWithdrawals', 'requested'],
    queryFn: async () => deliveryAPI.getWithdrawals('requested'),
    refetchInterval: 60_000,
  });
  const partners = data?.data || [];
  const counts = data?.counts || {};

  const onUpdated = (updated) => {
    setSelected(updated);
    queryClient.invalidateQueries({ queryKey: ['adminDeliveryPartners'] });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0"><TwoWheelerRoundedIcon /></div>
          <div>
            <h1 className="text-xl lg:text-2xl font-medium text-gray-800">Delivery Partners</h1>
            <p className="text-[12px] text-gray-500">Approve new partners, set their shifts, settle cash and pay withdrawals.</p>
          </div>
        </div>
        <div className="relative w-full md:w-72">
          <SearchRoundedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, city, vehicle..." className="w-full h-10 pl-9 pr-3 bg-white border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]" />
        </div>
      </div>

      <div className="flex gap-1 bg-white p-1 rounded-xl border border-gray-100 w-full md:w-fit overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 h-9 rounded-lg text-[12px] font-semibold flex items-center gap-2 whitespace-nowrap ${tab === t.key ? 'bg-[#5EB929] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            {t.label}
            <span className={`text-[10px] px-1.5 rounded ${tab === t.key ? 'bg-white/20' : t.key === 'withdrawals' && waiting?.counts?.requested?.n ? 'bg-amber-100 text-amber-700' : 'bg-gray-100'}`}>
              {t.key === 'withdrawals' ? waiting?.counts?.requested?.n || 0 : counts[t.key] || 0}
            </span>
          </button>
        ))}
      </div>

      {tab === 'withdrawals' ? (
        <PartnerWithdrawals />
      ) : isLoading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" /></div>
      ) : partners.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <TwoWheelerRoundedIcon sx={{ fontSize: 40 }} className="text-gray-200" />
          <p className="mt-2 text-[13px] text-gray-500">No {tab} partners</p>
          {tab === 'pending' && <p className="text-[12px] text-gray-400">Partners sign up at <span className="font-mono">/delivery/signup</span></p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {partners.map((p) => (
            <button key={p.id} onClick={() => setSelected(p)} className="text-left bg-white rounded-2xl border border-gray-100 p-4 hover:border-[#5EB929]/40 hover:shadow-md transition-all">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gray-900 overflow-hidden flex items-center justify-center shrink-0">
                  {p.profilePhoto ? <img src={p.profilePhoto} alt="" className="w-full h-full object-cover" /> : <TwoWheelerRoundedIcon className="text-[#5EB929]" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[12px] text-gray-500 truncate">{p.city} · +91 {p.phone}</p>
                </div>
                {p.status === 'approved' && (
                  <span className={`w-2.5 h-2.5 rounded-full ${p.isOnline ? 'bg-[#5EB929]' : 'bg-gray-300'}`} title={p.isOnline ? 'Online' : 'Offline'} />
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 capitalize">{p.vehicleType}{p.vehicleNumber ? ` · ${p.vehicleNumber}` : ''}</span>
                {p.status === 'approved' && <span className="px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">{p.stats.totalDeliveries} deliveries</span>}
                {p.stats.cashInHand > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700">Cash {rupees(p.stats.cashInHand)}</span>}
                {p.status === 'pending' && !p.documents.idProofImage && <span className="px-2 py-0.5 rounded-md bg-red-50 text-red-600">Documents missing</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && <PartnerPanel partner={selected} onClose={() => setSelected(null)} onUpdated={onUpdated} />}
    </div>
  );
};

export default DeliveryPartners;
