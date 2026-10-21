// Short store links: getofferly.in/<slug> opens that store (Merchant.slug).
// The slug comes from the store name the first time the store is saved and then
// never changes, so links merchants already shared keep working after a rename.

// First path segments the website already uses, so a store can never take them.
// Keep in step with the routes in frontend/src/App.jsx, the folders in
// frontend/public and the short links handled in frontend/index.html.
const RESERVED = new Set([
  'home', 'explore', 'map', 'cart', 'checkout', 'order', 'subscribe', 'offer', 'saved', 'redemptions',
  'redeem', 'review', 'store', 'profile', 'rewards', 'referral', 'guide', 'notifications', 'search',
  'about', 'terms', 'privacy', 'contact', 'support', 'login', 'signup', 'verify', 'merchant', 'admin',
  'delivery', 'invite', 'app', 'api', 'assets', 'banners', 'placeholders', 'uploads', 'cdn-cgi',
  'offerly', 'help', 'settings', 'stores', 'offers', 'shop', 'shops', 'www', 'static',
]);

const MAX_LENGTH = 40;

export const slugify = (name) => {
  const slug = String(name || '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_LENGTH)
    .replace(/-+$/g, '');
  return slug || 'store';
};

export const isValidSlug = (slug) => typeof slug === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX_LENGTH + 6;

// A free slug for `name`: "shoe-store", else "shoe-store-2", "shoe-store-3"...
export const uniqueStoreSlug = async (Model, name, excludeId = null) => {
  const base = slugify(name);
  for (let n = 1; n <= 200; n += 1) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    if (n === 1 && RESERVED.has(candidate)) continue;
    const taken = await Model.exists({ slug: candidate, ...(excludeId ? { _id: { $ne: excludeId } } : {}) });
    if (!taken) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
};

// One-off at boot: stores saved before slugs existed get theirs.
export const backfillStoreSlugs = async (Model) => {
  const missing = await Model.find({ $or: [{ slug: { $exists: false } }, { slug: null }, { slug: '' }] })
    .select('_id storeName')
    .sort({ createdAt: 1 })
    .lean();
  for (const m of missing) {
    const slug = await uniqueStoreSlug(Model, m.storeName, m._id);
    await Model.updateOne({ _id: m._id }, { $set: { slug } });
  }
  return missing.length;
};
