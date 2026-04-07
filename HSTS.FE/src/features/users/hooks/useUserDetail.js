import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../api';

export const useUserDetail = (userId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchUser = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const response = await usersApi.getUserById(userId);
      setData(response.data);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  return { data, loading, refresh: fetchUser };
};