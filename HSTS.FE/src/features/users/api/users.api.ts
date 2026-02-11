import api from '@/lib/axios';
import type {
  UserDto,
  ProfileDto,
  UpdateMyInfoRequest,
  CreateProfileRequest,
  UpdateProfileRequest,
} from '../types/users.type';

export const usersApi = {
  getMyInfo: () => api.get<UserDto>('/api/users/me'),

  updateMyInfo: (data: UpdateMyInfoRequest) => api.put<UserDto>('/api/users/me', data),

  getMyProfiles: () => api.get<ProfileDto[]>('/api/users/me/profiles'),

  getMyProfile: (profileId: number) => api.get<ProfileDto>(`/api/users/me/profiles/${profileId}`),

  createProfile: (data: CreateProfileRequest) =>
    api.post<ProfileDto>('/api/users/me/profiles', data),

  updateProfile: (data: UpdateProfileRequest) =>
    api.put<ProfileDto>(`/api/users/me/profiles/${data.profileId}`, data),

  deleteProfile: (profileId: number) => api.delete(`/api/users/me/profiles/${profileId}`),
};
