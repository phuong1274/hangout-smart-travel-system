import { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getTransportModesApi } from '../api';

export const useTransportModes = () => {
  const {
    pagination,
    searchTerm,
    handleTableChange,
    handleSearch,
    setTotal,
    pageIndex,
    pageSize,
  } = usePagination();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState();

  const fetchTransportModes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTransportModesApi({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
        category: categoryFilter || undefined,
      });
      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, categoryFilter, setTotal]);

  useEffect(() => {
    fetchTransportModes();
  }, [fetchTransportModes]);

  const handleCategoryFilterChange = useCallback((value) => {
    setCategoryFilter(value);
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    handleCategoryFilterChange,
    categoryFilter,
    fetchTransportModes,
  };
};
