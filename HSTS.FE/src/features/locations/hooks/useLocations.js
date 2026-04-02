import { useCallback, useState, useEffect } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getLocationsApi } from '../api';

export const useLocations = () => {
  const {
    pagination,
    handleTableChange,
    setTotal,
    pageIndex,
    pageSize
  } = usePagination();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({});

  const fetchLocations = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        pageIndex,
        pageSize,
        ...filters
      };

      const response = await getLocationsApi(params);

      // response is already the data object due to .then(res => res.data) in API
      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch (error) {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, filters, setTotal]);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const handleSearch = (newFilters) => {
    setFilters(newFilters);
  };

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchLocations,
  };
};
