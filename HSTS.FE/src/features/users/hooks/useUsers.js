import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { usersApi } from '../api';

export const useUsers = () => {
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

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
      });
      const payload = response.data;

      setData(payload.items || []);
      setTotal(payload.totalCount || 0);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, searchTerm, setTotal]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchUsers,
  };
};
