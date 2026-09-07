import { useQuery } from '@tanstack/react-query';
import { userAPI } from '../api/user.api';
import { useApp } from '../modules/customer/context/AppContext';

// Shared status for the customer subscription claim-gate: whether admin has
// the gate switched on platform-wide, and whether this customer is currently
// subscribed. Backed by React Query's cache so every consumer (cart, claim
// screen, paywall) shares one fetch instead of re-checking independently.
export const useCustomerSubscription = () => {
  const { isLoggedIn, user } = useApp();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['customerSubscriptionStatus'],
    queryFn: () => userAPI.getSubscriptionStatus(),
    enabled: isLoggedIn && user?.type === 'customer',
    staleTime: 60_000,
  });

  return {
    enabled: Boolean(data?.enabled),
    isSubscribed: Boolean(data?.isSubscribed),
    subscription: data?.subscription || null,
    isLoading,
    refetch,
  };
};

export default useCustomerSubscription;
