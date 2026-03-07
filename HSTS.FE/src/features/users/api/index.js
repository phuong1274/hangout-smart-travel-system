import apiClient from '@/lib/axios';

export const usersApi = {
  getUsers: (params) => apiClient.get('/api/users', { params }),
  getMyInfo: () => apiClient.get('/api/users/me'),
  updateMyInfo: (data) => apiClient.put('/api/users/me', data),
  getMyProfiles: () => apiClient.get('/api/users/me/profiles'),
  getMyProfile: (profileId) => apiClient.get(`/api/users/me/profiles/${profileId}`),
  createProfile: (data) => apiClient.post('/api/users/me/profiles', data),
  updateProfile: ({ profileId, ...data }) => apiClient.put(`/api/users/me/profiles/${profileId}`, data),
  deleteProfile: (profileId) => apiClient.delete(`/api/users/me/profiles/${profileId}`),
};
