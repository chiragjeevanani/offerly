import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import { deliveryAPI } from '../../../api/delivery.api';

// Delivery partners' withdrawal requests: pay them outside the app (UPI / bank),
// then mark paid with the transaction reference, or decline (money goes back to
// the partner's wallet).

const rupees = (n) => `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
const when = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const FILTERS = [
  { key: 'requested', label: 'To pay' },
  { key: 'paid', label: 'Paid' },
  { key: 'rejected', label: 'Declined' },
];

const Row = ({ w, onDone }) => {
  const [mode, setMode] = useState('');
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const to = w.payoutTo || {};

  const act = async () => {
    setBusy(true);
    try {
      if (mode === 'paid') await deliveryAPI.markWithdrawalPaid(w.id, text.trim());
      else await deliveryAPI.rejectWithdrawal(w.id, text.trim());
      toast.success(mode === 'paid' ? 'Marked as paid. The partner has been told.' : 'Declined. The amount is back in their wallet.');
      onDone();
    } catch (err) {
      toast.error(err?.error || 'Could not update');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-gray-900">{w.partner?.name || 'Partner'}</p>
          <p className="text-[12px] text-gray-500">{w.partner?.city} · +91 {w.partner?.phone} · {when(w.createdAt)}</p>
        </div>
        <p className="text-lg font-semibold text-gray-900">{rupees(w.amount)}</p>
      </div>
      <div className="rounded-xl bg-gray-50 p-3 text-[12px] text-gray-700">
        {to.upiId ? (
          <p>UPI: <span className="font-mono font-semibold select-all">{to.upiId}</span></p>
        ) : (
          <p>
            Bank: <span className="font-semibold">{to.accountHolderName || '-'}</span> · A/c <span className="font-mono font-semibold select-all">{to.accountNumber}</span> · IFSC <span className="font-mono font-semibold select-all">{to.ifscCode}</span>
          </p>
        )}
      </div>
      {w.status === 'paid' && <p className="text-[12px] text-green-700">Paid {when(w.paidAt)}{w.reference ? ` · ref ${w.reference}` : ''}</p>}
      {w.status === 'rejected' && <p className="text-[12px] text-red-600">Declined {when(w.rejectedAt)}: {w.rejectReason}</p>}
      {w.status === 'requested' && (
        mode ? (
          <div className="space-y-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={mode === 'paid' ? 'UPI / bank reference (UTR), optional' : 'Reason (shown to the partner)'}
              className="w-full h-10 px-3 border border-gray-200 rounded-xl text-[13px] outline-none focus:border-[#5EB929]"
              autoFocus
            />
            <div className="flex gap-2">
              <button onClick={() => { setMode(''); setText(''); }} className="flex-1 h-10 rounded-xl bg-gray-100 text-gray-600 text-[13px] font-semibold">Back</button>
              <button
                disabled={busy || (mode === 'reject' && !text.trim())}
                onClick={act}
                className={`flex-1 h-10 rounded-xl text-white text-[13px] font-semibold disabled:opacity-50 ${mode === 'paid' ? 'bg-[#5EB929]' : 'bg-red-500'}`}
              >
                {busy ? 'Saving...' : mode === 'paid' ? 'Confirm paid' : 'Decline'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setMode('reject')} className="flex-1 h-10 rounded-xl border border-red-200 text-red-500 text-[13px] font-semibold">Decline</button>
            <button onClick={() => setMode('paid')} className="flex-[2] h-10 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold">I've paid {rupees(w.amount)}</button>
          </div>
        )
      )}
    </div>
  );
};

const PartnerWithdrawals = () => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState('requested');
  const { data, isLoading } = useQuery({
    queryKey: ['adminWithdrawals', status],
    queryFn: async () => deliveryAPI.getWithdrawals(status),
    refetchInterval: 60_000,
    placeholderData: (prev) => prev,
  });
  const rows = data?.data || [];
  const counts = data?.counts || {};
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['adminWithdrawals'] });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setStatus(f.key)}
            className={`px-3 h-8 rounded-lg text-[12px] font-semibold ${status === f.key ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}
          >
            {f.label} <span className="opacity-70">{counts[f.key]?.n || 0}</span>
          </button>
        ))}
        {status === 'requested' && counts.requested?.amount > 0 && (
          <span className="text-[12px] text-gray-500">{rupees(counts.requested.amount)} to pay in all</span>
        )}
      </div>
      {isLoading ? (
        <div className="py-16 flex justify-center"><div className="w-8 h-8 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" /></div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-2xl border border-dashed border-gray-200">
          <AccountBalanceWalletRoundedIcon sx={{ fontSize: 40 }} className="text-gray-200" />
          <p className="mt-2 text-[13px] text-gray-500">{status === 'requested' ? 'No withdrawals waiting' : `No ${status} withdrawals`}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {rows.map((w) => <Row key={w.id} w={w} onDone={refresh} />)}
        </div>
      )}
    </div>
  );
};

export default PartnerWithdrawals;
