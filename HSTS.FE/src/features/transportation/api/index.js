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

export const getTransportModesApi = (params) => {
  return apiClient.get('/api/transport-modes', { params }).then(res => res.data);
};

export const getTransportModeByIdApi = (id) => {
  return apiClient.get(`/api/transport-modes/${id}`).then(res => res.data);
};

export const createTransportModeApi = (data) => {
  return apiClient.post('/api/transport-modes', data).then(res => res.data);
};

export const updateTransportModeApi = (id, data) => {
  return apiClient.put(`/api/transport-modes/${id}`, data).then(res => res.data);
};

export const deleteTransportModeApi = (id) => {
  return apiClient.delete(`/api/transport-modes/${id}`).then(res => res.data);
};

export const getLocalTransportMetricsApi = (params) => {
  return apiClient.get('/api/local-transport-metrics', { params }).then(res => res.data);
};

export const getLocalTransportMetricByIdApi = (transportationId) => {
  return apiClient.get(`/api/local-transport-metrics/${transportationId}`).then(res => res.data);
};

export const createLocalTransportMetricApi = (data) => {
  return apiClient.post('/api/local-transport-metrics', data).then(res => res.data);
};

export const updateLocalTransportMetricApi = (transportationId, data) => {
  return apiClient.put(`/api/local-transport-metrics/${transportationId}`, data).then(res => res.data);
};

export const deleteLocalTransportMetricApi = (transportationId) => {
  return apiClient.delete(`/api/local-transport-metrics/${transportationId}`).then(res => res.data);
};