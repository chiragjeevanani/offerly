import express from 'express';
import { upload } from '../config/cloudinary.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

// @desc    Upload single image
// @route   POST /api/upload/image
// @access  Private
router.post('/image', protect, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image file provided' 
      });
    }

    // Cloudinary automatically uploads and returns the URL
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      url: req.file.path, // Cloudinary URL
      publicId: req.file.filename
    });
  } catch (error) {
    console.error('Image upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload image',
      error: error.message 
    });
  }
});

// @desc    Upload multiple images
// @route   POST /api/upload/images
// @access  Private
router.post('/images', protect, upload.array('images', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'No image files provided' 
      });
    }

    const uploadedImages = req.files.map(file => ({
      url: file.path,
      publicId: file.filename
    }));

    res.status(200).json({
      success: true,
      message: `${req.files.length} images uploaded successfully`,
      images: uploadedImages
    });
  } catch (error) {
    console.error('Images upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to upload images',
      error: error.message 
    });
  }
});

// @desc    Delete image from Cloudinary
// @route   DELETE /api/upload/image/:publicId
// @access  Private
router.delete('/image/:publicId', protect, async (req, res) => {
  try {
    const { publicId } = req.params;
    
    // Import cloudinary from config
    const { cloudinary } = await import('../config/cloudinary.js');
    
    const result = await cloudinary.uploader.destroy(publicId);
    
    if (result.result === 'ok') {
      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete image'
      });
    }
  } catch (error) {
    console.error('Image delete error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete image',
      error: error.message 
    });
  }
});

export default router;
