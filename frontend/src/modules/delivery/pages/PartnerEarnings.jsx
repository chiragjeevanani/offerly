import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import EmojiEventsRoundedIcon from '@mui/icons-material/EmojiEventsRounded';
import EventRoundedIcon from '@mui/icons-material/EventRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { Card, PrimaryButton, SectionLabel } from '../components/PartnerUI';
import { rupees } from '../utils/partner';

const WITHDRAW_STATUS = {
  requested: { label: 'Processing', cls: 'bg-amber-50 text-amber-700' },
  paid: { label: 'Paid', cls: 'bg-green-50 text-green-700' },
  rejected: { label: 'Declined', cls: 'bg-red-50 text-red-600' },
};
const date = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const WithdrawSheet = ({ wallet, onClose, onDone }) => {
  const [amount, setAmount] = useState(String(wallet.withdrawable));
  const [busy, setBusy] = useState(false);
  const value = Math.floor(Number(amount) || 0);
  const tooMuch = value > wallet.withdrawable;
  const tooLittle = value < Math.max(1, wallet.schedule.minAmount);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await deliveryAPI.withdraw(value);
      toast.success(`Withdrawal of ${rupees(value)} requested`);
      onDone(res.data);
    } catch (err) {
      toast.error(err?.error || 'Could not request withdrawal');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div onClick={() => !busy && onClose()} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg bg-white rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 shadow-2xl space-y-4" role="dialog" aria-label="Withdraw">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Withdraw earnings</h3>
          <p className="text-[12px] text-gray-500 font-medium">Up to {rupees(wallet.withdrawable)}. Offerly pays it to your UPI / bank account.</p>
        </div>
        <label className="block">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Amount</span>
          <div className="mt-1.5 flex items-center h-14 px-4 bg-[#F8FAFC] border border-gray-100 rounded-2xl focus-within:border-[#5EB929]/50">
            <span className="text-xl font-black text-gray-400">₹</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 7))} inputMode="numeric" className="flex-1 ml-1 bg-transparent text-2xl font-black text-gray-900 outline-none" aria-label="Amount" />
            <button type="button" onClick={() => setAmount(String(wallet.withdrawable))} className="text-[11px] font-bold text-[#5EB929] uppercase tracking-wider">All</button>
          </div>
          {tooMuch && <span className="block mt-1 text-[11px] font-bold text-red-500">More than you can withdraw</span>}
          {!tooMuch && tooLittle && wallet.schedule.minAmount > 0 && <span className="block mt-1 text-[11px] font-bold text-red-500">The smallest withdrawal is {rupees(wallet.schedule.minAmount)}</span>}
        </label>
        <PrimaryButton onClick={submit} loading={busy} disabled={tooMuch || tooLittle} className="w-full">
          Withdraw {value > 0 ? rupees(value) : ''}
        </PrimaryButton>
      </div>
    </div>
  );
};

const PartnerEarnings = ({ me }) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [withdrawing, setWithdrawing] = useState(false);
  const { stats, settlements = [] } = me.partner;
  const { data: wallet } = useQuery({
    queryKey: ['partnerWallet'],
    queryFn: async () => (await deliveryAPI.getWallet())?.data,
    staleTime: 15_000,
  });

  return (
    <div className="px-4 pt-5 space-y-5">
      <div>
        <SectionLabel>Wallet</SectionLabel>
        <h1 className="text-xl font-bold text-gray-900">Your earnings</h1>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl text-white bg-gradient-to-br from-gray-950 via-gray-900 to-[#132c0c] border border-[#5EB929]/30">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5EB929]/25 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8cee50]">Available to withdraw</p>
          <p className="text-4xl font-black tracking-tight mt-1">{rupees(wallet ? wallet.withdrawable : Math.max(0, stats.earningsDue - stats.cashInHand))}</p>
          <p className="text-[12px] text-gray-300 font-medium mt-1">
            Owed to you {rupees(stats.earningsDue)}{stats.cashInHand > 0 ? ` · minus ${rupees(stats.cashInHand)} cash you hold` : ''}
          </p>
          {wallet && (
            <div className="mt-4 space-y-2">
              <PrimaryButton className="w-full" disabled={!wallet.canWithdraw} onClick={() => setWithdrawing(true)}>
                <AccountBalanceWalletRoundedIcon sx={{ fontSize: 18 }} /> Withdraw
              </PrimaryButton>
              {wallet.blocker && (
                <p className="text-[11px] font-semibold text-amber-200 text-center">
                  {wallet.blocker}
                  {/UPI ID or bank/.test(wallet.blocker) && (
                    <button type="button" onClick={() => navigate('/delivery/profile')} className="ml-1 underline">Add now</button>
                  )}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {wallet && (
        <Card className="p-4 flex gap-3 items-center">
          <span className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0"><EventRoundedIcon sx={{ fontSize: 18 }} /></span>
          <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
            You can withdraw <span className="font-bold text-gray-900">{wallet.schedule.text}</span>
            {wallet.schedule.minAmount > 0 ? `, at least ${rupees(wallet.schedule.minAmount)}` : ''}.
            {!wallet.schedule.openNow && wallet.schedule.opensAt && ` Next: ${new Date(wallet.schedule.opensAt).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}.`}
          </p>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center"><PaymentsRoundedIcon sx={{ fontSize: 18 }} /></div>
          <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Cash in hand</p>
          <p className="text-xl font-bold text-gray-900">{rupees(stats.cashInHand)}</p>
          <p className="text-[10px] text-gray-400 font-medium">Hand over to Offerly</p>
        </Card>
        <Card className="p-4">
          <div className="w-9 h-9 rounded-xl bg-[#5EB929]/10 text-[#5EB929] flex items-center justify-center"><LocalShippingRoundedIcon sx={{ fontSize: 18 }} /></div>
          <p className="mt-2 text-[10px] font-bold text-gray-400 uppercase tracking-widest">All-time</p>
          <p className="text-xl font-bold text-gray-900">{rupees(stats.totalEarnings)}</p>
          <p className="text-[10px] text-gray-400 font-medium">{stats.totalDeliveries} deliveries</p>
        </Card>
      </div>

      {wallet?.history?.length > 0 && (
        <section className="space-y-2.5">
          <SectionLabel className="px-1">Withdrawals</SectionLabel>
          {wallet.history.map((w) => {
            const st = WITHDRAW_STATUS[w.status];
            return (
              <Card key={w.id} className="p-4">
                <div className="flex justify-between items-center gap-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-black text-gray-900">{rupees(w.amount)}</p>
                    <p className="text-[11px] text-gray-400 font-medium">{date(w.createdAt)}{w.payoutTo?.upiId ? ` · ${w.payoutTo.upiId}` : w.payoutTo?.accountNumber ? ` · A/c ••${w.payoutTo.accountNumber.slice(-4)}` : ''}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg ${st.cls}`}>{st.label}</span>
                </div>
                {w.status === 'paid' && w.reference && <p className="mt-1 text-[11px] text-gray-500">Reference {w.reference}</p>}
                {w.status === 'rejected' && <p className="mt-1 text-[11px] text-red-500">{w.rejectReason} · amount returned to your wallet</p>}
              </Card>
            );
          })}
        </section>
      )}

      {me.bonuses?.length > 0 && (
        <section className="space-y-2.5">
          <SectionLabel className="px-1">Target bonuses</SectionLabel>
          {me.bonuses.map((b) => (
            <Card key={b.id} className="p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <EmojiEventsRoundedIcon sx={{ fontSize: 20 }} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-gray-900">{b.deliveries} deliveries {{ daily: 'in a day', weekly: 'in a week', monthly: 'in a month' }[b.period]}</p>
                <p className="text-[11px] font-medium text-gray-400">{date(b.at)}</p>
              </div>
              <p className="text-[14px] font-black text-[#5EB929]">+{rupees(b.bonus)}</p>
            </Card>
          ))}
        </section>
      )}

      <section className="space-y-2.5 pb-4">
        <SectionLabel className="px-1">Settlements</SectionLabel>
        {settlements.length === 0 ? (
          <Card className="p-6 text-center">
            <AccountBalanceWalletRoundedIcon sx={{ fontSize: 36 }} className="text-gray-200" />
            <p className="mt-1 text-[12px] text-gray-400 font-medium">No settlements yet</p>
          </Card>
        ) : (
          settlements.map((s, i) => (
            <Card key={i} className="p-4">
              <div className="flex justify-between items-center">
                <p className="text-[12px] font-bold text-gray-900">{date(s.at)}</p>
                <p className="text-[13px] font-black text-[#5EB929]">+{rupees(s.earningsPaid)}</p>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Paid {rupees(s.earningsPaid)}{s.cashReceived ? ` · Cash handed over ${rupees(s.cashReceived)}` : ''}{s.note ? ` · ${s.note}` : ''}
              </p>
            </Card>
          ))
        )}
      </section>

      {withdrawing && wallet && (
        <WithdrawSheet
          wallet={wallet}
          onClose={() => setWithdrawing(false)}
          onDone={(fresh) => {
            setWithdrawing(false);
            queryClient.setQueryData(['partnerWallet'], fresh);
            queryClient.invalidateQueries({ queryKey: ['partnerMe'] });
          }}
        />
      )}
    </div>
  );
};

export default PartnerEarnings;
