// Last-loaded data per store ({ merchant, products, offers, reviews, cart }),
// kept for the life of the tab. Coming Back from the cart re-ran five API calls
// behind a spinner, which on slow networks read as a blank white screen; now
// the cached copy paints instantly and refreshes in the background. Shared by
// the store page and the product page.
export const storeCache = new Map();
