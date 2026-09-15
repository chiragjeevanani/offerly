import express from 'express';
import fs from 'fs';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { MAX_UPLOAD_MB, upload } from '../config/upload.js';
import { buildPublicUrl, resolveStoredFile, storeFile } from '../utils/fileStorage.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// Uploads are authenticated, but they write to the server's own disk - a logged-in
// merchant looping an upload is the one request here that costs us storage.
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many uploads, please try again later' },
});

// multer rejects (size cap, disallowed type) surface as errors from the middleware
// itself, so they need translating here or they fall through as a generic 500.
const handleUpload = (middleware) => (req, res, next) =>
  middleware(req, res, (error) => {
    if (!error) return next();

    if (error instanceof multer.MulterError) {
      const message =
        error.code === 'LIMIT_FILE_SIZE'
          ? `File too large. Maximum size is ${MAX_UPLOAD_MB}MB`
          : error.code === 'LIMIT_FILE_COUNT'
            ? 'Too many files'
            : 'Upload failed';
      return res.status(400).json({ success: false, message });
    }

    return res.status(400).json({ success: false, message: error.message || 'Upload failed' });
  });

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post('/image', protect, uploadLimiter, handleUpload(upload.single('image')), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided',
      });
    }

    const filename = await storeFile(req.file.buffer, req.file.mimetype);

    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: buildPublicUrl(filename),
      publicId: filename,
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload image',
      error: error.message,
    });
  }
});

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
router.post('/images', protect, uploadLimiter, handleUpload(upload.array('images', 10)), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No image files provided',
      });
    }

    const uploadedImages = [];
    for (const file of req.files) {
      const filename = await storeFile(file.buffer, file.mimetype);
      uploadedImages.push({ url: buildPublicUrl(filename), publicId: filename });
    }

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} images uploaded successfully`,
      images: uploadedImages,
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to upload images',
      error: error.message,
    });
  }
});

// @desc    Delete a stored image
// @route   DELETE /api/upload/image/:publicId
// @access  Private
router.delete('/image/:publicId', protect, async (req, res) => {
  try {
    const { publicId } = req.params;

    // publicId is user input going straight into a filesystem path, so it is matched
    // against the exact shape we issue rather than merely sanitised.
    const filePath = resolveStoredFile(publicId);
    if (!filePath) {
      return res.status(400).json({
        success: false,
        message: 'Invalid file identifier',
      });
    }

    await fs.promises.unlink(filePath);

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
    });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({
        success: false,
        message: 'Image not found',
      });
    }

    console.error('Image delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete image',
      error: error.message,
    });
  }
});

export default router;
