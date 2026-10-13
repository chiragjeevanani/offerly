import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import StarsRoundedIcon from '@mui/icons-material/StarsRounded';
import CardGiftcardRoundedIcon from '@mui/icons-material/CardGiftcardRounded';
import SouthWestRoundedIcon from '@mui/icons-material/SouthWestRounded';
import ScheduleRoundedIcon from '@mui/icons-material/ScheduleRounded';
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import toast from 'react-hot-toast';
import { merchantAPI } from '../../../api/merchant.api';

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const when = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// How each ledger entry reads to the store: money in (green) or out to a payout
const ENTRY = {
  points_discount: { icon: StarsRoundedIcon, sign: '+', tone: 'text-[#5EB929] bg-[#5EB929]/10', title: 'Customer used points' },
  bonus_discount: { icon: CardGiftcardRoundedIcon, sign: '+', tone: 'text-[#5EB929] bg-[#5EB929]/10', title: 'Offerly bonus on an order' },
  payout_requested: { icon: ScheduleRoundedIcon, sign: '−', tone: 'text-amber-600 bg-amber-50', title: 'Payout requested' },
  payout_paid: { icon: SouthWestRoundedIcon, sign: '', tone: 'text-blue-600 bg-blue-50', title: 'Paid to you by Offerly' },
  payout_rejected: { icon: ReplayRoundedIcon, sign: '+', tone: 'text-gray-600 bg-gray-100', title: 'Payout request declined' },
};

const PAYOUT_STATUS = {
  pending: { label: 'Waiting for Offerly', tone: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', tone: 'bg-[#5EB929]/10 text-[#4E9F1F]' },
  rejected: { label: 'Declined', tone: 'bg-red-50 text-red-600' },
};

const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]';

const PayoutDetailsForm = ({ initial, onDone }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    upiId: initial?.upiId || '',
    accountHolderName: initial?.accountHolderName || '',
    accountNumber: initial?.accountNumber || '',
    ifscCode: initial?.ifscCode || '',
    bankName: initial?.bankName || '',
  });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = useMutation({
    mutationFn: () => merchantAPI.saveBankDetails(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchantSettlement'] });
      toast.success('Payout details saved');
      onDone();
    },
    onError: (err) => toast.error(err?.error || err?.response?.data?.error || 'Could not save payout details'),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
      className="space-y-3"
    >
      <p className="text-xs text-gray-500">Add a UPI ID, a bank account, or both. Offerly pays your payouts here.</p>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 mb-1">UPI ID</label>
        <input value={form.upiId} onChange={set('upiId')} placeholder="yourname@bank" className={inputClass} autoCapitalize="none" />
      </div>
      <div className="flex items-center gap-3 text-[11px] font-bold text-gray-300">
        <span className="flex-1 h-px bg-gray-200" /> OR BANK ACCOUNT <span className="flex-1 h-px bg-gray-200" />
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 mb-1">Account holder name</label>
        <input value={form.accountHolderName} onChange={set('accountHolderName')} className={inputClass} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">Account number</label>
          <input value={form.accountNumber} onChange={set('accountNumber')} inputMode="numeric" className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] font-bold text-gray-500 mb-1">IFSC code</label>
          <input value={form.ifscCode} onChange={set('ifscCode')} placeholder="SBIN0001234" className={`${inputClass} uppercase`} />
        </div>
      </div>
      <div>
        <label className="block text-[11px] font-bold text-gray-500 mb-1">Bank name (optional)</label>
        <input value={form.bankName} onChange={set('bankName')} className={inputClass} />
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" onClick={onDone} className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-600 text-sm font-bold">
          Cancel
        </button>
        <button type="submit" disabled={save.isPending} className="flex-1 py-3 rounded-xl bg-[#5EB929] text-white text-sm font-bold disabled:opacity-50">
          {save.isPending ? 'Saving...' : 'Save'}
        </button>
      </div>
    </form>
  );
};

const maskAccount = (n = '') => (n.length > 4 ? `•••• ${n.slice(-4)}` : n);

const Wallet = () => {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState('history');
  const [editingDetails, setEditingDetails] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['merchantSettlement'],
    queryFn: async () => (await merchantAPI.getSettlement()).data,
  });

  const requestPayout = useMutation({
    mutationFn: () => merchantAPI.requestPayout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['merchantSettlement'] });
      toast.success('Payout requested. Offerly will pay you soon.');
    },
    onError: (err) => toast.error(err?.error || err?.response?.data?.error || 'Could not request a payout'),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (isError || !data) {
    return <p className="p-8 text-center text-sm text-red-500">Couldn't load your wallet. Pull down to refresh or try again.</p>;
  }

  const { wallet, bankDetails, hasPayoutDetails, minPayout, transactions, payouts } = data;
  const openRequest = payouts.find((p) => p.status === 'pending');
  const belowMinimum = wallet.balance < minPayout;
  const canRequest = wallet.balance > 0 && !belowMinimum && !openRequest && hasPayoutDetails;

  // Why the button is off, in the order the store can fix it
  const blocker = openRequest
    ? `Your request for ${rupees(openRequest.amount)} is waiting for Offerly. You can ask again once it's paid.`
    : wallet.balance <= 0
      ? 'Nothing to pay out yet. This fills up when customers use points or get an Offerly bonus at your store.'
      : !hasPayoutDetails
        ? 'Add your UPI ID or bank account below to request a payout.'
        : belowMinimum
          ? `You can request a payout once this reaches ${rupees(minPayout)}.`
          : '';

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <AccountBalanceWalletRoundedIcon className="text-[#5EB929]" /> Offerly Wallet
          </h1>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">
            When a customer pays with points or gets an Offerly bonus, you collect less at the counter. Offerly pays that amount back to you
            here.
          </p>
        </div>

        {/* Balance */}
        <div className="bg-gray-900 rounded-3xl p-5 text-white relative overflow-hidden">
          <div className="absolute -top-16 -right-16 w-48 h-48 bg-[#5EB929]/25 rounded-full blur-3xl" />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-widest text-white/60">Offerly owes you</p>
            <p className="text-4xl font-bold mt-1 tracking-tight">{rupees(wallet.balance)}</p>
            <button
              onClick={() => requestPayout.mutate()}
              disabled={!canRequest || requestPayout.isPending}
              className="mt-4 w-full py-3.5 rounded-2xl bg-[#5EB929] text-white text-sm font-bold disabled:bg-white/10 disabled:text-white/40 active:scale-[0.98] transition-transform"
            >
              {requestPayout.isPending ? 'Requesting...' : canRequest ? `Request payout of ${rupees(Math.floor(wallet.balance))}` : 'Request payout'}
            </button>
            {blocker && <p className="mt-3 text-xs text-white/70 leading-relaxed">{blocker}</p>}
            <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-sm font-bold">{rupees(wallet.pending)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Requested</p>
              </div>
              <div>
                <p className="text-sm font-bold">{rupees(wallet.totalPaid)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Paid to you</p>
              </div>
              <div>
                <p className="text-sm font-bold">{rupees(wallet.totalEarned)}</p>
                <p className="text-[10px] text-white/50 mt-0.5">Total so far</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payout details */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
              <AccountBalanceRoundedIcon sx={{ fontSize: 20 }} />
            </div>
            <h2 className="flex-1 text-sm font-bold text-gray-900">Where Offerly pays you</h2>
            {!editingDetails && hasPayoutDetails && (
              <button onClick={() => setEditingDetails(true)} className="flex items-center gap-1 text-xs font-bold text-[#5EB929]">
                <EditRoundedIcon sx={{ fontSize: 14 }} /> Edit
              </button>
            )}
          </div>
          {editingDetails ? (
            <PayoutDetailsForm initial={bankDetails} onDone={() => setEditingDetails(false)} />
          ) : hasPayoutDetails ? (
            <div className="space-y-1.5 text-sm">
              {bankDetails.upiId && (
                <p className="flex justify-between gap-3">
                  <span className="text-gray-500">UPI</span>
                  <span className="font-semibold text-gray-900 break-all text-right">{bankDetails.upiId}</span>
                </p>
              )}
              {bankDetails.accountNumber && (
                <p className="flex justify-between gap-3">
                  <span className="text-gray-500">Bank account</span>
                  <span className="font-semibold text-gray-900 text-right">
                    {maskAccount(bankDetails.accountNumber)} · {bankDetails.ifscCode}
                  </span>
                </p>
              )}
            </div>
          ) : (
            <button onClick={() => setEditingDetails(true)} className="w-full py-3 rounded-xl border-2 border-dashed border-[#5EB929]/40 text-[#5EB929] text-sm font-bold">
              Add UPI ID or bank account
            </button>
          )}
        </div>

        {/* History / payouts */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-gray-100 rounded-xl">
          {[
            ['history', 'History'],
            ['payouts', `Payouts${payouts.length ? ` (${payouts.length})` : ''}`],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`py-2 rounded-lg text-xs font-bold transition-all ${tab === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'history' &&
          (transactions.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">No activity yet.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
              {transactions.map((t) => {
                const meta = ENTRY[t.type] || ENTRY.bonus_discount;
                const Icon = meta.icon;
                return (
                  <div key={t._id} className="flex items-center gap-3 p-3.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.tone}`}>
                      <Icon sx={{ fontSize: 18 }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900">{meta.title}</p>
                      <p className="text-[11px] text-gray-500 truncate">{t.note}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{when(t.createdAt)}</p>
                    </div>
                    <p className={`text-sm font-bold shrink-0 ${meta.sign === '+' ? 'text-[#5EB929]' : 'text-gray-700'}`}>
                      {meta.sign}
                      {rupees(t.amount)}
                    </p>
                  </div>
                );
              })}
            </div>
          ))}

        {tab === 'payouts' &&
          (payouts.length === 0 ? (
            <p className="text-center text-sm text-gray-400 py-8">You haven't requested a payout yet.</p>
          ) : (
            <div className="space-y-2.5">
              {payouts.map((p) => {
                const status = PAYOUT_STATUS[p.status] || PAYOUT_STATUS.pending;
                return (
                  <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-lg font-bold text-gray-900">{rupees(p.amount)}</p>
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.tone}`}>{status.label}</span>
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">Requested {when(p.createdAt)}</p>
                    {p.status === 'paid' && (
                      <p className="text-xs text-gray-600 mt-2">
                        Paid {p.processedAt ? when(p.processedAt) : ''} · Ref <span className="font-semibold break-all">{p.reference}</span>
                      </p>
                    )}
                    {p.status === 'rejected' && p.adminNote && <p className="text-xs text-red-600 mt-2">{p.adminNote}</p>}
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
};

export default Wallet;
