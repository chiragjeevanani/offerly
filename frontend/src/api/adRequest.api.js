import axiosInstance from './axios';

export const adAPI = {
  // Get approved ads (public)
  getApproved: async (params) => {
    return axiosInstance.get('/admin/ads/approved', { params });
  },
};
