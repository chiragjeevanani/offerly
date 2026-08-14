import ProductVariant from '../models/ProductVariant.js';
import Product from '../models/Product.js';

// Get all variants for a product
export const getVariantsByProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    const variants = await ProductVariant.find({ 
      productId: req.params.productId,
      isActive: true 
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      variants,
      count: variants.length
    });
  } catch (error) {
    console.error('Get variants error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch variants',
      error: error.message
    });
  }
};

// Create new variant
export const createVariant = async (req, res) => {
  try {
    const product = await Product.findById(req.params.productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    // Check ownership
    if (product.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate discount
    const discount = req.body.price && req.body.offerPrice 
      ? Math.round(((req.body.price - req.body.offerPrice) / req.body.price) * 100)
      : 0;

    const variant = await ProductVariant.create({
      ...req.body,
      productId: req.params.productId,
      discount
    });

    return res.status(201).json({
      success: true,
      message: 'Variant created successfully',
      variant
    });
  } catch (error) {
    console.error('Create variant error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create variant',
      error: error.message
    });
  }
};

// Update variant
export const updateVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findById(req.params.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Check product ownership
    const product = await Product.findById(variant.productId);
    if (product.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Calculate discount if prices are updated
    if (req.body.price || req.body.offerPrice) {
      const price = req.body.price || variant.price;
      const offerPrice = req.body.offerPrice || variant.offerPrice;
      req.body.discount = Math.round(((price - offerPrice) / price) * 100);
    }

    // Update variant
    Object.assign(variant, req.body);
    await variant.save();

    return res.status(200).json({
      success: true,
      message: 'Variant updated successfully',
      variant
    });
  } catch (error) {
    console.error('Update variant error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update variant',
      error: error.message
    });
  }
};

// Delete variant (soft delete)
export const deleteVariant = async (req, res) => {
  try {
    const variant = await ProductVariant.findById(req.params.variantId);

    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'Variant not found'
      });
    }

    // Check product ownership
    const product = await Product.findById(variant.productId);
    if (product.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete
    variant.isActive = false;
    await variant.save();

    return res.status(200).json({
      success: true,
      message: 'Variant deleted successfully'
    });
  } catch (error) {
    console.error('Delete variant error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete variant',
      error: error.message
    });
  }
};
