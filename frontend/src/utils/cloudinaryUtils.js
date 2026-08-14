/**
 * Cloudinary image transformation utility
 * Optimizes images by injecting transformation parameters into Cloudinary URLs
 */

export const getOptimizedImageUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string') return url;
  
  // Only transform Cloudinary URLs
  if (!url.includes('cloudinary.com')) return url;

  const {
    width = 400,
    height = 400,
    crop = 'fill',
    quality = 'auto',
    format = 'auto'
  } = options;

  // Cloudinary URL format: https://res.cloudinary.com/demo/image/upload/v1570975164/sample.jpg
  // We want to inject: /upload/c_fill,h_400,w_400,f_auto,q_auto/
  
  const uploadIndex = url.indexOf('/upload/');
  if (uploadIndex === -1) return url;

  const prefix = url.substring(0, uploadIndex + 8);
  const suffix = url.substring(uploadIndex + 8);
  
  const transformations = `c_${crop},h_${height},w_${width},f_${format},q_${quality}/`;
  
  return `${prefix}${transformations}${suffix}`;
};
