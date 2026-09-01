import Plan from '../models/Plan.js';
import Merchant from '../../merchant/models/Merchant.js';

// @desc    Get all active plans (with city filtering)
// @route   GET /api/plans
// @access  Public (Optional auth for city detection)
export const getPlans = async (req, res) => {
  try {
    let city = typeof req.query.city === 'string' ? req.query.city : '';

    // If logged in as merchant, get their city automatically
    if (!city && req.user) {
      const merchant = await Merchant.findOne({
        $or: [{ _id: req.user._id }, { ownerId: req.user._id }]
      });
      if (merchant) {
        city = merchant.city;
      }
    }

    const query = { status: 'active' };

    if (city) {
      // Show plans specifically for this city OR global plans (empty/null)
      query.$or = [
        { applicableCities: city },
        { applicableCities: { $size: 0 } },
        { applicableCities: { $exists: false } }
      ];
    }

    const plans = await Plan.find(query)
      .select('-__v')
      .sort({ price: 1 });
    
    return res.status(200).json({
      success: true,
      count: plans.length,
      data: plans, // Standardizing to 'data' field
      plans // Keeping for backward compatibility
    });
  } catch (error) {
    console.error('Get plans error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch plans'
    });
  }
};

// @desc    Get plan by ID
// @route   GET /api/plans/:id
// @access  Public
export const getPlanById = async (req, res) => {
  try {
    const plan = await Plan.findById(req.params.id);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Get plan by ID error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch plan'
    });
  }
};
