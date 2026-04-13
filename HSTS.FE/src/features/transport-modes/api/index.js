import apiClient from '@/lib/axios';

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
