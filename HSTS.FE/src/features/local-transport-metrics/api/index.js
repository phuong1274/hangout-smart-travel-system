import apiClient from '@/lib/axios';

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
