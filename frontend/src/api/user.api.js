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

  // Push notifications (FCM device tokens)
  getPushTokens: async () => {
    return axiosInstance.get('/users/me/push-tokens');
  },

  registerPushToken: async ({ token, platform }) => {
    return axiosInstance.post('/users/me/push-tokens', { token, platform });
  },

  // `authToken` is for the logout path, where auth storage is cleared the
  // instant after this fires and the request interceptor would find nothing.
  unregisterPushToken: async (token, authToken) => {
    // DELETE with a body: axios needs it under `data`, not as the 2nd arg.
    return axiosInstance.delete('/users/me/push-tokens', {
      data: { token },
      ...(authToken ? { headers: { Authorization: `Bearer ${authToken}` } } : {}),
    });
  },

  sendTestPush: async () => {
    return axiosInstance.post('/users/me/push-tokens/test');
  },

  // Customer subscription (claim gate)
  getSubscriptionStatus: async () => {
    return axiosInstance.get('/users/me/subscription');
  },

  purchaseSubscription: async (planId) => {
    return axiosInstance.post('/users/me/subscription/purchase', { planId });
  },

  verifySubscription: async (payload) => {
    return axiosInstance.post('/users/me/subscription/verify', payload);
  },
};
