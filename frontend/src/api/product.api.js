import axiosInstance from './axios';

export const productAPI = {
  // Get all products for a merchant
  getByMerchant: async (merchantId = 'me') => {
    return axiosInstance.get(`/products/merchant/${merchantId}`);
  },

  // Get single product by ID
  getById: async (id) => {
    return axiosInstance.get(`/products/${id}`);
  },

  // Create new product
  create: async (data) => {
    return axiosInstance.post('/products', data);
  },

  // Update product
  update: async (id, data) => {
    return axiosInstance.put(`/products/${id}`, data);
  },

  // Delete product
  delete: async (id) => {
    return axiosInstance.delete(`/products/${id}`);
  },

  // Get product statistics
  getStats: async () => {
    return axiosInstance.get('/products/stats');
  },

  // Debug authentication
  debugAuth: async () => {
    return axiosInstance.get('/products/debug/auth');
  }
};
