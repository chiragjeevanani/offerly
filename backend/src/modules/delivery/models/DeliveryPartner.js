import mongoose from 'mongoose';

// FCM device tokens, same shape as User/Merchant so the shared push service
// (user/services/pushService.js) can read and prune them.
const fcmTokenSchema = new mongoose.Schema(
  {
    token: { type: String, required: true, trim: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A delivery partner account. Its own collection, like Merchant and Admin, so
// auth.js resolves `req.user` to this document for role 'delivery'.
const deliveryPartnerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, unique: true, index: true },
    email: { type: String, trim: true, lowercase: true },
    role: { type: String, default: 'delivery', immutable: true },
    city: { type: String, default: '', index: true },
    profilePhoto: { type: String, default: '' },
    vehicleType: { type: String, enum: ['bike', 'scooter', 'bicycle', 'other'], default: 'bike' },
    vehicleNumber: { type: String, trim: true, uppercase: true, default: '' },
    // Driving licence / ID proof, checked by the admin before approval.
    documents: {
      licenceNumber: { type: String, trim: true, uppercase: true, default: '' },
      licenceImage: { type: String, default: '' },
      idProofImage: { type: String, default: '' },
    },
    // pending -> approved | rejected, blocked by admin (auth.js refuses 'blocked').
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'blocked'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    // Only online, approved partners see the open order pool.
    isOnline: { type: Boolean, default: false },
    // Running totals. cashInHand is COD money collected and not yet handed to
    // Offerly; earningsDue is what Offerly owes the partner. Admin settles both.
    stats: {
      totalDeliveries: { type: Number, default: 0 },
      totalEarnings: { type: Number, default: 0 },
      earningsDue: { type: Number, default: 0 },
      cashInHand: { type: Number, default: 0 },
    },
    settlements: {
      type: [
        {
          _id: false,
          cashReceived: Number,
          earningsPaid: Number,
          note: String,
          at: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
    fcmTokens: {
      web: { type: [fcmTokenSchema], default: [] },
      app: { type: [fcmTokenSchema], default: [] },
    },
    bankDetails: {
      accountHolderName: { type: String, default: '' },
      accountNumber: { type: String, default: '' },
      ifscCode: { type: String, default: '' },
      upiId: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

deliveryPartnerSchema.index({ city: 1, status: 1, isOnline: 1 });
deliveryPartnerSchema.index({ 'fcmTokens.web.token': 1 });
deliveryPartnerSchema.index({ 'fcmTokens.app.token': 1 });

export default mongoose.models.DeliveryPartner || mongoose.model('DeliveryPartner', deliveryPartnerSchema);
