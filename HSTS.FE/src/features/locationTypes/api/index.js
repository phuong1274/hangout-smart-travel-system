import apiClient from '@/lib/axios';

export const getLocationTypesApi = (params) => {
  return apiClient.get('/api/LocationTypes', { params }).then(res => res.data);
};

export const getLocationTypeByIdApi = (id) => {
  return apiClient.get(`/api/LocationTypes/${id}`).then(res => res.data);
};

export const createLocationTypeApi = (data) => {
  return apiClient.post('/api/LocationTypes', data).then(res => res.data);
};

export const updateLocationTypeApi = (id, data) => {
  return apiClient.put(`/api/LocationTypes/${id}`, data).then(res => res.data);
};

export const deleteLocationTypeApi = (id) => {
  return apiClient.delete(`/api/LocationTypes/${id}`).then(res => res.data);
};
