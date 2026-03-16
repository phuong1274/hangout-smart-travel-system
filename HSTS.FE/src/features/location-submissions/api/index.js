import apiClient from '@/lib/axios';

export const getMySubmissionsApi = (params) => {
  return apiClient.get('/LocationSubmissions/my', { params }).then(res => res.data);
};

export const getSubmissionByIdApi = (id) => {
  return apiClient.get(`/LocationSubmissions/${id}`).then(res => res.data);
};

export const createLocationSubmissionApi = (data) => {
  return apiClient.post('/LocationSubmissions', data).then(res => res.data);
};

export const updateLocationSubmissionApi = (id, data) => {
  return apiClient.put(`/LocationSubmissions/${id}`, data).then(res => res.data);
};

export const reviewSubmissionApi = (id, data) => {
  return apiClient.post(`/LocationSubmissions/${id}/review`, data).then(res => res.data);
};

export const getAllSubmissionsApi = (params) => {
  return apiClient.get('/LocationSubmissions/admin/all', { params }).then(res => res.data);
};

export const deleteLocationSubmissionApi = (id) => {
  return apiClient.delete(`/LocationSubmissions/${id}`).then(res => res.data);
};

export const getAllDestinationsApi = () => {
  return apiClient.get('/Destinations').then(res => res.data);
};

export const getAllLocationTypesApi = () => {
  return apiClient.get('/LocationTypes').then(res => res.data);
};

export const getAllAmenitiesApi = () => {
  return apiClient.get('/Amenities').then(res => res.data);
};

export const getAllTagsApi = () => {
  return apiClient.get('/Tags').then(res => res.data);
};
