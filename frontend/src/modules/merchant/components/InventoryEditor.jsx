import { useState } from 'react';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import Inventory2RoundedIcon from '@mui/icons-material/Inventory2Rounded';
import { comboKey, comboLabel, rebuildVariants } from '../utils/inventory';

const MAX_OPTIONS = 3;
const OPTION_PRESETS = {
  Size: ['S', 'M', 'L', 'XL', 'XXL'],
  Colour: ['Black', 'White', 'Red', 'Blue', 'Green'],
  Material: [],
  Weight: [],
};

const ValueInput = ({ onAdd }) => {
  const [text, setText] = useState('');
  const commit = () => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean);
    if (parts.length) onAdd(parts);
    setText('');
  };
  return (
    <input
      value={text}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          commit();
        }
      }}
      onBlur={commit}
      placeholder="Type a value, press Enter"
      className="flex-1 min-w-[110px] text-[12px] font-bold text-gray-900 outline-none bg-transparent py-1"
    />
  );
};

/**
 * Inventory section of the product form.
 * value: { trackInventory, stock, variantOptions: [{name, values}], variants: [{attributes, stock, price, sku}] }
 */
const InventoryEditor = ({ value, onChange, basePrice }) => {
  const { trackInventory, stock, variantOptions = [], variants = [] } = value;
  const hasVariants = variantOptions.length > 0;
  const usableOptions = variantOptions.filter((o) => o.name.trim() && o.values.length);

  const setOptions = (nextOptions) =>
    onChange({ ...value, variantOptions: nextOptions, variants: rebuildVariants(nextOptions, variants) });

  const updateOption = (idx, patch) =>
    setOptions(variantOptions.map((o, i) => (i === idx ? { ...o, ...patch } : o)));

  const addValues = (idx, newValues) => {
    const current = variantOptions[idx].values;
    const merged = [...current];
    newValues.forEach((v) => { if (!merged.some((m) => m.toLowerCase() === v.toLowerCase())) merged.push(v); });
    updateOption(idx, { values: merged });
  };

  const toggleVariants = () => {
    if (hasVariants) {
      onChange({ ...value, variantOptions: [], variants: [] });
    } else {
      const options = [{ name: 'Size', values: [] }];
      onChange({ ...value, trackInventory: true, variantOptions: options, variants: [] });
    }
  };

  const updateVariant = (idx, patch) =>
    onChange({ ...value, variants: variants.map((v, i) => (i === idx ? { ...v, ...patch } : v)) });

  const setAllQty = (qty) => onChange({ ...value, variants: variants.map((v) => ({ ...v, stock: qty })) });

  const totalQty = variants.reduce((s, v) => s + (Number(v.stock) || 0), 0);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Inventory2RoundedIcon sx={{ fontSize: 16 }} className="text-[#5EB929]" />
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Inventory</span>
        </div>
        {hasVariants && usableOptions.length > 0 && (
          <span className="text-[10px] font-bold text-gray-400">{variants.length} variants · {totalQty} in stock</span>
        )}
      </div>

      {/* Sizes / colours toggle */}
      <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
        <span>
          <span className="block text-[12px] font-bold text-gray-800">Comes in sizes, colours, etc.</span>
          <span className="block text-[10px] font-medium text-gray-400">Track stock separately for each combination</span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={hasVariants}
          onClick={toggleVariants}
          className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${hasVariants ? 'bg-[#5EB929]' : 'bg-gray-200'}`}
        >
          <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${hasVariants ? 'translate-x-4' : ''}`} />
        </button>
      </label>

      {!hasVariants ? (
        <>
          <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
            <span>
              <span className="block text-[12px] font-bold text-gray-800">Track stock</span>
              <span className="block text-[10px] font-medium text-gray-400">Customers can't order more than you have</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={trackInventory}
              onClick={() => onChange({ ...value, trackInventory: !trackInventory })}
              className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${trackInventory ? 'bg-[#5EB929]' : 'bg-gray-200'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${trackInventory ? 'translate-x-4' : ''}`} />
            </button>
          </label>
          {trackInventory && (
            <div className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <span className="text-[11px] font-bold text-gray-600">Quantity in stock</span>
              <input
                type="number"
                min="0"
                inputMode="numeric"
                value={stock}
                onChange={(e) => onChange({ ...value, stock: e.target.value })}
                placeholder="0"
                className="w-20 text-right text-[13px] font-bold text-gray-900 outline-none bg-transparent"
              />
            </div>
          )}
        </>
      ) : (
        <div className="space-y-3">
          {/* Options */}
          {variantOptions.map((opt, idx) => (
            <div key={idx} className="rounded-lg border border-gray-100 p-2.5 space-y-2">
              <div className="flex items-center gap-2">
                <input
                  value={opt.name}
                  onChange={(e) => updateOption(idx, { name: e.target.value })}
                  placeholder="Option name (e.g. Size)"
                  list="variant-option-presets"
                  className="flex-1 text-[12px] font-bold text-gray-900 outline-none bg-gray-50 rounded-md px-2 py-1.5"
                />
                <button
                  type="button"
                  onClick={() => setOptions(variantOptions.filter((_, i) => i !== idx))}
                  className="w-7 h-7 rounded-md bg-gray-100 text-gray-400 flex items-center justify-center"
                  aria-label={`Remove ${opt.name || 'option'}`}
                >
                  <CloseRoundedIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {opt.values.map((v) => (
                  <span key={v} className="inline-flex items-center gap-1 pl-2 pr-1 py-0.5 rounded-md bg-[#5EB929]/10 text-[#3F8F17] text-[11px] font-bold">
                    {v}
                    <button
                      type="button"
                      onClick={() => updateOption(idx, { values: opt.values.filter((x) => x !== v) })}
                      className="w-4 h-4 flex items-center justify-center rounded hover:bg-[#5EB929]/20"
                      aria-label={`Remove ${v}`}
                    >
                      <CloseRoundedIcon sx={{ fontSize: 11 }} />
                    </button>
                  </span>
                ))}
                <ValueInput onAdd={(vals) => addValues(idx, vals)} />
              </div>
              {opt.values.length === 0 && OPTION_PRESETS[opt.name]?.length > 0 && (
                <button
                  type="button"
                  onClick={() => addValues(idx, OPTION_PRESETS[opt.name])}
                  className="text-[10px] font-bold text-[#5EB929]"
                >
                  + Add {OPTION_PRESETS[opt.name].join(', ')}
                </button>
              )}
            </div>
          ))}
          <datalist id="variant-option-presets">
            {Object.keys(OPTION_PRESETS).map((n) => <option key={n} value={n} />)}
          </datalist>
          {variantOptions.length < MAX_OPTIONS && (
            <button
              type="button"
              onClick={() => setOptions([...variantOptions, { name: variantOptions.some((o) => o.name === 'Colour') ? '' : 'Colour', values: [] }])}
              className="flex items-center gap-1 text-[11px] font-bold text-[#5EB929]"
            >
              <AddRoundedIcon sx={{ fontSize: 14 }} /> Add another option
            </button>
          )}

          {/* Combination matrix */}
          {variants.length > 0 && (
            <div className="rounded-lg border border-gray-100 overflow-hidden">
              <div className="grid grid-cols-[1fr_72px_84px] gap-2 px-2.5 py-2 bg-gray-50 text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                <span>Variant</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Price ₹</span>
              </div>
              <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                {variants.map((v, idx) => (
                  <div key={comboKey(v.attributes, usableOptions)} className="grid grid-cols-[1fr_72px_84px] gap-2 items-center px-2.5 py-1.5">
                    <span className="text-[12px] font-bold text-gray-800 truncate">{comboLabel(v.attributes, usableOptions)}</span>
                    <input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      value={v.stock}
                      onChange={(e) => updateVariant(idx, { stock: e.target.value })}
                      placeholder="0"
                      className={`w-full text-right text-[12px] font-bold outline-none rounded-md px-1.5 py-1 bg-gray-50 ${Number(v.stock) > 0 ? 'text-gray-900' : 'text-red-400'}`}
                    />
                    <input
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={v.price}
                      onChange={(e) => updateVariant(idx, { price: e.target.value })}
                      placeholder={basePrice ? String(basePrice) : 'Same'}
                      className="w-full text-right text-[12px] font-bold text-gray-900 outline-none rounded-md px-1.5 py-1 bg-gray-50 placeholder:text-gray-300"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between gap-2 px-2.5 py-2 bg-gray-50 border-t border-gray-100">
                <span className="text-[10px] font-medium text-gray-400">Leave price empty to use the main price</span>
                <button
                  type="button"
                  onClick={() => {
                    const qty = window.prompt('Set the same quantity for every variant:', '10');
                    if (qty !== null && qty.trim() !== '' && Number(qty) >= 0) setAllQty(String(Math.floor(Number(qty))));
                  }}
                  className="text-[10px] font-bold text-[#5EB929] shrink-0"
                >
                  Set all qty
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventoryEditor;
