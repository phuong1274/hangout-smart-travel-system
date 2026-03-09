import apiClient from '@/lib/axios';

export const getLocationsApi = (params) => {
  return apiClient.get('/Locations', { params }).then(res => res.data);
};

export const getLocationByIdApi = (id) => {
  return apiClient.get(`/Locations/${id}`).then(res => res.data);
};

export const createLocationApi = (data) => {
  return apiClient.post('/Locations', data).then(res => res.data);
};

export const updateLocationApi = (id, data) => {
  return apiClient.put(`/Locations/${id}`, data).then(res => res.data);
};

export const deleteLocationApi = (id) => {
  return apiClient.delete(`/Locations/${id}`).then(res => res.data);
};

// Dropdown data APIs
export const getAllTagsApi = () => {
  return apiClient.get('/common/tags').then(res => res.data);
};

export const getAllDestinationsApi = () => {
  return apiClient.get('/common/destinations').then(res => res.data);
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/common/location-types').then(res => res.data);
};

export const getAllAmenitiesApi = () => {
  return apiClient.get('/common/amenities').then(res => res.data);
};
