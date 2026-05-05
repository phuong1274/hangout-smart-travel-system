import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { reviewsApi } from '../api';

export const useMyReviews = () => {
  const {
    pagination,
    searchTerm,
    handleTableChange,
    handleSearch,
    setTotal,
    pageIndex,
    pageSize,
  } = usePagination();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ratingFilter, setRatingFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();

  const fetchMyReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reviewsApi.getMyReviews({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
        rating: ratingFilter || undefined,
        status: statusFilter ?? undefined,
      });
      const payload = response.data || {};

      setItems(payload.items || []);
      setTotal(payload.totalCount || 0);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, ratingFilter, searchTerm, setTotal, statusFilter]);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  const resetToFirstPage = useCallback(() => {
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  const handleRatingFilterChange = useCallback((value) => {
    setRatingFilter(value);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const handleStatusFilterChange = useCallback((value) => {
    setStatusFilter(value);
    resetToFirstPage();
  }, [resetToFirstPage]);

  const filterState = useMemo(
    () => ({ ratingFilter, statusFilter }),
    [ratingFilter, statusFilter],
  );

  return {
    items,
    loading,
    pagination,
    filterState,
    handleTableChange,
    handleSearch,
    handleRatingFilterChange,
    handleStatusFilterChange,
    refresh: fetchMyReviews,
  };
};
