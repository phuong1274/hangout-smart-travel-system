import React, { useEffect, useCallback, useMemo, useState } from 'react';
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
  const [roleFilter, setRoleFilter] = useState();
  const [statusFilter, setStatusFilter] = useState();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await usersApi.getUsers({
        pageIndex,
        pageSize,
        searchTerm: searchTerm || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      const payload = response.data;

      setData(payload.items || []);
      setTotal(payload.totalCount || 0);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, roleFilter, searchTerm, setTotal, statusFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filterState = useMemo(
    () => ({ roleFilter, statusFilter }),
    [roleFilter, statusFilter]
  );

  return {
    data,
    loading,
    pagination,
    filterState,
    handleTableChange,
    handleSearch,
    setRoleFilter,
    setStatusFilter,
    fetchUsers,
  };
};
