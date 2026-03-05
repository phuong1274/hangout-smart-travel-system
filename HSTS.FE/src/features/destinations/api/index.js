import apiClient from '@/lib/axios';

export const getDestinationsApi = (params) => {
  return apiClient.get('/Destinations', { params });
};

export const getDestinationByIdApi = (id) => {
  return apiClient.get(`/Destinations/${id}`);
};

export const createDestinationApi = (data) => {
  return apiClient.post('/Destinations', data);
};

export const updateDestinationApi = (id, data) => {
  return apiClient.put(`/Destinations/${id}`, data);
};

export const deleteDestinationApi = (id) => {
  return apiClient.delete(`/Destinations/${id}`);
};
