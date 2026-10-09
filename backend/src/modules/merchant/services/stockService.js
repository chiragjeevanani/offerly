import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import StockMovement from '../models/StockMovement.js';
import Redemption from '../../booking/models/Redemption.js';
import { notifyMerchant } from '../../user/services/notificationService.js';

// Stock model: `stock` is what's physically on the shelf, `reserved` is what
// unexpired booking passes have set aside. Customers can only take
// `stock - reserved`. Every update below is a single atomic Mongo write, so two
// customers racing for the last unit can't both get it.

export const LOW_STOCK_THRESHOLD = 5;

const num = (field) => ({ $ifNull: [field, 0] });
const AVAILABLE = { $subtract: [num('$stock'), num('$reserved')] };
const floorAt0 = (expr) => ({ $max: [0, expr] });

const lineKey = (l) => `${l.productId}|${l.variantId || ''}`;
const modelFor = (line) => (line.variantId ? ProductVariant : Product);
const idFilter = (line) =>
  line.variantId ? { _id: line.variantId, productId: line.productId } : { _id: line.productId, trackInventory: true };

/**
 * The stock-tracked lines of a pass, merged per product/variant:
 * [{ productId, variantId, qty, label }]. Untracked products are skipped.
 */
export const trackedLines = async (items) => {
  const plainIds = [...new Set((items || []).filter((it) => !it.variantId).map((it) => String(it.productId)))];
  const tracked = new Set(
    plainIds.length
      ? (await Product.find({ _id: { $in: plainIds }, trackInventory: true }).select('_id').lean()).map((p) => String(p._id))
      : []
  );
  const merged = new Map();
  for (const it of items || []) {
    const qty = Number(it.qty) || 0;
    if (!qty || !it.productId) continue;
    if (!it.variantId && !tracked.has(String(it.productId))) continue;
    const line = {
      productId: it.productId,
      variantId: it.variantId || null,
      qty,
      label: it.product?.name || it.label || '',
    };
    const key = lineKey(line);
    if (merged.has(key)) merged.get(key).qty += qty;
    else merged.set(key, line);
  }
  return [...merged.values()];
};

const productMerchantIds = async (lines) => {
  const ids = [...new Set(lines.map((l) => String(l.productId)))];
  const products = await Product.find({ _id: { $in: ids } }).select('merchantId').lean();
  return new Map(products.map((p) => [String(p._id), p.merchantId]));
};

const logMovements = async (entries) => {
  if (!entries.length) return;
  try {
    const merchantByProduct = await productMerchantIds(entries);
    await StockMovement.insertMany(
      entries
        .map((e) => ({ ...e, merchantId: e.merchantId || merchantByProduct.get(String(e.productId)) }))
        .filter((e) => e.merchantId)
    );
  } catch (err) {
    console.error('[Stock] Failed to write stock history (non-blocking):', err);
  }
};

// Tells the merchant when an item's available count crosses the low-stock
// line or hits zero. Only on the crossing, so it isn't repeated every sale.
const alertIfCrossed = async (line, doc, consumedQty) => {
  if (!doc) return;
  const after = (doc.stock || 0) - (doc.reserved || 0);
  const before = after + consumedQty;
  let title = '';
  let body = '';
  if (before > 0 && after <= 0) {
    title = 'Out of stock';
    body = `${line.label || 'An item'} is now out of stock. Customers can't book it until you restock.`;
  } else if (before > LOW_STOCK_THRESHOLD && after <= LOW_STOCK_THRESHOLD) {
    title = 'Running low';
    body = `Only ${after} left of ${line.label || 'an item'}.`;
  }
  if (!title) return;
  try {
    const merchantId = (await productMerchantIds([line])).get(String(line.productId));
    if (!merchantId) return;
    await notifyMerchant(String(merchantId), {
      type: 'stock_alert',
      title,
      body,
      data: { productId: String(line.productId), variantId: line.variantId ? String(line.variantId) : '', available: String(after) },
      link: '/merchant/products',
    });
  } catch (err) {
    console.error('[Stock] Alert failed (non-blocking):', err);
  }
};

const applyPipeline = (line, set) =>
  modelFor(line).findOneAndUpdate(idFilter(line), [{ $set: set }], { returnDocument: 'after', updatePipeline: true }).select('stock reserved').lean();

/**
 * Sets units aside for `lines`. All-or-nothing: if any line doesn't fit, the
 * ones already reserved are given back and `{ error, line, available }` is
 * returned. With `force` (merchant editing at the counter, who can see the
 * shelf) lines are reserved even past what's available.
 */
export const reserveLines = async (lines, { force = false, redemptionId = null, passId = '' } = {}) => {
  const done = [];
  for (const line of lines) {
    const filter = idFilter(line);
    if (!force) filter.$expr = { $gte: [AVAILABLE, line.qty] };
    const doc = await modelFor(line).findOneAndUpdate(filter, { $inc: { reserved: line.qty } }, { returnDocument: 'after' }).select('stock reserved').lean();
    if (!doc) {
      await releaseLines(done, { redemptionId, passId, log: false });
      const current = await modelFor(line).findOne(idFilter(line)).select('stock reserved').lean();
      const available = Math.max(0, (current?.stock || 0) - (current?.reserved || 0));
      const name = line.label || 'This item';
      return {
        error: available > 0 ? `Only ${available} left of ${name}` : `${name} is out of stock`,
        line,
        available,
      };
    }
    done.push({ ...line, doc });
  }
  await logMovements(
    done.map((l) => ({
      productId: l.productId, variantId: l.variantId, type: 'reserved', reservedChange: l.qty,
      stockAfter: l.doc.stock || 0, reservedAfter: l.doc.reserved || 0, redemptionId, passId, label: l.label,
    }))
  );
  for (const l of done) await alertIfCrossed(l, l.doc, l.qty);
  return { lines: done.map(({ doc, ...l }) => l) };
};

/** Gives reserved units back (never below zero). */
export const releaseLines = async (lines, { redemptionId = null, passId = '', log = true } = {}) => {
  const entries = [];
  for (const line of lines) {
    const doc = await applyPipeline(line, { reserved: floorAt0({ $subtract: [num('$reserved'), line.qty] }) });
    if (doc) {
      entries.push({
        productId: line.productId, variantId: line.variantId, type: 'released', reservedChange: -line.qty,
        stockAfter: doc.stock || 0, reservedAfter: doc.reserved || 0, redemptionId, passId, label: line.label,
      });
    }
  }
  if (log) await logMovements(entries);
};

/** A completed pass: units leave the shelf and stop being reserved. */
const consumeLines = async (lines, { redemptionId, passId }) => {
  const entries = [];
  for (const line of lines) {
    const doc = await applyPipeline(line, {
      stock: floorAt0({ $subtract: [num('$stock'), line.qty] }),
      reserved: floorAt0({ $subtract: [num('$reserved'), line.qty] }),
    });
    if (doc) {
      entries.push({
        productId: line.productId, variantId: line.variantId, type: 'sold', stockChange: -line.qty, reservedChange: -line.qty,
        stockAfter: doc.stock || 0, reservedAfter: doc.reserved || 0, redemptionId, passId, label: line.label,
      });
    }
  }
  await logMovements(entries);
};

/** Passes from before reservations existed: deduct straight from the shelf. */
const deductUnreservedLines = async (lines, { redemptionId, passId }) => {
  const entries = [];
  for (const line of lines) {
    const doc = await applyPipeline(line, { stock: floorAt0({ $subtract: [num('$stock'), line.qty] }) });
    if (doc) {
      entries.push({
        productId: line.productId, variantId: line.variantId, type: 'sold', stockChange: -line.qty,
        stockAfter: doc.stock || 0, reservedAfter: doc.reserved || 0, redemptionId, passId, label: line.label,
      });
      await alertIfCrossed(line, doc, line.qty);
    }
  }
  await logMovements(entries);
};

/**
 * Called once a pass is completed. Moves its held units out of stock; for a
 * legacy pass with no hold, deducts the items directly. Safe to call twice.
 */
export const consumeStockForRedemption = async (redemption) => {
  const meta = { redemptionId: redemption._id, passId: redemption.internalId || '' };
  const status = redemption.stockHold?.status || 'none';
  if (status === 'held') {
    const res = await Redemption.updateOne(
      { _id: redemption._id, 'stockHold.status': 'held' },
      { $set: { 'stockHold.status': 'consumed' } }
    );
    if (res.modifiedCount > 0) await consumeLines(redemption.stockHold.lines, meta);
    return;
  }
  if (status === 'none') {
    const res = await Redemption.updateOne(
      { _id: redemption._id, 'stockHold.status': { $in: ['none', null] } },
      { $set: { 'stockHold.status': 'consumed' } }
    );
    if (res.modifiedCount > 0) await deductUnreservedLines(await trackedLines(redemption.items), meta);
  }
};

/** Returns the held units of an expired/cancelled pass. Safe to call any number of times. */
export const releaseStockHold = async (redemption) => {
  if (redemption.stockHold?.status !== 'held') return;
  const res = await Redemption.updateOne(
    { _id: redemption._id, status: { $in: ['expired', 'cancelled'] }, 'stockHold.status': 'held' },
    { $set: { 'stockHold.status': 'released' } }
  );
  if (res.modifiedCount > 0) {
    await releaseLines(redemption.stockHold.lines, { redemptionId: redemption._id, passId: redemption.internalId || '' });
  }
};

/** Cron sweep: every expired/cancelled pass still holding stock. */
export const releaseUnreleasedStockHolds = async () => {
  const passes = await Redemption.find({ status: { $in: ['expired', 'cancelled'] }, 'stockHold.status': 'held' })
    .select('stockHold internalId status')
    .lean();
  for (const pass of passes) await releaseStockHold(pass);
  return passes.length;
};

/**
 * Re-balances a pending pass's hold after its items were edited. Growth is
 * reserved (all-or-nothing, unless `force`), shrinkage released. Returns an
 * error string or null; on success `redemption.stockHold.lines` is updated
 * (caller saves). Passes with no hold are left alone.
 */
export const rebalanceStockHold = async (redemption, nextItems, { force = false } = {}) => {
  if (redemption.stockHold?.status !== 'held') return null;
  const prev = new Map((redemption.stockHold.lines || []).map((l) => [lineKey(l), l]));
  const next = await trackedLines(nextItems);
  const nextByKey = new Map(next.map((l) => [lineKey(l), l]));
  const meta = { redemptionId: redemption._id, passId: redemption.internalId || '' };

  const grow = [];
  const shrink = [];
  for (const l of next) {
    const before = prev.get(lineKey(l))?.qty || 0;
    if (l.qty > before) grow.push({ ...l, qty: l.qty - before });
    else if (l.qty < before) shrink.push({ ...l, qty: before - l.qty });
  }
  for (const [key, l] of prev) if (!nextByKey.has(key)) shrink.push({ ...l });

  if (grow.length) {
    const res = await reserveLines(grow, { force, ...meta });
    if (res.error) return res.error;
  }
  if (shrink.length) await releaseLines(shrink, meta);
  redemption.stockHold.lines = next;
  return null;
};

/** History row for a manual change to a shelf count. No-op if it didn't change. */
export const logStockAdjustment = async ({ merchantId, productId, variantId = null, before, after, reserved = 0, label = '' }) => {
  const b = Number(before) || 0;
  const a = Number(after) || 0;
  if (a === b) return;
  await logMovements([
    { merchantId, productId, variantId, type: 'adjusted', stockChange: a - b, stockAfter: a, reservedAfter: reserved || 0, label },
  ]);
};
