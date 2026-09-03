/**
 * Global Helper for Store Offering Type (Product vs Service) and Food/Veg Indicator Detection.
 */

const SERVICE_KEYWORDS = [
  'salon', 'saloon', 'spa', 'hair', 'beauty', 'parlour', 'parlor',
  'gym', 'fitness', 'yoga', 'wellness', 'crossfit', 'workout', 'training',
  'clinic', 'hospital', 'healthcare', 'dental', 'dentist', 'therapy', 'physio',
  'tour', 'tours', 'travel', 'hotel', 'resort', 'homestay', 'stay',
  'service', 'services', 'repair', 'cleaning', 'laundry', 'car wash', 'auto service',
  'education', 'coaching', 'class', 'classes', 'tutoring', 'academy',
  'photography', 'studio', 'event', 'catering', 'consulting', 'massage', 'grooming'
];

const FOOD_KEYWORDS = [
  'food', 'restaurant', 'restaurants', 'cafe', 'bistro', 'bakery',
  'dining', 'eatery', 'bar', 'sweets', 'dessert', 'desserts',
  'fast food', 'cloud kitchen', 'diner', 'pizzeria', 'dhaba', 'burger', 'pizza', 'biryani'
];

export const isServiceCategory = (category) => {
  if (!category) return false;
  const name = String(category).toLowerCase().trim();
  return SERVICE_KEYWORDS.some(k => name.includes(k));
};

export const isFoodCategory = (category) => {
  if (!category) return false;
  const name = String(category).toLowerCase().trim();
  return FOOD_KEYWORDS.some(k => name.includes(k));
};

/**
 * Returns true if the store offering is service-based, false if product-based.
 * Intelligently checks:
 * 1. Explicit merchant.storeType === 'service_based'
 * 2. Category name (e.g. Saloon, Salon, Spa, Gym, Clinic)
 * 3. Majority of catalog items having categoryType === 'service_based' or duration
 */
export const checkIsServiceStore = (merchant, products = []) => {
  // 1. Explicit merchant storeType
  if (merchant?.storeType === 'service_based' || merchant?.storeType === 'service') {
    return true;
  }
  // 2. Category is an established service category (e.g. Saloon, Salon, Spa, Gym)
  if (isServiceCategory(merchant?.category)) {
    return true;
  }
  // 3. Products list has service items or duration or service category names
  if (products && products.length > 0) {
    const serviceCount = products.filter(p => 
      p.categoryType === 'service_based' || 
      p.duration || 
      (p.categoryName && isServiceCategory(p.categoryName)) ||
      (p.category && isServiceCategory(p.category))
    ).length;
    if (serviceCount > 0 && serviceCount >= products.length / 2) {
      return true;
    }
  }
  // 4. Default to product_based
  return false;
};

/**
 * Returns label for store catalog: 'Services' or 'Products'
 */
export const getCatalogLabel = (merchant, products = []) => {
  return checkIsServiceStore(merchant, products) ? 'Services' : 'Products';
};

/**
 * Check if veg/nonveg indicator should be rendered for an item.
 * ONLY allowed for food/restaurant categories and when merchant explicitly chose it.
 */
export const shouldShowVegIndicator = (merchant, product) => {
  if (!product) return false;
  // If the product itself is service-based, NEVER show veg/nonveg
  if (product.categoryType === 'service_based' || product.duration) {
    return false;
  }
  // If the store is service-based, NEVER show veg/nonveg
  if (checkIsServiceStore(merchant)) {
    return false;
  }
  // Must be in a food/restaurant category
  const isFood = isFoodCategory(merchant?.category) || 
                 isFoodCategory(product.categoryName) || 
                 isFoodCategory(product.category);
  if (!isFood) {
    return false;
  }
  // Must be explicitly boolean (true or false, never null/undefined)
  return product.isVeg === true || product.isVeg === false;
};
