import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const merchantAPI = {
  // Get all merchants with optional filters
  getAll: async (params) => {
    return axiosInstance.get(API_ENDPOINTS.GET_MERCHANTS, { params });
  },

  // Get merchant by ID (or 'me' for current user's merchant)
  getById: async (id) => {
    if (id === 'me') {
      return axiosInstance.get('/merchants/me');
    }
    return axiosInstance.get(API_ENDPOINTS.GET_MERCHANT.replace(':id', id));
  },

  // Create merchant (store registration)
  create: async (data) => {
    return axiosInstance.post('/merchants/register', data);
  },

  // Update onboarding (Step-by-step progress)
  updateOnboarding: async (step, data) => {
    return axiosInstance.patch('/merchants/me/onboarding', { step, data });
  },

  // Get current user's subscription
  getMySubscription: async () => {
    return axiosInstance.get('/merchants/me/subscription');
  },

  // 4-Step Registration APIs
  updateBusinessDetails: async (data) => {
    return axiosInstance.post('/merchants/me/registration/business-details', data);
  },

  updateKYBDocuments: async (data) => {
    return axiosInstance.post('/merchants/me/registration/kyb-documents', data);
  },

  updateLocationHours: async (data) => {
    return axiosInstance.post('/merchants/me/registration/location-hours', data);
  },

  // Get store configuration for offer creation
  getStoreConfig: async () => {
    try {
      const response = await axiosInstance.get('/merchants/me/store-config');
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Get store config error:', error);
      throw error;
    }
  },

  // Get merchant dashboard stats (revenue, bookings, customers, etc.)
  getDashboard: async () => {
    return axiosInstance.get('/merchants/me/dashboard');
  },

  // Get merchant's customer directory
  getCustomers: async () => {
    return axiosInstance.get('/merchants/me/customers');
  },

  // Today's headline numbers (acquired / redemptions / sales / views)
  getTodayAnalytics: async () => {
    return axiosInstance.get('/merchants/me/analytics/today');
  },

  // Full monthly insights report. `month` is YYYY-MM; omit for the current month.
  getMonthlyAnalytics: async (month) => {
    return axiosInstance.get('/merchants/me/analytics/monthly', {
      params: month ? { month } : {},
    });
  },

  // Search products for offer creation
  searchProducts: async (query) => {
    try {
      const response = await axiosInstance.get('/products/search', {
        params: { q: query }
      });
      return response; // axios interceptor already returns response.data
    } catch (error) {
      console.error('Search products error:', error);
      throw error;
    }
  },

  // Notification APIs
  getNotifications: async () => {
    try {
      const response = await axiosInstance.get('/merchants/me/notifications');
      return response;
    } catch (error) {
      console.error('Get notifications error:', error);
      throw error;
    }
  },

  markNotificationRead: async (id) => {
    try {
      const response = await axiosInstance.patch(`/merchants/me/notifications/${id}/read`);
      return response;
    } catch (error) {
      console.error('Mark notification read error:', error);
      throw error;
    }
  },

  markAllNotificationsRead: async () => {
    try {
      const response = await axiosInstance.patch('/merchants/me/notifications/mark-all-read');
      return response;
    } catch (error) {
      console.error('Mark all notifications read error:', error);
      throw error;
    }
  },

  // Plan & Subscription
  getAvailablePlans: async (city) => {
    try {
      const response = await axiosInstance.get('/admin/plans', {
        params: city ? { city } : {}
      });
      return response;
    } catch (error) {
      console.error('Get available plans error:', error);
      throw error;
    }
  },

  activateSubscription: async (planId) => {
    try {
      const response = await axiosInstance.post('/merchants/me/subscription/purchase', { planId });
      return response;
    } catch (error) {
      console.error('Activate subscription error:', error);
      throw error;
    }
  },

  verifySubscription: async (payload) => {
    try {
      const response = await axiosInstance.post('/merchants/me/subscription/verify', payload);
      return response;
    } catch (error) {
      console.error('Verify subscription error:', error);
      throw error;
    }
  },

  requestAd: async (data) => {
    try {
      const response = await axiosInstance.post('/merchants/me/ads', data);
      return response;
    } catch (error) {
      console.error('Request ad error:', error);
      throw error;
    }
  },
};
