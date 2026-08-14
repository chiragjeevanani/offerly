import axiosInstance from './axios';

export const cartAPI = {
  // Get customer's cart
  getCart: async () => {
    return axiosInstance.get('/cart');
  },

  // Update cart (add/update item or remove item)
  updateCart: async (merchantId, productId, qty) => {
    return axiosInstance.put('/cart', { merchantId, productId, qty });
  },

  // Clear cart
  clearCart: async () => {
    return axiosInstance.delete('/cart');
  },
};
