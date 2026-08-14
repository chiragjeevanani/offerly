import Plan from "../../admin/models/Plan.js";
import Redemption from "../../booking/models/Redemption.js";
import MerchantSubscription from "../../payment/models/MerchantSubscription.js";
import Notification from "../../user/models/Notification.js";
import MerchantNotification from "../models/MerchantNotification.js";
import { serializeMerchant, serializeRedemption } from "../../../utils/serializers.js";
import Merchant from "../models/Merchant.js";
import Offer from "../models/Offer.js";
import Product from "../models/Product.js";
import AdRequest from "../../admin/models/AdRequest.js";
import { calculateDistance, formatDistance } from "../../../utils/distance.js";

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const registrationFields = [
  "storeName",
  "category",
  "city",
  "locality",
  "address",
  "phone",
  "email",
  "description",
  "coordinates",
  "coverImage",
  "logo",
  "photos",
  "documents",
  "subscriptionPlanId",
];

const buildMerchantPayload = (body) => {
  const payload = {};

  for (const field of registrationFields) {
    if (field in body) {
      payload[field] = body[field];
    }
  }

  if (!payload.phone && body.contactNumber) {
    payload.phone = body.contactNumber;
  }

  // Require admin approval for all new merchants
  payload.status = "pending";
  payload.hasRequestedStore = true;
  payload.verified = false;
  payload.approvedAt = null;
  payload.joinedAt = null;
  payload.rejectionReason = "";
  payload.rejectedAt = null;
  payload.rejectedBy = null;

  return payload;
};

const getMerchantForOwner = async (userId) => {
  return Merchant.findById(userId);
};

const getLatestSubscription = async (userId, merchantId = null) => {
  const query = merchantId ? { merchantId } : { userId };
  // Only look for core memberships, not ad packages
  query.planType = { $ne: 'advertisement' };
  
  return MerchantSubscription.findOne(query)
    .populate("planId")
    .sort({ createdAt: -1 });
};

export const getMerchants = async (req, res) => {
  const query = {};

  // Existing: Filter by city
  if (req.query.city) {
    query.city = new RegExp(`^${escapeRegex(req.query.city.trim())}$`, "i");
  }

  // Existing: Filter by category
  if (req.query.category) {
    query.category = req.query.category;
  }

  // Existing: Filter by status (only approved for non-admin)
  // Fix: Admins should see the filtered status even if it's not "approved"
  if (req.user && req.user.role === "admin") {
    if (req.query.status && req.query.status !== 'all') {
      query.status = req.query.status;
    }
  } else {
    query.status = "approved";
  }

  // Handle search query (q)
  if (req.query.q) {
    const searchRegex = new RegExp(escapeRegex(req.query.q.trim()), "i");
    query.$or = [
      { storeName: searchRegex },
      { ownerName: searchRegex },
      { phone: searchRegex },
      { email: searchRegex },
    ];
  }

  // Pagination & Sorting
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const sortBy = req.query.sortBy || 'createdAt';
  const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
  const sortObj = { [sortBy]: sortOrder };

  // Fetch count and data in parallel
  const [initialTotal, initialMerchants] = await Promise.all([
    Merchant.countDocuments(query),
    Merchant.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(limit)
  ]);
  let total = initialTotal;
  let merchants = initialMerchants;

  // Fallback city matching for stored city format differences.
  if (!merchants.length && req.query.city) {
    query.city = new RegExp(escapeRegex(req.query.city.trim()), "i");
    const [fallbackTotal, fallbackMerchants] = await Promise.all([
      Merchant.countDocuments(query),
      Merchant.find(query)
        .sort(sortObj)
        .skip(skip)
        .limit(limit),
    ]);
    merchants = fallbackMerchants;
    total = fallbackTotal;
  }

  // Parse user coordinates for distance calculation
  const userLat = req.query.userLat ? parseFloat(req.query.userLat) : null;
  const userLng = req.query.userLng ? parseFloat(req.query.userLng) : null;

  const merchantIds = merchants.map((merchant) => merchant._id);
  const offerCountsRaw = merchantIds.length
    ? await Offer.aggregate([
        {
          $match: {
            merchantId: { $in: merchantIds },
            status: "active",
          },
        },
        { $group: { _id: "$merchantId", count: { $sum: 1 } } },
      ])
    : [];
  const offerCountByMerchantId = new Map(
    offerCountsRaw.map((item) => [item._id.toString(), item.count]),
  );

  // NEW: Calculate offer count for each merchant and add distance
  const merchantsWithEnhancements = merchants.map((merchant) => {
      const merchantObj = merchant.toObject();

      merchantObj.offerCount = offerCountByMerchantId.get(merchant._id.toString()) || 0;

      // Calculate distance if user coordinates provided
      if (userLat && userLng && merchant.coordinates) {
        const distance = calculateDistance(
          userLat,
          userLng,
          merchant.coordinates.lat,
          merchant.coordinates.lng
        );
        merchantObj.distance = formatDistance(distance);
      }

      return merchantObj;
    });

  return res.status(200).json({
    success: true,
    merchants: merchantsWithEnhancements.map(serializeMerchant),
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      hasMore: page * limit < total
    }
  });
};

export const getMerchantById = async (req, res) => {
  const merchant = await Merchant.findById(req.params.id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  const canSeeMerchant =
    merchant.status === "approved" ||
    (req.user &&
      (req.user.role === "admin" || merchant._id.toString() === req.user._id.toString()));

  if (!canSeeMerchant) {
    return res.status(404).json({ message: "Merchant not found" });
  }

  return res.status(200).json({ merchant: serializeMerchant(merchant) });
};

export const registerStore = async (req, res) => {
  // Find the "Free Trial" plan or use the provided one
  let plan = null;
  if (req.body.subscriptionPlanId) {
    plan = await Plan.findById(req.body.subscriptionPlanId);
  }

  // If no plan provided or found, default to "Free Trial"
  if (!plan) {
    plan = await Plan.findOne({ name: { $regex: /Trial/i }, status: "active" });
  }

  if (!plan) {
    return res.status(400).json({ message: "Subscription plan not found" });
  }

  // If selecting a paid plan, require payment reference
  if (Number(plan.price || 0) > 0 && !req.body.paymentReference) {
    return res.status(400).json({ message: "Payment required for the selected subscription plan" });
  }

  const payload = buildMerchantPayload(req.body);

  const merchant = await Merchant.findByIdAndUpdate(req.user._id, payload, { new: true });

  // Set subscription end date based on plan trialDays or duration
  const startDate = new Date();
  const endDate = new Date();
  
  const trialDays = Number(plan.trialDays || 0);
  if (trialDays > 0) {
    endDate.setDate(startDate.getDate() + trialDays);
  } else if (plan.duration === 'Monthly') {
    endDate.setMonth(startDate.getMonth() + 1);
  } else if (plan.duration === 'Yearly') {
    endDate.setFullYear(startDate.getFullYear() + 1);
  } else {
    endDate.setDate(startDate.getDate() + 30); // Global fallback
  }

  await MerchantSubscription.findOneAndUpdate(
    {
      userId: req.user._id,
    },
    {
      userId: req.user._id,
      merchantId: merchant._id,
      planId: plan._id,
      amount: Number(plan.price || 0),
      status: "active",
      startDate,
      endDate,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  await MerchantNotification.create({
    merchantId: req.user._id,
    title: "Store application submitted",
    body: "Your merchant profile has been submitted and is waiting for admin approval. Your 1-month free trial will begin once approved.",
    type: "merchant_application",
    data: { merchantId: merchant._id.toString() },
  });

  return res.status(201).json({
    merchant: serializeMerchant(merchant),
    message: "Merchant application submitted successfully",
  });
};

export const getMyStore = async (req, res) => {
  let merchant = await getMerchantForOwner(req.user._id);

  // Fallback: try to find by phone if not found by ID
  if (!merchant && req.user.phone) {
    merchant = await Merchant.findOne({ phone: req.user.phone });
  }

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  return res.status(200).json({ merchant: serializeMerchant(merchant) });
};

export const updateOnboarding = async (req, res) => {
  try {
    let merchant = await Merchant.findById(req.user._id);
    let isNewMerchant = false;

    // If merchant doesn't exist, create a new one
    if (!merchant) {
      console.log('Creating new merchant for user:', req.user._id);
      isNewMerchant = true;
      merchant = new Merchant({
        _id: req.user._id,
        ownerName: req.user.name || 'Merchant',
        phone: req.user.phone,
        email: req.user.email,
        status: 'pending',
        hasRequestedStore: false,
        onboardingStep: 0,
      });
    }

    const { step, data } = req.body;

    if (step === 'kyb') {
      // Expected data.documents as an array of structured objects
      if (data && data.documents && Array.isArray(data.documents)) {
        // Transform and validate documents
        merchant.documents = data.documents.map(doc => ({
          name: doc.name || '',
          type: doc.type || '',
          url: doc.url || '',
          data: doc.data || '',
          label: doc.label || ''
        }));
      }
      merchant.onboardingStep = 3;
    } else if (step === 'profile') {
      // Expected store info + bank details
      if (data.storeName) merchant.storeName = data.storeName;
      if (data.category) merchant.category = data.category;
      if (data.city) merchant.city = data.city;
      if (data.locality) merchant.locality = data.locality;
      if (data.address) merchant.address = data.address;
      if (data.businessHours) merchant.businessHours = data.businessHours;
      if (data.description) merchant.description = data.description;
      if (data.logo) merchant.logo = data.logo;
      if (data.coverImage) merchant.coverImage = data.coverImage;
      
      if (data.bankDetails) {
        merchant.bankDetails = {
          ...(merchant.bankDetails?.toObject?.() || merchant.bankDetails || {}),
          ...data.bankDetails
        };
      }
      
      if (data.subscriptionPlanId) {
        merchant.subscriptionPlanId = data.subscriptionPlanId;
        merchant.onboardingStep = 4;
        merchant.status = 'pending';
        merchant.hasRequestedStore = true;
      }
    }

    await merchant.save();
    console.log('Merchant saved successfully:', merchant._id, 'isNew:', isNewMerchant);

    return res.status(200).json({ 
      success: true, 
      merchant: serializeMerchant(merchant),
      message: `Onboarding ${step} updated successfully`
    });
  } catch (error) {
    console.error('Update Onboarding Error:', error);
    return res.status(500).json({ 
      success: false, 
      message: "Internal server error during onboarding update",
      error: error.message 
    });
  }
};

// Step 2: Business Details
export const updateBusinessDetails = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const { storeName, category, description, businessEmail, businessPhone, logo, photos } = req.body;

    // Validate required fields
    if (!storeName || !category || !description || !businessEmail || !businessPhone || !logo) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Validate description word count (10-50 words)
    const wordCount = description.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (wordCount < 10) {
      return res.status(400).json({
        success: false,
        message: 'Description must be at least 10 words'
      });
    }
    if (wordCount > 50) {
      return res.status(400).json({
        success: false,
        message: 'Description must not exceed 50 words'
      });
    }

    // Update merchant
    merchant.storeName = storeName.trim();
    merchant.category = category.trim();
    merchant.description = description.trim();
    merchant.businessEmail = businessEmail.trim().toLowerCase();
    merchant.businessPhone = businessPhone.trim();
    merchant.logo = logo.trim();
    
    if (photos && Array.isArray(photos)) {
      merchant.photos = photos;
    }

    merchant.onboardingStep = Math.max(merchant.onboardingStep, 2);
    await merchant.save();

    return res.status(200).json({
      success: true,
      merchant: serializeMerchant(merchant),
      message: 'Business details updated successfully'
    });
  } catch (error) {
    console.error('Update Business Details Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update business details',
      error: error.message
    });
  }
};

// Step 3: KYB Documents
export const updateKYBDocuments = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const { documents, gstNumber } = req.body;

    // Validate documents array exists
    if (!documents || !Array.isArray(documents)) {
      return res.status(400).json({
        success: false,
        message: 'Documents array is required'
      });
    }

    // Validate required documents
    const requiredDocs = ['aadhaar_front', 'aadhaar_back', 'pan_card', 'owner_photo', 'business_registration', 'store_front_photo'];
    const uploadedDocTypes = documents.map(doc => doc.type);
    
    const missingDocs = requiredDocs.filter(type => !uploadedDocTypes.includes(type));
    
    if (missingDocs.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required documents: ${missingDocs.join(', ')}`
      });
    }

    // Validate that all documents have valid URLs
    const docsWithoutUrl = documents.filter(doc => !doc.url || doc.url.trim() === '');
    
    if (docsWithoutUrl.length > 0) {
      const invalidDocLabels = docsWithoutUrl.map(doc => doc.label || doc.type).join(', ');
      return res.status(400).json({
        success: false,
        message: `The following documents are missing URLs: ${invalidDocLabels}. Please re-upload them.`
      });
    }

    // Update documents
    merchant.documents = documents.map(doc => ({
      type: doc.type,
      label: doc.label,
      url: doc.url,
      name: doc.name,
      size: doc.size,
      uploadedAt: new Date()
    }));

    if (gstNumber) {
      merchant.gstNumber = gstNumber;
    }

    merchant.onboardingStep = Math.max(merchant.onboardingStep, 3);
    await merchant.save();

    return res.status(200).json({
      success: true,
      merchant: serializeMerchant(merchant),
      message: 'KYB documents uploaded successfully'
    });
  } catch (error) {
    console.error('Update KYB Documents Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to upload KYB documents',
      error: error.message
    });
  }
};

// Step 4: Location & Hours
export const updateLocationHours = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);
    
    if (!merchant) {
      return res.status(404).json({ success: false, message: 'Merchant not found' });
    }

    const { address, city, state, pincode, latitude, longitude, businessHours } = req.body;

    // Validate required fields (latitude and longitude are now optional)
    if (!address || !city || !state || !pincode || !businessHours) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    // Update location
    merchant.address = address.trim();
    merchant.city = city.trim();
    merchant.state = state.trim();
    merchant.pincode = pincode.trim();
    
    // Only update coordinates if they are provided
    if (latitude !== undefined && latitude !== null && longitude !== undefined && longitude !== null) {
      merchant.coordinates = {
        lat: parseFloat(latitude),
        lng: parseFloat(longitude)
      };
    }

    // Update business hours
    merchant.businessHours = businessHours;

    // Mark registration as complete
    merchant.onboardingStep = 4;
    merchant.status = 'pending';
    merchant.hasRequestedStore = true;

    // Assign default Trial Plan if not already set
    if (!merchant.subscriptionPlanId) {
      // Use the already imported Plan model from line 1
      const trialPlan = await Plan.findOne({ name: { $regex: /Trial/i }, status: "active" });
      if (trialPlan) {
        merchant.subscriptionPlanId = trialPlan._id;
      }
    }

    await merchant.save();

    // Notify Admin
    try {
      const Admin = (await import("../../admin/models/Admin.js")).default;
      const AdminNotification = (await import("../../admin/models/AdminNotification.js")).default;
      const { emitAdminNotification } = await import("../../../config/socket.js");

      const admins = await Admin.find().select("_id");

      if (admins.length > 0) {
        const notification = await AdminNotification.create({
          title: "New Merchant Application",
          body: `Merchant ${merchant.storeName} has submitted registration for approval.`,
          type: "merchant_signup",
          data: { merchantId: merchant._id },
        });

        emitAdminNotification(notification);
      }
    } catch (notifError) {
      console.error("Failed to notify admins:", notifError);
    }

    return res.status(200).json({
      success: true,
      merchant: serializeMerchant(merchant),
      message: 'Registration completed successfully! Your application is under review.'
    });
  } catch (error) {
    console.error('Update Location Hours Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update location and hours',
      error: error.message
    });
  }
};

export const updateMyStore = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const editableFields = [
    "storeName",
    "category",
    "city",
    "locality",
    "address",
    "phone",
    "email",
    "description",
    "coordinates",
    "coverImage",
    "logo",
    "photos",
    "documents",
  ];

  for (const field of editableFields) {
    if (field in req.body) {
      merchant[field] = req.body[field];
    }
  }

  await merchant.save();

  return res.status(200).json({ merchant: serializeMerchant(merchant) });
};

export const getMerchantDashboard = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const [productsCount, offersCount, redemptions, latestSubscription, adRequests, adSubscriptions] = await Promise.all([
    Product.countDocuments({ merchantId: merchant._id }),
    Offer.countDocuments({ merchantId: merchant._id }),
    Redemption.find({ merchantId: merchant._id }).sort({ createdAt: -1 }),
    getLatestSubscription(req.user._id, merchant._id),
    AdRequest.find({ merchantId: merchant._id }),
    MerchantSubscription.find({ merchantId: merchant._id, planType: 'advertisement', status: 'active' })
  ]);

  const now = new Date();
  const activeAdsCount = adRequests.filter(ad => ad.status === 'approved' && (!ad.expiryAt || new Date(ad.expiryAt) > now)).length;
  const pendingAdsCount = adRequests.filter(ad => ad.status === 'pending').length; const expiredAdsCount = adRequests.filter(ad => ad.status === 'approved' && ad.expiryAt && new Date(ad.expiryAt) <= now).length; const availableAdSlots = Math.max(0, adSubscriptions.length - adRequests.length);

  const revenue = redemptions
    .filter((item) => ["redeemed", "completed"].includes(item.status))
    .reduce((sum, item) => sum + Number(item?.totals?.final || 0), 0);

  const customersCount = new Set(
    redemptions.map((item) => item.customerId?.toString()).filter(Boolean),
  ).size;

  const remainingDays = latestSubscription?.endDate
    ? Math.max(0, Math.ceil((new Date(latestSubscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : 0;

  // Calculate 7-day daily revenue accurately
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const weeklyRevenueData = await Redemption.aggregate([
    {
      $match: {
        merchantId: merchant._id,
        status: { $in: ["redeemed", "completed"] },
        createdAt: { $gte: sevenDaysAgo }
      }
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        revenue: { $sum: { $toDouble: "$totals.final" } }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Calculate top performing offers
  const topOffersData = await Redemption.aggregate([
    { $match: { merchantId: merchant._id, status: { $in: ["redeemed", "completed"] } } },
    { $group: { _id: "$offerId", count: { $sum: 1 }, revenue: { $sum: { $toDouble: "$totals.final" } } } },
    { $sort: { count: -1 } },
    { $limit: 3 },
    { $lookup: { from: 'offers', localField: '_id', foreignField: '_id', as: 'offerDetails' } },
    { $unwind: { path: '$offerDetails', preserveNullAndEmptyArrays: true } }
  ]);

  return res.status(200).json({
    merchant: serializeMerchant(merchant),
    stats: {
      productsCount,
      offersCount,
      bookingsCount: redemptions.length,
      revenue,
      customersCount,
      pendingBookingsCount: redemptions.filter((item) => item.status === "active").length,
      remainingDays,
      weeklyRevenue: weeklyRevenueData,
      topOffers: topOffersData.map(item => ({
        id: item._id,
        title: item.offerDetails?.title || 'Unknown Offer',
        count: item.count,
        revenue: item.revenue
      })),
      // Ad Stats
      activeAdsCount,
      pendingAdsCount,
      expiredAdsCount,
      availableAdSlots,
      totalAdPackages: adSubscriptions.length
    },
    recentBookings: redemptions.slice(0, 10).map(serializeRedemption),
    subscription: latestSubscription,
    adSubscriptions // Including full ad subs for detailed UI
  });
};

export const getMerchantCustomers = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);

  if (!merchant) {
    return res.status(404).json({ message: "Merchant profile not found" });
  }

  const bookings = await Redemption.find({ merchantId: merchant._id }).populate(
    "customerId",
    "name phone email",
  );

  const customers = new Map();

  for (const booking of bookings) {
    if (!booking.customerId) {
      continue;
    }

    const key = booking.customerId._id.toString();
    const current = customers.get(key) || {
      id: key,
      name: booking.customerName || booking.customerId.name || "",
      phone: booking.customerId.phone || "",
      email: booking.customerId.email || "",
      visits: 0,
      spend: 0,
      lastVisit: booking.createdAt,
    };

    current.visits += 1;
    current.spend += Number(booking?.totals?.final || 0);
    current.lastVisit =
      new Date(current.lastVisit) > new Date(booking.createdAt)
        ? current.lastVisit
        : booking.createdAt;

    customers.set(key, current);
  }

  return res.status(200).json({
    customers: [...customers.values()].sort(
      (left, right) => new Date(right.lastVisit) - new Date(left.lastVisit),
    ),
  });
};

export const getMySubscription = async (req, res) => {
  const merchant = await getMerchantForOwner(req.user._id);
  const subscription = await getLatestSubscription(req.user._id, merchant?._id || null);

  return res.status(200).json({
    subscription,
    merchant: merchant ? serializeMerchant(merchant) : null,
  });
};

// Get store configuration for offer creation
export const getStoreConfig = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    // Import Category model
    const Category = (await import('../../admin/models/Category.js')).default;
    const category = await Category.findOne({ name: merchant.category });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    return res.status(200).json({
      success: true,
      config: {
        offer_mode: category.offer_mode || category.type,
        requires_booking: category.requires_booking || false,
        category: merchant.category,
        categoryType: category.type
      }
    });
  } catch (error) {
    console.error('Get store config error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch store configuration',
      error: error.message
    });
  }
};


// ── Notification Functions ──────────────────────────────────────────────────

export const getMyNotifications = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(404).json({ 
        success: false, 
        message: 'Merchant profile not found' 
      });
    }

    const [notifications, unreadCount] = await Promise.all([
      MerchantNotification.find({ merchantId: merchant._id })
        .sort({ createdAt: -1 })
        .limit(50),
      MerchantNotification.countDocuments({ merchantId: merchant._id, isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

export const markNotificationRead = async (req, res) => {
  try {
    const notification = await MerchantNotification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Verify notification belongs to this merchant
    if (notification.merchantId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    notification.isRead = true;
    await notification.save();

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark notification as read',
      error: error.message
    });
  }
};

export const markAllNotificationsRead = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    await MerchantNotification.updateMany(
      { merchantId: merchant._id, isRead: false },
      { isRead: true }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark all notifications as read',
      error: error.message
    });
  }
};

const getEffectivePlan = async (merchant) => {
  const now = new Date();
  const activeSubscription = await MerchantSubscription.findOne({
    merchantId: merchant._id,
    status: "active",
    endDate: { $gte: now },
  })
    .populate("planId")
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

// ───────────────────────── AD REQUESTS ─────────────────────────

export const requestAd = async (req, res) => {
  try {
    const merchant = await Merchant.findById(req.user._id);

    if (!merchant) {
      return res.status(404).json({
        success: false,
        message: 'Merchant profile not found'
      });
    }

    const { planId, paymentId, image, adText, type, expiryAt } = req.body;

    const adRequest = await AdRequest.create({
      merchantId: merchant._id,
      storeName: merchant.storeName,
      planId,
      paymentId,
      image,
      adText,
      type: type || 'banner',

      expiryAt: req.body.expiryAt || null,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Ad request submitted successfully',
      data: adRequest
    });
  } catch (error) {
    console.error('Request ad error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit ad request',
      error: error.message
    });
  }
};

export const purchaseSubscription = async (req, res) => {
  try {
    const { planId } = req.body;
    const merchant = await Merchant.findOne({ ownerId: req.user._id });
    if (!merchant) return res.status(404).json({ success: false, error: 'Merchant not found' });

    const plan = await Plan.findById(planId);
    if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' });

    // Validate Trial
    const isTrial = plan.trialDays > 0 || plan.name.toLowerCase().includes('trial');
    if (isTrial && merchant.hasUsedFreeTrial) {
      return res.status(400).json({ success: false, error: 'You have already used your free trial' });
    }

    const startDate = new Date();
    const endDate = new Date();
    
    if (isTrial) {
      endDate.setDate(endDate.getDate() + plan.trialDays);
    } else if (plan.duration === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.duration === 'Yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // If price > 0, create Razorpay Order
    if (plan.price > 0) {
      const { createRazorpayOrder } = await import('../../../utils/razorpay.js');
      try {
        const order = await createRazorpayOrder(plan.price, 'INR', `rcpt_${merchant._id.toString().slice(-8)}_${Date.now()}`);
        return res.status(200).json({
          success: true,
          requiresPayment: true,
          orderId: order.id,
          amount: order.amount,
          currency: order.currency,
          key: process.env.RAZORPAY_KEY_ID,
          merchantDetails: {
            name: merchant.storeName,
            email: req.user.email,
            contact: req.user.phone
          }
        });
      } catch (err) {
        return res.status(500).json({ success: false, error: 'Payment gateway error. Please try again later.' });
      }
    }

    // Update Subscription (Direct activation for Free/Trial)
    await MerchantSubscription.findOneAndUpdate(
      { merchantId: merchant._id },
      {
        userId: req.user._id,
        merchantId: merchant._id,
        planId: plan._id,
        amount: plan.price,
        status: 'active',
        startDate,
        endDate
      },
      { upsert: true, returnDocument: 'after' }
    );

    // Update Merchant
    const updateData = { subscriptionPlanId: plan._id };
    if (isTrial) updateData.hasUsedFreeTrial = true;
    await Merchant.findByIdAndUpdate(merchant._id, updateData);

    res.status(200).json({ success: true, message: `Successfully activated ${plan.name}` });
  } catch (err) {
    console.error('Purchase subscription error:', err);
    res.status(500).json({ success: false, error: 'Failed to activate subscription' });
  }
};

export const verifySubscription = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, planId } = req.body;
    const { verifyRazorpayPayment } = await import('../../../utils/razorpay.js');

    const isValid = verifyRazorpayPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    if (!isValid) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    const merchant = await Merchant.findOne({ ownerId: req.user._id });
    const plan = await Plan.findById(planId);

    if (!merchant || !plan) {
      return res.status(404).json({ success: false, error: 'Merchant or Plan not found' });
    }

    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.duration === 'Monthly') {
      endDate.setMonth(endDate.getMonth() + 1);
    } else if (plan.duration === 'Yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1);
    } else if (plan.duration === 'Lifetime') {
      endDate.setFullYear(endDate.getFullYear() + 100);
    }

    if (plan.planType === 'advertisement') {
      // Create a NEW independent record for each Ad purchase
      await MerchantSubscription.create({
        userId: req.user._id,
        merchantId: merchant._id,
        planId: plan._id,
        amount: plan.price,
        status: 'active',
        startDate,
        endDate,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        planType: 'advertisement'
      });
      // NO update to Merchant.subscriptionPlanId
    } else {
      // Core Membership - Overwrite/Update existing one
      await MerchantSubscription.findOneAndUpdate(
        { merchantId: merchant._id, planType: { $ne: 'advertisement' } },
        {
          userId: req.user._id,
          merchantId: merchant._id,
          planId: plan._id,
          amount: plan.price,
          status: 'active',
          startDate,
          endDate,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id,
          planType: 'merchant'
        },
        { upsert: true, returnDocument: 'after' }
      );

      // Update Merchant's primary tier
      await Merchant.findByIdAndUpdate(merchant._id, { subscriptionPlanId: plan._id });
    }

    res.status(200).json({ success: true, message: `Payment verified. ${plan.name} activated!` });
  } catch (error) {
    console.error('Verify subscription error:', error);
    res.status(500).json({ success: false, error: 'Failed to verify payment' });
  }
};
