import apiClient from '@/lib/axios';

/**
 * Fetches dashboard statistics.
 * Maps to the BE home/stats endpoint (placeholder).
 */
export const getHomeStatsApi = () => {
  return apiClient.get('/Home/Stats');
};
