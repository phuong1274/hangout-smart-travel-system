import apiClient from '@/lib/axios';

export const getTagsApi = (params) => {
  return apiClient.get('/Tags', { params });
};

export const getTagByIdApi = (id) => {
  return apiClient.get(`/Tags/${id}`);
};

export const createTagApi = (data) => {
  return apiClient.post('/Tags', data);
};

export const updateTagApi = (id, data) => {
  return apiClient.put(`/Tags/${id}`, data);
};

export const deleteTagApi = (id) => {
  return apiClient.delete(`/Tags/${id}`);
};
