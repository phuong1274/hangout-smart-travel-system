import { useState, useCallback, useEffect } from 'react';
import { message } from 'antd';
import { usersApi } from '../api';
import { useAuthStore } from '@/store/authStore';

export const useMyInfo = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getMyInfo();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
};

export const useUpdateMyInfo = (onSuccess) => {
  const [loading, setLoading] = useState(false);
  const { updateUser } = useAuthStore();

  const updateMyInfo = useCallback(async (data) => {
    setLoading(true);
    try {
      const res = await usersApi.updateMyInfo(data);
      updateUser({ fullName: res.data.fullName });
      message.success('Profile updated!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }, [updateUser, onSuccess]);

  return { updateMyInfo, loading };
};

export const useMyProfiles = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.getMyProfiles();
      setData(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, refetch: fetch };
};

export const useCreateProfile = (onSuccess) => {
  const [loading, setLoading] = useState(false);

  const createProfile = useCallback(async (data) => {
    setLoading(true);
    try {
      await usersApi.createProfile(data);
      message.success('Profile created!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { createProfile, loading };
};

export const useUpdateProfile = (onSuccess) => {
  const [loading, setLoading] = useState(false);

  const updateProfile = useCallback(async (data) => {
    setLoading(true);
    try {
      await usersApi.updateProfile(data);
      message.success('Profile updated!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { updateProfile, loading };
};

export const useDeleteProfile = (onSuccess) => {
  const [loading, setLoading] = useState(false);

  const deleteProfile = useCallback(async (profileId) => {
    setLoading(true);
    try {
      await usersApi.deleteProfile(profileId);
      message.success('Profile deleted!');
      onSuccess?.();
    } finally {
      setLoading(false);
    }
  }, [onSuccess]);

  return { deleteProfile, loading };
};
