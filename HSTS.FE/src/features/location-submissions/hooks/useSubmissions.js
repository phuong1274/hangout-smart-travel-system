import { useState, useCallback, useEffect } from 'react';
import { getMySubmissionsApi } from '../api';

export const useSubmissions = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0
  });
  const [searchTerm, setSearchTerm] = useState('');

  const fetchSubmissions = useCallback(async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await getMySubmissionsApi({
        pageIndex: page,
        pageSize
      });
      setData(response.items || []);
      setPagination({
        current: page,
        pageSize,
        total: response.totalCount || 0
      });
    } catch (error) {
      console.error('Failed to fetch submissions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTableChange = (pag) => {
    fetchSubmissions(pag.current, pag.pageSize);
  };

  const handleSearch = (value) => {
    setSearchTerm(value);
    fetchSubmissions(1, pagination.pageSize);
  };

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  return {
    data,
    loading,
    pagination,
    handleTableChange,
    handleSearch,
    fetchSubmissions
  };
};
