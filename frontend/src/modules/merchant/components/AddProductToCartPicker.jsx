import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import CheckRoundedIcon from '@mui/icons-material/CheckRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { productAPI } from '../../../api/product.api';

// One selectable row per sellable unit: a product, or each size/colour of a
// product with variants. `key` matches lineKey() in ScannerEntry.
const toRows = (products) =>
  products.flatMap((product) => {
    const productId = (product._id || product.id)?.toString();
    const options = product.variantOptions || [];
    if (options.length && product.variants?.length) {
      return product.variants.map((v) => {
        const attrs = v.attributes || {};
        const label = options.map((o) => attrs[o.name]).filter(Boolean).join(' / ') || v.name;
        return {
          key: `${productId}|${v._id}`,
          product,
          variant: v,
          name: `${product.name} (${label})`,
          price: v.price,
          offerPrice: v.offerPrice,
          stock: v.stock ?? 0,
          tracked: true,
        };
      });
    }
    return [{
      key: `${productId}|`,
      product,
      variant: null,
      name: product.name,
      price: product.price,
      offerPrice: product.offerPrice,
      stock: product.stock ?? 0,
      tracked: Boolean(product.trackInventory),
    }];
  });

const AddProductToCartPicker = ({ onAdd, excludeIds = [], disabled = false }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await productAPI.search(query.trim());
        setResults(res?.products || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const excludeSet = new Set(excludeIds.map((id) => id?.toString()));
  const rows = toRows(results);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="flex items-center gap-2 bg-[#F8FAFC] border border-gray-100 rounded-xl px-3 py-2.5">
        <SearchRoundedIcon sx={{ fontSize: 18 }} className="text-gray-400 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          placeholder="Search a product to add..."
          className="w-full bg-transparent text-xs font-bold text-gray-900 placeholder:text-gray-400 outline-none"
        />
      </div>

      <AnimatePresence>
        {open && query.trim().length >= 2 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute z-50 w-full mt-2 bg-white rounded-xl border border-gray-100 shadow-2xl max-h-64 overflow-y-auto"
          >
            {loading ? (
              <div className="p-4 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-5 text-center">
                <Inventory2RoundedIcon sx={{ fontSize: 28 }} className="text-gray-200 mb-1" />
                <p className="text-[11px] font-bold text-gray-400">No products found</p>
              </div>
            ) : (
              <div className="p-1.5">
                {rows.map((row) => {
                  const { product } = row;
                  const alreadyAdded = excludeSet.has(row.key);
                  const soldOut = row.tracked && row.stock <= 0;
                  return (
                    <button
                      key={row.key}
                      type="button"
                      disabled={alreadyAdded || disabled}
                      onClick={() => { if (!alreadyAdded && !disabled) { onAdd(product, row.variant); setQuery(''); setResults([]); setOpen(false); } }}
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg text-left transition-colors ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    >
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Inventory2RoundedIcon sx={{ fontSize: 16 }} className="text-gray-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-900 truncate">{row.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] font-bold text-gray-900">₹{row.offerPrice}</span>
                          {row.price > row.offerPrice && (
                            <span className="text-[10px] text-gray-400 line-through">₹{row.price}</span>
                          )}
                          {row.tracked && (
                            <span className={`text-[10px] font-bold ${soldOut ? 'text-red-500' : 'text-gray-400'}`}>
                              · {soldOut ? 'Out of stock' : `${row.stock} in stock`}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${alreadyAdded ? 'bg-green-50 text-green-500' : 'bg-primary/10 text-primary'}`}>
                        {alreadyAdded ? <CheckRoundedIcon sx={{ fontSize: 16 }} /> : <AddRoundedIcon sx={{ fontSize: 16 }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddProductToCartPicker;
