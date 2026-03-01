import apiClient from '@/lib/axios';

export const getUsersApi = (params) => {
  return apiClient.get('/Users', { params });
};

export const getUserByIdApi = (id) => {
  return apiClient.get(`/Users/${id}`);
};

export const createUserApi = (data) => {
  return apiClient.post('/Users', data);
};

export const updateUserApi = (id, data) => {
  return apiClient.put(`/Users/${id}`, data);
};

export const deleteUserApi = (id) => {
  return apiClient.delete(`/Users/${id}`);
};
