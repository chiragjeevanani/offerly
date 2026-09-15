// This import must stay first. The seeders build their data arrays at module level, and
// ESM evaluates a module's imports before the body of whatever imported it - so by the
// time masterSeeder.js reaches its own dotenv.config() call, every seedImage() below has
// already run. Without this, PUBLIC_UPLOAD_BASE_URL would be unset at that moment and
// every seeded URL would silently point at localhost, including on the server.
import 'dotenv/config';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { UPLOAD_DIR, buildPublicUrl } from '../utils/fileStorage.js';

const ASSETS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'assets');

let warnedAboutBaseUrl = false;

/**
 * Resolve a bundled demo image to a servable URL, copying it into the upload directory
 * on first use.
 *
 * Seed images ship in the repo rather than being hotlinked from a stock-photo CDN, so
 * re-seeding cannot reintroduce an external dependency into the database. Filenames stay
 * stable and prefixed (`seed-*`) so re-running a seeder overwrites rather than
 * accumulating copies, and so seeded rows are recognisable next to real uploads.
 */
export const seedImage = (name) => {
  if (!process.env.PUBLIC_UPLOAD_BASE_URL && !warnedAboutBaseUrl) {
    warnedAboutBaseUrl = true;
    console.warn(
      '[seedAssets] PUBLIC_UPLOAD_BASE_URL is not set - seeded image URLs will point at localhost.',
    );
  }

  const filename = `seed-${name}.webp`;
  const destination = path.join(UPLOAD_DIR, filename);

  if (!fs.existsSync(destination)) {
    const source = path.join(ASSETS_DIR, `${name}.webp`);
    if (!fs.existsSync(source)) {
      throw new Error(`Missing seed asset "${name}" - expected ${source}`);
    }
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    fs.copyFileSync(source, destination);
  }

  return buildPublicUrl(filename);
};

/** Every asset name that ships with the repo - used by the self-check below. */
export const listSeedAssets = () =>
  fs
    .readdirSync(ASSETS_DIR)
    .filter((file) => file.endsWith('.webp'))
    .map((file) => file.replace(/\.webp$/, ''));
