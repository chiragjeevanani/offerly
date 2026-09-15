/**
 * Clear image URLs that point at the disabled Cloudinary account.
 *
 * The account (cloud_name dykqqkmqy) returns "disabled customer" from the Admin API
 * and 401 from every delivery endpoint - plain, signed, and archive alike - so these
 * files cannot be downloaded by anyone and migrateCloudinaryToLocal.js has nothing to
 * fetch. The URLs are dead weight that render as broken images; clearing them lets the
 * UI fall back to its designed placeholders (a merchant's initial instead of a logo,
 * and an "upload" prompt instead of a missing KYB document).
 *
 * Dry run (default):  npm run clear:dead-images
 * Commit:             npm run clear:dead-images -- --commit
 *
 * Idempotent, and only ever touches values containing "cloudinary.com".
 *
 * If the Cloudinary account is ever reinstated, restore the URLs from the snapshot in
 * backend/backups/image-urls-before-migration-*.json and run migrate:images instead.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../config/db.js';
import { collectSlots } from './migrateCloudinaryToLocal.js';

import Merchant from '../modules/merchant/models/Merchant.js';
import Offer from '../modules/merchant/models/Offer.js';
import Product from '../modules/merchant/models/Product.js';
import ServicePlan from '../modules/merchant/models/ServicePlan.js';
import AdRequest from '../modules/admin/models/AdRequest.js';
import Category from '../modules/admin/models/Category.js';
import Reward from '../modules/rewards/models/Reward.js';
import ScratchCard from '../modules/rewards/models/ScratchCard.js';
import User from '../modules/user/models/User.js';

dotenv.config();

const COMMIT = process.argv.includes('--commit');

const isDead = (value) => typeof value === 'string' && value.includes('cloudinary.com');

// Scalar string fields get emptied. Array members are removed outright, because an
// empty string left in photos[] would still render as a broken image slot.
const TARGETS = [
  {
    name: 'Merchant',
    model: Merchant,
    scalars: ['logo', 'coverImage'],
    arrays: ['photos'],
    subdocs: [{ arrayPath: 'documents', urlField: 'url' }],
  },
  { name: 'Offer', model: Offer, scalars: ['image', 'customImage'], arrays: [], subdocs: [] },
  { name: 'Product', model: Product, scalars: [], arrays: ['images'], subdocs: [] },
  { name: 'ServicePlan', model: ServicePlan, scalars: [], arrays: ['images'], subdocs: [] },
  { name: 'AdRequest', model: AdRequest, scalars: ['image'], arrays: [], subdocs: [] },
  { name: 'Reward', model: Reward, scalars: ['image'], arrays: [], subdocs: [] },
  { name: 'ScratchCard', model: ScratchCard, scalars: ['rewardSnapshot.image'], arrays: [], subdocs: [] },
  { name: 'User', model: User, scalars: ['avatar', 'profilePhoto'], arrays: [], subdocs: [] },
  { name: 'Category', model: Category, scalars: ['icon'], arrays: [], subdocs: [] },
];

const stats = { cleared: 0, removed: 0, docs: 0 };

const processModel = async ({ name, model, scalars, arrays, subdocs }) => {
  const conditions = [
    ...scalars.map((f) => ({ [f]: { $regex: 'cloudinary\\.com' } })),
    ...arrays.map((f) => ({ [f]: { $regex: 'cloudinary\\.com' } })),
    ...subdocs.map((s) => ({ [`${s.arrayPath}.${s.urlField}`]: { $regex: 'cloudinary\\.com' } })),
  ];
  if (conditions.length === 0) return;

  const documents = await model.find({ $or: conditions });
  let touchedDocs = 0;
  let cleared = 0;
  let removed = 0;

  for (const doc of documents) {
    let changed = false;

    for (const field of scalars) {
      for (const slot of collectSlots(doc, field)) {
        if (!isDead(slot.parent[slot.key])) continue;
        slot.parent[slot.key] = '';
        cleared += 1;
        changed = true;
      }
    }

    for (const field of arrays) {
      const current = doc[field];
      if (!Array.isArray(current)) continue;
      const kept = current.filter((v) => !isDead(v));
      if (kept.length === current.length) continue;
      removed += current.length - kept.length;
      doc[field] = kept;
      changed = true;
    }

    for (const { arrayPath, urlField } of subdocs) {
      const current = doc[arrayPath];
      if (!Array.isArray(current)) continue;
      const kept = current.filter((entry) => !isDead(entry?.[urlField]));
      if (kept.length === current.length) continue;
      removed += current.length - kept.length;
      doc[arrayPath] = kept;
      changed = true;
    }

    if (changed) {
      touchedDocs += 1;
      if (COMMIT) {
        [...scalars, ...arrays, ...subdocs.map((s) => s.arrayPath)].forEach((p) => doc.markModified(p));
        await doc.save();
      }
    }
  }

  stats.cleared += cleared;
  stats.removed += removed;
  stats.docs += touchedDocs;

  if (touchedDocs > 0 || cleared > 0 || removed > 0) {
    const verb = COMMIT ? 'cleared' : 'would clear';
    console.log(`${name.padEnd(13)} ${verb} ${cleared} field(s), dropped ${removed} array entr(ies) across ${touchedDocs} doc(s)`);
  } else {
    console.log(`${name.padEnd(13)} nothing to do`);
  }
};

const run = async () => {
  console.log(COMMIT ? '=== COMMIT MODE - writing changes ===' : '=== DRY RUN - pass --commit to write ===');
  console.log('Clearing URLs that point at the disabled Cloudinary account.\n');

  await connectDB();

  for (const target of TARGETS) {
    await processModel(target);
  }

  console.log('\n--- Summary ---');
  console.log(`Scalar fields emptied:  ${stats.cleared}`);
  console.log(`Array entries removed:  ${stats.removed}`);
  console.log(`Documents affected:     ${stats.docs}`);
  if (!COMMIT) console.log('\nNothing was written. Re-run with --commit to apply.');

  await mongoose.connection.close();
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  run().catch(async (error) => {
    console.error('Failed:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
}
