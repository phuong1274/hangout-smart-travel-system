import apiClient from '@/lib/axios';

export const getLocationTypesApi = (params) => {
  return apiClient.get('/LocationTypes', { params }).then(res => res.data);
};

export const getLocationTypeByIdApi = (id) => {
  return apiClient.get(`/LocationTypes/${id}`).then(res => res.data);
};

export const createLocationTypeApi = (data) => {
  return apiClient.post('/LocationTypes', data).then(res => res.data);
};

export const updateLocationTypeApi = (id, data) => {
  return apiClient.put(`/LocationTypes/${id}`, data).then(res => res.data);
};

export const deleteLocationTypeApi = (id) => {
  return apiClient.delete(`/LocationTypes/${id}`).then(res => res.data);
};
