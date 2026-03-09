import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getAmenitiesApi } from '../api';

export const useAmenities = () => {
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

  const fetchAmenities = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getAmenitiesApi({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined
      });

      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch (error) {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, setTotal]);

  useEffect(() => {
    fetchAmenities();
  }, [fetchAmenities]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchAmenities,
  };
};
