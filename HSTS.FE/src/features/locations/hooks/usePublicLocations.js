import { useCallback, useEffect, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getPublicLocationsApi } from '../api';

export const usePublicLocations = (initialFilters = {}) => {
  const { pagination, handleTableChange, setTotal, pageIndex, pageSize } = usePagination();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters);

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageIndex,
        pageSize,
        destinationId: filters.destinationId || undefined,
        keyword: filters.keyword || undefined,
        minRating: filters.minRating || undefined,
      };

      const response = await getPublicLocationsApi(params);
      setData(response?.items || response?.Items || []);
      setTotal(response?.totalCount || response?.TotalCount || 0);
    } catch (error) {
      // Global interceptor handles notifications
    } finally {
      setLoading(false);
    }
  }, [filters.destinationId, filters.keyword, filters.minRating, pageIndex, pageSize, setTotal]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleFilterChange = useCallback((nextFilters) => {
    setFilters(nextFilters);
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  return {
    data,
    loading,
    pagination,
    filters,
    handleTableChange,
    handleFilterChange,
    fetchLocations,
  };
};
