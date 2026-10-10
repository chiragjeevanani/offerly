import { createContext, useContext, useMemo } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { FilterProvider, useFilter } from './FilterContext';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  return (
    <AuthProvider>
      <FilterProvider>
        <AppWrapper>{children}</AppWrapper>
      </FilterProvider>
    </AuthProvider>
  );
};

// Legacy no-op / deprecated stubs. Module-level so their identity never changes.
const refreshUnread = () => {};
const getOffers = () => { console.warn('getOffers from context is deprecated. Use offerAPI directly.'); return []; };
const getMerchants = () => { console.warn('getMerchants from context is deprecated. Use merchantAPI directly.'); return []; };

// Helper component to combine context values for useApp
const AppWrapper = ({ children }) => {
  const auth = useAuth();
  const filters = useFilter();

  // Both parents hand over stable objects until their own state changes, so the
  // merged value only changes when something a consumer could care about did.
  const value = useMemo(
    () => ({
      ...auth,
      ...filters,
      refreshUnread,
      getOffers,
      getMerchants,
    }),
    [auth, filters]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default AppContext;
