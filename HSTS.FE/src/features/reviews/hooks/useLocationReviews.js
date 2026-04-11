import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '../api';

export const useLocationReviews = (locationId) => {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize] = useState(10);

  const fetchReviews = useCallback(async () => {
    if (!locationId) return;
    setLoading(true);
    try {
      const response = await reviewsApi.getByLocation(locationId, { pageIndex, pageSize });
      const data = response?.data || {};
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
    } finally {
      setLoading(false);
    }
  }, [locationId, pageIndex, pageSize]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return { items, totalCount, loading, pageIndex, pageSize, setPageIndex, refresh: fetchReviews };
};
