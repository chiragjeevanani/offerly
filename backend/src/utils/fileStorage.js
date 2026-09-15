import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// backend/src/utils -> backend
const BACKEND_ROOT = path.resolve(__dirname, '..', '..');

export const UPLOAD_DIR = path.resolve(
  BACKEND_ROOT,
  process.env.UPLOAD_DIR || 'uploads',
);

// Largest edge we keep. Merchant phones routinely shoot 4000px+; nothing in the UI
// renders bigger than a full-bleed offer hero, so anything past this is pure bytes.
const MAX_EDGE = 1600;
const WEBP_QUALITY = 80;

export const ensureUploadDir = () => {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  return UPLOAD_DIR;
};

ensureUploadDir();

// Generated, never derived from the client's filename - the original name is attacker
// controlled and only ever reaches us to be thrown away.
const generateFilename = (extension) =>
  `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${extension}`;

// Filenames we hand out, and therefore the only shape the delete route will act on.
export const STORED_FILENAME_PATTERN = /^\d+-[a-f0-9]{16}\.(webp|pdf)$/;

export const isPdf = (mimetype) => mimetype === 'application/pdf';

/**
 * Normalise an uploaded buffer onto disk and return its stored filename.
 *
 * Images are re-encoded to WebP; PDFs (KYB documents) are written through untouched
 * because sharp cannot process them.
 */
export const storeFile = async (buffer, mimetype) => {
  if (isPdf(mimetype)) {
    const filename = generateFilename('pdf');
    await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), buffer);
    return filename;
  }

  // .rotate() with no argument applies the EXIF orientation tag and then drops the
  // metadata entirely - which also strips the GPS coordinates baked into photos taken
  // on a merchant's phone.
  const output = await sharp(buffer)
    .rotate()
    .resize({
      width: MAX_EDGE,
      height: MAX_EDGE,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  const filename = generateFilename('webp');
  await fs.promises.writeFile(path.join(UPLOAD_DIR, filename), output);
  return filename;
};

/**
 * Absolute URL for a stored file.
 *
 * Absolute rather than relative so that every `<img src>` in the SPA and every image
 * field already in Mongo keeps working untouched, and so legacy Cloudinary URLs can
 * sit alongside these during the migration.
 *
 * In production PUBLIC_UPLOAD_BASE_URL ends in /api, which nginx strips before
 * proxying - so /api/uploads/x.webp lands on the static mount below as /uploads/x.webp.
 */
export const buildPublicUrl = (filename) => {
  const base = (process.env.PUBLIC_UPLOAD_BASE_URL || `http://localhost:${process.env.PORT || 5000}`)
    .replace(/\/+$/, '');
  return `${base}/uploads/${filename}`;
};

/**
 * Resolve a stored filename to an on-disk path, refusing anything that escapes
 * UPLOAD_DIR. Returns null if the name is not one we could have issued.
 */
export const resolveStoredFile = (filename) => {
  if (!filename || !STORED_FILENAME_PATTERN.test(filename)) return null;

  const resolved = path.resolve(UPLOAD_DIR, filename);
  if (resolved !== path.join(UPLOAD_DIR, filename)) return null;

  return resolved;
};
