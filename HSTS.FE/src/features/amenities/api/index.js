import apiClient from '@/lib/axios';

export const getAmenitiesApi = (params) => {
  return apiClient.get('/Amenities', { params }).then(res => res.data);
};

export const getAmenityByIdApi = (id) => {
  return apiClient.get(`/Amenities/${id}`).then(res => res.data);
};

export const createAmenityApi = (data) => {
  return apiClient.post('/Amenities', data).then(res => res.data);
};

export const updateAmenityApi = (id, data) => {
  return apiClient.put(`/Amenities/${id}`, data).then(res => res.data);
};

export const deleteAmenityApi = (id) => {
  return apiClient.delete(`/Amenities/${id}`).then(res => res.data);
};
