/**
 * Clear image URLs that still point somewhere external and cannot be fetched.
 *
 * Run this after migrate:images has pulled down everything it could. Whatever is left
 * external is unreachable - a disabled Cloudinary account, a seeded example.com
 * placeholder, a deleted remote file - and only renders as a broken image. Clearing it
 * lets the UI fall back to its designed placeholder (a merchant's initial instead of a
 * logo, an "upload" prompt instead of a missing KYB document).
 *
 * Dry run (default):  npm run clear:dead-images
 * Commit:             npm run clear:dead-images -- --commit
 *
 * By default each URL is re-checked over the network first, so a host that is merely
 * having a bad day is not wiped. Pass --no-verify to skip the check and clear every
 * remaining external URL.
 */
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../config/db.js';
import { IMAGE_TARGETS, collectSlots, isExternalImageUrl, toMarkPath, toQueryPath } from '../utils/imageFields.js';

dotenv.config();

const COMMIT = process.argv.includes('--commit');
const VERIFY = !process.argv.includes('--no-verify');
const OWN_BASE = process.env.PUBLIC_UPLOAD_BASE_URL || '';

const reachability = new Map();

/** Is this URL actually dead? Cached per URL so a shared placeholder is checked once. */
const isDead = async (url) => {
  if (!VERIFY) return true;
  if (reachability.has(url)) return reachability.get(url);

  let dead = true;
  try {
    const res = await fetch(url, { method: 'GET', redirect: 'follow' });
    dead = !res.ok;
  } catch {
    dead = true;
  }
  reachability.set(url, dead);
  return dead;
};

const stats = { cleared: 0, removed: 0, docs: 0, kept: 0 };

const processModel = async ({ name, model, paths }) => {
  const documents = await model.find({
    $or: paths.map((p) => ({ [toQueryPath(p)]: { $regex: '^https?://' } })),
  });

  let touchedDocs = 0;
  let cleared = 0;
  let removed = 0;

  for (const doc of documents) {
    // Track per-path so an untouched field is never marked or reassigned.
    const changedPaths = new Set();

    for (const dotPath of paths) {
      const isSubdocField = dotPath.includes('[].');
      const isArrayMember = !isSubdocField && dotPath.endsWith('[]');

      if (isArrayMember) {
        // Remove dead members outright - an empty string left in photos[] would still
        // render as a broken slot.
        const field = toQueryPath(dotPath);
        const current = doc[field];
        if (!Array.isArray(current)) continue;

        const kept = [];
        let dropped = 0;
        for (const value of current) {
          if (isExternalImageUrl(value, OWN_BASE) && (await isDead(value))) {
            dropped += 1;
          } else {
            kept.push(value);
          }
        }
        if (dropped > 0) {
          doc[field] = kept;
          removed += dropped;
          changedPaths.add(dotPath);
        }
        continue;
      }

      if (isSubdocField) {
        const [arrayPath, urlField] = dotPath.split('[].');
        const current = doc[arrayPath];
        if (!Array.isArray(current)) continue;

        const kept = [];
        let dropped = 0;
        for (const entry of current) {
          const value = entry?.[urlField];
          if (isExternalImageUrl(value, OWN_BASE) && (await isDead(value))) {
            dropped += 1;
          } else {
            kept.push(entry);
          }
        }
        if (dropped > 0) {
          doc[arrayPath] = kept;
          removed += dropped;
          changedPaths.add(dotPath);
        }
        continue;
      }

      for (const slot of collectSlots(doc, dotPath)) {
        const value = slot.parent[slot.key];
        if (!isExternalImageUrl(value, OWN_BASE)) continue;
        if (!(await isDead(value))) {
          stats.kept += 1;
          continue;
        }
        slot.parent[slot.key] = '';
        cleared += 1;
        changedPaths.add(dotPath);
      }
    }

    if (changedPaths.size > 0) {
      touchedDocs += 1;
      if (COMMIT) {
        [...changedPaths].forEach((p) => doc.markModified(toMarkPath(p)));
        await doc.save();
      }
    }
  }

  stats.cleared += cleared;
  stats.removed += removed;
  stats.docs += touchedDocs;

  const verb = COMMIT ? 'cleared' : 'would clear';
  if (touchedDocs > 0) {
    console.log(`${name.padEnd(13)} ${verb} ${cleared} field(s), dropped ${removed} array entr(ies) across ${touchedDocs} doc(s)`);
  } else {
    console.log(`${name.padEnd(13)} nothing to do`);
  }
};

const run = async () => {
  console.log(COMMIT ? '=== COMMIT MODE - writing changes ===' : '=== DRY RUN - pass --commit to write ===');
  console.log(VERIFY ? 'Re-checking each URL over the network first.\n' : 'Skipping reachability checks (--no-verify).\n');

  await connectDB();

  for (const target of IMAGE_TARGETS) {
    await processModel(target);
  }

  console.log('\n--- Summary ---');
  console.log(`Scalar fields emptied:  ${stats.cleared}`);
  console.log(`Array entries removed:  ${stats.removed}`);
  console.log(`Documents affected:     ${stats.docs}`);
  if (VERIFY && stats.kept > 0) console.log(`Still reachable, kept:  ${stats.kept}`);
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
