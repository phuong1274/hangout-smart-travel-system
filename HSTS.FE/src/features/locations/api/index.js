import apiClient from '@/lib/axios';

export const getLocationsApi = (params) => {
  return apiClient.get('/api/Locations', { params }).then(res => res.data);
};

export const getLocationByIdApi = (id) => {
  return apiClient.get(`/api/Locations/${id}`).then(res => res.data);
};

export const getPartnerLocationsApi = (params) => {
  return apiClient.get('/api/Locations/partner/my', { params }).then(res => res.data);
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
export const getAllTagsApi = (params) => {
  return apiClient.get('/api/Tags', { params }).then(res => res.data);
};

export const getAllDistrictsApi = () => {
  return apiClient.get('/api/common/districts').then(res => res.data);
};

// Alias for backward compatibility
export const getAllDestinationsApi = getAllDistrictsApi;

export const getAllLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

export const getAllAmenitiesApi = () => {
  return apiClient.get('/api/Amenities').then(res => res.data);
};

export const getAllProvincesApi = () => {
  return apiClient.get('/api/common/provinces').then(res => res.data);
};

export const getDistrictsByProvinceApi = (provinceId) => {
  return apiClient.get(`/api/common/provinces/${provinceId}/districts`).then(res => res.data);
};

// Import from location-submissions for SuggestEditModal
export { createLocationSubmissionApi } from '@/features/location-submissions/api';
