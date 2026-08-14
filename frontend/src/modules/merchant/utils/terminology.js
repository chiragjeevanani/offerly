// ─── Category-Based Terminology Helper ────────────────────────────────────────

/**
 * Get UI terminology based on merchant category
 * Adapts labels, titles, and field visibility for different business types
 */
export const getTerminology = (merchantCategory) => {
  const terminology = {
    'Food': {
      singular: 'Product',
      plural: 'Products',
      addButton: 'ADD NEW PRODUCT',
      pageTitle: 'Store Products',
      pageSubtitle: 'Manage your menu and catalog items',
      categoryLabel: 'Category',
      categoryPlaceholder: 'e.g. Main Course, Starters',
      showVegOption: true,
      showDuration: false,
      durationLabel: null
    },
    'Cafe': {
      singular: 'Product',
      plural: 'Products',
      addButton: 'ADD NEW PRODUCT',
      pageTitle: 'Cafe Menu',
      pageSubtitle: 'Manage your beverages and food items',
      categoryLabel: 'Category',
      categoryPlaceholder: 'e.g. Coffee, Pastries',
      showVegOption: true,
      showDuration: false,
      durationLabel: null
    },
    'Saloon': {
      singular: 'Service',
      plural: 'Services',
      addButton: 'ADD NEW SERVICE',
      pageTitle: 'Salon Services',
      pageSubtitle: 'Manage your service offerings',
      categoryLabel: 'Service Type',
      categoryPlaceholder: 'e.g. Hair Services, Skin Care',
      showVegOption: false,
      showDuration: true,
      durationLabel: 'Service Duration'
    },
    'Gym': {
      singular: 'Plan',
      plural: 'Plans',
      addButton: 'ADD NEW PLAN',
      pageTitle: 'Membership Plans',
      pageSubtitle: 'Manage your gym memberships and packages',
      categoryLabel: 'Plan Type',
      categoryPlaceholder: 'e.g. Membership Plans, Personal Training',
      showVegOption: false,
      showDuration: true,
      durationLabel: 'Plan Duration'
    },
    'Shops': {
      singular: 'Product',
      plural: 'Products',
      addButton: 'ADD NEW PRODUCT',
      pageTitle: 'Store Products',
      pageSubtitle: 'Manage your product inventory',
      categoryLabel: 'Category',
      categoryPlaceholder: 'e.g. Groceries, Electronics',
      showVegOption: false,
      showDuration: false,
      durationLabel: null
    },
    'Services': {
      singular: 'Service',
      plural: 'Services',
      addButton: 'ADD NEW SERVICE',
      pageTitle: 'Service Offerings',
      pageSubtitle: 'Manage your service catalog',
      categoryLabel: 'Service Type',
      categoryPlaceholder: 'e.g. Plumbing, Electrical',
      showVegOption: false,
      showDuration: true,
      durationLabel: 'Service Duration'
    },
    'Health': {
      singular: 'Service',
      plural: 'Services',
      addButton: 'ADD NEW SERVICE',
      pageTitle: 'Health Services',
      pageSubtitle: 'Manage your health and wellness services',
      categoryLabel: 'Service Type',
      categoryPlaceholder: 'e.g. Consultation, Therapy',
      showVegOption: false,
      showDuration: true,
      durationLabel: 'Session Duration'
    },
    'Fashion': {
      singular: 'Product',
      plural: 'Products',
      addButton: 'ADD NEW PRODUCT',
      pageTitle: 'Fashion Products',
      pageSubtitle: 'Manage your fashion inventory',
      categoryLabel: 'Category',
      categoryPlaceholder: 'e.g. Clothing, Accessories',
      showVegOption: false,
      showDuration: false,
      durationLabel: null
    }
  };
  
  // Default to Food if category not found
  return terminology[merchantCategory] || terminology['Food'];
};

/**
 * Get category suggestions based on merchant type
 * Provides relevant category options for dropdown
 */
export const getCategorySuggestions = (merchantCategory) => {
  const suggestions = {
    'Food': ['Starters', 'Main Course', 'Desserts', 'Beverages', 'Combos', 'Snacks'],
    'Cafe': ['Coffee', 'Tea', 'Snacks', 'Pastries', 'Sandwiches', 'Smoothies'],
    'Saloon': ['Hair Services', 'Skin Care', 'Nail Care', 'Makeup', 'Spa Treatments', 'Bridal Packages'],
    'Gym': ['Membership Plans', 'Personal Training', 'Group Classes', 'Supplements', 'Diet Plans'],
    'Shops': ['Groceries', 'Electronics', 'Clothing', 'Home Essentials', 'Stationery'],
    'Services': ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Repair'],
    'Health': ['Consultation', 'Therapy', 'Diagnostics', 'Wellness Programs', 'Yoga Classes'],
    'Fashion': ['Clothing', 'Footwear', 'Accessories', 'Jewelry', 'Bags']
  };
  
  return suggestions[merchantCategory] || ['General'];
};

/**
 * Get duration options for services/plans
 * Used in duration dropdown for time-based offerings
 */
export const getDurationOptions = () => {
  return [
    '15 mins',
    '30 mins',
    '45 mins',
    '1 hour',
    '1.5 hours',
    '2 hours',
    '3 hours',
    '1 day',
    '1 week',
    '1 month',
    '3 months',
    '6 months',
    '1 year'
  ];
};
