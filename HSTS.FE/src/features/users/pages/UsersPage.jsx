import React from 'react';
import { Card, Typography, Space } from 'antd';
import SearchFilter from '@/components/UI/SearchFilter';
import { useUsers } from '../hooks/useUsers';
import { UserTable } from '../components/UserTable';

const { Title } = Typography;

const UsersPage = () => {
  const { 
    data, 
    loading, 
    pagination, 
    handleTableChange, 
    handleSearch 
  } = useUsers();

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Title level={2}>User Management</Title>
      <Card>
        <SearchFilter 
          onSearch={handleSearch} 
          loading={loading} 
          placeholder="Search by name or email"
        />
        <UserTable
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
