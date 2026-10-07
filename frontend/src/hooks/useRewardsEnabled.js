import { useQuery } from '@tanstack/react-query';
import { rewardsAPI } from '../api/rewards.api';

// Whether admin has the Claim Milestones & Rewards feature switched on
// platform-wide. Shared React Query cache so the home banner, nav items and
// the /rewards route all reuse one fetch. Reports `false` until loaded so the
// rewards UI never flashes in and then disappears when the feature is off.
export const useRewardsEnabled = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['rewardsSettings'],
    queryFn: () => rewardsAPI.getSettings(),
    staleTime: 60_000,
  });

  return {
    enabled: data?.enabled === true,
    isLoading,
  };
};

export default useRewardsEnabled;
