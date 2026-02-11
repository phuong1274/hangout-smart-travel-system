import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { message } from 'antd';
import { useTranslation } from 'react-i18next';
import { usersApi } from './users.api';
import { useAuthStore } from '@/stores/auth.store';
import type {
  UpdateMyInfoRequest,
  CreateProfileRequest,
  UpdateProfileRequest,
} from '../types/users.type';

const USER_KEYS = {
  myInfo: ['users', 'me'] as const,
  myProfiles: ['users', 'me', 'profiles'] as const,
};

export const useMyInfo = () => {
  return useQuery({
    queryKey: USER_KEYS.myInfo,
    queryFn: () => usersApi.getMyInfo().then((res) => res.data),
  });
};

export const useUpdateMyInfo = () => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();
  const { t } = useTranslation('profile');

  return useMutation({
    mutationFn: (data: UpdateMyInfoRequest) => usersApi.updateMyInfo(data),
    onSuccess: ({ data }) => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myInfo });
      updateUser({ fullName: data.fullName });
      message.success(t('updateSuccess'));
    },
    onError: () => {
      message.error(t('updateError'));
    },
  });
};

export const useMyProfiles = () => {
  return useQuery({
    queryKey: USER_KEYS.myProfiles,
    queryFn: () => usersApi.getMyProfiles().then((res) => res.data),
  });
};

export const useCreateProfile = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('profile');

  return useMutation({
    mutationFn: (data: CreateProfileRequest) => usersApi.createProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myProfiles });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myInfo });
      message.success(t('profiles.createSuccess'));
    },
    onError: () => {
      message.error(t('profiles.createError'));
    },
  });
};

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('profile');

  return useMutation({
    mutationFn: (data: UpdateProfileRequest) => usersApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myProfiles });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myInfo });
      message.success(t('profiles.updateSuccess'));
    },
    onError: () => {
      message.error(t('profiles.updateError'));
    },
  });
};

export const useDeleteProfile = () => {
  const queryClient = useQueryClient();
  const { t } = useTranslation('profile');

  return useMutation({
    mutationFn: (profileId: number) => usersApi.deleteProfile(profileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myProfiles });
      queryClient.invalidateQueries({ queryKey: USER_KEYS.myInfo });
      message.success(t('profiles.deleteSuccess'));
    },
    onError: () => {
      message.error(t('profiles.deleteError'));
    },
  });
};
