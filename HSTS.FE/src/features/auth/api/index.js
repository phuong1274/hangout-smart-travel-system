import apiClient from '@/lib/axios';

export const loginApi = (data) => {
  return apiClient.post('/auth/login', data);
};

export const logoutApi = () => {
  return apiClient.post('/auth/logout');
};

export const refreshTokenApi = () => {
  return apiClient.post('/auth/refresh');
};

export const getProfileApi = () => {
  return apiClient.get('/auth/profile');
};
