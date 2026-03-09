import apiClient from '@/lib/axios';

export const getDestinationsApi = (params) => {
  return apiClient.get('/Destinations', { params }).then(res => res.data);
};

export const getDestinationByIdApi = (id) => {
  return apiClient.get(`/Destinations/${id}`).then(res => res.data);
};

export const createDestinationApi = (data) => {
  return apiClient.post('/Destinations', data).then(res => res.data);
};

export const updateDestinationApi = (id, data) => {
  return apiClient.put(`/Destinations/${id}`, data).then(res => res.data);
};

export const deleteDestinationApi = (id) => {
  return apiClient.delete(`/Destinations/${id}`).then(res => res.data);
};
