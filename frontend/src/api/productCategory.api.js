import axiosInstance from './axios';

export const productCategoryAPI = {
  // Get the authenticated merchant's own categories (incl. inactive)
  getMine: async () => {
    return axiosInstance.get('/product-categories/merchant/me');
  },

  // Get a merchant's active categories (public)
  getByMerchant: async (merchantId) => {
    return axiosInstance.get(`/product-categories/merchant/${merchantId}`);
  },

  create: async (data) => {
    return axiosInstance.post('/product-categories', data);
  },

  update: async (id, data) => {
    return axiosInstance.put(`/product-categories/${id}`, data);
  },

  delete: async (id) => {
    return axiosInstance.delete(`/product-categories/${id}`);
  },
};
