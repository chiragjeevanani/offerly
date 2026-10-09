import mongoose from 'mongoose';

// Singleton document (there is only ever one). The support contact details
// shown in the apps - one set for customers, one for merchants - edited by
// admins under Support Contacts. Empty fields are simply hidden in the apps.
const contactSchema = new mongoose.Schema(
  {
    email: { type: String, trim: true, default: '' },
    phone: { type: String, trim: true, default: '' },
    whatsapp: { type: String, trim: true, default: '' },
    hours: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

const supportSettingsSchema = new mongoose.Schema(
  {
    customer: { type: contactSchema, default: () => ({}) },
    merchant: { type: contactSchema, default: () => ({}) },
  },
  { timestamps: true }
);

export default mongoose.models.SupportSettings || mongoose.model('SupportSettings', supportSettingsSchema);
