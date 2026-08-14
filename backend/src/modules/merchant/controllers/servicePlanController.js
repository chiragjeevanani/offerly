import ServicePlan from '../models/ServicePlan.js';
import Merchant from '../models/Merchant.js';

const getOwnedMerchant = async (userId) => {
  return Merchant.findById(userId);
};

// Get all service plans for a merchant
export const getServicePlans = async (req, res) => {
  try {
    const merchant = await getOwnedMerchant(req.user._id);
    
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant profile not found' });
    }

    const plans = await ServicePlan.find({ 
      merchantId: merchant._id,
      isActive: true 
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      plans,
      count: plans.length
    });
  } catch (error) {
    console.error('Get service plans error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service plans',
      error: error.message
    });
  }
};

// Get single service plan by ID
export const getServicePlanById = async (req, res) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    // Check ownership
    if (plan.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    return res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Get service plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch service plan',
      error: error.message
    });
  }
};

// Create new service plan
export const createServicePlan = async (req, res) => {
  try {
    const merchant = await getOwnedMerchant(req.user._id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const plan = await ServicePlan.create({
      ...req.body,
      merchantId: merchant._id
    });

    return res.status(201).json({
      success: true,
      message: 'Service plan created successfully',
      plan
    });
  } catch (error) {
    console.error('Create service plan error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to create service plan',
      error: error.message
    });
  }
};

// Update service plan
export const updateServicePlan = async (req, res) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    // Check ownership
    if (plan.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update plan
    Object.assign(plan, req.body);
    await plan.save();

    return res.status(200).json({
      success: true,
      message: 'Service plan updated successfully',
      plan
    });
  } catch (error) {
    console.error('Update service plan error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update service plan',
      error: error.message
    });
  }
};

// Delete service plan (soft delete)
export const deleteServicePlan = async (req, res) => {
  try {
    const plan = await ServicePlan.findById(req.params.id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: 'Service plan not found'
      });
    }

    // Check ownership
    if (plan.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Soft delete
    plan.isActive = false;
    await plan.save();

    return res.status(200).json({
      success: true,
      message: 'Service plan deleted successfully'
    });
  } catch (error) {
    console.error('Delete service plan error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete service plan',
      error: error.message
    });
  }
};
