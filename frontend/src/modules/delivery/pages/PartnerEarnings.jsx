import AccountBalanceWalletRoundedIcon from '@mui/icons-material/AccountBalanceWalletRounded';
import PaymentsRoundedIcon from '@mui/icons-material/PaymentsRounded';
import LocalShippingRoundedIcon from '@mui/icons-material/LocalShippingRounded';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { Card, SectionLabel } from '../components/PartnerUI';
import { rupees } from '../utils/partner';

const PartnerEarnings = ({ me }) => {
  const { stats, settlements = [], bankDetails = {} } = me.partner;
  const hasPayout = Boolean(bankDetails.upiId || bankDetails.accountNumber);

  return (
    <div className="px-4 pt-5 space-y-5">
      <div>
        <SectionLabel>Earnings</SectionLabel>
        <h1 className="text-xl font-bold text-gray-900">Your wallet</h1>
      </div>

      <div className="relative overflow-hidden rounded-[2rem] p-6 shadow-xl text-white bg-gradient-to-br from-gray-950 via-gray-900 to-[#132c0c] border border-[#5EB929]/30">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#5EB929]/25 rounded-full blur-2xl pointer-events-none" />
        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[#8cee50]">Offerly owes you</p>
          <p className="text-4xl font-black tracking-tight mt-1">{rupees(stats.earningsDue)}</p>
          <p className="text-[12px] text-gray-300 font-medium mt-1">
            {me.payoutPerDelivery > 0 ? `${rupees(me.payoutPerDelivery)} per delivery · ` : ''}paid out by Offerly
          </p>
        </div>
      </div>

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

      <Card className="p-4 flex gap-3">
        <InfoOutlinedIcon className="text-gray-400 shrink-0" sx={{ fontSize: 18 }} />
        <p className="text-[12px] text-gray-500 font-medium leading-relaxed">
          Offerly settles up with you regularly: you hand over the cash collected on deliveries, and we pay what you've earned.
          {!hasPayout && ' Add your UPI ID or bank account in Profile so we can pay you.'}
        </p>
      </Card>

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
                <p className="text-[12px] font-bold text-gray-900">{new Date(s.at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <p className="text-[13px] font-black text-[#5EB929]">+{rupees(s.earningsPaid)}</p>
              </div>
              <p className="text-[11px] text-gray-500 font-medium mt-0.5">
                Paid {rupees(s.earningsPaid)} · Cash handed over {rupees(s.cashReceived)}{s.note ? ` · ${s.note}` : ''}
              </p>
            </Card>
          ))
        )}
      </section>
    </div>
  );
};

export default PartnerEarnings;
