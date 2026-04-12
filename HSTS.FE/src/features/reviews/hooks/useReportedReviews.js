import { useCallback, useEffect, useState } from 'react';
import { reviewsApi } from '../api';

export const useReportedReviews = () => {
  const [items, setItems] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await reviewsApi.getReportedReviews({ pageIndex, pageSize });
      const data = response?.data || {};
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleTableChange = (pagination) => {
    setPageIndex(pagination?.current ?? 1);
    setPageSize(pagination?.pageSize ?? 10);
  };

  return {
    items,
    totalCount,
    loading,
    pageIndex,
    pageSize,
    setPageIndex,
    setPageSize,
    handleTableChange,
    refresh: fetchReports,
  };
};
