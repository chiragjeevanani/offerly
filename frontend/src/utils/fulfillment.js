// Pickup vs delivery, chosen in the cart and read again at checkout, plus the
// customer's last delivery address so the next order is pre-filled. Storage can
// throw (private mode), so every access is guarded.
const METHOD_KEY = 'offerly_fulfillment';
const ADDRESS_KEY = 'offerly_delivery_address';

export const getFulfillment = () => {
  try {
    return sessionStorage.getItem(METHOD_KEY) === 'delivery' ? 'delivery' : 'pickup';
  } catch {
    return 'pickup';
  }
};

export const setFulfillment = (method) => {
  try {
    sessionStorage.setItem(METHOD_KEY, method === 'delivery' ? 'delivery' : 'pickup');
  } catch {
    // not remembered - the cart defaults to pickup
  }
};

export const getSavedAddress = () => {
  try {
    return JSON.parse(localStorage.getItem(ADDRESS_KEY) || 'null');
  } catch {
    return null;
  }
};

export const saveAddress = (address) => {
  try {
    localStorage.setItem(ADDRESS_KEY, JSON.stringify(address));
  } catch {
    // fine - the form is just not pre-filled next time
  }
};
