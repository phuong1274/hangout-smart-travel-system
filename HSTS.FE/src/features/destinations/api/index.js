import apiClient from '@/lib/axios';

export const getDestinationsApi = (params) => {
  return apiClient.get('/api/Destinations', { params }).then(res => res.data);
};

export const getDestinationByIdApi = (id) => {
  return apiClient.get(`/api/Destinations/${id}`).then(res => res.data);
};

export const createDestinationApi = (data) => {
  return apiClient.post('/api/Destinations', data).then(res => res.data);
};

export const updateDestinationApi = (id, data) => {
  return apiClient.put(`/api/Destinations/${id}`, data).then(res => res.data);
};

export const deleteDestinationApi = (id) => {
  return apiClient.delete(`/api/Destinations/${id}`).then(res => res.data);
};

export const getCountriesApi = () => {
  return apiClient.get('/api/Locations/countries').then(res => res.data);
};

export const getStatesApi = (countryId) => {
  const params = countryId ? { countryId } : {};
  return apiClient.get('/api/Locations/states', { params }).then(res => res.data);
};
