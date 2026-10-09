import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import HistoryRoundedIcon from '@mui/icons-material/HistoryRounded';
import { productAPI } from '../../../api/product.api';

const DESCRIBE = {
  reserved: (m) => ({ title: `Held for pass ${m.passId || ''}`.trim(), tone: 'text-indigo-600' }),
  // Covers expiry, cancellation and a customer removing items from their pass.
  released: (m) => ({ title: m.passId ? `Returned from pass ${m.passId}` : 'Returned to stock', tone: 'text-gray-600' }),
  sold: (m) => ({ title: `Sold - pass ${m.passId || ''}`.trim(), tone: 'text-[#3f8a17]' }),
  adjusted: () => ({ title: 'Stock count changed by you', tone: 'text-amber-600' }),
};

const signed = (n) => (n > 0 ? `+${n}` : String(n));

const formatWhen = (iso) =>
  new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

// Sales and manual edits change the shelf; holds change what's bookable.
const changeText = (m) => {
  if (m.type === 'sold' || m.type === 'adjusted') return { n: m.stockChange || 0, unit: 'on shelf' };
  return { n: -(m.reservedChange || 0), unit: 'available' };
};

const StockHistorySheet = ({ product, onClose }) => {
  const productId = product?._id || product?.id;
  const { data, isLoading, isError } = useQuery({
    queryKey: ['stockHistory', productId],
    queryFn: () => productAPI.getStockHistory(productId),
    enabled: !!productId,
  });
  const movements = data?.movements || [];

  // Portalled to <body>: the merchant pages sit inside animated containers that
  // would otherwise trap this sheet underneath the bottom navigation.
  return createPortal(
    <AnimatePresence>
      {product && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] bg-black/40 flex items-end sm:items-center justify-center"
          onClick={onClose}
        >
          <motion.div
            initial={{ y: 40 }}
            animate={{ y: 0 }}
            exit={{ y: 40 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 p-5 border-b border-gray-100">
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  <HistoryRoundedIcon sx={{ fontSize: 13 }} /> Stock history
                </p>
                <h3 className="text-[15px] font-bold text-gray-900 truncate">{product.name}</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  {product.totalStock ?? 0} on shelf · {product.totalReserved ?? 0} held for passes ·{' '}
                  <span className="font-semibold text-gray-700">{product.totalAvailable ?? product.totalStock ?? 0} available</span>
                </p>
              </div>
              <button type="button" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-50">
                <CloseRoundedIcon sx={{ fontSize: 20 }} />
              </button>
            </div>

            <div className="overflow-y-auto p-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {isLoading && (
                <div className="py-10 flex justify-center">
                  <div className="w-6 h-6 border-2 border-[#5EB929]/20 border-t-[#5EB929] rounded-full animate-spin" />
                </div>
              )}
              {isError && <p className="py-8 text-center text-[12px] text-red-500">Could not load the history. Please try again.</p>}
              {!isLoading && !isError && movements.length === 0 && (
                <p className="py-8 text-center text-[12px] text-gray-400">No stock changes recorded yet.</p>
              )}
              {movements.map((m) => {
                const d = (DESCRIBE[m.type] || DESCRIBE.adjusted)(m);
                const { n: change, unit } = changeText(m);
                return (
                  <div key={m.id} className="flex items-start justify-between gap-3 px-2 py-2.5 border-b border-gray-50 last:border-0">
                    <div className="min-w-0">
                      <p className={`text-[12px] font-semibold ${d.tone}`}>{d.title}</p>
                      {product.hasVariants && m.label && <p className="text-[11px] text-gray-500 truncate">{m.label}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {formatWhen(m.createdAt)} · shelf {m.stockAfter ?? '-'} · held {m.reservedAfter ?? '-'}
                      </p>
                    </div>
                    <span className={`text-[13px] font-bold shrink-0 ${change < 0 ? 'text-red-500' : change > 0 ? 'text-[#3f8a17]' : 'text-gray-400'}`}>
                      {`${signed(change)} ${unit}`}
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};

export default StockHistorySheet;
