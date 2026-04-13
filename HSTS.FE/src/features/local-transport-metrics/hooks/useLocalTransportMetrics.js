import { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getLocalTransportMetricsApi } from '../api';

export const useLocalTransportMetrics = () => {
  const {
    pagination,
    handleTableChange,
    setTotal,
    pageIndex,
    pageSize,
  } = usePagination();

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [transportationIdFilter, setTransportationIdFilter] = useState();

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getLocalTransportMetricsApi({
        pageIndex,
        pageSize,
        transportationId: transportationIdFilter || undefined,
      });
      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, transportationIdFilter, setTotal]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const handleTransportationFilter = useCallback((value) => {
    setTransportationIdFilter(value);
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleTransportationFilter,
    fetchMetrics,
  };
};
