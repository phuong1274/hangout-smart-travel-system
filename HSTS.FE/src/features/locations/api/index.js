import apiClient from '@/lib/axios';

export const getLocationsApi = (params) => {
  return apiClient.get('/api/Locations', { params }).then(res => res.data);
};

export const getLocationByIdApi = (id) => {
  return apiClient.get(`/api/Locations/${id}`).then(res => res.data);
};

export const createLocationApi = (data) => {
  return apiClient.post('/api/Locations', data).then(res => res.data);
};

export const updateLocationApi = (id, data) => {
  return apiClient.put(`/api/Locations/${id}`, data).then(res => res.data);
};

export const deleteLocationApi = (id) => {
  return apiClient.delete(`/api/Locations/${id}`).then(res => res.data);
};

// Dropdown data APIs
export const getAllTagsApi = () => {
  return apiClient.get('/api/Tags').then(res => res.data);
};

export const getAllDestinationsApi = () => {
  return apiClient.get('/api/Destinations').then(res => res.data);
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

export const getAllAmenitiesApi = () => {
  return apiClient.get('/api/Amenities').then(res => res.data);
};
