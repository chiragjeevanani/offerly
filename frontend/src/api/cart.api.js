import axiosInstance from './axios';

export const cartAPI = {
  // Get customer's cart
  getCart: async () => {
    return axiosInstance.get('/cart');
  },

  // Update cart (add/update item or remove item)
  // variantId picks the size/colour for products with variants
  updateCart: async (merchantId, productId, qty, variantId = null) => {
    return axiosInstance.put('/cart', { merchantId, productId, qty, variantId });
  },

  // Clear cart
  clearCart: async () => {
    return axiosInstance.delete('/cart');
  },
};
