import apiClient from '@/lib/axios';

export const getAmenitiesApi = (params) => {
  return apiClient.get('/api/Amenities', { params }).then(res => res.data);
};

export const getAmenityByIdApi = (id) => {
  return apiClient.get(`/api/Amenities/${id}`).then(res => res.data);
};

export const createAmenityApi = (data) => {
  return apiClient.post('/api/Amenities', data).then(res => res.data);
};

export const updateAmenityApi = (id, data) => {
  return apiClient.put(`/api/Amenities/${id}`, data).then(res => res.data);
};

export const deleteAmenityApi = (id) => {
  return apiClient.delete(`/api/Amenities/${id}`).then(res => res.data);
};
