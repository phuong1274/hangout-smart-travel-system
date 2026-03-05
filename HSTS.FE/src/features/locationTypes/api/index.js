import apiClient from '@/lib/axios';

export const getLocationTypesApi = (params) => {
  return apiClient.get('/LocationTypes', { params });
};

export const getLocationTypeByIdApi = (id) => {
  return apiClient.get(`/LocationTypes/${id}`);
};

export const createLocationTypeApi = (data) => {
  return apiClient.post('/LocationTypes', data);
};

export const updateLocationTypeApi = (id, data) => {
  return apiClient.put(`/LocationTypes/${id}`, data);
};

export const deleteLocationTypeApi = (id) => {
  return apiClient.delete(`/LocationTypes/${id}`);
};
