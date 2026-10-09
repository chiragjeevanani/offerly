import SupportSettings from '../models/SupportSettings.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Digits with optional leading +, spaces, dashes and brackets; 8-15 digits in all.
const PHONE_RE = /^\+?[\d\s\-()]+$/;
const digitCount = (v) => (v.match(/\d/g) || []).length;

const getSettings = async () => (await SupportSettings.findOne()) || SupportSettings.create({});

const shape = (settings) => ({
  customer: {
    email: settings.customer?.email || '',
    phone: settings.customer?.phone || '',
    whatsapp: settings.customer?.whatsapp || '',
    hours: settings.customer?.hours || '',
  },
  merchant: {
    email: settings.merchant?.email || '',
    phone: settings.merchant?.phone || '',
    whatsapp: settings.merchant?.whatsapp || '',
    hours: settings.merchant?.hours || '',
  },
  updatedAt: settings.updatedAt || null,
});

// Returns { value } or { error } for one audience's contact block.
const cleanContact = (raw = {}, label) => {
  const pick = (k) => (typeof raw[k] === 'string' ? raw[k].trim() : '');
  const email = pick('email').toLowerCase();
  const phone = pick('phone');
  const whatsapp = pick('whatsapp');
  const hours = pick('hours').slice(0, 80);

  if (email && !EMAIL_RE.test(email)) return { error: `${label} support email isn't a valid email address` };
  for (const [name, value] of [['phone number', phone], ['WhatsApp number', whatsapp]]) {
    if (value && (!PHONE_RE.test(value) || digitCount(value) < 8 || digitCount(value) > 15)) {
      return { error: `${label} ${name} should be 8-15 digits (e.g. +91 98765 43210)` };
    }
  }
  return { value: { email, phone, whatsapp, hours } };
};

// @desc    Support contacts for both apps (public - shown on Contact/Support pages)
// @route   GET /support
export const getSupportContacts = async (req, res) => {
  try {
    res.status(200).json({ success: true, data: shape(await getSettings()) });
  } catch (err) {
    console.error('Get support contacts error:', err);
    res.status(500).json({ success: false, error: 'Failed to load support contacts' });
  }
};

// @desc    Update the support contacts shown to customers and/or merchants
// @route   PUT /admin/support-contacts   body: { customer?: {...}, merchant?: {...} }
export const updateSupportContacts = async (req, res) => {
  try {
    const settings = await getSettings();
    for (const [key, label] of [['customer', 'Customer'], ['merchant', 'Merchant']]) {
      if (req.body?.[key] === undefined) continue;
      const { value, error } = cleanContact(req.body[key], label);
      if (error) return res.status(400).json({ success: false, error });
      settings[key] = value;
    }
    await settings.save();
    res.status(200).json({ success: true, data: shape(settings) });
  } catch (err) {
    console.error('Update support contacts error:', err);
    res.status(500).json({ success: false, error: 'Failed to save support contacts' });
  }
};
