export const normalizePhone = (phone = '') => phone.replace(/\D/g, '').slice(-10);

export const withCountryCode = (phone = '') => {
  const normalized = normalizePhone(phone);
  return normalized ? `91${normalized}` : '';
};
