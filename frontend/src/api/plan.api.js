import axiosInstance from './axios';

export const planAPI = {
  // Get all active plans
  getAll: async () => {
    return axiosInstance.get('/plans');
  },

  // Get plan by ID
  getById: async (id) => {
    return axiosInstance.get(`/plans/${id}`);
  },
};
