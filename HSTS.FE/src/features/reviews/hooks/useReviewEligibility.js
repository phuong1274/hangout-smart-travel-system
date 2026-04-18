import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '../api';

export const useReviewEligibility = (locationId, enabled) => {
  const [canReview, setCanReview] = useState(false);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (!enabled || !locationId) return;
    setLoading(true);
    try {
      const res = await reviewsApi.getEligibility(locationId);
      setCanReview(res.data?.canReview ?? false);
    } catch {
      setCanReview(false);
    } finally {
      setLoading(false);
    }
  }, [locationId, enabled]);

  useEffect(() => {
    check();
  }, [check]);

  return { canReview, loading };
};
