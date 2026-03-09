import apiClient from '@/lib/axios';

export const getTagsApi = (params) => {
  return apiClient.get('/Tags', { params }).then(res => res.data);
};

export const getTagByIdApi = (id) => {
  return apiClient.get(`/Tags/${id}`).then(res => res.data);
};

export const createTagApi = (data) => {
  return apiClient.post('/Tags', data).then(res => res.data);
};

export const updateTagApi = (id, data) => {
  return apiClient.put(`/Tags/${id}`, data).then(res => res.data);
};

export const deleteTagApi = (id) => {
  return apiClient.delete(`/Tags/${id}`).then(res => res.data);
};
