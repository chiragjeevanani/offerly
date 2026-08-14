import axiosInstance from './axios';

export const reviewAPI = {
  // Create a new review
  create: async (data) => {
    return axiosInstance.post('/reviews', data);
  },

  // Get reviews for a specific merchant
  getMerchantReviews: async (merchantId) => {
    return axiosInstance.get(`/reviews/merchant/${merchantId}`);
  },
};
