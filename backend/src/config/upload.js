import multer from 'multer';
import dotenv from 'dotenv';

dotenv.config();

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 10;

// Keep this under nginx's client_max_body_size (15m) or the proxy rejects the request
// before Express ever sees it, and multer's error message never reaches the client.
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

const ALLOWED_MIME = /^image\/(jpeg|jpg|png|webp|gif|avif|heic|heif)$/;

// Memory, not disk: sharp needs the buffer to re-encode, and writing the raw upload
// first would leave the original on disk to clean up.
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_MIME.test(file.mimetype) || file.mimetype === 'application/pdf') {
    return cb(null, true);
  }
  return cb(new Error('Only image files and PDFs are allowed'), false);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
    files: 10,
  },
});
