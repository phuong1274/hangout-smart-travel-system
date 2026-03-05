import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getDestinationsApi } from '../api';

export const useDestinations = () => {
  const {
    pagination,
    searchTerm,
    handleTableChange,
    handleSearch,
    setTotal,
    pageIndex,
    pageSize
  } = usePagination();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchDestinations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDestinationsApi({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined
      });

      setData(response.items || []);
      setTotal(response.totalCount || 0);
    } catch (error) {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, setTotal]);

  useEffect(() => {
    fetchDestinations();
  }, [fetchDestinations]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchDestinations,
  };
};
