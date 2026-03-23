import { useQuery } from '@tanstack/react-query';
import { getHomeStatsApi } from '../api/homeApi';

/**
 * Custom hook to manage home dashboard statistics.
 * Utilizes React Query for server-state management.
 */
export const useHomeStats = () => {
  return useQuery({
    queryKey: ['homeStats'],
    queryFn: getHomeStatsApi,
    // Error is handled by global axios interceptor
  });
};
