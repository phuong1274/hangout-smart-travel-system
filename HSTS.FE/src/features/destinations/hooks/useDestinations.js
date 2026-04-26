import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getDistrictsApi } from '../api';

export const useDistricts = () => {
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
  const [provinceId, setProvinceId] = useState(undefined);

  const handleProvinceChange = useCallback((value) => {
    setProvinceId(value);
  }, []);

  const fetchDistricts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getDistrictsApi({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
        provinceId: provinceId
      });

      setData(response.items || response.Items || []);
      setTotal(response.totalCount || response.TotalCount || 0);
    } catch (error) {
      // Handled by global interceptor
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, provinceId, setTotal]);

  useEffect(() => {
    fetchDistricts();
  }, [fetchDistricts]);

  return {
    data,
    loading,
    pagination,
    provinceId,
    handleTableChange,
    handleSearch,
    handleProvinceChange,
    fetchDistricts,
  };
};
