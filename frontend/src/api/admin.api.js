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

  // Global Search
  globalSearch: async (query) => {
    return axiosInstance.get(`/admin/search?q=${encodeURIComponent(query)}`);
  },

  // Get all plans
  getPlans: async () => {
    return axiosInstance.get('/admin/plans');
  },

  // Update merchant status
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
