import axios from './axios';

export const variantAPI = {
  // Get all variants for a product
  getByProduct: async (productId) => {
    try {
      const response = await axios.get(`/variants/products/${productId}/variants`);
      return response;
    } catch (error) {
      console.error('Get variants error:', error);
      throw error;
    }
  },

  // Create new variant for a product
  create: async (productId, data) => {
    try {
      const response = await axios.post(`/variants/products/${productId}/variants`, data);
      return response;
    } catch (error) {
      console.error('Create variant error:', error);
      throw error;
    }
  },

  // Update variant
  update: async (productId, variantId, data) => {
    try {
      const response = await axios.put(`/variants/products/${productId}/variants/${variantId}`, data);
      return response;
    } catch (error) {
      console.error('Update variant error:', error);
      throw error;
    }
  },

  // Delete variant (soft delete)
  delete: async (productId, variantId) => {
    try {
      const response = await axios.delete(`/variants/products/${productId}/variants/${variantId}`);
      return response;
    } catch (error) {
      console.error('Delete variant error:', error);
      throw error;
    }
  }
};
