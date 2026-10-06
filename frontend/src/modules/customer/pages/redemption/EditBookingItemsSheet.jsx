import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import toast from 'react-hot-toast';

import { bookingAPI } from '../../../../api/booking.api';
import { productAPI } from '../../../../api/product.api';
import ProductThumb from '../../components/ui/ProductThumb';

const toLine = (it) => ({
  productId: String(it.productId || it.product?.id || ''),
  name: it.product?.name || 'Product',
  price: it.product?.price || 0,
  offerPrice: it.product?.offerPrice || 0,
  image: it.product?.image || '',
  qty: it.qty,
});

// Lets a customer change the items on a booking after the pass was generated.
// The QR / Pass ID stay the same; the server re-prices everything on save.
const EditBookingItemsSheet = ({ booking, merchantId, onClose, onSaved }) => {
  const [lines, setLines] = useState(() => (booking.items || []).map(toLine));
  const [catalog, setCatalog] = useState([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    productAPI.getByMerchant(merchantId)
      .then((res) => setCatalog(res?.products || []))
      .catch(() => setCatalog([]))
      .finally(() => setLoadingCatalog(false));
  }, [merchantId]);

  const catalogById = useMemo(
    () => new Map(catalog.map((p) => [String(p._id || p.id), p])),
    [catalog]
  );

  // Live catalogue prices/images win over the snapshot, since that's what the
  // server will charge once saved.
  const resolvedLines = lines.map((l) => {
    const p = catalogById.get(l.productId);
    if (!p) return { ...l, unavailable: !loadingCatalog };
    return {
      ...l,
      name: p.name,
      price: p.price,
      offerPrice: p.offerPrice,
      image: p.images?.[0] || p.image || l.image,
      unavailable: false,
    };
  });

  const addable = catalog.filter((p) => !lines.some((l) => l.productId === String(p._id || p.id)));

  const itemsTotal = Math.round(resolvedLines.reduce((s, l) => s + l.offerPrice * l.qty, 0));
  const walletDiscount = Math.min(booking.totals?.walletDiscount || 0, itemsTotal);
  const payable = itemsTotal - walletDiscount;

  const setQty = (productId, qty) => {
    setLines((prev) => (qty <= 0
      ? prev.filter((l) => l.productId !== productId)
      : prev.map((l) => (l.productId === productId ? { ...l, qty } : l))));
  };

  const addProduct = (p) => {
    setLines((prev) => [...prev, {
      productId: String(p._id || p.id),
      name: p.name,
      price: p.price,
      offerPrice: p.offerPrice,
      image: p.images?.[0] || p.image || '',
      qty: 1,
    }]);
  };

  const handleSave = async () => {
    if (lines.length === 0) {
      toast.error('Keep at least one item in your booking');
      return;
    }
    if (resolvedLines.some((l) => l.unavailable)) {
      toast.error('Remove items that are no longer available');
      return;
    }

    setSaving(true);
    try {
      const response = await bookingAPI.updateMyItems(
        booking._id || booking.id,
        lines.map(({ productId, qty }) => ({ productId, qty }))
      );
      if (response?.success) {
        toast.success('Booking updated');
        onSaved(response.data);
      }
    } catch (error) {
      toast.error(error?.error || error?.message || 'Failed to update booking');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={saving ? undefined : onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[88vh] flex flex-col shadow-2xl"
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-gray-50">
          <div>
            <h2 className="text-base font-bold text-gray-900 uppercase tracking-tight">Edit Items</h2>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
              Pass {booking.internalId} stays the same
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center"
          >
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Current items */}
          <div className="space-y-3">
            {resolvedLines.length === 0 && (
              <p className="text-[11px] font-bold text-gray-400 text-center py-4">
                No items left. Add something below.
              </p>
            )}
            {resolvedLines.map((l) => (
              <div key={l.productId} className="flex items-center gap-3">
                <ProductThumb src={l.image} alt={l.name} className="w-12 h-12" />
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-gray-900 truncate">{l.name}</p>
                  {l.unavailable ? (
                    <p className="text-[10px] font-bold text-red-500 uppercase">No longer available</p>
                  ) : (
                    <p className="text-[11px] font-bold text-gray-400">₹{Math.round(l.offerPrice)} each</p>
                  )}
                </div>
                <div className="flex items-center bg-[#F8FAFC] rounded-xl border border-gray-100 p-0.5">
                  <button
                    onClick={() => setQty(l.productId, l.qty - 1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900"
                  >
                    <RemoveRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                  <span className="w-6 text-center text-[12px] font-bold text-gray-900">{l.qty}</span>
                  <button
                    onClick={() => setQty(l.productId, l.qty + 1)}
                    disabled={l.unavailable}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-900 disabled:opacity-30"
                  >
                    <AddRoundedIcon sx={{ fontSize: 14 }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Add more from the same store */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Add more from this store</p>
            {loadingCatalog ? (
              <div className="flex justify-center py-4">
                <div className="w-6 h-6 border-2 border-[#5EB929] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : addable.length === 0 ? (
              <p className="text-[11px] font-bold text-gray-400">Everything from this store is already in your booking.</p>
            ) : (
              <div className="space-y-3">
                {addable.map((p) => (
                  <div key={p._id || p.id} className="flex items-center gap-3">
                    <ProductThumb src={p.images?.[0] || p.image} alt={p.name} className="w-12 h-12" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-gray-900 truncate">{p.name}</p>
                      <p className="text-[11px] font-bold text-gray-400">
                        ₹{Math.round(p.offerPrice)}
                        {p.price > p.offerPrice && (
                          <span className="ml-1.5 line-through text-gray-300">₹{Math.round(p.price)}</span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => addProduct(p)}
                      className="px-3 h-8 rounded-xl border border-[#5EB929]/40 text-[#5EB929] text-[11px] font-bold uppercase flex items-center gap-1"
                    >
                      <AddRoundedIcon sx={{ fontSize: 14 }} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pt-3 pb-5 border-t border-gray-100">
          {walletDiscount > 0 && (
            <div className="flex justify-between text-[11px] font-bold text-[#5EB929] mb-1">
              <span>Offerly Extra Discount</span>
              <span>-₹{walletDiscount}</span>
            </div>
          )}
          <div className="flex justify-between items-end mb-3">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">New Total</span>
            <span className="text-xl font-bold text-[#5EB929] leading-none">₹{payable}</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={saving || loadingCatalog}
            className="w-full h-12 bg-gray-900 text-white rounded-2xl font-bold text-[12px] uppercase tracking-[0.2em] flex items-center justify-center disabled:opacity-60"
          >
            {saving ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : 'Save Changes'}
          </motion.button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default EditBookingItemsSheet;
