import { useEffect, useState, useCallback } from 'react';
import { getPublicLocationDetailApi } from '../api';

export const usePublicLocationDetail = (locationId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLocationDetail = useCallback(async () => {
    if (!locationId) {
      setData(null);
      return;
    }

    setLoading(true);
    try {
      const response = await getPublicLocationDetailApi(locationId);
      setData(response || null);
    } catch (error) {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchLocationDetail();
  }, [fetchLocationDetail]);

  return {
    data,
    loading,
    fetchLocationDetail,
  };
};
