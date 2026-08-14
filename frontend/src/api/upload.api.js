import axios from './axios';

export const uploadAPI = {
  // Upload single image
  uploadImage: async (file) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await axios.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response;
    } catch (error) {
      console.error('Upload image error:', error);
      throw error;
    }
  },

  // Upload multiple images
  uploadImages: async (files) => {
    try {
      const formData = new FormData();
      
      // Append all files
      files.forEach((file) => {
        formData.append(`images`, file);
      });

      const response = await axios.post('/upload/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response;
    } catch (error) {
      console.error('Upload images error:', error);
      throw error;
    }
  },

  // Helper function to convert base64 to file
  base64ToFile: (base64String, filename) => {
    const arr = base64String.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    
    return new File([u8arr], filename, { type: mime });
  }
};
