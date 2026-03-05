import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getLocationsApi } from '../api';

export const useLocations = () => {
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

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLocationsApi({
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
    fetchLocations();
  }, [fetchLocations]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchLocations,
  };
};
