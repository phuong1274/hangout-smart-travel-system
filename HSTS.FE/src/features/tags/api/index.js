import apiClient from '@/lib/axios';

export const getTagsApi = (params) => {
  return apiClient.get('/api/Tags', { params }).then(res => res.data);
};

export const getTagByIdApi = (id) => {
  return apiClient.get(`/api/Tags/${id}`).then(res => res.data);
};

export const createTagApi = (data) => {
  return apiClient.post('/api/Tags', data).then(res => res.data);
};

export const updateTagApi = (id, data) => {
  return apiClient.put(`/api/Tags/${id}`, data).then(res => res.data);
};

export const deleteTagApi = (id) => {
  return apiClient.delete(`/api/Tags/${id}`).then(res => res.data);
};

// New hierarchical tag APIs
export const getRootTagsApi = () => {
  return apiClient.get('/api/Tags/root').then(res => res.data);
};

export const getChildTagsApi = (parentTagId) => {
  return apiClient.get(`/api/Tags/parent/${parentTagId}`).then(res => res.data);
};
