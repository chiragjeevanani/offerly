import crypto from "crypto";

import Plan from "../../admin/models/Plan.js";
import Merchant from "../../merchant/models/Merchant.js";
import { serializeMerchant } from "../../../utils/serializers.js";
import MerchantApplicationDraft from "../models/MerchantApplicationDraft.js";
import MerchantSubscription from "../models/MerchantSubscription.js";
import Payment from "../models/Payment.js";
import { claimAndActivateOrder } from "../services/subscriptionActivation.js";

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

  // Lifetime is a far-future date, not null: the client reads a null endDate as
  // the Unix epoch and would show a lifetime plan as already expired.
  if (duration === "Lifetime") {
    return new Date(now.getFullYear() + 100, now.getMonth(), now.getDate());
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

// Turns a paid draft into a Merchant + subscription exactly once, whether the
// browser's /verify call or Razorpay's webhook gets here first. The atomic flip to
// "activating" is the lock. Resolves to the merchant, or null when the draft is
// already submitted or being activated by the other path. If activation throws,
// the draft is released so a retry can finish the job.
const activateDraft = async (draftId, payment) => {
  const draft = await MerchantApplicationDraft.findOneAndUpdate(
    { _id: draftId, status: { $in: ["payment_pending", "payment_verified"] } },
    { $set: { status: "activating" } },
    { new: true },
  );
  if (!draft) {
    return null;
  }

  try {
    const plan = await Plan.findById(draft.planId);
    if (!plan) {
      throw new Error(`Plan ${draft.planId} not found for paid draft ${draft._id}`);
    }
    return await createMerchantFromDraft({ draft, payment, plan });
  } catch (err) {
    await MerchantApplicationDraft.updateOne(
      { _id: draft._id, status: "activating" },
      { $set: { status: "payment_verified" } },
    );
    throw err;
  }
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

  // updateOne, not draft.save(): the webhook may have submitted this draft
  // already and a stale in-memory save would knock it back to payment_verified.
  await MerchantApplicationDraft.updateOne(
    { _id: draft._id, status: "payment_pending" },
    { $set: { status: "payment_verified", paymentId: razorpayPaymentId } },
  );

  let merchant = await activateDraft(draft._id, payment);

  if (!merchant) {
    const current = await MerchantApplicationDraft.findById(draft._id).select("status");
    if (current?.status === "submitted") {
      merchant = await Merchant.findOne({ ownerId: draft.userId });
    }
    if (!merchant) {
      return res.status(409).json({
        message: "Your payment was received and your store is being set up. Please refresh in a moment.",
      });
    }
  }

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
    const isPaid = event === "payment.captured" || event === "order.paid";
    const razorpayPaymentId = payload?.payment?.entity?.id || "";

    try {
      const payment = await Payment.findOne({ orderId });

      if (payment) {
        payment.webhooks = [...(payment.webhooks || []), { event, payload, receivedAt: new Date() }];

        if (isPaid) {
          payment.status = "paid";
          payment.paymentId = razorpayPaymentId || payment.paymentId;
        }

        // Don't let a late failure event undo a payment that has already succeeded.
        if (event === "payment.failed" && payment.status !== "paid") {
          payment.status = "failed";
        }

        await payment.save();

        // New-merchant registration: the buyer may have closed the tab before the
        // browser's /verify call, so the webhook creates the store itself.
        if (isPaid && payment.draftId) {
          await activateDraft(payment.draftId, payment);
        }
      } else if (isPaid) {
        // Renewals, ad plans and customer subscriptions are tracked as SubscriptionOrder.
        await claimAndActivateOrder({ orderId }, razorpayPaymentId);
      }
    } catch (err) {
      // A non-2xx makes Razorpay redeliver the event, which is what we want when
      // the money is taken but activation failed.
      console.error(`[Razorpay webhook] ${event} for order ${orderId} failed:`, err);
      return res.status(500).json({ message: "Webhook processing failed" });
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
