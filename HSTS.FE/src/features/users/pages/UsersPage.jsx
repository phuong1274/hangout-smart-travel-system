import React, { useEffect, useCallback } from 'react';
import { Card, Typography, Space } from 'antd';
import DataTable from '@/components/UI/DataTable';
import SearchFilter from '@/components/UI/SearchFilter';
import { usePagination } from '@/hooks/usePagination';
import { getUsersApi } from '../api';

const { Title } = Typography;

const UsersPage = () => {
  const { 
    pagination, 
    searchTerm, 
    handleTableChange, 
    handleSearch, 
    setTotal,
    pageIndex,
    pageSize 
  } = usePagination();

  const [data, setData] = React.useState([]);
  const [loading, setLoading] = React.useState(false);

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

  const columns = [
    { title: 'Full Name', dataIndex: 'fullName', key: 'fullName' },
    { title: 'Email', dataIndex: 'email', key: 'email' },
    { 
      title: 'Created At', 
      dataIndex: 'createdAt', 
      key: 'createdAt',
      render: (date) => date ? new Date(date).toLocaleDateString() : '-'
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={2}>User Management</Title>
      <Card>
        <SearchFilter 
          onSearch={handleSearch} 
          loading={loading} 
          placeholder="Search by name or email"
        />
        <DataTable
          columns={columns}
          data={data}
          loading={loading}
          pagination={pagination}
          onTableChange={handleTableChange}
        />
      </Card>
    </Space>
  );
};

export default UsersPage;
