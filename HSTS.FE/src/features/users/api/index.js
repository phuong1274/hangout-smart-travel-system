import apiClient from '@/lib/axios';

export const usersApi = {
  getUsers: (params) => apiClient.get('/api/users', { params }),
  getUserById: (userId) => apiClient.get(`/api/users/${userId}`),
  getRoles: () => apiClient.get('/api/users/roles'),
  changeUserRole: ({ userId, roleId }) =>
    apiClient.put(`/api/users/${userId}/role`, { userId, roleId }),
  getMyInfo: () => apiClient.get('/api/users/me'),
  updateMyInfo: (data) => apiClient.put('/api/users/me', data),
  uploadAvatar: (formData) => apiClient.post('/api/users/me/avatar', formData, {
    headers: { 'Content-Type': undefined }, // let browser set multipart/form-data + boundary
  }),
  getMyProfiles: () => apiClient.get('/api/users/me/profiles'),
  getMyProfile: (profileId) => apiClient.get(`/api/users/me/profiles/${profileId}`),
  createProfile: (data) => apiClient.post('/api/users/me/profiles', data),
  updateProfile: ({ profileId, ...data }) => apiClient.put(`/api/users/me/profiles/${profileId}`, data),
  deleteProfile: (profileId) => apiClient.delete(`/api/users/me/profiles/${profileId}`),
};
