// Labels and colours for a delivery order's stage in the store's Bookings list.
export const DELIVERY_STAGE = {
  placed: { label: 'New order', cls: 'bg-blue-50 text-blue-600' },
  preparing: { label: 'Packing', cls: 'bg-amber-50 text-amber-600' },
  ready: { label: 'Packed', cls: 'bg-violet-50 text-violet-600' },
  picked_up: { label: 'Out for delivery', cls: 'bg-sky-50 text-sky-600' },
  delivered: { label: 'Delivered', cls: 'bg-green-50 text-green-600' },
  cancelled: { label: 'Cancelled', cls: 'bg-gray-100 text-gray-500' },
};
