import crypto from "crypto";

import Plan from "../../admin/models/Plan.js";
import Merchant from "../../merchant/models/Merchant.js";
import { serializeMerchant } from "../../../utils/serializers.js";
import MerchantApplicationDraft from "../models/MerchantApplicationDraft.js";
import MerchantSubscription from "../models/MerchantSubscription.js";
import Payment from "../models/Payment.js";

// Plain `!==` on signatures leaks timing information an attacker can use to
// guess the correct value byte-by-byte. Compare in constant time instead.
const safeCompare = (a, b) => {
  const bufferA = Buffer.from(String(a || ""));
  const bufferB = Buffer.from(String(b || ""));

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufferA, bufferB);
};

const getRazorpayAuthHeader = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured");
  }

  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
};

const buildEndDate = (duration) => {
  const now = new Date();

  if (duration === "Lifetime") {
    return null;
  }

  if (duration === "Yearly") {
    return new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  }

  return new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
};

const buildMerchantPayload = (applicationData, userId, planId) => {
  return {
    ownerId: userId,
    storeName: applicationData.storeName || "",
    category: applicationData.category || "",
    city: applicationData.city || "",
    locality: applicationData.locality || "",
    address: applicationData.address || "",
    phone: applicationData.phone || applicationData.contactNumber || "",
    email: applicationData.email || "",
    description: applicationData.description || "",
    coordinates: applicationData.coordinates || null,
    coverImage: applicationData.coverImage || "",
    logo: applicationData.logo || "",
    photos: applicationData.photos || [],
    documents: applicationData.documents || [],
    subscriptionPlanId: planId,
    status: "pending",
    verified: false,
    rejectionReason: "",
    rejectedAt: null,
    rejectedBy: null,
  };
};

const createMerchantFromDraft = async ({ draft, payment, plan }) => {
  const merchantPayload = buildMerchantPayload(draft.applicationData || {}, draft.userId, plan._id);
  const existingMerchant = await Merchant.findOne({ ownerId: draft.userId });

  const merchant = existingMerchant
    ? await Merchant.findByIdAndUpdate(existingMerchant._id, merchantPayload, { new: true })
    : await Merchant.create(merchantPayload);

  await MerchantSubscription.findOneAndUpdate(
    {
      userId: draft.userId,
      merchantId: merchant._id,
    },
    {
      userId: draft.userId,
      merchantId: merchant._id,
      planId: plan._id,
      paymentId: payment._id,
      amount: Number(plan.price || 0),
      status: "active",
      startDate: new Date(),
      endDate: buildEndDate(plan.duration),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  payment.merchantId = merchant._id;
  await payment.save();

  draft.status = "submitted";
  await draft.save();

  return merchant;
};

export const createMerchantPlanOrder = async (req, res) => {
  const { planId, applicationData = {} } = req.body;
  const plan = await Plan.findById(planId);

  if (!plan) {
    return res.status(400).json({ message: "Subscription plan not found" });
  }

  if (Number(plan.price || 0) <= 0) {
    return res.status(400).json({ message: "Free plans do not require Razorpay order creation" });
  }

  const draft = await MerchantApplicationDraft.create({
    userId: req.user._id,
    planId: plan._id,
    applicationData,
    status: "payment_pending",
  });

  const amountInPaise = Math.round(Number(plan.price || 0) * 100);
  const orderResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: getRazorpayAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: amountInPaise,
      currency: "INR",
      receipt: `offerly-${draft._id.toString()}`,
      notes: {
        applicationId: draft._id.toString(),
        userId: req.user._id.toString(),
        planId: plan._id.toString(),
      },
    }),
  });

  const orderPayload = await orderResponse.json();

  if (!orderResponse.ok) {
    draft.status = "failed";
    await draft.save();
    return res.status(400).json({
      message: orderPayload.error?.description || "Unable to create Razorpay order",
    });
  }

  draft.orderId = orderPayload.id;
  await draft.save();

  const payment = await Payment.create({
    userId: req.user._id,
    planId: plan._id,
    draftId: draft._id,
    amount: Number(plan.price || 0),
    currency: "INR",
    orderId: orderPayload.id,
    payload: orderPayload,
    status: "created",
  });

  return res.status(201).json({
    applicationId: draft._id.toString(),
    order: orderPayload,
    paymentId: payment._id.toString(),
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "",
    plan: {
      id: plan._id.toString(),
      name: plan.name,
      price: Number(plan.price || 0),
      duration: plan.duration,
    },
  });
};

export const verifyMerchantPlanPayment = async (req, res) => {
  const { applicationId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
  const draft = await MerchantApplicationDraft.findOne({
    _id: applicationId,
    userId: req.user._id,
  });

  if (!draft) {
    return res.status(404).json({ message: "Merchant application draft not found" });
  }

  const plan = await Plan.findById(draft.planId);

  if (!plan) {
    return res.status(400).json({ message: "Subscription plan not found" });
  }

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!safeCompare(expectedSignature, razorpaySignature)) {
    return res.status(400).json({ message: "Invalid Razorpay payment signature" });
  }

  const payment = await Payment.findOne({
    draftId: draft._id,
    orderId: razorpayOrderId,
  });

  if (!payment) {
    return res.status(404).json({ message: "Payment record not found" });
  }

  payment.paymentId = razorpayPaymentId;
  payment.signature = razorpaySignature;
  payment.status = "paid";
  payment.payload = {
    ...payment.payload,
    verification: {
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    },
  };
  await payment.save();

  draft.paymentId = razorpayPaymentId;
  draft.status = "payment_verified";
  await draft.save();

  const merchant = await createMerchantFromDraft({ draft, payment, plan });

  return res.status(200).json({
    success: true,
    merchant: serializeMerchant(merchant),
    applicationId: draft._id.toString(),
  });
};

export const razorpayWebhook = async (req, res) => {
  const signature = req.headers["x-razorpay-signature"];
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!secret) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not configured - ignoring incoming webhook");
    return res.status(200).json({ success: true });
  }

  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(req.rawBody || JSON.stringify(req.body))
    .digest("hex");

  if (!safeCompare(signature, expectedSignature)) {
    return res.status(400).json({ message: "Invalid webhook signature" });
  }

  const { event, payload } = req.body;
  const orderId =
    payload?.payment?.entity?.order_id || payload?.order?.entity?.id || payload?.order?.id || "";

  if (orderId) {
    const payment = await Payment.findOne({ orderId });

    if (payment) {
      payment.webhooks = [...(payment.webhooks || []), { event, payload, receivedAt: new Date() }];

      if (event === "payment.captured" || event === "order.paid") {
        payment.status = "paid";
        payment.paymentId = payload?.payment?.entity?.id || payment.paymentId;
      }

      if (event === "payment.failed") {
        payment.status = "failed";
      }

      await payment.save();
    }
  }

  return res.status(200).json({ success: true });
};

export const getMerchantPlanStatus = async (req, res) => {
  const draft = await MerchantApplicationDraft.findById(req.params.applicationId);

  if (!draft) {
    return res.status(404).json({ message: "Merchant application draft not found" });
  }

  if (req.user.role !== "admin" && draft.userId.toString() !== req.user._id.toString()) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const payment = await Payment.findOne({ draftId: draft._id }).sort({ createdAt: -1 });
  const merchant = await Merchant.findOne({ ownerId: draft.userId }).sort({ createdAt: -1 });
  const subscription = merchant
    ? await MerchantSubscription.findOne({ merchantId: merchant._id }).sort({ createdAt: -1 })
    : null;

  return res.status(200).json({
    applicationId: draft._id.toString(),
    draft,
    payment,
    merchant: merchant ? serializeMerchant(merchant) : null,
    subscription,
  });
};
