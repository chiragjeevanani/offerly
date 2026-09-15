/**
 * Every place in the schema that can hold an image URL, plus the walker used to read
 * and rewrite them.
 *
 * Derived by enumerating the live schemas for String / [String] paths rather than from
 * memory - the KYB array is `documents` (not `kybDocuments`), and `Offer.customImage`
 * and `User.profilePhoto` are easy to miss by eye.
 */
import Merchant from '../modules/merchant/models/Merchant.js';
import Offer from '../modules/merchant/models/Offer.js';
import Product from '../modules/merchant/models/Product.js';
import ServicePlan from '../modules/merchant/models/ServicePlan.js';
import AdRequest from '../modules/admin/models/AdRequest.js';
import Category from '../modules/admin/models/Category.js';
import Reward from '../modules/rewards/models/Reward.js';
import ScratchCard from '../modules/rewards/models/ScratchCard.js';
import User from '../modules/user/models/User.js';

/**
 * `paths` are dot-paths where a segment ending in [] means "map over this array".
 * So 'photos[]' walks the array's own string members, and 'documents[].url' descends
 * into each subdocument.
 */
export const IMAGE_TARGETS = [
  { name: 'Merchant', model: Merchant, paths: ['logo', 'coverImage', 'photos[]', 'documents[].url'] },
  { name: 'Offer', model: Offer, paths: ['image', 'customImage'] },
  { name: 'Product', model: Product, paths: ['images[]'] },
  { name: 'ServicePlan', model: ServicePlan, paths: ['images[]'] },
  { name: 'AdRequest', model: AdRequest, paths: ['image'] },
  { name: 'Reward', model: Reward, paths: ['image'] },
  { name: 'ScratchCard', model: ScratchCard, paths: ['rewardSnapshot.image'] },
  { name: 'User', model: User, paths: ['avatar', 'profilePhoto'] },
  { name: 'Category', model: Category, paths: ['icon'] },
];

/** Mongo-queryable form of a dot-path ('documents[].url' -> 'documents.url'). */
export const toQueryPath = (dotPath) => dotPath.replace(/\[\]/g, '');

/**
 * Resolve a dot-path against a document into assignable slots.
 *
 * Returns [{ parent, key, mongoPath }]. `parent[key]` reads and writes the value in
 * place; `mongoPath` is the concrete positional path for a `$set` ('photos.2',
 * 'documents.1.url'), which lets callers update just that field instead of saving the
 * whole document - some legacy records fail current schema validation on unrelated
 * required fields, so a full save() would reject them.
 */
export const collectSlots = (root, dotPath) => {
  const segments = dotPath.split('.');
  const join = (prefix, segment) => (prefix ? `${prefix}.${segment}` : String(segment));

  const slots = [];
  let cursors = [{ node: root, path: '' }];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isArrayHop = segment.endsWith('[]');
    const key = isArrayHop ? segment.slice(0, -2) : segment;
    const isLast = i === segments.length - 1;

    const next = [];
    for (const { node, path } of cursors) {
      if (node === null || node === undefined) continue;

      const value = node[key];
      if (value === null || value === undefined) continue;
      const keyPath = join(path, key);

      if (isArrayHop) {
        // The array holds the values directly (photos[]) when this is the last segment;
        // otherwise descend into each element (documents[].url).
        if (!Array.isArray(value)) continue;
        for (let index = 0; index < value.length; index += 1) {
          if (isLast) {
            slots.push({ parent: value, key: index, mongoPath: join(keyPath, index) });
          } else {
            next.push({ node: value[index], path: join(keyPath, index) });
          }
        }
      } else if (isLast) {
        slots.push({ parent: node, key, mongoPath: keyPath });
      } else {
        next.push({ node: value, path: keyPath });
      }
    }
    cursors = next;
  }

  return slots;
};

/**
 * True when a value is an absolute http(s) URL pointing somewhere other than our own
 * public origin - i.e. an image we are hotlinking rather than serving ourselves.
 */
export const isExternalImageUrl = (value, ownBaseUrl) => {
  if (typeof value !== 'string' || !/^https?:\/\//i.test(value)) return false;

  let host;
  try {
    host = new URL(value).host;
  } catch {
    return false;
  }

  if (!ownBaseUrl) return true;
  try {
    return host !== new URL(ownBaseUrl).host;
  } catch {
    return true;
  }
};
