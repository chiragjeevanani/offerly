import axiosInstance from './axios';

export const categoryAPI = {
  getAll: async () => {
    return axiosInstance.get('/categories');
  },
  
  getById: async (id) => {
    return axiosInstance.get(`/categories/${id}`);
  },
  
  getAllAdmin: async () => {
    return axiosInstance.get('/admin/categories');
  },
  
  create: async (data) => {
    return axiosInstance.post('/admin/categories', data);
  },
  
  update: async (id, data) => {
    return axiosInstance.put(`/admin/categories/${id}`, data);
  },
  
  delete: async (id) => {
    return axiosInstance.delete(`/admin/categories/${id}`);
  },
  
  toggle: async (id) => {
    return axiosInstance.patch(`/admin/categories/${id}/toggle`);
  },
  
  updateCounts: async (id) => {
    return axiosInstance.patch(`/admin/categories/${id}/update-counts`);
  },
};
