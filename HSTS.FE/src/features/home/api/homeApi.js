import apiClient from '@/lib/axios';

export const getHomeDiscoveryApi = () => {
  return apiClient.get('/api/Home/discovery').then((res) => res.data);
};

export const getHomeDestinationsApi = () => {
  return apiClient.get('/api/Home/destinations').then((res) => res.data);
};

export const getHomeStatsApi = () => {
  return apiClient.get('/api/Home/discovery').then((res) => res.data?.socialProof?.stats || []);
};
