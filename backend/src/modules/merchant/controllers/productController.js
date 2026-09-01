import Product from '../models/Product.js';
import Merchant from '../models/Merchant.js';
import ProductCategory from '../models/ProductCategory.js';
import Plan from '../../admin/models/Plan.js';
import MerchantSubscription from '../../payment/models/MerchantSubscription.js';
import mongoose from 'mongoose';
import { serializeProduct } from '../../../utils/serializers.js';
import { getOrCreateUncategorized } from './productCategoryController.js';

// Get all products for a merchant
export const getProductsByMerchant = async (req, res) => {
  try {
    let merchantId;
    const isSelfRequest = req.params.merchantId === 'me' || !req.params.merchantId;

    // Handle 'me' route (authenticated merchant)
    if (isSelfRequest) {
      if (!req.user || !req.user._id) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }
      merchantId = req.user._id;
    } else {
      // Handle specific merchant ID (public access)
      merchantId = req.params.merchantId;
    }

    if (!isSelfRequest) {
      const publicMerchant = await Merchant.findOne({
        _id: merchantId,
        status: 'approved'
      }).select('_id');

      if (!publicMerchant) {
        return res.status(404).json({
          success: false,
          message: 'Merchant not found'
        });
      }
    }

    const products = await Product.find({
      merchantId,
      isActive: true
    })
      .populate('categoryId', 'name discountPercent isActive order')
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      products: products.map(p => serializeProduct(p)),
      count: products.length
    });
  } catch (error) {
    console.error('❌ Get products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch products',
      error: error.message
    });
  }
};

// Get single product by ID
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id).populate('categoryId', 'name discountPercent isActive order');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (!req.user) {
      const publicMerchant = await Merchant.findOne({
        _id: product.merchantId,
        status: 'approved'
      }).select('_id');

      if (!publicMerchant || !product.isActive) {
        return res.status(404).json({
          success: false,
          message: 'Product not found'
        });
      }
    }

    // Check if user has access to this product (only if authenticated)
    if (req.user && req.user.role !== 'admin' && product.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      success: true,
      product
    });
  } catch (error) {
    console.error('Get product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch product',
      error: error.message
    });
  }
};

const getEffectivePlan = async (merchant) => {
  const now = new Date();
  const activeSubscription = await MerchantSubscription.findOne({
    merchantId: merchant._id,
    status: 'active',
    endDate: { $gte: now },
  })
    .populate('planId')
    .sort({ createdAt: -1 });

  if (activeSubscription?.planId) {
    return activeSubscription.planId;
  }

  if (!merchant.subscriptionPlanId) {
    return null;
  }

  const plan = await Plan.findById(merchant.subscriptionPlanId);
  return plan;
};

// Create new product
export const createProduct = async (req, res) => {
  try {
    const merchantId = req.user._id;

    // Check if merchant exists
    const merchant = await Merchant.findById(merchantId);
    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant not found'
      });
    }

    // Check product limit based on subscription
    const plan = await getEffectivePlan(merchant);
    const productCount = await Product.countDocuments({ merchantId, isActive: true });
    const maxProducts = plan ? plan.maxProducts : 5; // Default 5 if no plan
    
    if (maxProducts !== 999 && productCount >= maxProducts) {
      return res.status(400).json({
        success: false,
        message: `Product limit reached. Your ${plan ? plan.name : 'current'} plan allows maximum ${maxProducts} products. Upgrade your plan for more.`
      });
    }

    // Resolve category (falls back to the merchant's default "Uncategorized" bucket)
    let category;
    if (req.body.categoryId) {
      category = await ProductCategory.findOne({ _id: req.body.categoryId, merchantId });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found or does not belong to this store'
        });
      }
    } else {
      category = await getOrCreateUncategorized(merchantId);
    }

    // Discount is always derived from the category, never merchant-entered
    const price = Number(req.body.price);
    const discount = category.discountPercent;
    const offerPrice = Math.round((price * (100 - discount)) / 100 * 100) / 100;

    // Create product
    const product = await Product.create({
      ...req.body,
      merchantId,
      categoryId: category._id,
      price,
      discount,
      offerPrice,
    });

    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });
  } catch (error) {
    console.error('Create product error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create product',
      error: error.message
    });
  }
};

// Update product
export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

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

    // Resolve category if it's being changed, and validate ownership
    let category = null;
    if (req.body.categoryId && req.body.categoryId !== product.categoryId.toString()) {
      category = await ProductCategory.findOne({ _id: req.body.categoryId, merchantId: product.merchantId });
      if (!category) {
        return res.status(400).json({
          success: false,
          message: 'Category not found or does not belong to this store'
        });
      }
    }

    // Discount is always derived from the (possibly new) category, never merchant-entered
    delete req.body.discount;
    delete req.body.offerPrice;
    if (req.body.price || category) {
      const price = req.body.price ? Number(req.body.price) : product.price;
      if (!category) {
        category = await ProductCategory.findById(product.categoryId);
      }
      req.body.price = price;
      req.body.discount = category.discountPercent;
      req.body.offerPrice = Math.round((price * (100 - category.discountPercent)) / 100 * 100) / 100;
    }

    // Update product
    Object.assign(product, req.body);
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      product
    });
  } catch (error) {
    console.error('Update product error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update product',
      error: error.message
    });
  }
};

// Delete product (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

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

    // Soft delete
    product.isActive = false;
    await product.save();

    return res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete product',
      error: error.message
    });
  }
};

// Get product statistics for merchant
export const getProductStats = async (req, res) => {
  try {
    const merchantId = req.user._id;

    const stats = await Product.aggregate([
      { $match: { merchantId: mongoose.Types.ObjectId(merchantId), isActive: true } },
      {
        $group: {
          _id: null,
          totalProducts: { $sum: 1 },
          avgDiscount: { $avg: '$discount' },
          totalValue: { $sum: '$price' },
          totalOfferValue: { $sum: '$offerPrice' }
        }
      }
    ]);

    return res.status(200).json({
      success: true,
      stats: stats[0] || {
        totalProducts: 0,
        avgDiscount: 0,
        totalValue: 0,
        totalOfferValue: 0
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Debug endpoint to check authentication
export const debugAuth = async (req, res) => {
  try {
    const merchantId = req.user._id;
    
    console.log('🔍 DEBUG AUTH INFO:');
    console.log('User ID:', merchantId);
    console.log('User ID String:', merchantId.toString());
    console.log('User Role:', req.user.role);
    console.log('User Email:', req.user.email);
    console.log('User Name:', req.user.ownerName || req.user.name);
    
    // Get all products for this merchant
    const products = await Product.find({ merchantId });
    console.log(`Found ${products.length} products for merchant ${merchantId}`);
    
    // Get all products in database
    const allProducts = await Product.find({}).limit(10);
    console.log(`Total products in DB: ${allProducts.length}`);
    console.log('Sample products:', allProducts.map(p => ({
      name: p.name,
      merchantId: p.merchantId.toString(),
      categoryType: p.categoryType
    })));
    
    return res.status(200).json({
      success: true,
      debug: {
        authenticatedMerchantId: merchantId.toString(),
        role: req.user.role,
        email: req.user.email,
        name: req.user.ownerName || req.user.name,
        productsForThisMerchant: products.length,
        products: products.map(p => ({
          id: p._id,
          name: p.name,
          categoryType: p.categoryType,
          merchantId: p.merchantId.toString()
        })),
        sampleProductsInDB: allProducts.map(p => ({
          name: p.name,
          merchantId: p.merchantId.toString(),
          categoryType: p.categoryType
        }))
      }
    });
  } catch (error) {
    console.error('Debug error:', error);
    return res.status(500).json({
      success: false,
      message: 'Debug failed',
      error: error.message
    });
  }
};

// Search products for offer creation
export const searchProducts = async (req, res) => {
  try {
    const merchantId = req.user._id;
    const searchQuery = (req.query.q || '').trim();

    const products = await Product.find({
      merchantId,
      isActive: true,
      name: { $regex: searchQuery, $options: 'i' }
    })
    .select('name price offerPrice images discount categoryId')
    .populate('categoryId', 'name discountPercent')
    .limit(10)
    .sort({ name: 1 });

    // Fetch variants in one query to avoid N+1 DB calls.
    const ProductVariant = (await import('../models/ProductVariant.js')).default;
    const productIds = products.map((product) => product._id);
    const allVariants = productIds.length
      ? await ProductVariant.find({
          productId: { $in: productIds },
          isActive: true,
        }).select('productId name price offerPrice discount')
      : [];

    const variantsByProductId = new Map();
    allVariants.forEach((variant) => {
      const key = variant.productId.toString();
      if (!variantsByProductId.has(key)) {
        variantsByProductId.set(key, []);
      }
      variantsByProductId.get(key).push(variant);
    });

    const productsWithVariants = products.map((product) => ({
      ...product.toObject(),
      variants: variantsByProductId.get(product._id.toString()) || [],
    }));

    return res.status(200).json({
      success: true,
      products: productsWithVariants
    });
  } catch (error) {
    console.error('Search products error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to search products',
      error: error.message
    });
  }
};
