import { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getTransitHubsApi } from '../api';

export const useTransitHubs = () => {
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
  const [districtId, setDistrictId] = useState();
  const [transportationId, setTransportationId] = useState();
  const [transitHubTypeId, setTransitHubTypeId] = useState();

  const fetchTransitHubs = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getTransitHubsApi({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
        districtId: districtId || undefined,
        transportationId: transportationId || undefined,
        transitHubTypeId: transitHubTypeId || undefined,
      });
      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, districtId, transportationId, transitHubTypeId, setTotal]);

  useEffect(() => {
    fetchTransitHubs();
  }, [fetchTransitHubs]);

  const handleFilterChange = useCallback((filterName, value) => {
    const setters = { districtId: setDistrictId, transportationId: setTransportationId, transitHubTypeId: setTransitHubTypeId };
    setters[filterName]?.(value);
    handleTableChange({ current: 1, pageSize });
  }, [handleTableChange, pageSize]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    handleFilterChange,
    fetchTransitHubs,
  };
};
