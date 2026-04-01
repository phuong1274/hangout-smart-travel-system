import apiClient from '@/lib/axios';

export const getDistrictsApi = (params) => {
  return apiClient.get('/api/Districts', { params }).then(res => res.data);
};

export const getDistrictByIdApi = (id) => {
  return apiClient.get(`/api/Districts/${id}`).then(res => res.data);
};

export const createDistrictApi = (data) => {
  return apiClient.post('/api/Districts', data).then(res => res.data);
};

export const updateDistrictApi = (id, data) => {
  return apiClient.put(`/api/Districts/${id}`, data).then(res => res.data);
};

export const deleteDistrictApi = (id) => {
  return apiClient.delete(`/api/Districts/${id}`).then(res => res.data);
};

export const getCountriesApi = () => {
  return apiClient.get('/api/Locations/countries').then(res => res.data);
};

export const getProvincesApi = (countryId) => {
  const params = countryId ? { countryId } : {};
  return apiClient.get('/api/Locations/provinces', { params }).then(res => res.data);
};
