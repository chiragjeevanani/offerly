/**
 * Backend Helper for Store Offering Type (Product vs Service)
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

export const resolveStoreType = (storeType, category) => {
  if (storeType === 'service_based' || storeType === 'service') return 'service_based';
  if (isServiceCategory(category)) return 'service_based';
  return 'product_based';
};
