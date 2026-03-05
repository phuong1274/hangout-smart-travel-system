import { useState, useCallback } from 'react';
import { PAGINATION } from '@/config/constants';


export const usePagination = (initialSize = PAGINATION.DEFAULT_PAGE_SIZE) => {
  const [pagination, setPagination] = useState({
    current: PAGINATION.DEFAULT_PAGE,
    pageSize: initialSize,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');

  const handleTableChange = useCallback((newPagination) => {
    setPagination((prev) => ({
      ...prev,
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    }));
  }, []);

  const handleSearch = useCallback((value) => {
    setSearchTerm(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  }, []);

  const setTotal = useCallback((total) => {
    setPagination((prev) => ({ ...prev, total }));
  }, []);

  return {
    pagination,
    searchTerm,
    handleTableChange,
    handleSearch,
    setTotal,
    pageIndex: pagination.current,
    pageSize: pagination.pageSize,
  };
};
