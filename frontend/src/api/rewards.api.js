import axiosInstance from './axios';

export const rewardsAPI = {
  // ==========================================
  // CUSTOMER ENDPOINTS
  // ==========================================
  getMyProgress: async () => {
    return axiosInstance.get('/rewards/progress');
  },

  getMyCards: async (status) => {
    const params = status ? { status } : {};
    return axiosInstance.get('/rewards/my-cards', { params });
  },

  scratchCard: async (cardId) => {
    return axiosInstance.post(`/rewards/scratch/${cardId}`);
  },

  // ==========================================
  // ADMIN ENDPOINTS
  // ==========================================
  getAdminMilestones: async () => {
    return axiosInstance.get('/rewards/admin/milestones');
  },

  createAdminMilestone: async (data) => {
    return axiosInstance.post('/rewards/admin/milestones', data);
  },

  updateAdminMilestone: async (id, data) => {
    return axiosInstance.put(`/rewards/admin/milestones/${id}`, data);
  },

  deleteAdminMilestone: async (id) => {
    return axiosInstance.delete(`/rewards/admin/milestones/${id}`);
  },

  getAdminRewards: async () => {
    return axiosInstance.get('/rewards/admin/rewards');
  },

  createAdminReward: async (data) => {
    return axiosInstance.post('/rewards/admin/rewards', data);
  },

  updateAdminReward: async (id, data) => {
    return axiosInstance.put(`/rewards/admin/rewards/${id}`, data);
  },

  deleteAdminReward: async (id) => {
    return axiosInstance.delete(`/rewards/admin/rewards/${id}`);
  },

  getAdminCards: async (params) => {
    return axiosInstance.get('/rewards/admin/cards', { params });
  },

  triggerAdminCheck: async (userId) => {
    return axiosInstance.post('/rewards/admin/trigger-check', { userId });
  },
};
