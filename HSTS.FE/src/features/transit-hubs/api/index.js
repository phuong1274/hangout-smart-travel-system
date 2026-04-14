import apiClient from '@/lib/axios';

export const getTransitHubsApi = (params) => {
  return apiClient.get('/api/transit-hubs', { params }).then(res => res.data);
};

export const getTransitHubByIdApi = (id) => {
  return apiClient.get(`/api/transit-hubs/${id}`).then(res => res.data);
};

export const getTransitHubTypesApi = () => {
  return apiClient.get('/api/transit-hubs/types').then(res => res.data);
};

export const getTransitHubsByTransportationApi = (transportationId) => {
  return apiClient.get(`/api/transit-hubs/by-transportation/${transportationId}`).then(res => res.data);
};

export const createTransitHubApi = (data) => {
  return apiClient.post('/api/transit-hubs', data).then(res => res.data);
};

export const updateTransitHubApi = (id, data) => {
  return apiClient.put(`/api/transit-hubs/${id}`, data).then(res => res.data);
};

export const deleteTransitHubApi = (id) => {
  return apiClient.delete(`/api/transit-hubs/${id}`).then(res => res.data);
};
