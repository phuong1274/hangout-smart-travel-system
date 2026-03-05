import React, { useEffect, useCallback, useState } from 'react';
import { usePagination } from '@/hooks/usePagination';
import { getUsersApi } from '../api';

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
      const response = await getUsersApi({ 
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
