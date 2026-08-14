import Category from '../models/Category.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';

// @desc    Get all categories (public - active only)
// @route   GET /api/categories
// @access  Public
export const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ status: 'active' })
      .sort({ order: 1, name: 1 })
      .select('-__v');

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

// @desc    Get all categories (admin - including inactive)
// @route   GET /api/admin/categories
// @access  Private/Admin
export const getAllCategories = async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ order: 1, name: 1 })
      .select('-__v');

    // Calculate stats
    const stats = {
      total: categories.length,
      active: categories.filter(c => c.status === 'active').length,
      inactive: categories.filter(c => c.status === 'inactive').length,
      productBased: categories.filter(c => c.type === 'product').length,
      serviceBased: categories.filter(c => c.type === 'service').length,
    };

    return res.status(200).json({
      success: true,
      stats,
      categories,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch categories',
    });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
export const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    return res.status(200).json({
      success: true,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch category',
    });
  }
};

// @desc    Create new category
// @route   POST /api/admin/categories
// @access  Private/Admin
export const createCategory = async (req, res) => {
  try {
    const { name, type, icon, color, description, order } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') } 
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists',
      });
    }

    const category = await Category.create({
      name,
      type,
      icon: icon || 'category',
      color: color || '#3D7A4F',
      description: description || '',
      order: order || 0,
      status: 'active',
    });

    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages[0],
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to create category',
    });
  }
};

// @desc    Update category
// @route   PUT /api/admin/categories/:id
// @access  Private/Admin
export const updateCategory = async (req, res) => {
  try {
    const { name, type, icon, color, description, order, status } = req.body;

    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Check if new name conflicts with existing category
    if (name && name !== category.name) {
      const existingCategory = await Category.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          error: 'Category with this name already exists',
        });
      }
    }

    // Update fields
    if (name) category.name = name;
    if (type) category.type = type;
    if (icon !== undefined) category.icon = icon;
    if (color) category.color = color;
    if (description !== undefined) category.description = description;
    if (order !== undefined) category.order = order;
    if (status) category.status = status;

    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: messages[0],
      });
    }

    return res.status(500).json({
      success: false,
      error: 'Failed to update category',
    });
  }
};

// @desc    Delete category
// @route   DELETE /api/admin/categories/:id
// @access  Private/Admin
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Check if category is being used by merchants
    const merchantCount = await Merchant.countDocuments({ category: category.name });
    
    if (merchantCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${merchantCount} merchant(s) are using this category.`,
      });
    }

    // Check if category is being used by offers
    const offerCount = await Offer.countDocuments({ category: category.name });
    
    if (offerCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete category. ${offerCount} offer(s) are using this category.`,
      });
    }

    await category.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Category deleted successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to delete category',
    });
  }
};

// @desc    Toggle category status
// @route   PATCH /api/admin/categories/:id/toggle
// @access  Private/Admin
export const toggleCategoryStatus = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    category.status = category.status === 'active' ? 'inactive' : 'active';
    await category.save();

    return res.status(200).json({
      success: true,
      message: `Category ${category.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to toggle category status',
    });
  }
};

// @desc    Update category counts (utility function)
// @route   PATCH /api/admin/categories/:id/update-counts
// @access  Private/Admin
export const updateCategoryCounts = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found',
      });
    }

    // Count merchants and offers
    const merchantCount = await Merchant.countDocuments({ 
      category: category.name,
      status: 'approved'
    });
    
    const offerCount = await Offer.countDocuments({ 
      category: category.name,
      status: 'active'
    });

    category.merchantCount = merchantCount;
    category.offerCount = offerCount;
    await category.save();

    return res.status(200).json({
      success: true,
      message: 'Category counts updated successfully',
      category,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to update category counts',
    });
  }
};
