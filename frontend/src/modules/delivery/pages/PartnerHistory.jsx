import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded';
import { deliveryAPI } from '../../../api/delivery.api';
import { Card, SectionLabel, StageBadge, Spinner } from '../components/PartnerUI';
import { rupees } from '../utils/partner';

const dayLabel = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PartnerHistory = () => {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['partnerHistory'],
    queryFn: async () => (await deliveryAPI.getMyOrders('history'))?.data || [],
  });

  // Group by day, newest first.
  const groups = orders.reduce((acc, o) => {
    const key = dayLabel(o.deliveredAt || o.assignedAt || o.createdAt);
    (acc[key] ||= []).push(o);
    return acc;
  }, {});

  return (
    <div className="px-4 pt-5 space-y-5">
      <div>
        <SectionLabel>Order history</SectionLabel>
        <h1 className="text-xl font-bold text-gray-900">Your deliveries</h1>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center"><Spinner className="w-7 h-7 border-[#5EB929]/20 border-t-[#5EB929]" /></div>
      ) : orders.length === 0 ? (
        <Card className="p-10 text-center">
          <ReceiptLongRoundedIcon sx={{ fontSize: 44 }} className="text-gray-200" />
          <p className="mt-2 text-[13px] font-bold text-gray-700">No deliveries yet</p>
          <p className="text-[12px] text-gray-400">Completed and cancelled orders show up here.</p>
        </Card>
      ) : (
        Object.entries(groups).map(([day, list]) => {
          const earned = list.filter((o) => o.stage === 'delivered').reduce((s, o) => s + (o.payout || 0), 0);
          return (
            <section key={day} className="space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <SectionLabel>{day}</SectionLabel>
                {earned > 0 && <span className="text-[11px] font-bold text-[#5EB929]">+{rupees(earned)}</span>}
              </div>
              {list.map((o) => (
                <Card key={o.id} className="p-3.5">
                  <button onClick={() => navigate(`/delivery/orders/${o.id}`)} className="w-full flex items-center gap-3 text-left">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-mono font-bold text-gray-900">#{o.internalId}</span>
                        <StageBadge stage={o.stage} />
                      </div>
                      <p className="mt-1 text-[12px] font-semibold text-gray-500 truncate">
                        {o.store.name} → {[o.drop.line2, o.drop.pincode].filter(Boolean).join(', ') || o.drop.name}
                      </p>
                      <p className="text-[10px] font-semibold text-gray-400 mt-0.5">
                        {o.deliveredAt ? new Date(o.deliveredAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        {o.collectAmount > 0 && o.stage === 'delivered' ? ` · Cash ${rupees(o.collectAmount)}` : ''}
                      </p>
                    </div>
                    {o.stage === 'delivered' && o.payout > 0 && <span className="text-[14px] font-black text-gray-900">{rupees(o.payout)}</span>}
                    <ChevronRightRoundedIcon className="text-gray-300" />
                  </button>
                </Card>
              ))}
            </section>
          );
        })
      )}
    </div>
  );
};

export default PartnerHistory;
