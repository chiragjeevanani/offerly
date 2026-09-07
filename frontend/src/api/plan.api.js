import axiosInstance from './axios';

export const planAPI = {
  // Get all active plans (optionally filtered, e.g. { planType: 'customer' })
  getAll: async (params = {}) => {
    return axiosInstance.get('/plans', { params });
  },

  // Get plan by ID
  getById: async (id) => {
    return axiosInstance.get(`/plans/${id}`);
  },
};
