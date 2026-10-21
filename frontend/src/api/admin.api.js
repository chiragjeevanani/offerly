import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const adminAPI = {
  // Dashboard stats
  getDashboardStats: async () => {
    return axiosInstance.get('/admin/dashboard');
  },

  // Get all users
  getAllUsers: async () => {
    return axiosInstance.get(API_ENDPOINTS.GET_ALL_USERS);
  },

  updateUserStatus: async (id, status) => {
    return axiosInstance.put(`/admin/users/${id}/status`, { status });
  },

  getAllBookings: async () => {
    return axiosInstance.get('/admin/redemptions');
  },

  // Get all merchants (for admin)
  getAllMerchants: async (params = {}) => {
    return axiosInstance.get(API_ENDPOINTS.GET_MERCHANTS, { params });
  },

  // Merchant discount wallet: balance, membership and history
  getMerchantWallet: async (id) => {
    return axiosInstance.get(`/admin/merchants/${id}/wallet`);
  },

  // action: 'add' | 'deduct' | 'set'
  adjustMerchantWallet: async (id, { action, amount, note }) => {
    return axiosInstance.put(`/admin/merchants/${id}/wallet`, { action, amount, note });
  },

  // Get all cities
  getCities: async () => {
    return axiosInstance.get('/admin/cities');
  },

  // Notifications
  getNotifications: async () => {
    return axiosInstance.get('/admin/notifications');
  },

  markNotificationRead: async (id) => {
    return axiosInstance.put(`/admin/notifications/${id}/read`);
  },

  markAllNotificationsRead: async () => {
    return axiosInstance.put('/admin/notifications/read-all');
  },

  // Global Search
  globalSearch: async (query) => {
    return axiosInstance.get(`/admin/search?q=${encodeURIComponent(query)}`);
  },

  // Get all plans
  getPlans: async () => {
    return axiosInstance.get('/admin/plans');
  },

  // Update merchant status
  // Support email / phone / WhatsApp / hours shown in the customer and merchant apps
  // Home Banners - ad carousel above "Select Services" in the customer app
  getHomeBanners: async () => axiosInstance.get('/admin/home-banners'),
  createHomeBanner: async (data) => axiosInstance.post('/admin/home-banners', data),
  updateHomeBanner: async (id, data) => axiosInstance.put(`/admin/home-banners/${id}`, data),
  reorderHomeBanners: async (ids) => axiosInstance.put('/admin/home-banners/reorder', { ids }),
  deleteHomeBanner: async (id) => axiosInstance.delete(`/admin/home-banners/${id}`),

  getSupportContacts: async () => axiosInstance.get('/support'),
  updateSupportContacts: async (data) => axiosInstance.put('/admin/support-contacts', data),

  // Move a store to a zone (and optionally another city).
  // zone: '<zoneId>' | '' (no zone) | 'auto' (from map location)
  updateMerchantZone: async (id, zone, city, state) => {
    return axiosInstance.put(`/admin/merchants/${id}/zone`, { zone, ...(city ? { city } : {}), ...(state ? { state } : {}) });
  },

  updateMerchantStatus: async (id, status, rejectionReason = null) => {
    return axiosInstance.put(
      API_ENDPOINTS.UPDATE_MERCHANT_STATUS.replace(':id', id),
      { status, rejectionReason }
    );
  },

  // Delete merchant (admin only)
  deleteMerchant: async (id) => {
    return axiosInstance.delete(`/merchants/${id}`);
  },

  // Save plan (create or update)
  savePlan: async (data) => {
    return axiosInstance.post('/admin/plans', data);
  },

  // Save city (create or update)
  saveCity: async (data) => {
    return axiosInstance.post('/admin/cities', data);
  },

  deleteCity: async (id) => {
    return axiosInstance.delete(`/admin/cities/${id}`);
  },

  deletePlan: async (id) => {
    return axiosInstance.delete(`/admin/plans/${id}`);
  },

  // Merchant discount wallet - global settings
  getWalletSettings: async () => {
    return axiosInstance.get('/admin/wallet-settings');
  },

  updateWalletSettings: async (data) => {
    return axiosInstance.put('/admin/wallet-settings', data);
  },

  // Store payouts for Offerly-funded discounts
  getPayouts: async (status = 'pending') => {
    return axiosInstance.get('/admin/payouts', { params: { status } });
  },

  payPayout: async (id, data) => {
    return axiosInstance.put(`/admin/payouts/${id}/pay`, data);
  },

  rejectPayout: async (id, data) => {
    return axiosInstance.put(`/admin/payouts/${id}/reject`, data);
  },

  // Send Notification (admin -> customers / merchants)
  getBroadcasts: async () => axiosInstance.get('/admin/broadcasts'),
  countBroadcastAudience: async (type, city) => axiosInstance.get('/admin/broadcasts/count', { params: { type, city } }),
  searchBroadcastTargets: async (kind, q) => axiosInstance.get('/admin/broadcasts/search', { params: { kind, q } }),
  sendBroadcast: async (data) => axiosInstance.post('/admin/broadcasts', data),

  // Blue tick (verified seller) rules
  getBlueTickSettings: async () => axiosInstance.get('/admin/blue-tick-settings'),
  updateBlueTickSettings: async (data) => axiosInstance.put('/admin/blue-tick-settings', data),

  // Refer & Earn + Customer Distribution Fund
  getIncentiveSettings: async () => {
    return axiosInstance.get('/admin/incentive-settings');
  },

  updateIncentiveSettings: async (data) => {
    return axiosInstance.put('/admin/incentive-settings', data);
  },

  getIncentiveSummary: async () => {
    return axiosInstance.get('/admin/incentive-summary');
  },

  getCustomerSubscriptionSettings: async () => {
    return axiosInstance.get('/admin/customer-subscription-settings');
  },

  updateCustomerSubscriptionSettings: async (data) => {
    return axiosInstance.put('/admin/customer-subscription-settings', data);
  },

  // Ads (Stubbed structure for mapping)
  getAdRequests: async () => {
    return axiosInstance.get('/admin/ads');
  },
  
  updateAdStatus: async (id, status) => {
    return axiosInstance.put(`/admin/ads/${id}/status`, { status });
  },

  deleteAd: async (id) => {
    return axiosInstance.delete(`/admin/ads/${id}`);
  },

  // Categories
  getCategories: async () => {
    return axiosInstance.get('/admin/categories');
  },

  saveCategory: async (data) => {
    return axiosInstance.post('/admin/categories', data);
  },

  deleteCategory: async (id) => {
    return axiosInstance.delete(`/admin/categories/${id}`);
  },
};
