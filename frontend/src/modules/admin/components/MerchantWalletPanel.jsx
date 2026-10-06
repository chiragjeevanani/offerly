import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { adminAPI } from '../../../api/admin.api';

const ACTIONS = [
  { id: 'add', label: 'Add' },
  { id: 'deduct', label: 'Deduct' },
  { id: 'set', label: 'Set to' },
];

const TXN_LABELS = {
  admin_credit: 'Added by admin',
  admin_debit: 'Deducted by admin',
  subscription_credit: 'Plan purchase credit',
  subscription_redeem: 'Used for plan payment',
  customer_discount_debit: 'New-customer discount',
};

const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Admin view of a merchant's membership and discount wallet, with controls to
// add to, deduct from, or set the wallet balance. Every change is logged.
const MerchantWalletPanel = ({ merchantId }) => {
  const queryClient = useQueryClient();
  const [action, setAction] = useState('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['adminMerchantWallet', merchantId],
    queryFn: async () => (await adminAPI.getMerchantWallet(merchantId)).data,
    enabled: Boolean(merchantId),
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (amount === '' || !Number.isFinite(value) || value < 0) return toast.error('Enter a valid amount');
    if (action !== 'set' && value <= 0) return toast.error('Enter an amount greater than 0');
    setSaving(true);
    try {
      const res = await adminAPI.adjustMerchantWallet(merchantId, { action, amount: value, note });
      queryClient.setQueryData(['adminMerchantWallet', merchantId], res.data);
      toast.success(`Wallet balance is now ${rupees(res.data.balance)}`);
      setAmount('');
      setNote('');
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to update wallet');
    } finally {
      setSaving(false);
    }
  };

  const sub = data?.subscription;
  const preview = (() => {
    const value = Number(amount);
    if (!data || amount === '' || !Number.isFinite(value)) return null;
    if (action === 'add') return data.balance + value;
    if (action === 'deduct') return data.balance - value;
    return value;
  })();

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100">
        <h4 className="text-[14px] font-semibold text-gray-800">Plan & Wallet</h4>
      </div>

      {isLoading ? (
        <div className="p-6 flex justify-center">
          <div className="w-6 h-6 border-2 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="p-5 space-y-5">
          {/* Membership */}
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center shrink-0">
              <WorkspacePremiumRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <div className="flex-1 min-w-0">
              {sub?.plan ? (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px] font-semibold text-gray-800">{sub.plan.name}</span>
                    {sub.isTrial && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold uppercase tracking-wider">Free trial</span>
                    )}
                    {sub.isExpired && (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-100 text-red-500 text-[10px] font-bold uppercase tracking-wider">Expired</span>
                    )}
                  </div>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {fmtDate(sub.startDate)} – {sub.endDate ? fmtDate(sub.endDate) : 'No end date'}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[14px] font-semibold text-gray-800">No plan yet</span>
                  <p className="text-[12px] text-gray-500 mt-0.5">
                    {data?.hasUsedFreeTrial ? 'Free trial already used.' : 'Gets a 1-month free Visible trial when approved.'}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* Wallet balance */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div className="w-9 h-9 rounded-xl bg-white text-[#5EB929] flex items-center justify-center shrink-0 border border-gray-100">
              <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} />
            </div>
            <div className="flex-1">
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Discount wallet balance</p>
              <p className="text-xl font-bold text-gray-900 leading-tight">{rupees(data?.balance)}</p>
            </div>
          </div>

          {/* Adjust */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAction(a.id)}
                  className={`flex-1 py-2 rounded-lg text-[12px] font-semibold transition-colors ${action === a.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <div className="flex items-center flex-1 bg-white border border-gray-200 rounded-xl px-3 focus-within:border-[#5EB929]">
                <span className="text-[14px] font-semibold text-gray-400 mr-1">₹</span>
                <input
                  type="number"
                  min="0"
                  inputMode="numeric"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Amount"
                  className="w-full py-2.5 text-[14px] font-semibold text-gray-900 outline-none bg-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={saving}
                className="px-5 rounded-xl bg-[#5EB929] text-white text-[13px] font-semibold hover:bg-[#489A1B] disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Note (optional) – e.g. Welcome bonus"
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-[13px] text-gray-800 outline-none focus:border-[#5EB929]"
            />
            {preview !== null && (
              <p className={`text-[12px] font-medium ${preview < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                {preview < 0 ? `Can't go below ₹0 (balance is ${rupees(data.balance)})` : `New balance will be ${rupees(preview)}`}
              </p>
            )}
          </form>

          {/* History */}
          {data?.transactions?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Recent wallet activity</p>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl max-h-64 overflow-y-auto">
                {data.transactions.map((t) => {
                  const credit = t.type === 'admin_credit' || t.type === 'subscription_credit';
                  return (
                    <div key={t.id} className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-gray-800">{TXN_LABELS[t.type] || t.type}</p>
                        <p className="text-[11px] text-gray-400 truncate">{fmtDate(t.createdAt)}{t.note ? ` · ${t.note}` : ''}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-[13px] font-semibold ${credit ? 'text-[#5EB929]' : 'text-red-500'}`}>{credit ? '+' : '−'}{rupees(t.amount)}</p>
                        <p className="text-[11px] text-gray-400">Bal {rupees(t.balanceAfter)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MerchantWalletPanel;
