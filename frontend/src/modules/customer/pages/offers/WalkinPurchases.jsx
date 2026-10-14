import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import { userAPI } from '../../../../api/user.api';

const rupees = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const formatDate = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

// Purchases a store rang up for this customer at the counter (walk-in sales),
// including ones from before they joined Offerly with this number.
const WalkinPurchases = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(null);
  const { data: purchases = [], isLoading, isError } = useQuery({
    queryKey: ['myWalkinPurchases'],
    queryFn: async () => (await userAPI.getWalkinPurchases())?.data || [],
  });

  if (isLoading) {
    return [1, 2, 3].map((i) => <div key={i} className="h-24 bg-surface rounded-2xl animate-pulse" />);
  }
  if (isError) {
    return <p className="text-center text-xs text-red-500 py-10">Couldn't load your in-store purchases. Please try again.</p>;
  }
  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm border border-gray-100">
          <StorefrontRoundedIcon sx={{ fontSize: 32 }} className="text-gray-200" />
        </div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-tight">No in-store purchases yet</h2>
        <p className="text-[11px] text-gray-400 font-medium px-10 mt-1 leading-relaxed">
          When you shop at an Offerly store and give them your number, the bill shows up here.
        </p>
      </div>
    );
  }

  const totalSaved = purchases.reduce((s, p) => s + (p.totals?.discount || 0), 0);

  return (
    <div className="space-y-2.5">
      <div className="flex flex-col px-0.5">
        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest leading-none">Bought at the store</p>
        <p className="text-[11px] text-gray-800 font-bold mt-0.5">
          {purchases.length} {purchases.length === 1 ? 'PURCHASE' : 'PURCHASES'}
          {totalSaved > 0 && <span className="text-[#5EB929]"> · SAVED {rupees(totalSaved)}</span>}
        </p>
      </div>

      {purchases.map((p) => {
        const store = p.merchantId;
        const isOpen = open === p._id;
        return (
          <div key={p._id} className="bg-white rounded-2xl border border-gray-50 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
            <button onClick={() => setOpen(isOpen ? null : p._id)} className="w-full p-3 flex items-center gap-3 text-left">
              <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-gray-50 bg-[#5EB929]/10 flex items-center justify-center">
                {store?.logo ? (
                  <img src={store.logo} alt="" className="w-full h-full object-cover" />
                ) : (
                  <StorefrontRoundedIcon className="text-[#5EB929]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-[13px] font-bold text-gray-900 truncate tracking-tight uppercase">{store?.storeName || 'Store'}</h4>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                  {formatDate(p.createdAt)} · {p.orderId}
                </p>
                <p className="text-[11px] text-gray-500 mt-1 truncate">{p.items.map((it) => it.name).join(', ')}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-sm font-bold text-gray-900">{rupees(p.totals?.paid)}</p>
                {p.totals?.discountPercent > 0 && <p className="text-[10px] font-bold text-[#5EB929]">{p.totals.discountPercent}% OFF</p>}
              </div>
              <ExpandMoreRoundedIcon className={`text-gray-300 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3 pt-2 border-t border-gray-50 space-y-1.5">
                {p.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">{it.qty} × {it.name}</span>
                    <span className="font-semibold text-gray-900">
                      {it.price < it.mrp && <span className="line-through text-gray-400 font-normal mr-1.5">{rupees(it.mrp * it.qty)}</span>}
                      {rupees(it.price * it.qty)}
                    </span>
                  </div>
                ))}
                {p.totals?.discount > 0 && (
                  <div className="flex justify-between text-xs text-[#5EB929] font-semibold pt-1">
                    <span>You saved</span>
                    <span>{rupees(p.totals.discount)}</span>
                  </div>
                )}
                {store?._id && (
                  <button
                    onClick={() => navigate(`/store/${store._id}`)}
                    className="mt-2 text-[10px] font-bold text-[#5EB929] uppercase tracking-widest bg-[#5EB929]/5 px-3 py-2 rounded-xl"
                  >
                    Visit store
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default WalkinPurchases;
