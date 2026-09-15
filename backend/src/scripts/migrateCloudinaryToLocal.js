/**
 * One-off migration: pull every Cloudinary-hosted image down onto this server's disk
 * and rewrite the database to point at the local copy.
 *
 * Dry run (default):  npm run migrate:images
 * Commit:             npm run migrate:images -- --commit
 *
 * Idempotent - only values containing "cloudinary.com" are touched, so re-running after
 * a partial failure picks up exactly what is left.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../config/db.js';
import { UPLOAD_DIR, buildPublicUrl, storeFile } from '../utils/fileStorage.js';

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
const ALLOW_LOCALHOST = process.argv.includes('--allow-localhost');

/**
 * The same Atlas cluster backs local development and production. Committing from a
 * dev machine would rewrite live image URLs to http://localhost:5000/... and the
 * original Cloudinary URLs are gone once overwritten - there is no undo. So a commit
 * whose PUBLIC_UPLOAD_BASE_URL points at localhost is refused unless explicitly forced
 * (which is only ever right against a genuinely local database).
 */
const assertSafeToCommit = () => {
  if (!COMMIT) return;

  const base = process.env.PUBLIC_UPLOAD_BASE_URL || '';
  const isLocal = !base || /localhost|127\.0\.0\.1/i.test(base);

  if (isLocal && !ALLOW_LOCALHOST) {
    console.error('\nREFUSING TO COMMIT.');
    console.error(`PUBLIC_UPLOAD_BASE_URL is "${base || '(unset)'}" - a local address.`);
    console.error('Writing these URLs into a shared database would break every image for');
    console.error('real users, and the original Cloudinary URLs cannot be recovered afterwards.');
    console.error('\nRun this on the server with PUBLIC_UPLOAD_BASE_URL set to the public origin');
    console.error('(e.g. https://getofferly.in/api), or pass --allow-localhost if this really is');
    console.error('a throwaway local database.\n');
    process.exit(1);
  }
};

// Every field in the schema that can hold an image URL. `paths` are dot-paths; a segment
// of [] means "map over this array", so 'kybDocuments[].url' walks the subdocuments.
// Derived by walking the live schemas for String / [String] paths that hold asset URLs,
// not from memory - the KYB documents array is `documents`, and Offer.customImage /
// User.profilePhoto are easy to miss by eye.
const TARGETS = [
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

const isCloudinaryUrl = (value) =>
  typeof value === 'string' && value.includes('cloudinary.com');

// The same source URL shows up across many documents (a shared placeholder, a logo
// snapshotted onto a scratch card). Download and re-encode it once.
const downloadCache = new Map();
const failures = [];

const stats = {
  scanned: 0,
  migrated: 0,
  reused: 0,
  failed: 0,
  bytesIn: 0,
  bytesOut: 0,
};

const fetchAndStore = async (url) => {
  if (downloadCache.has(url)) {
    stats.reused += 1;
    return downloadCache.get(url);
  }

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();

  // Cloudinary served PDFs as raw files; keep the same branch the upload route uses.
  const filename = await storeFile(buffer, contentType);
  const newUrl = buildPublicUrl(filename);

  stats.bytesIn += buffer.length;
  stats.bytesOut += fs.statSync(path.join(UPLOAD_DIR, filename)).size;

  downloadCache.set(url, newUrl);
  return newUrl;
};

/** Read a dot-path (supporting [] array hops) off a document. Returns [{ parent, key }]. */
export const collectSlots = (root, dotPath) => {
  const segments = dotPath.split('.');
  let cursors = [root];

  for (let i = 0; i < segments.length; i += 1) {
    const segment = segments[i];
    const isArrayHop = segment.endsWith('[]');
    const key = isArrayHop ? segment.slice(0, -2) : segment;
    const isLast = i === segments.length - 1;

    const next = [];
    for (const cursor of cursors) {
      if (cursor === null || cursor === undefined) continue;

      const value = cursor[key];
      if (value === null || value === undefined) continue;

      if (isArrayHop) {
        // The array itself holds the values (photos[], images[]) when this is the last
        // segment; otherwise we descend into each element (kybDocuments[].url).
        if (!Array.isArray(value)) continue;
        if (isLast) {
          for (let index = 0; index < value.length; index += 1) {
            next.push({ parent: value, key: index });
          }
        } else {
          next.push(...value);
        }
      } else if (isLast) {
        next.push({ parent: cursor, key });
      } else {
        next.push(value);
      }
    }
    cursors = next;
  }

  return cursors;
};

const migrateModel = async ({ name, model, paths }) => {
  const orConditions = paths.map((dotPath) => ({
    [dotPath.replace(/\[\]/g, '')]: { $regex: 'cloudinary\\.com' },
  }));

  const documents = await model.find({ $or: orConditions });
  let touchedDocs = 0;
  let touchedFields = 0;

  for (const doc of documents) {
    let changed = false;

    for (const dotPath of paths) {
      for (const slot of collectSlots(doc, dotPath)) {
        const current = slot.parent[slot.key];
        if (!isCloudinaryUrl(current)) continue;

        stats.scanned += 1;

        if (!COMMIT) {
          touchedFields += 1;
          changed = true;
          continue;
        }

        try {
          slot.parent[slot.key] = await fetchAndStore(current);
          stats.migrated += 1;
          touchedFields += 1;
          changed = true;
        } catch (error) {
          stats.failed += 1;
          failures.push({ model: name, id: String(doc._id), path: dotPath, url: current, error: error.message });
          console.error(`  ! ${name} ${doc._id} ${dotPath}: ${error.message}`);
        }
      }
    }

    if (changed) {
      touchedDocs += 1;
      if (COMMIT) {
        // markModified is required for the array/subdocument hops - mutating an element
        // in place does not always trip Mongoose's change tracking.
        paths.forEach((dotPath) => doc.markModified(dotPath.replace(/\[\]/g, '')));
        await doc.save();
      }
    }
  }

  const verb = COMMIT ? 'migrated' : 'would migrate';
  console.log(`${name.padEnd(14)} ${verb} ${String(touchedFields).padStart(4)} url(s) across ${touchedDocs} doc(s)`);
};

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const run = async () => {
  console.log(COMMIT ? '=== COMMIT MODE - writing changes ===' : '=== DRY RUN - pass --commit to write ===');
  console.log(`Upload dir:  ${UPLOAD_DIR}`);
  console.log(`Public base: ${buildPublicUrl('<file>')}\n`);

  assertSafeToCommit();

  await connectDB();

  for (const target of TARGETS) {
    await migrateModel(target);
  }

  console.log('\n--- Summary ---');
  console.log(`Cloudinary URLs found: ${stats.scanned}`);
  if (COMMIT) {
    console.log(`Migrated:              ${stats.migrated} (${stats.reused} deduped)`);
    console.log(`Failed:                ${stats.failed}`);
    console.log(`Downloaded:            ${formatMb(stats.bytesIn)} -> stored ${formatMb(stats.bytesOut)}`);
  }

  if (failures.length > 0) {
    const reportPath = path.resolve(UPLOAD_DIR, '..', 'migration-failures.json');
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));
    console.log(`\n${failures.length} failure(s) written to ${reportPath}`);
    console.log('Re-run the script to retry only those - migrated URLs are skipped.');
  }

  await mongoose.connection.close();
};

// Only migrate when invoked directly, so the helpers above stay importable for tests.
const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  run().catch(async (error) => {
    console.error('Migration failed:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
}
