import axiosInstance from './axios';
import { API_ENDPOINTS } from '../config/constants';

export const userAPI = {
  // Get user profile
  getProfile: async () => {
    return axiosInstance.get(API_ENDPOINTS.GET_PROFILE);
  },
  
  // Update profile
  updateProfile: async (data) => {
    return axiosInstance.put(API_ENDPOINTS.GET_PROFILE, data);
  },
  
  // Get cities
  getCities: async () => {
    return axiosInstance.get(API_ENDPOINTS.GET_CITIES);
  },
  
  // Get plans
  getPlans: async () => {
    return axiosInstance.get(API_ENDPOINTS.GET_PLANS);
  },
  
  // Saved Offers
  getSavedOffers: async () => {
    return axiosInstance.get('/users/saved-offers');
  },
  
  toggleSavedOffer: async (offerId) => {
    return axiosInstance.post(`/users/saved-offers/${offerId}/toggle`);
  },
  // Notifications
  getNotifications: async () => {
    return axiosInstance.get('/users/notifications');
  },
  
  markNotificationRead: async (id) => {
    return axiosInstance.patch(`/users/notifications/${id}/read`);
  },

  markAllNotificationsRead: async () => {
    return axiosInstance.patch('/users/notifications/read-all');
  },

  // Referral
  getReferralHistory: async () => {
    return axiosInstance.get('/users/referrals/history');
  },

  redeemCredits: async (amount) => {
    return axiosInstance.post('/users/credits/redeem', { amount });
  },
};
