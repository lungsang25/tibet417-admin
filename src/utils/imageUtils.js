/**
 * Transforms Cloudinary URLs to serve optimized images
 * @param {string} url - Original Cloudinary URL
 * @param {object} options - Transformation options
 * @returns {string} - Optimized URL
 */
export const getOptimizedImage = (url, options = {}) => {
    const { width = 400, height = 400 } = options;
    
    if (url && url.includes('cloudinary.com')) {
        return url.replace('/upload/', `/upload/w_${width},h_${height},c_limit,q_auto,f_auto/`);
    }
    return url;
};

/**
 * Get thumbnail version of image (smaller size for lists)
 */
export const getThumbnail = (url) => {
    return getOptimizedImage(url, { width: 100, height: 100 });
};
