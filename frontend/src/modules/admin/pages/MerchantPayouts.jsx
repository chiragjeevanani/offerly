import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import toast from 'react-hot-toast';
import { adminAPI } from '../../../api/admin.api';

const rupees = (n) => `₹${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
const when = (d) =>
  d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';

const TABS = [
  ['pending', 'To pay'],
  ['paid', 'Paid'],
  ['rejected', 'Declined'],
];

const inputClass =
  'w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none bg-white';

const Stat = ({ label, value, sub }) => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
    <p className="text-[11px] font-semibold text-gray-500">{label}</p>
    <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
  </div>
);

const Copyable = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-gray-500 shrink-0">{label}</span>
      <button
        type="button"
        onClick={() => navigator.clipboard?.writeText(value).then(() => toast.success(`${label} copied`))}
        className="flex items-center gap-1.5 font-semibold text-gray-900 text-right break-all"
        title="Copy"
      >
        {value}
        <ContentCopyRoundedIcon sx={{ fontSize: 14 }} className="text-gray-400 shrink-0" />
      </button>
    </div>
  );
};

// Pay or decline one request
const ProcessDialog = ({ payout, mode, onClose }) => {
  const queryClient = useQueryClient();
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const paying = mode === 'pay';

  const mutation = useMutation({
    mutationFn: () =>
      paying
        ? adminAPI.payPayout(payout._id, { reference, adminNote: note })
        : adminAPI.rejectPayout(payout._id, { adminNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPayouts'] });
      toast.success(paying ? 'Marked as paid' : 'Request declined');
      onClose();
    },
    onError: (err) => toast.error(err?.error || err?.response?.data?.error || 'Something went wrong'),
  });

  return (
    <div className="fixed inset-0 z-[9999] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={(e) => {
          e.preventDefault();
          mutation.mutate();
        }}
        className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">{paying ? 'Mark as paid' : 'Decline request'}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {payout.merchantId?.storeName || 'Store'} · {rupees(payout.amount)}
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
            <CloseRoundedIcon sx={{ fontSize: 16 }} />
          </button>
        </div>

        {paying ? (
          <>
            <p className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-xl p-3">
              Pay {rupees(payout.amount)} to the store first (UPI or bank transfer), then enter the reference here. This can't be undone.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Payment reference (UTR / UPI transaction ID)</label>
              <input value={reference} onChange={(e) => setReference(e.target.value)} className={inputClass} required maxLength={80} autoFocus />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Note (optional)</label>
              <input value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} maxLength={300} />
            </div>
          </>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Reason (the store will see this)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${inputClass} resize-none`} required maxLength={300} autoFocus />
            <p className="text-[11px] text-gray-400 mt-1">The {rupees(payout.amount)} goes back to the store's balance.</p>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className={`w-full py-3 rounded-xl text-white text-sm font-bold disabled:opacity-50 ${paying ? 'bg-primary' : 'bg-red-500'}`}
        >
          {mutation.isPending ? 'Saving...' : paying ? `Confirm ${rupees(payout.amount)} paid` : 'Decline request'}
        </button>
      </form>
    </div>
  );
};

// Smallest balance a store can ask to be paid
const MinimumPayout = () => {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ['adminIncentiveSettings'],
    queryFn: async () => (await adminAPI.getIncentiveSettings()).data,
  });
  const saved = settings?.payout?.minAmount ?? 0;
  const [value, setValue] = useState(null); // null = showing the saved value
  const shown = value ?? saved;

  const save = useMutation({
    mutationFn: () => adminAPI.updateIncentiveSettings({ payout: { minAmount: Number(shown) || 0 } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminIncentiveSettings'] });
      setValue(null);
      toast.success('Minimum payout saved');
    },
    onError: (err) => toast.error(err?.error || err?.response?.data?.error || 'Could not save'),
  });

  if (!settings) return null;
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center gap-3">
      <div className="flex-1">
        <p className="text-sm font-bold text-gray-900">Minimum payout</p>
        <p className="text-xs text-gray-500">A store can request a payout once Offerly owes it at least this much. 0 = any amount.</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-gray-400">₹</span>
        <input
          type="number"
          min="0"
          value={shown}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} w-28`}
        />
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending || Number(shown) === saved}
          className="px-4 py-2.5 bg-gray-900 text-white rounded-xl text-xs font-bold disabled:opacity-40"
        >
          Save
        </button>
      </div>
    </div>
  );
};

const MerchantPayouts = () => {
  const [status, setStatus] = useState('pending');
  const [dialog, setDialog] = useState(null); // { payout, mode }

  const { data, isLoading, isError } = useQuery({
    queryKey: ['adminPayouts', status],
    queryFn: async () => (await adminAPI.getPayouts(status)).data,
  });
  const payouts = data?.payouts || [];
  const summary = data?.summary;

  return (
    <div className="p-4 md:p-8 space-y-5 max-w-4xl mx-auto pb-28">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
          <PaymentsRoundedIcon sx={{ fontSize: 28 }} className="text-primary" />
          Merchant Payouts
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Stores are owed the discounts Offerly gave their customers: points used and Distribution Fund bonuses. Pay a request outside the app,
          then mark it paid here.
        </p>
      </div>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Stat label="Requested, waiting for you" value={rupees(summary.awaitingPayment)} sub={`${summary.pendingCount} request${summary.pendingCount === 1 ? '' : 's'}`} />
          <Stat label="Owed, not requested yet" value={rupees(summary.notYetRequested)} sub="Still in stores' wallets" />
          <Stat label="Paid so far" value={rupees(summary.totalPaid)} />
        </div>
      )}

      <MinimumPayout />

      <div className="grid grid-cols-3 gap-1 p-1 bg-gray-100 rounded-xl max-w-md">
        {TABS.map(([key, label]) => (
          <button
            key={key}
            onClick={() => setStatus(key)}
            className={`py-2 rounded-lg text-xs font-bold transition-all ${status === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            {label}
            {key === 'pending' && summary?.pendingCount > 0 ? ` (${summary.pendingCount})` : ''}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-gray-500 py-10 text-center">Loading...</p>}
      {isError && <p className="text-sm text-red-500 py-10 text-center">Couldn't load payout requests. Refresh to try again.</p>}
      {!isLoading && !isError && payouts.length === 0 && (
        <p className="text-sm text-gray-400 py-10 text-center">
          {status === 'pending' ? 'No payout requests waiting.' : 'Nothing here yet.'}
        </p>
      )}

      <div className="space-y-3">
        {payouts.map((p) => {
          const bank = p.bankDetails || {};
          return (
            <div key={p._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{p.merchantId?.storeName || 'Store removed'}</p>
                  <p className="text-[11px] text-gray-500">
                    {[p.merchantId?.city, p.merchantId?.phone].filter(Boolean).join(' · ')}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">Requested {when(p.createdAt)}</p>
                </div>
                <p className="text-xl font-bold text-gray-900 shrink-0">{rupees(p.amount)}</p>
              </div>

              <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
                <Copyable label="UPI" value={bank.upiId} />
                <Copyable label="Account holder" value={bank.accountHolderName} />
                <Copyable label="Account number" value={bank.accountNumber} />
                <Copyable label="IFSC" value={bank.ifscCode} />
                {bank.bankName && (
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="text-gray-500">Bank</span>
                    <span className="font-semibold text-gray-900 text-right">{bank.bankName}</span>
                  </div>
                )}
              </div>

              {p.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => setDialog({ payout: p, mode: 'reject' })} className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-xs font-bold">
                    Decline
                  </button>
                  <button onClick={() => setDialog({ payout: p, mode: 'pay' })} className="flex-[2] py-2.5 rounded-xl bg-primary text-white text-xs font-bold">
                    Mark as paid
                  </button>
                </div>
              )}
              {p.status === 'paid' && (
                <p className="text-xs text-gray-600">
                  Paid {when(p.processedAt)} · Ref <span className="font-semibold break-all">{p.reference}</span>
                  {p.adminNote ? ` · ${p.adminNote}` : ''}
                </p>
              )}
              {p.status === 'rejected' && (
                <p className="text-xs text-red-600">
                  Declined {when(p.processedAt)} · {p.adminNote}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dialog && <ProcessDialog payout={dialog.payout} mode={dialog.mode} onClose={() => setDialog(null)} />}
    </div>
  );
};

export default MerchantPayouts;
