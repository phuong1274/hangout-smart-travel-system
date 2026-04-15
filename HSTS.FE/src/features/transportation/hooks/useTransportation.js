import { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { 
  getTransitHubsApi, 
  getTransportModesApi, 
  getLocalTransportMetricsApi 
} from '../api';

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