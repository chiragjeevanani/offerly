import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StorefrontRoundedIcon from '@mui/icons-material/StorefrontRounded';
import PhoneIphoneRoundedIcon from '@mui/icons-material/PhoneIphoneRounded';
import VerifiedUserRoundedIcon from '@mui/icons-material/VerifiedUserRounded';
import PersonAddAltRoundedIcon from '@mui/icons-material/PersonAddAltRounded';
import SearchRoundedIcon from '@mui/icons-material/SearchRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import DeleteOutlineRoundedIcon from '@mui/icons-material/DeleteOutlineRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import CompareArrowsRoundedIcon from '@mui/icons-material/CompareArrowsRounded';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import toast from 'react-hot-toast';
import { merchantAPI } from '../../../api/merchant.api';
import { productAPI } from '../../../api/product.api';
import { servicePlanAPI } from '../../../api/servicePlan.api';

const rupees = (n) => `₹${(Math.round((Number(n) || 0) * 100) / 100).toLocaleString('en-IN')}`;
const when = (d) =>
  new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
const pctOff = (mrp, price) => (mrp > 0 && price >= 0 && price <= mrp ? Math.round(((mrp - price) / mrp) * 1000) / 10 : 0);
const errText = (err, fallback) => err?.error || err?.response?.data?.error || err?.message || fallback;
const toNum = (v) => (v === '' || v === null || v === undefined ? NaN : Number(v));

const inputClass =
  'w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 outline-none focus:bg-white focus:border-[#5EB929]';

let lineSeq = 0;
const newLine = (fields) => ({ key: ++lineSeq, qty: 1, mrp: '', price: '', ...fields });

// ---------- Step 1: who is the customer ----------
const CustomerStep = ({ onReady }) => {
  const [phone, setPhone] = useState('');
  const [found, setFound] = useState(null); // lookup result
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const validPhone = /^[6-9]\d{9}$/.test(phone);

  const lookup = async (e) => {
    e?.preventDefault();
    if (!validPhone) return toast.error('Enter a valid 10-digit mobile number');
    setBusy(true);
    try {
      const res = await merchantAPI.walkinLookup(phone);
      setFound(res.data);
      setOtpSent(false);
      setOtp('');
    } catch (err) {
      toast.error(errText(err, 'Could not check this number'));
    } finally {
      setBusy(false);
    }
  };

  const sendOtp = async () => {
    setBusy(true);
    try {
      await merchantAPI.walkinSendOtp(phone);
      setOtpSent(true);
      toast.success('OTP sent to the customer');
    } catch (err) {
      toast.error(errText(err, 'Could not send the OTP'));
    } finally {
      setBusy(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) return toast.error('Enter the 6-digit OTP');
    setBusy(true);
    try {
      const res = await merchantAPI.walkinVerifyOtp(phone, otp);
      toast.success('Number verified');
      onReady({ phone, exists: false, name: name.trim(), walkinToken: res.data.walkinToken, visits: found?.visits || 0 });
    } catch (err) {
      toast.error(errText(err, 'Could not verify the OTP'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900">Customer's mobile number</h2>
        <p className="text-xs text-gray-500 mt-0.5">The sale is saved to this number, so the customer sees it in the Offerly app.</p>
      </div>
      <form onSubmit={lookup} className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-400">+91</span>
          <input
            type="tel"
            inputMode="numeric"
            autoFocus
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value.replace(/\D/g, '').slice(-10));
              setFound(null);
              setOtpSent(false);
            }}
            placeholder="98765 43210"
            className={`${inputClass} pl-12 tracking-wide`}
          />
        </div>
        <button
          type="submit"
          disabled={!validPhone || busy}
          className="px-4 rounded-xl bg-[#5EB929] text-white text-sm font-bold disabled:opacity-50"
        >
          {busy && !found ? '...' : 'Next'}
        </button>
      </form>

      {found?.exists && (
        <div className="rounded-xl border border-[#5EB929]/30 bg-[#5EB929]/5 p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#5EB929] text-white flex items-center justify-center font-bold">
            {(found.name || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">{found.name || 'Offerly customer'}</p>
            <p className="text-[11px] text-[#4E9F1F] font-semibold flex items-center gap-1">
              <VerifiedUserRoundedIcon sx={{ fontSize: 13 }} /> Offerly customer
              {found.visits > 0 && <span className="text-gray-500 font-medium"> · {found.visits} earlier {found.visits === 1 ? 'visit' : 'visits'}</span>}
            </p>
          </div>
          <button
            onClick={() => onReady({ phone, exists: true, name: found.name, visits: found.visits })}
            className="px-4 py-2 rounded-xl bg-[#5EB929] text-white text-xs font-bold"
          >
            Continue
          </button>
        </div>
      )}

      {found && !found.exists && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 space-y-3">
          <div className="flex items-start gap-2.5">
            <PersonAddAltRoundedIcon className="text-amber-600 mt-0.5" sx={{ fontSize: 20 }} />
            <div>
              <p className="text-sm font-bold text-gray-900">Not on Offerly yet</p>
              <p className="text-[11px] text-gray-600 leading-relaxed">
                Send an OTP to confirm the number. When they join Offerly with this number, they'll see this purchase in the app.
              </p>
            </div>
          </div>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={60}
            placeholder="Customer name (optional)"
            className={inputClass}
          />
          {!otpSent ? (
            <button onClick={sendOtp} disabled={busy} className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold disabled:opacity-50">
              {busy ? 'Sending...' : `Send OTP to +91 ${phone}`}
            </button>
          ) : (
            <form onSubmit={verify} className="space-y-2">
              <p className="text-[11px] text-gray-600">Ask the customer for the 6-digit code they just received.</p>
              <div className="flex gap-2">
                <input
                  inputMode="numeric"
                  autoFocus
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-digit OTP"
                  className={`${inputClass} tracking-[0.4em] placeholder:tracking-normal text-center`}
                />
                <button type="submit" disabled={busy || otp.length !== 6} className="px-4 rounded-xl bg-[#5EB929] text-white text-sm font-bold disabled:opacity-50">
                  Verify
                </button>
              </div>
              <button type="button" onClick={sendOtp} disabled={busy} className="text-[11px] font-semibold text-[#4E9F1F]">
                Didn't get it? Resend OTP
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
};

// ---------- Step 2: what did they buy ----------
const ItemLine = ({ line, onChange, onRemove }) => {
  const mrp = toNum(line.mrp);
  const price = toNum(line.price);
  const overPrice = Number.isFinite(mrp) && Number.isFinite(price) && price > mrp;
  const off = Number.isFinite(mrp) && Number.isFinite(price) ? pctOff(mrp, price) : null;
  const variants = line.variants || [];

  return (
    <div className="rounded-xl border border-gray-100 p-3 space-y-2.5">
      <div className="flex items-start gap-2">
        {line.kind === 'custom' ? (
          <input
            value={line.name}
            onChange={(e) => onChange({ name: e.target.value })}
            placeholder="Item name"
            maxLength={80}
            className={`${inputClass} py-2`}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-900">{line.name}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{line.kind === 'service' ? 'Service' : 'Product'}</p>
          </div>
        )}
        <button onClick={onRemove} className="p-1.5 text-gray-400 hover:text-red-500" aria-label="Remove item">
          <DeleteOutlineRoundedIcon sx={{ fontSize: 18 }} />
        </button>
      </div>

      {variants.length > 0 && (
        <select
          value={line.variantId || ''}
          onChange={(e) => {
            const v = variants.find((x) => x._id === e.target.value);
            onChange({ variantId: e.target.value, mrp: v ? String(v.price ?? '') : line.mrp });
          }}
          className={`${inputClass} py-2`}
        >
          {variants.map((v) => (
            <option key={v._id} value={v._id}>{v.label}</option>
          ))}
        </select>
      )}

      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 items-end">
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Qty</label>
          <div className="flex items-center border border-gray-200 rounded-xl bg-gray-50">
            <button onClick={() => onChange({ qty: Math.max(1, line.qty - 1) })} className="p-2 text-gray-600" aria-label="Less">
              <RemoveRoundedIcon sx={{ fontSize: 16 }} />
            </button>
            <span className="w-6 text-center text-sm font-bold">{line.qty}</span>
            <button onClick={() => onChange({ qty: Math.min(999, line.qty + 1) })} className="p-2 text-gray-600" aria-label="More">
              <AddRoundedIcon sx={{ fontSize: 16 }} />
            </button>
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Item price (₹)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={line.mrp}
            onChange={(e) => onChange({ mrp: e.target.value })}
            placeholder="0"
            className={`${inputClass} py-2`}
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-500 mb-1">Sold for (₹)</label>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={line.price}
            onChange={(e) => onChange({ price: e.target.value })}
            placeholder="0"
            className={`${inputClass} py-2 ${overPrice ? 'border-red-300 bg-red-50' : ''}`}
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        {overPrice ? (
          <span className="font-semibold text-red-500">Sold price can't be more than the item price</span>
        ) : off !== null ? (
          <span className={`font-bold px-2 py-0.5 rounded-md ${off > 0 ? 'bg-[#5EB929]/10 text-[#4E9F1F]' : 'bg-gray-100 text-gray-500'}`}>
            {off > 0 ? `${off}% off` : 'No discount'}
          </span>
        ) : (
          <span className="text-gray-400">Enter both prices to see the discount</span>
        )}
        {Number.isFinite(price) && !overPrice && <span className="font-bold text-gray-900">{rupees(price * line.qty)}</span>}
      </div>
    </div>
  );
};

const ItemsStep = ({ customer, onChangeCustomer, onSaved }) => {
  const [lines, setLines] = useState([]);
  const [search, setSearch] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const { data: catalogue = [], isLoading } = useQuery({
    queryKey: ['walkinCatalogue'],
    queryFn: async () => {
      const [productRes, serviceRes] = await Promise.all([
        productAPI.getByMerchant('me').catch(() => null),
        servicePlanAPI.getAll().catch(() => null),
      ]);
      const products = (productRes?.products || []).filter((p) => p.isActive !== false).map((p) => ({
        key: `p-${p._id || p.id}`, kind: 'product', id: p._id || p.id, name: p.name, price: p.price,
        variants: (p.variants || []).filter((v) => v.isActive !== false),
      }));
      const services = (serviceRes?.plans || []).map((s) => ({
        key: `s-${s._id}`, kind: 'service', id: s._id, name: s.name, price: s.basePrice, variants: [],
      }));
      return [...products, ...services];
    },
    staleTime: 60 * 1000,
  });

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q ? catalogue.filter((c) => c.name?.toLowerCase().includes(q)) : catalogue;
    return list.slice(0, q ? 20 : 8);
  }, [catalogue, search]);

  const addFromCatalogue = (item) => {
    const firstVariant = item.variants[0];
    setLines((ls) => [
      ...ls,
      newLine({
        kind: item.kind,
        name: item.name,
        productId: item.kind === 'product' ? item.id : null,
        servicePlanId: item.kind === 'service' ? item.id : null,
        variants: item.variants,
        variantId: firstVariant?._id || null,
        mrp: String((firstVariant ? firstVariant.price : item.price) ?? ''),
      }),
    ]);
    setSearch('');
  };

  const update = (key, patch) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  const remove = (key) => setLines((ls) => ls.filter((l) => l.key !== key));

  const totals = useMemo(() => {
    let mrp = 0;
    let paid = 0;
    for (const l of lines) {
      const m = toNum(l.mrp);
      const p = toNum(l.price);
      if (Number.isFinite(m)) mrp += m * l.qty;
      if (Number.isFinite(p)) paid += p * l.qty;
    }
    return { mrp, paid, discount: mrp - paid, pct: pctOff(mrp, paid) };
  }, [lines]);

  const problem = (() => {
    if (!lines.length) return 'Add at least one item';
    for (const [i, l] of lines.entries()) {
      const m = toNum(l.mrp);
      const p = toNum(l.price);
      if (l.kind === 'custom' && !l.name?.trim()) return `Item ${i + 1}: enter its name`;
      if (!Number.isFinite(m) || m < 0) return `Item ${i + 1}: enter the item price`;
      if (!Number.isFinite(p) || p < 0) return `Item ${i + 1}: enter the price you sold it for`;
      if (p > m) return `Item ${i + 1}: sold price is more than the item price`;
    }
    return null;
  })();

  const save = async () => {
    if (problem) return toast.error(problem);
    setSaving(true);
    try {
      const res = await merchantAPI.createWalkinOrder({
        phone: customer.phone,
        walkinToken: customer.walkinToken,
        customerName: customer.name,
        note,
        items: lines.map((l) => ({
          kind: l.kind,
          productId: l.productId || undefined,
          variantId: l.variantId || undefined,
          servicePlanId: l.servicePlanId || undefined,
          name: l.kind === 'custom' ? l.name.trim() : undefined,
          qty: l.qty,
          mrp: Number(l.mrp),
          price: Number(l.price),
        })),
      });
      onSaved(res.data);
    } catch (err) {
      toast.error(errText(err, 'Could not save the sale'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Customer chip */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3.5 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center">
          <PhoneIphoneRoundedIcon sx={{ fontSize: 20 }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{customer.name || 'Walk-in customer'}</p>
          <p className="text-[11px] text-gray-500">
            +91 {customer.phone} · {customer.exists ? 'Offerly customer' : 'Verified by OTP'}
          </p>
        </div>
        <button onClick={onChangeCustomer} className="text-xs font-bold text-[#4E9F1F]">Change</button>
      </div>

      {/* Picker */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-900">Add items</h2>
        <div className="relative">
          <SearchRoundedIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" sx={{ fontSize: 18 }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search your products & services"
            className={`${inputClass} pl-10`}
          />
        </div>
        {isLoading ? (
          <div className="h-16 bg-gray-50 rounded-xl animate-pulse" />
        ) : (
          <div className="flex flex-wrap gap-2">
            {matches.map((item) => (
              <button
                key={item.key}
                onClick={() => addFromCatalogue(item)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:border-[#5EB929] active:scale-95 transition"
              >
                <AddRoundedIcon sx={{ fontSize: 14 }} className="text-[#5EB929]" />
                {item.name}
                {item.price ? <span className="text-gray-400 font-medium">{rupees(item.price)}</span> : null}
              </button>
            ))}
            {!matches.length && (
              <p className="text-xs text-gray-400">{search ? 'Nothing matches - add it as another item below.' : 'No products or services yet.'}</p>
            )}
            <button
              onClick={() => setLines((ls) => [...ls, newLine({ kind: 'custom', name: search.trim() })])}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-gray-300 text-xs font-semibold text-gray-600"
            >
              <AddRoundedIcon sx={{ fontSize: 14 }} /> Other item
            </button>
          </div>
        )}
      </div>

      {/* Bill */}
      {lines.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-bold text-gray-900">Bill ({lines.length} {lines.length === 1 ? 'item' : 'items'})</h2>
          {lines.map((line) => (
            <ItemLine key={line.key} line={line} onChange={(patch) => update(line.key, patch)} onRemove={() => remove(line.key)} />
          ))}
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            placeholder="Note (optional), e.g. paid by UPI"
            className={inputClass}
          />
          <div className="rounded-xl bg-gray-50 p-3.5 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-600"><span>Total item price</span><span className="font-semibold">{rupees(totals.mrp)}</span></div>
            <div className="flex justify-between text-[#4E9F1F]">
              <span>Discount {totals.pct > 0 && <span className="font-bold">({totals.pct}%)</span>}</span>
              <span className="font-semibold">−{rupees(Math.max(0, totals.discount))}</span>
            </div>
            <div className="flex justify-between text-gray-900 font-bold text-base pt-1.5 border-t border-gray-200">
              <span>Customer pays</span><span>{rupees(totals.paid)}</span>
            </div>
          </div>
          <button
            onClick={save}
            disabled={saving || Boolean(problem)}
            className="w-full py-3 rounded-xl bg-[#5EB929] text-white text-sm font-bold shadow-lg shadow-[#5EB929]/20 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? 'Saving...' : `Save sale · ${rupees(totals.paid)}`}
          </button>
          {problem && lines.length > 0 && <p className="text-[11px] text-center text-gray-500">{problem}</p>}
        </div>
      )}
    </div>
  );
};

// ---------- History ----------
const RecentSales = () => {
  const [open, setOpen] = useState(null);
  const { data, isLoading } = useQuery({
    queryKey: ['walkinOrders'],
    queryFn: async () => (await merchantAPI.getWalkinOrders({ limit: 30 })) || {},
  });
  const orders = data?.data || [];

  return (
    <div className="space-y-2.5">
      <h2 className="text-sm font-bold text-gray-900 flex items-center gap-1.5 px-0.5">
        <ReceiptLongRoundedIcon sx={{ fontSize: 18 }} className="text-[#5EB929]" /> Recent walk-in sales
      </h2>
      {isLoading ? (
        <div className="h-20 bg-white rounded-2xl animate-pulse" />
      ) : orders.length === 0 ? (
        <p className="text-xs text-gray-400 bg-white rounded-2xl border border-gray-100 p-4 text-center">No walk-in sales yet.</p>
      ) : (
        orders.map((o) => (
          <div key={o._id} className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            <button onClick={() => setOpen(open === o._id ? null : o._id)} className="w-full p-3.5 flex items-center gap-3 text-left">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{o.customerName || `+91 ${o.customerPhone}`}</p>
                <p className="text-[11px] text-gray-500">{o.orderId} · {when(o.createdAt)} · {o.items.length} {o.items.length === 1 ? 'item' : 'items'}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-bold text-gray-900">{rupees(o.totals.paid)}</p>
                {o.totals.discountPercent > 0 && <p className="text-[10px] font-bold text-[#4E9F1F]">{o.totals.discountPercent}% off</p>}
              </div>
              <ExpandMoreRoundedIcon className={`text-gray-400 transition-transform ${open === o._id ? 'rotate-180' : ''}`} />
            </button>
            {open === o._id && (
              <div className="px-3.5 pb-3.5 space-y-1.5 border-t border-gray-50 pt-2.5">
                {o.items.map((it, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-gray-700">{it.qty} × {it.name}</span>
                    <span className="text-gray-900 font-semibold">
                      {it.price < it.mrp && <span className="line-through text-gray-400 font-normal mr-1.5">{rupees(it.mrp * it.qty)}</span>}
                      {rupees(it.price * it.qty)}
                    </span>
                  </div>
                ))}
                <p className="text-[11px] text-gray-500 pt-1">+91 {o.customerPhone}{o.note ? ` · ${o.note}` : ''}</p>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

const WalkinSale = () => {
  const queryClient = useQueryClient();
  const [customer, setCustomer] = useState(null);
  const [saved, setSaved] = useState(null);

  return (
    <div className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <StorefrontRoundedIcon className="text-[#5EB929]" /> Walk-in Sale
            </h1>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Ring up a customer who came to your store without booking in the app. Set your own price on each item - the
              discount is worked out for you.
            </p>
          </div>
          <Link to="/merchant/online-offline" className="flex-shrink-0 flex items-center gap-1 text-[11px] font-bold text-[#4E9F1F] bg-[#5EB929]/10 px-2.5 py-1.5 rounded-lg">
            <CompareArrowsRoundedIcon sx={{ fontSize: 15 }} /> Online vs offline
          </Link>
        </div>

        {saved ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center space-y-3">
            <CheckCircleRoundedIcon sx={{ fontSize: 48 }} className="text-[#5EB929]" />
            <div>
              <p className="text-base font-bold text-gray-900">Sale saved · {saved.orderId}</p>
              <p className="text-xs text-gray-500 mt-1">
                {saved.customerName || `+91 ${saved.customerPhone}`} paid {rupees(saved.totals.paid)}
                {saved.totals.discount > 0 && ` (saved ${rupees(saved.totals.discount)}, ${saved.totals.discountPercent}% off)`}
              </p>
              {saved.verifiedBy === 'otp' && (
                <p className="text-[11px] text-gray-500 mt-2">They'll see it in the Offerly app once they sign up with this number.</p>
              )}
            </div>
            <button
              onClick={() => {
                setSaved(null);
                setCustomer(null);
              }}
              className="px-6 py-2.5 rounded-xl bg-[#5EB929] text-white text-sm font-bold"
            >
              New walk-in sale
            </button>
          </div>
        ) : customer ? (
          <ItemsStep
            customer={customer}
            onChangeCustomer={() => setCustomer(null)}
            onSaved={(order) => {
              setSaved(order);
              queryClient.invalidateQueries({ queryKey: ['walkinOrders'] });
              queryClient.invalidateQueries({ queryKey: ['salesComparison'] });
              queryClient.invalidateQueries({ queryKey: ['merchantProducts'] });
            }}
          />
        ) : (
          <CustomerStep onReady={setCustomer} />
        )}

        <RecentSales />
      </div>
    </div>
  );
};

export default WalkinSale;
