import { useCallback, useEffect, useState } from 'react';
import { usersApi } from '../api';

export const useRoles = () => {
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchRoles = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.getRoles();
      setRoles(response.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  return { roles, loading, refresh: fetchRoles };
};