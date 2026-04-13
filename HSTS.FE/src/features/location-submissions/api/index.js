import apiClient from '@/lib/axios';

export const getMySubmissionsApi = (params) => {
  return apiClient.get('/api/LocationSubmissions/my', { params }).then(res => res.data);
};

export const getSubmissionByIdApi = (id) => {
  return apiClient.get(`/api/LocationSubmissions/${id}`).then(res => res.data);
};

export const createLocationSubmissionApi = (data) => {
  return apiClient.post('/api/LocationSubmissions', data).then(res => res.data);
};

export const updateLocationSubmissionApi = (id, data) => {
  return apiClient.put(`/api/LocationSubmissions/${id}`, data).then(res => res.data);
};

export const reviewSubmissionApi = (id, data) => {
  return apiClient.post(`/api/LocationSubmissions/${id}/review`, data).then(res => res.data);
};

export const getAllSubmissionsApi = (params) => {
  return apiClient.get('/api/LocationSubmissions/admin/all', { params }).then(res => res.data);
};

export const deleteLocationSubmissionApi = (id) => {
  return apiClient.delete(`/api/LocationSubmissions/${id}`).then(res => res.data);
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

export const getAllTagsApi = (params) => {
  return apiClient.get('/api/Tags', { params }).then(res => res.data);
};

