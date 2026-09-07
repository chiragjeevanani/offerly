import mongoose from 'mongoose';

// Singleton document (there is only ever one). Global on/off switch for the
// customer-facing subscription gate on claiming offers - see
// utils/customerSubscription.js for how this is read.
const customerSubscriptionSettingsSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export default mongoose.models.CustomerSubscriptionSettings ||
  mongoose.model('CustomerSubscriptionSettings', customerSubscriptionSettingsSchema);
