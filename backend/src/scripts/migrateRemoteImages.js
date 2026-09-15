/**
 * Pull every externally-hosted image into this server's own storage and rewrite the
 * database to point at the local copy.
 *
 * Covers anything we are hotlinking - seeded Unsplash stock photos, and Cloudinary
 * assets should that account ever be reinstated. Any http(s) URL whose host is not our
 * own PUBLIC_UPLOAD_BASE_URL is a candidate.
 *
 * Dry run (default):  npm run migrate:images
 * Commit:             npm run migrate:images -- --commit
 *
 * Idempotent: once a URL points at our own host it is skipped, so the script can be
 * re-run to retry whatever failed last time.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import connectDB from '../config/db.js';
import { UPLOAD_DIR, buildPublicUrl, storeFile } from '../utils/fileStorage.js';
import { IMAGE_TARGETS, collectSlots, isExternalImageUrl, toQueryPath } from '../utils/imageFields.js';

dotenv.config();

const COMMIT = process.argv.includes('--commit');
const ALLOW_LOCALHOST = process.argv.includes('--allow-localhost');
const OWN_BASE = process.env.PUBLIC_UPLOAD_BASE_URL || '';

/**
 * Local development and production share one Atlas cluster. Committing from a dev box
 * would rewrite live image URLs to http://localhost:5000/... and the originals are gone
 * once overwritten, so refuse unless explicitly forced.
 */
const assertSafeToCommit = () => {
  if (!COMMIT) return;

  const isLocal = !OWN_BASE || /localhost|127\.0\.0\.1/i.test(OWN_BASE);
  if (isLocal && !ALLOW_LOCALHOST) {
    console.error('\nREFUSING TO COMMIT.');
    console.error(`PUBLIC_UPLOAD_BASE_URL is "${OWN_BASE || '(unset)'}" - a local address.`);
    console.error('Writing these URLs into a shared database would break every image for');
    console.error('real users, and the originals cannot be recovered afterwards.');
    console.error('\nRun this on the server with PUBLIC_UPLOAD_BASE_URL set to the public origin');
    console.error('(e.g. https://getofferly.in/api), or pass --allow-localhost if this really is');
    console.error('a throwaway local database.\n');
    process.exit(1);
  }
};

// The same source URL appears across many documents (a shared stock photo, a logo
// snapshotted onto a scratch card). Fetch and re-encode it once.
const downloadCache = new Map();
const failures = [];
const stats = { scanned: 0, migrated: 0, reused: 0, failed: 0, bytesIn: 0, bytesOut: 0 };

const fetchAndStore = async (url) => {
  if (downloadCache.has(url)) {
    stats.reused += 1;
    return downloadCache.get(url);
  }

  const response = await fetch(url, {
    headers: { 'User-Agent': 'offerly-image-migration' },
    redirect: 'follow',
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) throw new Error('empty response body');

  const contentType = (response.headers.get('content-type') || 'image/jpeg').split(';')[0].trim();
  if (!/^image\//.test(contentType) && contentType !== 'application/pdf') {
    throw new Error(`unexpected content-type ${contentType}`);
  }

  const filename = await storeFile(buffer, contentType);
  const newUrl = buildPublicUrl(filename);

  stats.bytesIn += buffer.length;
  stats.bytesOut += fs.statSync(path.join(UPLOAD_DIR, filename)).size;

  downloadCache.set(url, newUrl);
  return newUrl;
};

const migrateModel = async ({ name, model, paths }) => {
  // Fetch anything holding an absolute URL; the per-value check decides what is external.
  const documents = await model.find({
    $or: paths.map((p) => ({ [toQueryPath(p)]: { $regex: '^https?://' } })),
  });

  let touchedDocs = 0;
  let touchedFields = 0;

  for (const doc of documents) {
    // Collected as concrete positional paths ('photos.2') and written with one $set.
    // A full doc.save() would re-validate the whole record, and some legacy rows are
    // missing required fields that have nothing to do with images.
    const updates = {};

    for (const dotPath of paths) {
      for (const slot of collectSlots(doc, dotPath)) {
        const current = slot.parent[slot.key];
        if (!isExternalImageUrl(current, OWN_BASE)) continue;

        stats.scanned += 1;

        if (!COMMIT) {
          touchedFields += 1;
          updates[slot.mongoPath] = true;
          continue;
        }

        try {
          updates[slot.mongoPath] = await fetchAndStore(current);
          stats.migrated += 1;
          touchedFields += 1;
        } catch (error) {
          stats.failed += 1;
          failures.push({ model: name, id: String(doc._id), path: dotPath, url: current, error: error.message });
          console.error(`  ! ${name} ${doc._id} ${dotPath}: ${error.message}`);
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      touchedDocs += 1;
      if (COMMIT) {
        await model.updateOne({ _id: doc._id }, { $set: updates });
      }
    }
  }

  const verb = COMMIT ? 'migrated' : 'would migrate';
  console.log(`${name.padEnd(13)} ${verb} ${String(touchedFields).padStart(4)} url(s) across ${touchedDocs} doc(s)`);
};

const formatMb = (bytes) => `${(bytes / 1024 / 1024).toFixed(1)}MB`;

const run = async () => {
  console.log(COMMIT ? '=== COMMIT MODE - writing changes ===' : '=== DRY RUN - pass --commit to write ===');
  console.log(`Upload dir:  ${UPLOAD_DIR}`);
  console.log(`Public base: ${buildPublicUrl('<file>')}`);
  console.log('Migrating every image hosted somewhere other than our own origin.\n');

  assertSafeToCommit();
  await connectDB();

  for (const target of IMAGE_TARGETS) {
    await migrateModel(target);
  }

  console.log('\n--- Summary ---');
  console.log(`External URLs found:   ${stats.scanned}`);
  if (COMMIT) {
    console.log(`Migrated:              ${stats.migrated} (${stats.reused} deduped)`);
    console.log(`Failed:                ${stats.failed}`);
    console.log(`Downloaded:            ${formatMb(stats.bytesIn)} -> stored ${formatMb(stats.bytesOut)}`);
  } else {
    console.log('\nNothing was written. Re-run with --commit to apply.');
  }

  if (failures.length > 0) {
    const reportPath = path.resolve(UPLOAD_DIR, '..', 'migration-failures.json');
    fs.writeFileSync(reportPath, JSON.stringify(failures, null, 2));
    console.log(`\n${failures.length} failure(s) written to ${reportPath}`);
    console.log('Re-run to retry them, or clear the unreachable ones with clear:dead-images.');
  }

  await mongoose.connection.close();
};

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  run().catch(async (error) => {
    console.error('Migration failed:', error);
    await mongoose.connection.close().catch(() => {});
    process.exit(1);
  });
}
