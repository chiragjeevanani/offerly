export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const API_ENDPOINTS = {
  // Auth
  SEND_OTP: '/auth/send-otp',
  VERIFY_OTP: '/auth/verify-otp',
  REGISTER_CUSTOMER: '/auth/register-customer',
  REGISTER_MERCHANT: '/auth/register-merchant-user',
  ADMIN_LOGIN: '/auth/admin-login',

  // Users
  GET_PROFILE: '/users/me',
  UPDATE_PROFILE: '/users/me',
  GET_CITIES: '/users/cities',
  GET_PLANS: '/users/plans',

  // Merchants
  GET_MERCHANTS: '/merchants',
  GET_MERCHANT: '/merchants/:id',
  CREATE_MERCHANT: '/merchants',

  // Offers
  GET_OFFERS: '/offers',
  GET_OFFER: '/offers/:id',

  // Products
  GET_PRODUCTS: '/products',

  // Bookings
  CREATE_REDEMPTION: '/redemptions',
  GET_REDEMPTIONS: '/redemptions/customer',
  VERIFY_QR: '/redemptions/verify-qr',

  // Admin
  GET_ALL_USERS: '/admin/users',
  UPDATE_MERCHANT_STATUS: '/admin/merchants/:id/status',
};

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'offerly_auth_token',
  USER_DATA: 'offerly_user_data',
};
