import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import { logStockAdjustment } from './stockService.js';

const MAX_OPTIONS = 3;
const MAX_VALUES = 30;
const MAX_VARIANTS = 200;

const roundPrice = (n) => Math.round(n * 100) / 100;
export const discountedPrice = (price, discountPercent) =>
  roundPrice((Number(price) * (100 - (discountPercent || 0))) / 100);

const toPlainAttributes = (attrs) =>
  attrs instanceof Map ? Object.fromEntries(attrs) : { ...(attrs || {}) };

/** Stable identity for a combination, in option order: "Size=M|Colour=Red". */
export const variantKey = (attributes, options) => {
  const attrs = toPlainAttributes(attributes);
  return options.map((o) => `${o.name}=${attrs[o.name] ?? ''}`).join('|');
};

export const variantLabel = (attributes, options) => {
  const attrs = toPlainAttributes(attributes);
  return options.map((o) => attrs[o.name]).filter(Boolean).join(' / ');
};

/**
 * Validates and cleans merchant-entered options. Returns { options } or { error }.
 * Empty input means "no variants".
 */
export const normalizeVariantOptions = (raw) => {
  if (!Array.isArray(raw)) return { options: [] };
  const options = [];
  const names = new Set();
  for (const opt of raw) {
    const name = String(opt?.name || '').trim();
    const values = [...new Set((opt?.values || []).map((v) => String(v).trim()).filter(Boolean))];
    if (!name && values.length === 0) continue;
    if (!name) return { error: 'Every option needs a name (e.g. Size, Colour)' };
    if (values.length === 0) return { error: `Add at least one value for ${name}` };
    if (values.length > MAX_VALUES) return { error: `${name} can have at most ${MAX_VALUES} values` };
    const key = name.toLowerCase();
    if (names.has(key)) return { error: `Option "${name}" is listed twice` };
    names.add(key);
    options.push({ name, values });
  }
  if (options.length > MAX_OPTIONS) return { error: `Use at most ${MAX_OPTIONS} options` };
  const combos = options.reduce((n, o) => n * o.values.length, 1);
  if (options.length && combos > MAX_VARIANTS) {
    return { error: `That makes ${combos} combinations - keep it under ${MAX_VARIANTS}` };
  }
  return { options };
};

/** Every combination of option values, as attribute objects. */
export const combinations = (options) =>
  options.reduce(
    (acc, opt) => acc.flatMap((partial) => opt.values.map((v) => ({ ...partial, [opt.name]: v }))),
    [{}]
  );

/**
 * Makes the product's active variants match `options`, taking stock/price/sku
 * per combination from `variantsInput` (matched by attributes). Combinations no
 * longer offered are deactivated, not deleted, so old offers/bookings that
 * reference them keep resolving.
 */
export const syncProductVariants = async (product, options, variantsInput, discountPercent) => {
  const inputByKey = new Map(
    (Array.isArray(variantsInput) ? variantsInput : []).map((v) => [variantKey(v.attributes, options), v])
  );
  const existing = await ProductVariant.find({ productId: product._id });
  const existingByKey = new Map(existing.map((v) => [variantKey(v.attributes, options), v]));

  const keep = new Set();
  for (const attrs of options.length ? combinations(options) : []) {
    const key = variantKey(attrs, options);
    const input = inputByKey.get(key) || {};
    const price = Number(input.price) > 0 ? Number(input.price) : product.price;
    const fields = {
      attributes: attrs,
      name: variantLabel(attrs, options),
      sku: String(input.sku || '').trim(),
      price,
      discount: discountPercent || 0,
      offerPrice: discountedPrice(price, discountPercent),
      stock: Math.max(0, Math.floor(Number(input.stock) || 0)),
      isActive: true,
    };
    const doc = existingByKey.get(key);
    if (doc) {
      const stockBefore = doc.stock || 0;
      Object.assign(doc, fields);
      await doc.save();
      keep.add(doc._id.toString());
      await logStockAdjustment({
        merchantId: product.merchantId, productId: product._id, variantId: doc._id,
        before: stockBefore, after: doc.stock, reserved: doc.reserved, label: `${product.name} (${fields.name})`,
      });
    } else {
      const created = await ProductVariant.create({ ...fields, productId: product._id });
      keep.add(created._id.toString());
      await logStockAdjustment({
        merchantId: product.merchantId, productId: product._id, variantId: created._id,
        before: 0, after: created.stock, label: `${product.name} (${fields.name})`,
      });
    }
  }

  const stale = existing.filter((v) => v.isActive && !keep.has(v._id.toString())).map((v) => v._id);
  if (stale.length) await ProductVariant.updateMany({ _id: { $in: stale } }, { $set: { isActive: false } });
};

/** Active variants for many products at once: Map(productId -> variant[]). */
export const getVariantsByProductIds = async (productIds) => {
  const variants = await ProductVariant.find({ productId: { $in: productIds }, isActive: true }).lean();
  const map = new Map();
  for (const v of variants) {
    const key = v.productId.toString();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(v);
  }
  return map;
};

export const serializeVariant = (v, options) => ({
  id: v._id.toString(),
  _id: v._id.toString(),
  attributes: toPlainAttributes(v.attributes),
  label: variantLabel(v.attributes, options || []) || v.name,
  sku: v.sku || '',
  price: v.price,
  offerPrice: v.offerPrice,
  stock: v.stock || 0,
  reserved: v.reserved || 0,
  available: Math.max(0, (v.stock || 0) - (v.reserved || 0)),
});

/**
 * Resolves one cart/booking line to its sellable unit: price, label and how
 * many are available. Returns { error } when the line can't be sold as asked.
 */
export const resolveLine = async ({ product, productId, variantId }) => {
  const p = product || (await Product.findById(productId));
  if (!p || !p.isActive) return { error: 'This item is no longer available' };

  const hasVariants = (p.variantOptions || []).length > 0;
  if (hasVariants && !variantId) {
    return { error: `Please choose ${p.variantOptions.map((o) => o.name.toLowerCase()).join(' & ')} for ${p.name}`, code: 'VARIANT_REQUIRED' };
  }

  if (variantId) {
    const v = await ProductVariant.findOne({ _id: variantId, productId: p._id, isActive: true });
    if (!v) return { error: `That option of ${p.name} is no longer available` };
    const label = variantLabel(v.attributes, p.variantOptions || []) || v.name;
    return {
      product: p,
      variant: v,
      label,
      displayName: `${p.name} (${label})`,
      price: v.price,
      offerPrice: v.offerPrice,
      available: Math.max(0, (v.stock || 0) - (v.reserved || 0)),
    };
  }

  return {
    product: p,
    variant: null,
    label: '',
    displayName: p.name,
    price: p.price,
    offerPrice: p.offerPrice,
    available: p.trackInventory ? Math.max(0, (p.stock || 0) - (p.reserved || 0)) : Infinity,
  };
};

export const stockError = (line, qty) => {
  if (qty <= line.available) return null;
  if (line.available <= 0) return `${line.displayName} is out of stock`;
  return `Only ${line.available} left of ${line.displayName}`;
};

/**
 * Reduces stock for a completed redemption's items. Never goes below zero -
 * if the shelf count was already wrong, the sale still happened.
 */
export const decrementStockForItems = async (items) => {
  const floorAtZero = (qty) => [{ $set: { stock: { $max: [0, { $subtract: ['$stock', qty] }] } } }];
  await Promise.all(
    (items || []).map((it) => {
      const qty = Number(it.qty) || 0;
      if (!qty || !it.productId) return null;
      if (it.variantId) return ProductVariant.updateOne({ _id: it.variantId }, floorAtZero(qty), { updatePipeline: true });
      return Product.updateOne({ _id: it.productId, trackInventory: true }, floorAtZero(qty), { updatePipeline: true });
    })
  );
};
