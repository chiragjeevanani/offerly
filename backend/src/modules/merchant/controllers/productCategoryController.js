import ProductCategory from '../models/ProductCategory.js';
import Product from '../models/Product.js';
import ProductVariant from '../models/ProductVariant.js';
import Merchant from '../models/Merchant.js';
import { serializeProductCategory } from '../../../utils/serializers.js';

const UNCATEGORIZED_NAME = 'Uncategorized';

export const getOrCreateUncategorized = async (merchantId) => {
  let category = await ProductCategory.findOne({ merchantId, isDefault: true });
  if (!category) {
    category = await ProductCategory.create({
      merchantId,
      name: UNCATEGORIZED_NAME,
      discountPercent: 0,
      isDefault: true,
    });
  }
  return category;
};

export const recomputeCategoryPricing = async (categoryId, discountPercent) => {
  const pipeline = [
    {
      $set: {
        discount: discountPercent,
        offerPrice: {
          $round: [{ $multiply: ['$price', (100 - discountPercent) / 100] }, 2],
        },
      },
    },
  ];

  await Product.updateMany({ categoryId }, pipeline);

  const productIds = await Product.find({ categoryId }).distinct('_id');
  if (productIds.length) {
    await ProductVariant.updateMany({ productId: { $in: productIds } }, pipeline);
  }
};

// @desc    Get all of the authenticated merchant's product categories (incl. inactive)
// @route   GET /api/product-categories/merchant/me
// @access  Private/Merchant
export const getMyCategories = async (req, res) => {
  try {
    const merchantId = req.user._id;
    const categories = await ProductCategory.find({ merchantId }).sort({ order: 1, name: 1 });

    const counts = await Product.aggregate([
      { $match: { merchantId, isActive: true } },
      { $group: { _id: '$categoryId', count: { $sum: 1 } } },
    ]);
    const countByCategory = new Map(counts.map((c) => [String(c._id), c.count]));

    return res.status(200).json({
      success: true,
      categories: categories.map((c) =>
        serializeProductCategory({ ...c.toObject(), productCount: countByCategory.get(String(c._id)) || 0 })
      ),
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

// @desc    Get a merchant's active product categories (public)
// @route   GET /api/product-categories/merchant/:merchantId
// @access  Public
export const getCategoriesByMerchant = async (req, res) => {
  try {
    const { merchantId } = req.params;

    const merchant = await Merchant.findOne({ _id: merchantId, status: 'approved' }).select('_id');
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const categories = await ProductCategory.find({ merchantId, isActive: true }).sort({ order: 1, name: 1 });

    return res.status(200).json({ success: true, categories: categories.map(serializeProductCategory) });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

// @desc    Create a product category
// @route   POST /api/product-categories
// @access  Private/Merchant
export const createCategory = async (req, res) => {
  try {
    const merchantId = req.user._id;
    const { name, discountPercent, order } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const existing = await ProductCategory.findOne({
      merchantId,
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A category with this name already exists' });
    }

    const category = await ProductCategory.create({
      merchantId,
      name: name.trim(),
      discountPercent: discountPercent || 0,
      order: order || 0,
    });

    return res.status(201).json({ success: true, message: 'Category created', category: serializeProductCategory(category) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0].message });
    }
    return res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
};

// @desc    Update a product category
// @route   PUT /api/product-categories/:id
// @access  Private/Merchant
export const updateCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { name, discountPercent, isActive, order } = req.body;

    if (category.isDefault && ((name && name.trim() !== category.name) || isActive === false)) {
      return res.status(400).json({ success: false, message: 'The Uncategorized category cannot be renamed or deactivated' });
    }

    if (name && name.trim() !== category.name) {
      const existing = await ProductCategory.findOne({
        merchantId: category.merchantId,
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
        _id: { $ne: category._id },
      });
      if (existing) {
        return res.status(400).json({ success: false, message: 'A category with this name already exists' });
      }
      category.name = name.trim();
    }

    const discountChanged = discountPercent !== undefined && discountPercent !== category.discountPercent;
    if (discountPercent !== undefined) category.discountPercent = discountPercent;
    if (isActive !== undefined) category.isActive = isActive;
    if (order !== undefined) category.order = order;

    await category.save();

    if (discountChanged) {
      await recomputeCategoryPricing(category._id, category.discountPercent);
    }

    return res.status(200).json({ success: true, message: 'Category updated', category: serializeProductCategory(category) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, message: Object.values(error.errors)[0].message });
    }
    return res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

// @desc    Delete a product category
// @route   DELETE /api/product-categories/:id
// @access  Private/Merchant
export const deleteCategory = async (req, res) => {
  try {
    const category = await ProductCategory.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    if (category.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (category.isDefault) {
      return res.status(400).json({ success: false, message: 'The Uncategorized category cannot be deleted' });
    }

    const productCount = await Product.countDocuments({ categoryId: category._id });
    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete category. ${productCount} product(s) are using it. Move them to another category first.`,
      });
    }

    await category.deleteOne();

    return res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};
