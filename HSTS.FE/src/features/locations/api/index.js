import apiClient from '@/lib/axios';

export const getLocationsApi = (params) => {
  return apiClient.get('/Locations', { params });
};

export const getLocationByIdApi = (id) => {
  return apiClient.get(`/Locations/${id}`);
};

export const createLocationApi = (data) => {
  return apiClient.post('/Locations', data);
};

export const updateLocationApi = (id, data) => {
  return apiClient.put(`/Locations/${id}`, data);
};

export const deleteLocationApi = (id) => {
  return apiClient.delete(`/Locations/${id}`);
};

// Dropdown data APIs
export const getAllTagsApi = () => {
  return apiClient.get('/common/tags');
};

export const getAllDestinationsApi = () => {
  return apiClient.get('/common/destinations');
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/common/location-types');
};
