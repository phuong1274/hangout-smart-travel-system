import apiClient from '@/lib/axios';

export const getClosuresByLocationApi = (locationId) =>
  apiClient.get(`/api/LocationClosures/location/${locationId}`).then(res => res.data);

export const createClosureApi = (data) =>
  apiClient.post('/api/LocationClosures', data).then(res => res.data);

export const endClosureApi = (id) =>
  apiClient.post(`/api/LocationClosures/${id}/end`).then(res => res.data);
