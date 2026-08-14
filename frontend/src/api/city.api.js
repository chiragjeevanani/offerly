import axiosInstance from './axios';

export const cityAPI = {
  // Get all active cities
  getAll: async () => {
    return axiosInstance.get('/cities');
  },

  // Get city by ID
  getById: async (id) => {
    return axiosInstance.get(`/cities/${id}`);
  },
};
