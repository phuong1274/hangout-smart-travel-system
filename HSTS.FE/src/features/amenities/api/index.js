import apiClient from '@/lib/axios';

export const getAmenitiesApi = (params) => {
  return apiClient.get('/Amenities', { params });
};

export const getAmenityByIdApi = (id) => {
  return apiClient.get(`/Amenities/${id}`);
};

export const createAmenityApi = (data) => {
  return apiClient.post('/Amenities', data);
};

export const updateAmenityApi = (id, data) => {
  return apiClient.put(`/Amenities/${id}`, data);
};

export const deleteAmenityApi = (id) => {
  return apiClient.delete(`/Amenities/${id}`);
};
