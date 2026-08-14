import { createContext, useContext, useCallback } from 'react';
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

// Helper component to combine context values for useApp
const AppWrapper = ({ children }) => {
  const auth = useAuth();
  const filters = useFilter();

  const value = {
    ...auth,
    ...filters,
    // Add any legacy or combined methods here
    refreshUnread: useCallback(() => {}, []),
    getOffers: () => { console.warn('getOffers from context is deprecated. Use offerAPI directly.'); return []; },
    getMerchants: () => { console.warn('getMerchants from context is deprecated. Use merchantAPI directly.'); return []; },
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};

export default AppContext;
