import Joi from 'joi';
import mongoose from 'mongoose';
import User from '../../user/models/User.js';
import Merchant from '../../merchant/models/Merchant.js';
import Offer from '../../merchant/models/Offer.js';
import Product from '../../merchant/models/Product.js';
import Redemption from '../../booking/models/Redemption.js';
import MerchantSubscription from '../../payment/models/MerchantSubscription.js';
import City from '../models/City.js';
import Plan from '../models/Plan.js';
import Category from '../models/Category.js';
import AdminNotification from '../models/AdminNotification.js';
import Notification from '../../user/models/Notification.js';
import MerchantNotification from '../../merchant/models/MerchantNotification.js';
import AdRequest from '../models/AdRequest.js';
import { emitMerchantNotification } from '../../../config/socket.js';
import { computeSubscriptionCharge, getWalletSettings } from '../../../utils/subscriptionWallet.js';

// ───────────────────────── DASHBOARD STATS ─────────────────────────

export const getDashboardStats = async (req, res) => {
  try {
    const [
      totalCustomers,
      totalMerchants,
      pendingMerchants,
      approvedMerchants,
      rejectedMerchants,
      totalOffers,
      activeOffers,
      totalRedemptions,
      recentMerchants,
      recentRedemptions,
    ] = await Promise.all([
      User.countDocuments({ role: 'customer' }),
      Merchant.countDocuments(),
      Merchant.countDocuments({ status: 'pending' }),
      Merchant.countDocuments({ status: 'approved' }),
      Merchant.countDocuments({ status: 'rejected' }),
      Offer.countDocuments(),
      Offer.countDocuments({ status: 'active' }),
      Redemption.countDocuments(),
      Merchant.find().sort({ createdAt: -1 }).limit(8).lean(),
      Redemption.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('customerId', 'name phone')
        .lean(),
    ]);

    // Calculate total revenue from completed redemptions
    const revenueResult = await Redemption.aggregate([
      { $match: { status: { $in: ['completed'] } } },
      { $group: { _id: null, total: { $sum: '$totals.final' } } },
    ]);
    const totalRevenue = revenueResult[0]?.total || 0;

    // Active subscriptions count
    const activeSubscriptions = await MerchantSubscription.countDocuments({ status: 'active' });

    // Revenue by category
    const revenueByCategory = await Redemption.aggregate([
      { $match: { status: { $in: ['completed'] } } },
      {
        $lookup: {
          from: 'merchants',
          localField: 'merchantId',
          foreignField: '_id',
          as: 'merchant',
        },
      },
      { $unwind: '$merchant' },
      {
        $group: {
          _id: '$merchant.category',
          revenue: { $sum: '$totals.final' },
          count: { $sum: 1 },
        },
      },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
    ]);

    // Daily signups (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailySignups = await User.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Daily redemptions (last 7 days)
    const dailyRedemptions = await Redemption.aggregate([
      { $match: { createdAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
          revenue: { $sum: '$totals.final' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.status(200).json({
      success: true,
      data: {
        stats: {
          totalCustomers,
          totalMerchants,
          pendingMerchants,
          approvedMerchants,
          rejectedMerchants,
          totalOffers,
          activeOffers,
          totalRedemptions,
          totalRevenue,
          activeSubscriptions,
        },
        charts: {
          revenueByCategory: revenueByCategory.map((item) => ({
            category: item._id || 'Other',
            revenue: item.revenue,
            count: item.count,
          })),
          dailySignups: dailySignups.map((item) => ({
            date: item._id,
            count: item.count,
          })),
          dailyRedemptions: dailyRedemptions.map((item) => ({
            date: item._id,
            count: item.count,
            revenue: item.revenue,
          })),
        },
        recentMerchants,
        recentRedemptions,
      },
    });
  } catch (err) {
    console.error('Dashboard stats error:', err);
    res.status(500).json({ success: false, error: 'Failed to load dashboard stats' });
  }
};

// ───────────────────────── USERS ─────────────────────────

export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort('-createdAt');
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

export const updateUserStatus = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid('active', 'blocked').required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

// @desc    Get all redemptions/bookings
// @route   GET /api/admin/redemptions
// @access  Private/Admin
export const getAllRedemptions = async (req, res) => {
  try {
    const redemptions = await Redemption.find()
      .populate('customerId', 'name phone email role')
      .populate('merchantId', 'storeName category city')
      .sort({ createdAt: -1 });

    // Map to a friendlier format for the frontend
    const formatted = redemptions.map(r => ({
      _id: r._id,
      id: r._id.toString().substring(0, 8), // Short ID
      customerName: r.customerId ? r.customerId.name : 'Unknown User',
      merchant: r.merchantId ? {
        storeName: r.merchantId.storeName,
        category: r.merchantId.category
      } : { storeName: 'Unknown Store' },
      totals: r.totals,
      status: r.status,
      createdAt: r.createdAt
    }));

    res.status(200).json({ success: true, count: redemptions.length, redemptions: formatted });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch redemptions' });
  }
};

// ───────────────────────── MERCHANT STATUS ─────────────────────────

export const updateMerchantStatus = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'pending').required(),
    rejectionReason: Joi.string().allow(null, '').optional(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid merchant ID format' });
  }

  try {
    const updateData = { status: req.body.status };

    if (req.body.status === 'approved') {
      updateData.approvedAt = new Date();
      updateData.approvedBy = req.user._id;
      updateData.joinedAt = new Date();
      updateData.rejectionReason = null;
      updateData.rejectedAt = null;
      updateData.rejectedBy = null;
    } else if (req.body.status === 'rejected') {
      updateData.rejectionReason = req.body.rejectionReason || 'Application did not meet requirements';
      updateData.rejectedAt = new Date();
      updateData.rejectedBy = req.user._id;
    }

    const merchant = await Merchant.findByIdAndUpdate(req.params.id, updateData, { new: true });

    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }

    // CREATE NOTIFICATION FOR MERCHANT
    let title = '';
    let body = '';
    
    if (req.body.status === 'approved') {
      title = 'Store Approved! 🎉';
      body = `Congratulations! Your store "${merchant.storeName}" has been approved. You can now access your full dashboard and start adding offers.`;
    } else if (req.body.status === 'rejected') {
      title = 'Application Status Update';
      body = `Your store application was not approved. Reason: ${updateData.rejectionReason}. Please update your details and resubmit.`;
    }

    if (title) {
       const merchantNotification = await MerchantNotification.create({
         merchantId: merchant._id,
         title,
         body,
         type: 'store_status',
         data: { status: req.body.status }
       });
       
       emitMerchantNotification(merchant._id, merchantNotification);
    }

    // If approved, check if they are starting a trial
    if (req.body.status === 'approved' && merchant.subscriptionPlanId) {
      const plan = await Plan.findById(merchant.subscriptionPlanId);
      if (plan && (plan.trialDays > 0 || plan.name.toLowerCase().includes('trial'))) {
        await Merchant.findByIdAndUpdate(merchant._id, { hasUsedFreeTrial: true });
      }
    }

    res.status(200).json({ success: true, data: merchant });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

export const deleteMerchant = async (req, res) => {
  try {
    const merchant = await Merchant.findByIdAndDelete(req.params.id);
    if (!merchant) {
      return res.status(404).json({ success: false, error: 'Merchant not found' });
    }
    
    // Also cleanup associated data
    await Promise.all([
      Offer.deleteMany({ merchantId: req.params.id }),
      Product.deleteMany({ merchantId: req.params.id }),
      MerchantSubscription.deleteMany({ merchantId: req.params.id }),
      Redemption.deleteMany({ merchantId: req.params.id })
    ]);

    res.status(200).json({ success: true, message: 'Merchant and all associated data deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

// ───────────────────────── CITIES ─────────────────────────

export const saveCity = async (req, res) => {
  try {
    const existing = await City.findOne({ name: req.body.name });

    if (existing && Array.isArray(req.body.zones)) {
      const incomingZoneIds = new Set(
        req.body.zones
          .map((zone) => zone._id || zone.id)
          .filter(Boolean)
          .map(String)
      );
      const removedZoneIds = existing.zones
        .map((zone) => String(zone._id))
        .filter((id) => !incomingZoneIds.has(id));

      if (removedZoneIds.length) {
        const merchantsInRemovedZones = await Merchant.countDocuments({
          zone: { $in: removedZoneIds },
        });
        if (merchantsInRemovedZones > 0) {
          return res.status(400).json({
            success: false,
            error: `Cannot remove zone(s) still assigned to ${merchantsInRemovedZones} merchant(s). Deactivate the zone instead.`,
          });
        }
      }
    }

    const city = await City.findOneAndUpdate(
      { name: req.body.name },
      req.body,
      { upsert: true, new: true }
    );

    if (city.zones?.length) {
      const counts = await Merchant.aggregate([
        { $match: { zone: { $in: city.zones.map((zone) => String(zone._id)) } } },
        { $group: { _id: '$zone', count: { $sum: 1 } } },
      ]);
      const countByZoneId = new Map(counts.map((entry) => [String(entry._id), entry.count]));
      city.zones.forEach((zone) => {
        zone.merchantCount = countByZoneId.get(String(zone._id)) || 0;
      });
      await city.save();
    }

    res.status(200).json({ success: true, data: city });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

export const deleteCity = async (req, res) => {
  try {
    const city = await City.findById(req.params.id);
    if (!city) {
      return res.status(404).json({ success: false, error: 'City not found' });
    }

    const zoneIds = city.zones.map((zone) => String(zone._id));
    const merchantsInCity = await Merchant.countDocuments(
      zoneIds.length
        ? { $or: [{ city: city.name }, { zone: { $in: zoneIds } }] }
        : { city: city.name }
    );
    if (merchantsInCity > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete city. ${merchantsInCity} merchant(s) are using this city or its zones.`,
      });
    }

    await city.deleteOne();
    res.status(200).json({ success: true, message: 'City deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

export const getCities = async (req, res) => {
  try {
    const cities = await City.find().sort({ name: 1 });
    res.status(200).json({ success: true, cities: cities });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ───────────────────────── PLANS ─────────────────────────

export const savePlan = async (req, res) => {
  try {
    if (req.body._id || req.body.id) {
      const plan = await Plan.findByIdAndUpdate(
        req.body._id || req.body.id,
        req.body,
        { new: true }
      );
      return res.status(200).json({ success: true, data: plan });
    }
    const plan = await Plan.create(req.body);
    res.status(201).json({ success: true, data: plan });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Operation failed' });
  }
};

export const getPlans = async (req, res) => {
  try {
    let query = { status: 'active' };
    let requestingMerchant = null;

    // If merchant is requesting, filter out Free Trial if already used and handle City-specific pricing
    if (req.user && req.user.role === 'merchant') {
      const merchant = await Merchant.findOne({
        $or: [{ _id: req.user._id }, { ownerId: req.user._id }]
      });
      if (merchant) {
        requestingMerchant = merchant;
        let filters = [{ status: 'active' }];

        // 1. Filter out Free Trial if used
        if (merchant.hasUsedFreeTrial) {
          filters.push({
            $and: [
              { name: { $not: /trial/i } },
              { trialDays: { $lte: 0 } }
            ]
          });
        }

        // 2. Filter by City (Permissive)
        const cityFilter = {
          $or: [
            { applicableCities: { $size: 0 } },
            { applicableCities: { $exists: false } },
            { applicableCities: null }
          ]
        };

        if (merchant.city) {
          cityFilter.$or.push({ applicableCities: { $in: [merchant.city] } });
        }

        filters.push(cityFilter);
        query = { $and: filters };
      }
    }

    const plans = await Plan.find(query).sort({ price: 1 });

    // Decorate each plan with the requesting merchant's effective (zone-priced)
    // charge, so the renewal UI can show what they'll actually pay.
    if (requestingMerchant) {
      const walletBalance = requestingMerchant.discountWallet?.balance || 0;
      const decorated = plans.map((plan) => {
        const charge = plan.planType === 'advertisement'
          ? { listPrice: Number(plan.price || 0), walletDiscount: 0, payable: Number(plan.price || 0) }
          : computeSubscriptionCharge(plan, requestingMerchant);
        const planObj = plan.toObject();
        return { ...planObj, ...charge };
      });
      return res.status(200).json({ success: true, data: decorated, walletBalance });
    }

    res.status(200).json({ success: true, data: plans });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// ───────────────────────── WALLET SETTINGS ─────────────────────────

export const getWalletSettingsConfig = async (req, res) => {
  try {
    const settings = await getWalletSettings();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch wallet settings' });
  }
};

export const updateWalletSettingsConfig = async (req, res) => {
  try {
    const { newUserDiscountAmount } = req.body;
    const settings = await getWalletSettings();
    settings.newUserDiscountAmount = Math.max(0, Number(newUserDiscountAmount || 0));
    await settings.save();
    res.status(200).json({ success: true, data: settings });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update wallet settings' });
  }
};

export const deletePlan = async (req, res) => {
  try {
    await Plan.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: 'Plan deleted successfully' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete plan' });
  }
};

// ───────────────────────── NOTIFICATIONS ─────────────────────────

export const getAdminNotifications = async (req, res) => {
  try {
    const notifications = await AdminNotification.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, data: notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' });
  }
};

export const markAdminNotificationRead = async (req, res) => {
  try {
    const notification = await AdminNotification.findByIdAndUpdate(
      req.params.id,
      { isRead: true },
      { new: true }
    );
    res.status(200).json({ success: true, data: notification });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update notification' });
  }
};

// ───────────────────────── SEARCH ─────────────────────────

export const globalSearch = async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ success: false, error: 'Search query required' });

  try {
    const regex = new RegExp(q, 'i');
    const [merchants, users, cities] = await Promise.all([
      Merchant.find({ $or: [{ storeName: regex }, { ownerName: regex }] }).limit(10).lean(),
      User.find({ name: regex, role: 'customer' }).limit(10).lean(),
      City.find({ name: regex }).limit(10).lean(),
    ]);

    res.status(200).json({
      success: true,
      data: {
        merchants,
        users,
        cities,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Search failed' });
  }
};

// ───────────────────────── AD REQUESTS ─────────────────────────

export const getAllAdRequests = async (req, res) => {
  try {
    const ads = await AdRequest.find()
      .populate('merchantId', 'storeName')
      .sort({ createdAt: -1 });

    const formatted = ads.map(ad => ({
      _id: ad._id,
      id: ad._id.toString(),
      merchantId: ad.merchantId?._id,
      storeName: ad.storeName || ad.merchantId?.storeName || 'Unknown Store',
      type: ad.type,
      status: ad.status,
      image: ad.image,
      expiryAt: ad.expiryAt,
      createdAt: ad.createdAt,
      updatedAt: ad.updatedAt
    }));

    res.status(200).json({ success: true, ads: formatted });
  } catch (err) {
    console.error('Get ad requests error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch ad requests' });
  }
};

export const updateAdRequestStatus = async (req, res) => {
  const schema = Joi.object({
    status: Joi.string().valid('approved', 'rejected', 'pending').required(),
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ success: false, error: error.details[0].message });
  }

  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid ad request ID format' });
  }

  try {
    const ad = await AdRequest.findById(req.params.id).populate('planId');
    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad request not found' });
    }

    const updates = { status: req.body.status };

    // If approving, calculate expiry date based on plan
    if (req.body.status === 'approved' && ad.planId) {
      const expiry = new Date();
      const plan = ad.planId;

      if (plan.duration === 'Monthly') {
        expiry.setMonth(expiry.getMonth() + 1);
      } else if (plan.duration === 'Yearly') {
        expiry.setFullYear(expiry.getFullYear() + 1);
      } else if (plan.duration === 'Lifetime') {
        expiry.setFullYear(expiry.getFullYear() + 100);
      }
      
      updates.expiryAt = expiry;
    }

    const updatedAd = await AdRequest.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    res.status(200).json({ success: true, data: updatedAd });
  } catch (err) {
    console.error('Update ad status error:', err);
    res.status(500).json({ success: false, error: 'Failed to update ad status' });
  }
};

export const deleteAdRequest = async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid ad request ID format' });
  }

  try {
    const ad = await AdRequest.findByIdAndDelete(req.params.id);

    if (!ad) {
      return res.status(404).json({ success: false, error: 'Ad request not found' });
    }

    res.status(200).json({ success: true, message: 'Ad request deleted successfully' });
  } catch (err) {
    console.error('Delete ad request error:', err);
    res.status(500).json({ success: false, error: 'Failed to delete ad request' });
  }
};

// ───────────────────────── PUBLIC AD REQUESTS ─────────────────────────

export const getApprovedAds = async (req, res) => {
  try {
    const { city } = req.query;
    const now = new Date();

    const query = {
      status: 'approved',
      $or: [{ expiryAt: null }, { expiryAt: { $gt: now } }],
    };

    // Filter by city if provided
    if (city) {
      const cityMerchants = await Merchant.find({ city, status: 'approved' }).select('_id');
      const merchantIds = cityMerchants.map(m => m._id);
      query.merchantId = { $in: merchantIds };
    }

    const ads = await AdRequest.find(query)
      .populate('merchantId', 'storeName verified logo')
      .sort({ createdAt: -1 })
      .limit(10);

    const adsData = ads.map((ad) => ({
      _id: ad._id,
      merchantId: ad.merchantId?._id,
      storeName: ad.storeName || ad.merchantId?.storeName,
      type: ad.type,
      image: ad.image,
      expiryAt: ad.expiryAt,
      merchant: ad.merchantId
        ? {
            verified: ad.merchantId.verified,
            logo: ad.merchantId.logo,
          }
        : null,
    }));

    return res.status(200).json({
      success: true,
      count: adsData.length,
      ads: adsData,
    });
  } catch (error) {
    console.error('Get approved ads error:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch approved ads',
    });
  }
};
