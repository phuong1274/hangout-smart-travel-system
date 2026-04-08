import apiClient from '@/lib/axios';

// Generate itinerary from trip plan request
export const generateItineraryApi = (data) => {
  return apiClient.post('/api/Itineraries/generate', data, { timeout: 120000 }).then(res => res.data);
};

// Get all provinces for dropdown
export const getProvincesApi = () => {
  return apiClient.get('/api/common/provinces').then(res => res.data);
};

// Get districts by province
export const getDistrictsByProvinceApi = (provinceId) => {
  return apiClient.get(`/api/common/provinces/${provinceId}/districts`).then(res => res.data);
};

// Get all districts
export const getAllDistrictsApi = () => {
  return apiClient.get('/api/common/districts').then(res => res.data);
};

// Get root tags (level 1)
export const getRootTagsApi = () => {
  return apiClient.get('/api/Tags/root').then(res => res.data);
};

// Get child tags by parent
export const getChildTagsApi = (parentTagId) => {
  return apiClient.get(`/api/Tags/parent/${parentTagId}`).then(res => res.data);
};

// Get location detail by id
export const getLocationByIdApi = (id) => {
  return apiClient.get(`/api/Locations/${id}`).then(res => res.data);
};

// Get all location types
export const getLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

// Get all amenities
export const getAmenitiesApi = () => {
  return apiClient.get('/api/Amenities').then(res => res.data);
};
