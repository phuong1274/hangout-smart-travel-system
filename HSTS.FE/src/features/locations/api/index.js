import apiClient from '@/lib/axios';

export const getLocationsApi = (params) => {
  return apiClient.get('/api/Locations', { params }).then(res => res.data);
};

export const getPublicLocationsApi = (params) => {
  return apiClient.get('/api/PublicLocations', { params }).then(res => res.data);
};

export const getLocationByIdApi = (id) => {
  return apiClient.get(`/api/Locations/${id}`).then(res => res.data);
};

export const getPublicLocationDetailApi = (id) => {
  return apiClient.get(`/api/PublicLocations/${id}`).then(res => res.data);
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

// Check for potentially duplicate locations by name similarity
export const checkDuplicateLocationApi = ({ name, latitude, longitude, radiusKm = 5 }) => {
  const params = { name };
  if (latitude != null) params.latitude = latitude;
  if (longitude != null) params.longitude = longitude;
  if (radiusKm != null) params.radiusKm = radiusKm;
  return apiClient.get('/api/Locations/check-duplicate', { params }).then(res => res.data);
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

export const getAllAmenitiesApi = (params) => {
  return apiClient.get('/api/Amenities', { params }).then(res => res.data);
};

export const getAllProvincesApi = () => {
  return apiClient.get('/api/common/provinces').then(res => res.data);
};

export const getDistrictsByProvinceApi = (provinceId) => {
  return apiClient.get(`/api/common/provinces/${provinceId}/districts`).then(res => res.data);
};

// Import from location-submissions for SuggestEditModal
export { createLocationSubmissionApi } from '@/features/location-submissions/api';
