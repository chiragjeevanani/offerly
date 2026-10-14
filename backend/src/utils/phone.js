export const normalizePhone = (phone = '') => phone.replace(/\D/g, '').slice(-10);

export const withCountryCode = (phone = '') => {
  const normalized = normalizePhone(phone);
  return normalized ? `91${normalized}` : '';
};

const escapeRegex = (value = '') => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Mongo filter matching a phone however it was stored (9876543210, 91..., +91...,
 * or legacy formatted "+91 98765 43210"). Mirrors the lookup in authController.
 */
export const buildPhoneQuery = (phone) => {
  const normalized = normalizePhone(phone);
  return {
    $or: [
      { phone: normalized },
      { phone: `91${normalized}` },
      { phone: `+91${normalized}` },
      // Spaces/dashes anywhere between the digits ("+91 98765 43210").
      { phone: { $regex: new RegExp(`${normalized.split('').map(escapeRegex).join('[\\s-]*')}$`) } },
    ],
  };
};
