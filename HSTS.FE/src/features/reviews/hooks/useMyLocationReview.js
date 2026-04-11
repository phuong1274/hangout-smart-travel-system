import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '../api';

export const useMyLocationReview = (locationId, isAuthenticated) => {
  const [myReview, setMyReview] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchMine = useCallback(async () => {
    if (!locationId || !isAuthenticated) {
      setMyReview(null);
      return;
    }

    setLoading(true);
    try {
      const response = await reviewsApi.getMyReview(locationId);
      setMyReview(response?.data || null);
    } finally {
      setLoading(false);
    }
  }, [locationId, isAuthenticated]);

  useEffect(() => {
    fetchMine();
  }, [fetchMine]);

  return { myReview, loading, refresh: fetchMine };
};
