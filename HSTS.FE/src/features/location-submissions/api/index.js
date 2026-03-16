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

export const getAllDestinationsApi = () => {
  return apiClient.get('/api/Destinations').then(res => res.data);
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/api/LocationTypes').then(res => res.data);
};

export const getAllAmenitiesApi = () => {
  return apiClient.get('/api/Amenities').then(res => res.data);
};

export const getAllTagsApi = () => {
  return apiClient.get('/api/Tags').then(res => res.data);
};
