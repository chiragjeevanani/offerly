import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import ProductThumb from './ProductThumb';

const matches = (variant, selection) =>
  Object.entries(selection).every(([name, value]) => variant.attributes?.[name] === value);

/**
 * Lets a customer pick a size/colour (etc.) combination and quantity.
 * product: serialized product with variantOptions + variants (each with stock)
 * qtyInCart(variantId) -> current cart qty for that combination
 * onConfirm(variant, qty) -> sets that combination's cart qty
 */
const VariantPickerSheet = ({ product, qtyInCart, onConfirm, onClose, busy = false }) => {
  const options = product.variantOptions || [];
  const variants = product.variants || [];
  // Bookable units: the shelf count minus what other passes are holding.
  const free = (v) => v?.available ?? v?.stock ?? 0;

  // Start on the first in-stock combination so the sheet opens ready to add.
  const [selection, setSelection] = useState(() => {
    const first = variants.find((v) => free(v) > 0) || variants[0];
    return first ? { ...first.attributes } : {};
  });

  const selected = useMemo(
    () => (options.every((o) => selection[o.name]) ? variants.find((v) => matches(v, selection)) : null),
    [options, variants, selection]
  );
  const [qty, setQty] = useState(() => Math.max(1, selected ? qtyInCart(selected._id) : 1));

  // Pickable if any in-stock variant has this value; "compatible" if it also
  // works with the other options already chosen (otherwise choose() switches
  // those to the nearest in-stock combination).
  const isAvailable = (optName, value) =>
    variants.some((v) => free(v) > 0 && v.attributes?.[optName] === value);
  const isCompatible = (optName, value) =>
    variants.some(
      (v) =>
        free(v) > 0 &&
        v.attributes?.[optName] === value &&
        options.every((o) => o.name === optName || !selection[o.name] || v.attributes?.[o.name] === selection[o.name])
    );

  const choose = (optName, value) => {
    const next = { ...selection, [optName]: value };
    // If the new value makes the other picks impossible, keep the closest in-stock match.
    if (!variants.some((v) => free(v) > 0 && matches(v, next))) {
      const fallback = variants.find((v) => free(v) > 0 && v.attributes?.[optName] === value);
      if (fallback) {
        setSelection({ ...fallback.attributes });
        setQty(Math.max(1, qtyInCart(fallback._id)));
        return;
      }
    }
    setSelection(next);
    const v = variants.find((x) => matches(x, next));
    setQty(Math.max(1, v ? qtyInCart(v._id) : 1));
  };

  const stock = free(selected);
  const inCart = selected ? qtyInCart(selected._id) : 0;
  const image = product.images?.[0] || product.image;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={busy ? undefined : onClose} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', damping: 26, stiffness: 300 }}
        className="relative w-full sm:max-w-md bg-white rounded-t-[2rem] sm:rounded-[2rem] max-h-[88vh] flex flex-col shadow-2xl"
      >
        <div className="p-5 flex gap-4 border-b border-gray-50">
          <ProductThumb src={image} alt={product.name} className="w-20 h-20" />
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-bold text-gray-900 leading-tight">{product.name}</h2>
            {selected ? (
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-lg font-bold text-gray-900">₹{Math.round(selected.offerPrice)}</span>
                {selected.price > selected.offerPrice && (
                  <span className="text-xs font-bold text-gray-400 line-through">₹{Math.round(selected.price)}</span>
                )}
              </div>
            ) : (
              <p className="mt-1.5 text-xs font-bold text-gray-400">Choose your options</p>
            )}
            {selected && (
              <p className={`mt-1 text-[11px] font-bold ${stock === 0 ? 'text-red-500' : stock <= 5 ? 'text-amber-600' : 'text-gray-400'}`}>
                {stock === 0 ? 'Out of stock' : stock <= 5 ? `Only ${stock} left` : 'In stock'}
              </p>
            )}
          </div>
          <button onClick={onClose} disabled={busy} className="w-9 h-9 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center shrink-0">
            <CloseRoundedIcon sx={{ fontSize: 18 }} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {options.map((opt) => (
            <div key={opt.name}>
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                {opt.name}{selection[opt.name] ? `: ${selection[opt.name]}` : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {opt.values.map((value) => {
                  const active = selection[opt.name] === value;
                  const available = isAvailable(opt.name, value);
                  const compatible = isCompatible(opt.name, value);
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => available && choose(opt.name, value)}
                      disabled={!available}
                      className={`min-w-[48px] px-3.5 py-2 rounded-xl text-sm font-bold border transition-colors ${
                        active
                          ? 'bg-[#5EB929] border-[#5EB929] text-white'
                          : !available
                            ? 'bg-gray-50 border-gray-100 text-gray-300 line-through cursor-not-allowed'
                            : compatible
                              ? 'bg-white border-gray-200 text-gray-800 hover:border-[#5EB929]'
                              : 'bg-white border-dashed border-gray-200 text-gray-400 hover:border-[#5EB929]'
                      }`}
                    >
                      {value}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-gray-100 flex items-center gap-3">
          <div className="flex items-center bg-gray-50 rounded-xl border border-gray-100 p-0.5">
            <button onClick={() => setQty((q) => Math.max(inCart > 0 ? 0 : 1, q - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500">
              <RemoveRoundedIcon sx={{ fontSize: 18 }} />
            </button>
            <span className="w-8 text-center font-bold text-gray-900">{qty}</span>
            <button
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
              disabled={!selected || qty >= stock}
              className="w-10 h-10 flex items-center justify-center text-gray-500 disabled:opacity-30"
            >
              <AddRoundedIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
          <button
            onClick={() => selected && onConfirm(selected, qty)}
            disabled={!selected || busy || (stock === 0 && qty > 0) || (qty === 0 && inCart === 0)}
            className="flex-1 h-12 rounded-xl bg-[#5EB929] text-white font-bold text-sm disabled:opacity-50"
          >
            {busy ? 'Updating...' : qty === 0 ? 'Remove from cart' : inCart > 0 ? `Update cart · ₹${Math.round((selected?.offerPrice || 0) * qty)}` : `Add to cart · ₹${Math.round((selected?.offerPrice || 0) * qty)}`}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body
  );
};

export default VariantPickerSheet;
